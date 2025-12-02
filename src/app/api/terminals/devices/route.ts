import { NextRequest, NextResponse } from "next/server";

const MERCADOPAGO_API_BASE = "https://api.mercadopago.com/point/integration-api";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, accessToken } = body;

    if (!provider || !accessToken) {
      return NextResponse.json(
        { error: "Provider y accessToken son requeridos" },
        { status: 400 }
      );
    }

    if (provider === "mercadopago") {
      const response = await fetch(`${MERCADOPAGO_API_BASE}/devices?offset=0&limit=50`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return NextResponse.json(
          { 
            error: "Error al obtener dispositivos de Mercado Pago",
            details: errorData.message || response.statusText,
          },
          { status: response.status }
        );
      }

      const data = await response.json();
      
      const devices = (data.devices || []).map((device: Record<string, unknown>) => ({
        id: device.id,
        posId: device.pos_id,
        storeId: device.store_id,
        externalPosId: device.external_pos_id,
        operatingMode: device.operating_mode,
        model: String(device.id).split("__")[0] || "Point",
      }));

      return NextResponse.json({ devices });

    } else if (provider === "clip") {
      return NextResponse.json({
        devices: [],
        message: "La integración con Clip requiere configuración manual del Device ID desde tu portal de Clip",
      });
    }

    return NextResponse.json(
      { error: "Provider no soportado" },
      { status: 400 }
    );

  } catch (error) {
    console.error("Error fetching terminal devices:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
