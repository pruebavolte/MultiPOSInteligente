import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserByClerkId } from "@/lib/supabase/users";
import { getUserOrders, createOrder } from "@/lib/supabase/orders";

// Get user's orders
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const user = await getUserByClerkId(userId);

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    const orders = await getUserOrders(user.id);

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Error al obtener las órdenes" },
      { status: 500 }
    );
  }
}

// Create new order
// Allows public orders when restaurantId is provided (for shared menu)
// Otherwise requires authentication
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, notes, currency, restaurantId } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Se requieren items para crear una orden" },
        { status: 400 }
      );
    }

    let targetUserId: string;

    // PUBLIC ORDER: If restaurantId is provided, this is a public order from shared menu
    if (restaurantId) {
      targetUserId = restaurantId;
    } else {
      // AUTHENTICATED ORDER: Require authentication
      const { userId } = await auth();

      if (!userId) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
      }

      const user = await getUserByClerkId(userId);

      if (!user) {
        return NextResponse.json(
          { error: "Usuario no encontrado" },
          { status: 404 }
        );
      }

      targetUserId = user.id;
    }

    // Calculate total
    const total = items.reduce(
      (sum: number, item: any) => sum + item.price * item.quantity,
      0
    );

    const order = await createOrder({
      userId: targetUserId,
      total,
      currency: currency || "MXN",
      notes: notes || null,
      items: items.map((item: any) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        currency: item.currency || currency || "MXN",
        imageUrl: item.imageUrl || null,
      })),
    });

    return NextResponse.json({
      success: true,
      order,
      message: "Orden creada exitosamente",
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Error al crear la orden" },
      { status: 500 }
    );
  }
}
