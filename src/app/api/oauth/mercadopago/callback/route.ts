import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const MP_CLIENT_ID = process.env.MERCADOPAGO_CLIENT_ID;
const MP_CLIENT_SECRET = process.env.MERCADOPAGO_CLIENT_SECRET;
const MP_REDIRECT_URI = process.env.MERCADOPAGO_REDIRECT_URI;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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
    console.log("[OAuth Callback] Redirect URI:", redirectUri);

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

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { error: dbError } = await supabase
      .from("terminal_connections")
      .upsert({
        user_id: stateData.userId,
        provider: "mercadopago",
        mp_user_id: tokens.user_id?.toString(),
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        public_key: tokens.public_key,
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        live_mode: tokens.live_mode,
        status: "connected",
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,provider"
      });

    if (dbError) {
      console.error("[DB Save Error]", JSON.stringify(dbError));
      return NextResponse.redirect(
        new URL(`/dashboard/settings/terminals?error=save_failed&details=${encodeURIComponent(dbError.message || '')}`, baseUrl)
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
