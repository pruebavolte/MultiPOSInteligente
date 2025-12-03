import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MP_CLIENT_ID = process.env.MERCADOPAGO_CLIENT_ID;
const MP_CLIENT_SECRET = process.env.MERCADOPAGO_CLIENT_SECRET;
const MP_REDIRECT_URI = process.env.MERCADOPAGO_REDIRECT_URI;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getBaseUrl(request: NextRequest): string {
  if (APP_URL) {
    return APP_URL;
  }
  
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") || "https";
  
  if (host && !host.includes("localhost")) {
    return `${protocol}://${host}`;
  }
  
  return request.nextUrl.origin;
}

async function saveConnectionToSupabase(data: {
  user_id: string;
  provider: string;
  mp_user_id: string | null;
  access_token: string;
  refresh_token: string;
  public_key: string | null;
  token_expires_at: string;
  live_mode: boolean;
  status: string;
}): Promise<{ success: boolean; error?: string }> {
  const restUrl = `${SUPABASE_URL}/rest/v1/terminal_connections`;
  
  const payload = {
    ...data,
    updated_at: new Date().toISOString()
  };

  try {
    const response = await fetch(restUrl, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=representation"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[Supabase REST Error]", JSON.stringify(errorData));
      
      if (errorData.code === "PGRST205" || errorData.code === "PGRST202") {
        const rpcResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/upsert_terminal_connection`, {
          method: "POST",
          headers: {
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            p_user_id: data.user_id,
            p_provider: data.provider,
            p_mp_user_id: data.mp_user_id,
            p_access_token: data.access_token,
            p_refresh_token: data.refresh_token,
            p_public_key: data.public_key,
            p_token_expires_at: data.token_expires_at,
            p_live_mode: data.live_mode,
            p_status: data.status
          })
        });

        if (!rpcResponse.ok) {
          const rpcError = await rpcResponse.json().catch(() => ({}));
          return { success: false, error: rpcError.message || "RPC failed" };
        }
        
        return { success: true };
      }
      
      return { success: false, error: errorData.message || "API error" };
    }

    return { success: true };
  } catch (error: any) {
    console.error("[Save Connection Error]", error);
    return { success: false, error: error.message };
  }
}

export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl(request);
  
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    console.log("[OAuth Callback] Processing callback from Mercado Pago");
    console.log("[OAuth Callback] Base URL:", baseUrl);

    if (error) {
      console.error("[OAuth Callback Error]", error);
      return NextResponse.redirect(
        new URL(`/dashboard/settings/terminals?error=${encodeURIComponent(error)}`, baseUrl)
      );
    }

    if (!code || !state) {
      console.error("[OAuth Callback] Missing code or state");
      return NextResponse.redirect(
        new URL("/dashboard/settings/terminals?error=missing_params", baseUrl)
      );
    }

    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, "base64").toString());
    } catch {
      console.error("[OAuth Callback] Invalid state format");
      return NextResponse.redirect(
        new URL("/dashboard/settings/terminals?error=invalid_state", baseUrl)
      );
    }

    if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
      console.error("[OAuth Callback] State expired");
      return NextResponse.redirect(
        new URL("/dashboard/settings/terminals?error=expired", baseUrl)
      );
    }

    if (!MP_CLIENT_ID || !MP_CLIENT_SECRET) {
      console.error("[OAuth Callback] Missing MP credentials");
      return NextResponse.redirect(
        new URL("/dashboard/settings/terminals?error=not_configured", baseUrl)
      );
    }

    const redirectUri = MP_REDIRECT_URI || `${baseUrl}/api/oauth/mercadopago/callback`;

    const tokenRequestBody: Record<string, string> = {
      client_id: MP_CLIENT_ID,
      client_secret: MP_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    };

    if (stateData.codeVerifier) {
      tokenRequestBody.code_verifier = stateData.codeVerifier;
    }

    console.log("[OAuth Callback] Exchanging code for token...");

    const tokenResponse = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tokenRequestBody),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      console.error("[Token Exchange Error]", JSON.stringify(errorData));
      return NextResponse.redirect(
        new URL(`/dashboard/settings/terminals?error=token_exchange_failed&details=${encodeURIComponent(errorData.message || errorData.error || '')}`, baseUrl)
      );
    }

    const tokens = await tokenResponse.json();
    console.log("[OAuth Callback] Token exchange successful, saving to database...");

    const saveResult = await saveConnectionToSupabase({
      user_id: stateData.userId,
      provider: 'mercadopago',
      mp_user_id: tokens.user_id?.toString() || null,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      public_key: tokens.public_key || null,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      live_mode: tokens.live_mode || false,
      status: 'connected'
    });

    if (!saveResult.success) {
      console.error("[DB Save Error]", saveResult.error);
      return NextResponse.redirect(
        new URL(`/dashboard/settings/terminals?error=save_failed&details=${encodeURIComponent(saveResult.error || '')}`, baseUrl)
      );
    }

    console.log("[OAuth Callback] Connection saved successfully!");
    return NextResponse.redirect(
      new URL("/dashboard/settings/terminals?connected=mercadopago", baseUrl)
    );
  } catch (error: any) {
    console.error("[OAuth Callback Error]", error);
    return NextResponse.redirect(
      new URL(`/dashboard/settings/terminals?error=${encodeURIComponent(error.message)}`, baseUrl)
    );
  }
}
