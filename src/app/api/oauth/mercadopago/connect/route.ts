import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-wrapper";

export const dynamic = "force-dynamic";

const MP_CLIENT_ID = process.env.MERCADOPAGO_CLIENT_ID;
const MP_REDIRECT_URI = process.env.MERCADOPAGO_REDIRECT_URI || 
  (process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/mercadopago/callback` : null);

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (!MP_CLIENT_ID) {
      return NextResponse.json(
        { 
          error: "Mercado Pago no está configurado",
          message: "Contacta al administrador para configurar la integración",
          demo_mode: true 
        }, 
        { status: 503 }
      );
    }

    const state = Buffer.from(JSON.stringify({
      userId: user.id,
      timestamp: Date.now(),
      nonce: Math.random().toString(36).substring(7)
    })).toString("base64");

    const redirectUri = MP_REDIRECT_URI || `${request.nextUrl.origin}/api/oauth/mercadopago/callback`;

    const authUrl = new URL("https://auth.mercadopago.com/authorization");
    authUrl.searchParams.set("client_id", MP_CLIENT_ID);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("platform_id", "mp");
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", state);

    return NextResponse.json({
      authUrl: authUrl.toString(),
      state
    });
  } catch (error: any) {
    console.error("[OAuth Connect Error]", error);
    return NextResponse.json(
      { error: error.message || "Error al iniciar OAuth" },
      { status: 500 }
    );
  }
}
