import { NextResponse } from 'next/server';

// PREVIEW: Clerk 100% FUERA. Sin `clerkMiddleware` (su wrapper hacía el "dev-browser handshake"
// que en el dominio de Railway no está autorizado y reescribía /dashboard a un 404 de Clerk).
// El "auth" lo resuelve auth-wrapper / lib-auth con el usuario de nuestra BD (o ficticio).
// Pass-through: deja pasar todo. Control 100% nuestro.
export default function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|offline.html|widgets/.*|icons/.*|images/.*).*)',
  ],
};
