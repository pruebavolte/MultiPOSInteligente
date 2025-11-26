import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Skip middleware for API routes and static assets
  const { pathname } = request.nextUrl
  
  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || 
      pathname.includes('.') || pathname.startsWith('/static')) {
    return NextResponse.next()
  }

  // Allow all routes - bypass Clerk authentication for now
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
