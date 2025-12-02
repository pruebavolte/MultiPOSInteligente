import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const MP_CLIENT_ID = process.env.MERCADOPAGO_CLIENT_ID;
const MP_CLIENT_SECRET = process.env.MERCADOPAGO_CLIENT_SECRET;
const MP_REDIRECT_URI = process.env.MERCADOPAGO_REDIRECT_URI;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      console.error("[OAuth Callback Error]", error);
      return NextResponse.redirect(
        new URL(`/dashboard/settings/terminals?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/dashboard/settings/terminals?error=missing_params", request.url)
      );
    }

    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, "base64").toString());
    } catch {
      return NextResponse.redirect(
        new URL("/dashboard/settings/terminals?error=invalid_state", request.url)
      );
    }

    if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
      return NextResponse.redirect(
        new URL("/dashboard/settings/terminals?error=expired", request.url)
      );
    }

    if (!MP_CLIENT_ID || !MP_CLIENT_SECRET) {
      return NextResponse.redirect(
        new URL("/dashboard/settings/terminals?error=not_configured", request.url)
      );
    }

    const redirectUri = MP_REDIRECT_URI || `${request.nextUrl.origin}/api/oauth/mercadopago/callback`;

    const tokenResponse = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: MP_CLIENT_ID,
        client_secret: MP_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("[Token Exchange Error]", errorText);
      return NextResponse.redirect(
        new URL("/dashboard/settings/terminals?error=token_exchange_failed", request.url)
      );
    }

    const tokens = await tokenResponse.json();

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
      console.error("[DB Save Error]", dbError);
      return NextResponse.redirect(
        new URL("/dashboard/settings/terminals?error=save_failed", request.url)
      );
    }

    return NextResponse.redirect(
      new URL("/dashboard/settings/terminals?connected=mercadopago", request.url)
    );
  } catch (error: any) {
    console.error("[OAuth Callback Error]", error);
    return NextResponse.redirect(
      new URL(`/dashboard/settings/terminals?error=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}
