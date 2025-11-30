import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-wrapper";

// GET /api/products - Get products filtered by user_id
export async function GET(request: NextRequest) {
  try {
    const userData = await getAuthenticatedUser();
    if (!userData) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const supabase = supabaseAdmin;

    const searchParams = request.nextUrl.searchParams;
    const productType = searchParams.get("product_type");
    const availableInPos = searchParams.get("available_in_pos");
    const availableInDigitalMenu = searchParams.get("available_in_digital_menu");
    const trackInventory = searchParams.get("track_inventory");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    let query = supabase
      .from("products")
      .select("*, category:categories(*)", { count: "exact" })
      .eq("user_id", userData.id); // Filter by user_id

    // Apply filters - Sistema unificado multi-canal
    if (availableInPos !== null) {
      query = query.eq("available_in_pos", availableInPos === "true");
    }
    if (availableInDigitalMenu !== null) {
      query = query.eq("available_in_digital_menu", availableInDigitalMenu === "true");
    }
    if (trackInventory !== null) {
      query = query.eq("track_inventory", trackInventory === "true");
    }

    // Mantener compatibilidad con product_type (OBSOLETO)
    if (productType) {
      query = query.eq("product_type", productType);
    }

    // Apply pagination
    const start = (page - 1) * limit;
    const end = start + limit - 1;
    query = query.range(start, end).order("created_at", { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching products:", error);
      return NextResponse.json(
        { error: "Error al obtener productos" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: data || [],
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error("Error in GET /api/products:", error);
    return NextResponse.json(
      { error: "Error al obtener productos" },
      { status: 500 }
    );
  }
}

// POST /api/products - Create product with user_id
export async function POST(request: NextRequest) {
  try {
    const userData = await getAuthenticatedUser();
    if (!userData) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const supabase = supabaseAdmin;

    const productData = await request.json();

    // Add user_id to product data
    const productWithUserId = {
      ...productData,
      user_id: userData.id,
    };

    const { data, error } = await supabase
      .from("products")
      // @ts-expect-error - Type mismatch with Supabase generated types
      .insert([productWithUserId])
      .select("*, category:categories(*)")
      .single();

    if (error) {
      console.error("Error creating product:", error);
      return NextResponse.json(
        { error: "Error al crear producto" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data, success: true });
  } catch (error) {
    console.error("Error in POST /api/products:", error);
    return NextResponse.json(
      { error: "Error al crear producto" },
      { status: 500 }
    );
  }
}

// PATCH /api/products/:id - Update product (only if user owns it)
export async function PATCH(request: NextRequest) {
  try {
    const userData = await getAuthenticatedUser();
    if (!userData) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const supabase = supabaseAdmin;

    const url = new URL(request.url);
    const productId = url.searchParams.get("id");

    if (!productId) {
      return NextResponse.json(
        { error: "ID de producto requerido" },
        { status: 400 }
      );
    }

    const updates = await request.json();

    // Update only if user owns the product
    const { data, error } = await supabase
      .from("products")
      // @ts-expect-error - Type mismatch with Supabase generated types
      .update(updates)
      .eq("id", productId)
      .eq("user_id", userData.id) // Ensure user owns this product
      .select("*, category:categories(*)")
      .single();

    if (error) {
      console.error("Error updating product:", error);
      return NextResponse.json(
        { error: "Error al actualizar producto" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Producto no encontrado o no autorizado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data, success: true });
  } catch (error) {
    console.error("Error in PATCH /api/products:", error);
    return NextResponse.json(
      { error: "Error al actualizar producto" },
      { status: 500 }
    );
  }
}

// DELETE /api/products/:id - Delete product (only if user owns it)
export async function DELETE(request: NextRequest) {
  try {
    const userData = await getAuthenticatedUser();
    if (!userData) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const supabase = supabaseAdmin;

    const url = new URL(request.url);
    const productId = url.searchParams.get("id");

    if (!productId) {
      return NextResponse.json(
        { error: "ID de producto requerido" },
        { status: 400 }
      );
    }

    // Delete only if user owns the product
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId)
      .eq("user_id", userData.id); // Ensure user owns this product

    if (error) {
      console.error("Error deleting product:", error);
      return NextResponse.json(
        { error: "Error al eliminar producto" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/products:", error);
    return NextResponse.json(
      { error: "Error al eliminar producto" },
      { status: 500 }
    );
  }
}
