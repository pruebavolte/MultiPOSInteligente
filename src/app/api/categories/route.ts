import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";
import { getUserByClerkId } from "@/lib/supabase/users";
import type { Database } from "@/lib/supabase/client";

// GET /api/categories - Get categories filtered by user_id
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const supabase = supabaseAdmin;

    // Get user's UUID from Supabase
    const userData = await getUserByClerkId(userId);

    if (!userData) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

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
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const supabase = supabaseAdmin;

    // Get user's UUID from Supabase
    const userData = await getUserByClerkId(userId);

    if (!userData) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

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
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const supabase = supabaseAdmin;

    // Get user's UUID from Supabase
    const userData = await getUserByClerkId(userId);

    if (!userData) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

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
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const supabase = supabaseAdmin;

    // Get user's UUID from Supabase
    const userData = await getUserByClerkId(userId);

    if (!userData) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

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
