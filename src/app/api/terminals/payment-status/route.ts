import { NextRequest, NextResponse } from "next/server";

const MERCADOPAGO_API_BASE = "https://api.mercadopago.com/point/integration-api";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, paymentIntentId, accessToken } = body;

    if (!provider || !paymentIntentId || !accessToken) {
      return NextResponse.json(
        { error: "Faltan parámetros requeridos" },
        { status: 400 }
      );
    }

    if (provider === "mercadopago") {
      const response = await fetch(
        `${MERCADOPAGO_API_BASE}/payment-intents/${paymentIntentId}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return NextResponse.json(
          { 
            error: "Error al verificar estado del pago",
            message: errorData.message || response.statusText,
            status: "error",
          },
          { status: response.status }
        );
      }

      const data = await response.json();
      
      let status: "pending" | "processing" | "approved" | "rejected" | "cancelled" | "error" = "pending";
      
      if (data.state === "FINISHED") {
        const paymentState = data.payment?.state?.toLowerCase();
        if (paymentState === "approved") {
          status = "approved";
        } else if (paymentState === "rejected") {
          status = "rejected";
        } else if (paymentState === "cancelled") {
          status = "cancelled";
        }
      } else if (data.state === "PROCESSING" || data.state === "OPEN") {
        status = "processing";
      } else if (data.state === "CANCELLED") {
        status = "cancelled";
      } else if (data.state === "ERROR") {
        status = "error";
      }

      return NextResponse.json({
        status,
        paymentId: data.payment?.id,
        authorizationCode: data.payment?.authorization_code,
        errorMessage: data.payment?.status_detail,
        rawState: data.state,
      });

    } else if (provider === "clip") {
      return NextResponse.json({
        status: "processing",
        message: "Verificando estado con Clip...",
      });
    }

    return NextResponse.json(
      { error: "Provider no soportado", status: "error" },
      { status: 400 }
    );

  } catch (error) {
    console.error("Error checking payment status:", error);
    return NextResponse.json(
      { error: "Error interno del servidor", status: "error" },
      { status: 500 }
    );
  }
}
