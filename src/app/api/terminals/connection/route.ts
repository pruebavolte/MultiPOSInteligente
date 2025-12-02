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

    let connection = null;
    let fetchError = null;

    try {
      const { data, error } = await supabase
        .from("terminal_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("provider", "mercadopago")
        .single();
      
      connection = data;
      fetchError = error;
    } catch (e: any) {
      fetchError = e;
    }

    if (fetchError && fetchError.code !== "PGRST116") {
      if (fetchError.code === "PGRST205" || fetchError.code === "PGRST202") {
        return NextResponse.json({ connected: false });
      }
      console.error("[Get Connection Error]", fetchError);
      return NextResponse.json({ error: "Error al obtener conexión" }, { status: 500 });
    }

    if (!connection) {
      return NextResponse.json({ connected: false });
    }

    const isExpired = connection.token_expires_at && 
      new Date(connection.token_expires_at) < new Date();

    if (isExpired) {
      const refreshed = await refreshToken(supabase, connection);
      if (!refreshed) {
        return NextResponse.json({ 
          connected: false,
          expired: true,
          message: "Tu conexión ha expirado. Por favor reconecta."
        });
      }
      const { data: updatedConnection } = await supabase
        .from("terminal_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("provider", "mercadopago")
        .single();
      
      return NextResponse.json({
        connected: true,
        connection: sanitizeConnection(updatedConnection)
      });
    }

    return NextResponse.json({
      connected: true,
      connection: sanitizeConnection(connection)
    });
  } catch (error: any) {
    console.error("[Get Connection Error]", error);
    return NextResponse.json(
      { error: error.message || "Error al obtener conexión" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { error } = await supabase
      .from("terminal_connections")
      .delete()
      .eq("user_id", user.id)
      .eq("provider", "mercadopago");

    if (error) {
      console.error("[Delete Connection Error]", error);
      return NextResponse.json({ error: "Error al desconectar" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Delete Connection Error]", error);
    return NextResponse.json(
      { error: error.message || "Error al desconectar" },
      { status: 500 }
    );
  }
}

async function refreshToken(supabase: any, connection: any): Promise<boolean> {
  const MP_CLIENT_ID = process.env.MERCADOPAGO_CLIENT_ID;
  const MP_CLIENT_SECRET = process.env.MERCADOPAGO_CLIENT_SECRET;

  if (!MP_CLIENT_ID || !MP_CLIENT_SECRET || !connection.refresh_token) {
    return false;
  }

  try {
    const response = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: MP_CLIENT_ID,
        client_secret: MP_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: connection.refresh_token,
      }),
    });

    if (!response.ok) return false;

    const tokens = await response.json();

    await supabase
      .from("terminal_connections")
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);

    return true;
  } catch {
    return false;
  }
}

function sanitizeConnection(connection: any) {
  return {
    id: connection.id,
    provider: connection.provider,
    status: connection.status,
    selected_device_id: connection.selected_device_id,
    selected_device_name: connection.selected_device_name,
    connected_at: connection.created_at,
    live_mode: connection.live_mode,
  };
}
