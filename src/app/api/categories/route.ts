import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, getSupabaseClient } from "@/lib/auth-wrapper";

// GET /api/categories - Get categories filtered by user_id
export async function GET(request: NextRequest) {
  try {
    const userData = await getAuthenticatedUser();
    if (!userData) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", userData.id) // Filter by user_id
      .eq("active", true)
      .order("name");

    if (error) {
      console.error("Error fetching categories:", error);
      return NextResponse.json(
        { error: "Error al obtener categorías" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data || [], success: true });
  } catch (error) {
    console.error("Error in GET /api/categories:", error);
    return NextResponse.json(
      { error: "Error al obtener categorías" },
      { status: 500 }
    );
  }
}

// POST /api/categories - Create category with user_id
export async function POST(request: NextRequest) {
  try {
    const userData = await getAuthenticatedUser();
    if (!userData) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const supabase = getSupabaseClient();

    const categoryData = await request.json();

    // Add user_id to category data
    const categoryWithUserId = {
      ...categoryData,
      user_id: userData.id,
    };

    // @ts-ignore - Type mismatch with Supabase generated types
    const { data, error } = await supabase
      .from("categories")
      .insert(categoryWithUserId)
      .select()
      .single();

    if (error) {
      console.error("Error creating category:", error);
      return NextResponse.json(
        { error: "Error al crear categoría" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data, success: true });
  } catch (error) {
    console.error("Error in POST /api/categories:", error);
    return NextResponse.json(
      { error: "Error al crear categoría" },
      { status: 500 }
    );
  }
}

// PATCH /api/categories/:id - Update category (only if user owns it)
export async function PATCH(request: NextRequest) {
  try {
    const userData = await getAuthenticatedUser();
    if (!userData) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const supabase = getSupabaseClient();

    const url = new URL(request.url);
    const categoryId = url.searchParams.get("id");

    if (!categoryId) {
      return NextResponse.json(
        { error: "ID de categoría requerido" },
        { status: 400 }
      );
    }

    const updates = await request.json();

    // Update only if user owns the category
    const { data, error } = await supabase
      .from("categories")
      // @ts-expect-error - Type mismatch with Supabase generated types
      .update(updates)
      .eq("id", categoryId)
      .eq("user_id", userData.id) // Ensure user owns this category
      .select()
      .single();

    if (error) {
      console.error("Error updating category:", error);
      return NextResponse.json(
        { error: "Error al actualizar categoría" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Categoría no encontrada o no autorizada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data, success: true });
  } catch (error) {
    console.error("Error in PATCH /api/categories:", error);
    return NextResponse.json(
      { error: "Error al actualizar categoría" },
      { status: 500 }
    );
  }
}

// DELETE /api/categories/:id - Delete category (only if user owns it)
export async function DELETE(request: NextRequest) {
  try {
    const userData = await getAuthenticatedUser();
    if (!userData) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const supabase = getSupabaseClient();

    const url = new URL(request.url);
    const categoryId = url.searchParams.get("id");

    if (!categoryId) {
      return NextResponse.json(
        { error: "ID de categoría requerido" },
        { status: 400 }
      );
    }

    // Delete only if user owns the category
    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", categoryId)
      .eq("user_id", userData.id); // Ensure user owns this category

    if (error) {
      console.error("Error deleting category:", error);
      return NextResponse.json(
        { error: "Error al eliminar categoría" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/categories:", error);
    return NextResponse.json(
      { error: "Error al eliminar categoría" },
      { status: 500 }
    );
  }
}
