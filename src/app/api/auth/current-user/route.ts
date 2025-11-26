import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserByClerkId } from "@/lib/supabase/users";

/**
 * GET /api/auth/current-user
 * Retorna información del usuario autenticado actual
 * Incluye el user_id de Supabase necesario para generar links del menú
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    // Get user data from Supabase using the typed function
    const userData = await getUserByClerkId(userId);

    if (!userData) {
      return NextResponse.json(
        { error: "Usuario no encontrado en la base de datos" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user: {
        id: userData.id,
        clerk_id: userData.clerk_id,
        email: userData.email,
        role: userData.role,
        restaurant_id: userData.restaurant_id,
        first_name: userData.first_name,
        last_name: userData.last_name,
      },
    });
  } catch (error) {
    console.error("Error getting current user:", error);
    return NextResponse.json(
      { error: "Error al obtener usuario" },
      { status: 500 }
    );
  }
}
