import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedUser } from "@/lib/auth-wrapper";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: connection, error: connError } = await supabase
      .from("terminal_connections")
      .select("access_token, provider")
      .eq("user_id", user.id)
      .eq("provider", "mercadopago")
      .single();

    if (connError || !connection) {
      return NextResponse.json({ 
        error: "No hay conexión activa",
        needsConnection: true 
      }, { status: 400 });
    }

    const devicesResponse = await fetch(
      "https://api.mercadopago.com/point/integration-api/devices",
      {
        headers: {
          "Authorization": `Bearer ${connection.access_token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!devicesResponse.ok) {
      const errorText = await devicesResponse.text();
      console.error("[Devices Fetch Error]", errorText);
      
      if (devicesResponse.status === 401) {
        return NextResponse.json({ 
          error: "Token expirado",
          needsReconnection: true 
        }, { status: 401 });
      }
      
      return NextResponse.json({ 
        error: "Error al obtener dispositivos" 
      }, { status: 500 });
    }

    const devicesData = await devicesResponse.json();
    
    const devices = devicesData.devices?.map((device: any) => ({
      id: device.id,
      pos_id: device.pos_id,
      store_id: device.store_id,
      external_pos_id: device.external_pos_id,
      operating_mode: device.operating_mode,
    })) || [];

    return NextResponse.json({ 
      devices,
      count: devices.length 
    });
  } catch (error: any) {
    console.error("[Get Devices Error]", error);
    return NextResponse.json(
      { error: error.message || "Error al obtener dispositivos" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { deviceId, deviceName } = body;

    if (!deviceId) {
      return NextResponse.json({ error: "Falta deviceId" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { error } = await supabase
      .from("terminal_connections")
      .update({
        selected_device_id: deviceId,
        selected_device_name: deviceName || `Terminal ${deviceId}`,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("provider", "mercadopago");

    if (error) {
      console.error("[Select Device Error]", error);
      return NextResponse.json({ error: "Error al guardar dispositivo" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      deviceId,
      deviceName: deviceName || `Terminal ${deviceId}`
    });
  } catch (error: any) {
    console.error("[Select Device Error]", error);
    return NextResponse.json(
      { error: error.message || "Error al seleccionar dispositivo" },
      { status: 500 }
    );
  }
}
