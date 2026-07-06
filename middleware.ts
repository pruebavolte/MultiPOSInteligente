import { NextResponse } from "next/server";

// PREVIEW: Clerk 100% FUERA. Este es el middleware que Next usa (raíz). Sin `clerkMiddleware`
// (su wrapper hacía el "dev-browser handshake" que rompía /dashboard en el dominio de Railway).
// El auth lo resuelve auth-wrapper / lib-auth con el usuario de nuestra BD (o ficticio). Control propio.
export default function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
