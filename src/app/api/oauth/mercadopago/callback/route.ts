import { NextRequest, NextResponse } from "next/server";
import { getSupabaseUrl, getSupabaseServiceKey, getActiveDatabase } from "@/lib/supabase/factory";

export const dynamic = "force-dynamic";

const MP_CLIENT_ID = process.env.MERCADOPAGO_CLIENT_ID;
const MP_CLIENT_SECRET = process.env.MERCADOPAGO_CLIENT_SECRET;
const MP_REDIRECT_URI = process.env.MERCADOPAGO_REDIRECT_URI;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

function getSupabaseCredentials() {
  const activeDb = getActiveDatabase();
  return {
    url: getSupabaseUrl(activeDb),
    serviceKey: getSupabaseServiceKey(activeDb),
  };
}

const PRODUCTION_URL = "https://www.systeminternational.app";

function getBaseUrl(request: NextRequest): string {
  console.log("[getBaseUrl] APP_URL:", APP_URL);
  console.log("[getBaseUrl] MP_REDIRECT_URI:", MP_REDIRECT_URI);
  
  if (APP_URL && !APP_URL.includes("localhost")) {
    console.log("[getBaseUrl] Using APP_URL:", APP_URL);
    return APP_URL;
  }
  
  if (MP_REDIRECT_URI) {
    try {
      const redirectUrl = new URL(MP_REDIRECT_URI);
      const baseFromRedirect = redirectUrl.origin;
      if (!baseFromRedirect.includes("localhost")) {
        console.log("[getBaseUrl] Using MP_REDIRECT_URI origin:", baseFromRedirect);
        return baseFromRedirect;
      }
    } catch (e) {
      console.error("[getBaseUrl] Error parsing MP_REDIRECT_URI:", e);
    }
  }
  
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") || "https";
  
  console.log("[getBaseUrl] Headers - host:", host, "protocol:", protocol);
  
  if (host && !host.includes("localhost")) {
    const headerUrl = `${protocol}://${host}`;
    console.log("[getBaseUrl] Using headers:", headerUrl);
    return headerUrl;
  }
  
  console.log("[getBaseUrl] Falling back to PRODUCTION_URL:", PRODUCTION_URL);
  return PRODUCTION_URL;
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
  const { url: SUPABASE_URL, serviceKey: SUPABASE_SERVICE_KEY } = getSupabaseCredentials();
  const restUrl = `${SUPABASE_URL}/rest/v1/terminal_connections`;
  
  console.log("[Save Connection] Using database:", getActiveDatabase());
  
  try {
    const checkResponse = await fetch(
      `${restUrl}?user_id=eq.${encodeURIComponent(data.user_id)}&provider=eq.${encodeURIComponent(data.provider)}&select=id`,
      {
        method: "GET",
        headers: {
          "apikey": SUPABASE_SERVICE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
        }
      }
    );

    if (!checkResponse.ok) {
      const checkError = await checkResponse.json().catch(() => ({}));
      console.error("[Supabase Check Error]", JSON.stringify(checkError));
      return { success: false, error: checkError.message || "Failed to check existing connection" };
    }

    const existingConnections = await checkResponse.json();
    const now = new Date().toISOString();
    
    if (existingConnections && existingConnections.length > 0) {
      // Update existing connection
      console.log("[Save Connection] Updating existing connection for user:", data.user_id);
      const updateUrl = `${restUrl}?user_id=eq.${encodeURIComponent(data.user_id)}&provider=eq.${encodeURIComponent(data.provider)}`;
      
      const updateResponse = await fetch(updateUrl, {
        method: "PATCH",
        headers: {
          "apikey": SUPABASE_SERVICE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation"
        },
        body: JSON.stringify({
          mp_user_id: data.mp_user_id,
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          public_key: data.public_key,
          token_expires_at: data.token_expires_at,
          live_mode: data.live_mode,
          status: data.status,
          updated_at: now
        })
      });

      if (!updateResponse.ok) {
        const updateError = await updateResponse.json().catch(() => ({}));
        console.error("[Supabase Update Error]", JSON.stringify(updateError));
        return { success: false, error: updateError.message || "Failed to update connection" };
      }
      
      console.log("[Save Connection] Update successful");
      return { success: true };
    } else {
      // Insert new connection
      console.log("[Save Connection] Inserting new connection for user:", data.user_id);
      
      const insertResponse = await fetch(restUrl, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_SERVICE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation"
        },
        body: JSON.stringify({
          ...data,
          created_at: now,
          updated_at: now
        })
      });

      if (!insertResponse.ok) {
        const insertError = await insertResponse.json().catch(() => ({}));
        console.error("[Supabase Insert Error]", JSON.stringify(insertError));
        return { success: false, error: insertError.message || "Failed to insert connection" };
      }
      
      console.log("[Save Connection] Insert successful");
      return { success: true };
    }
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

    const stateAgeMs = Date.now() - stateData.timestamp;
    const maxAgeMs = 30 * 60 * 1000;
    console.log("[OAuth Callback] State age:", Math.round(stateAgeMs / 1000), "seconds, max:", Math.round(maxAgeMs / 1000), "seconds");
    
    if (stateAgeMs > maxAgeMs) {
      console.error("[OAuth Callback] State expired - age:", stateAgeMs, "ms");
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
