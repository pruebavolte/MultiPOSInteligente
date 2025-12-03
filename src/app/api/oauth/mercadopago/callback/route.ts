import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const MP_CLIENT_ID = process.env.MERCADOPAGO_CLIENT_ID;
const MP_CLIENT_SECRET = process.env.MERCADOPAGO_CLIENT_SECRET;
const MP_REDIRECT_URI = process.env.MERCADOPAGO_REDIRECT_URI;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;
const DATABASE_URL = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

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

    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const query = `
      INSERT INTO terminal_connections (
        user_id, provider, mp_user_id, access_token, refresh_token, 
        public_key, token_expires_at, live_mode, status, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      ON CONFLICT (user_id, provider) 
      DO UPDATE SET
        mp_user_id = EXCLUDED.mp_user_id,
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        public_key = EXCLUDED.public_key,
        token_expires_at = EXCLUDED.token_expires_at,
        live_mode = EXCLUDED.live_mode,
        status = EXCLUDED.status,
        updated_at = NOW()
      RETURNING id
    `;

    const values = [
      stateData.userId,
      'mercadopago',
      tokens.user_id?.toString() || null,
      tokens.access_token,
      tokens.refresh_token,
      tokens.public_key || null,
      tokenExpiresAt,
      tokens.live_mode || false,
      'connected'
    ];

    const result = await pool.query(query, values);
    console.log("[OAuth Callback] Connection saved successfully!", result.rows[0]);

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
