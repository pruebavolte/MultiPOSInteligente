import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedUser } from "@/lib/auth-wrapper";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function findTerminalConnection(supabase: any, userId: string) {
  const { data: connection, error } = await supabase
    .from("terminal_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "mercadopago")
    .single();

  if (!error && connection) {
    return connection;
  }

  const { data: anyConnection } = await supabase
    .from("terminal_connections")
    .select("*")
    .eq("provider", "mercadopago")
    .limit(1)
    .single();

  if (anyConnection) {
    console.log("[Terminal] Using fallback connection for user:", userId, "found connection for:", anyConnection.user_id);
    return anyConnection;
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    console.log("[Devices GET] User ID:", user.id, "Email:", user.email);

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const connection = await findTerminalConnection(supabase, user.id);

    if (!connection) {
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

    console.log("[Devices POST] User ID:", user.id, "Email:", user.email);

    const body = await request.json();
    const { deviceId, deviceName } = body;

    if (!deviceId) {
      return NextResponse.json({ error: "Falta deviceId" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const connection = await findTerminalConnection(supabase, user.id);

    if (!connection) {
      console.error("[Select Device Error] No connection found for user:", user.id);
      return NextResponse.json({ 
        error: "No hay conexión activa de Mercado Pago",
        needsConnection: true 
      }, { status: 400 });
    }

    console.log("[Devices POST] Found connection ID:", connection.id, "for user_id:", connection.user_id);

    const { error, data } = await supabase
      .from("terminal_connections")
      .update({
        selected_device_id: deviceId,
        selected_device_name: deviceName || `Terminal ${deviceId}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id)
      .select();

    if (error) {
      console.error("[Select Device Error] Supabase error:", error);
      return NextResponse.json({ 
        error: "Error al guardar dispositivo",
        details: error.message 
      }, { status: 500 });
    }

    console.log("[Devices POST] Device saved successfully. Updated rows:", data?.length || 0);

    return NextResponse.json({ 
      success: true,
      deviceId,
      deviceName: deviceName || `Terminal ${deviceId}`
    });
  } catch (error: any) {
    console.error("[Select Device Error] Exception:", error);
    return NextResponse.json(
      { error: error.message || "Error al seleccionar dispositivo" },
      { status: 500 }
    );
  }
}
