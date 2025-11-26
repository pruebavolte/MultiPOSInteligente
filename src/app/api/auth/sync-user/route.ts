import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getOrCreateUser } from "@/lib/supabase/users";

/**
 * API endpoint to sync the current Clerk user with Supabase
 * This is called automatically when a user logs in
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    // Get full user details from Clerk
    const clerkUser = await currentUser();

    if (!clerkUser) {
      return NextResponse.json(
        { error: "No se pudo obtener información del usuario" },
        { status: 404 }
      );
    }

    // Get primary email
    const primaryEmail = clerkUser.emailAddresses.find(
      (email) => email.id === clerkUser.primaryEmailAddressId
    );

    if (!primaryEmail) {
      return NextResponse.json(
        { error: "No se encontró email principal" },
        { status: 400 }
      );
    }

    // Create or get user in Supabase
    const user = await getOrCreateUser(userId, {
      email: primaryEmail.emailAddress,
      firstName: clerkUser.firstName || "",
      lastName: clerkUser.lastName || "",
      image: clerkUser.imageUrl || undefined,
    });

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error: any) {
    console.error("Error syncing user:", error);
    console.error("Error details:", {
      message: error?.message,
      stack: error?.stack,
      code: error?.code,
    });
    return NextResponse.json(
      {
        error: "Error al sincronizar usuario",
        details: error?.message || "Unknown error"
      },
      { status: 500 }
    );
  }
}
