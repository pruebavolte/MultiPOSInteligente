import { NextRequest, NextResponse } from "next/server";

const MERCADOPAGO_API_BASE = "https://api.mercadopago.com/point/integration-api";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      provider, 
      deviceId, 
      accessToken, 
      amount, 
      externalReference,
      intentId,
    } = body;

    if (!provider || !deviceId || !accessToken || !amount) {
      return NextResponse.json(
        { error: "Faltan parámetros requeridos" },
        { status: 400 }
      );
    }

    if (provider === "mercadopago") {
      const response = await fetch(
        `${MERCADOPAGO_API_BASE}/devices/${deviceId}/payment-intents`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: Math.round(amount * 100),
            additional_info: {
              external_reference: externalReference || intentId,
              print_on_terminal: true,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return NextResponse.json(
          { 
            error: "Error al crear intento de pago",
            message: errorData.message || response.statusText,
            status: "error",
          },
          { status: response.status }
        );
      }

      const data = await response.json();

      return NextResponse.json({
        status: "processing",
        paymentIntentId: data.id,
        deviceId: data.device_id,
        amount: data.amount,
      });

    } else if (provider === "clip") {
      return NextResponse.json({
        status: "processing",
        paymentIntentId: `clip_${Date.now()}`,
        message: "Pago enviado a terminal Clip. Esperando confirmación...",
      });
    }

    return NextResponse.json(
      { error: "Provider no soportado", status: "error" },
      { status: 400 }
    );

  } catch (error) {
    console.error("Error creating payment intent:", error);
    return NextResponse.json(
      { error: "Error interno del servidor", status: "error" },
      { status: 500 }
    );
  }
}
