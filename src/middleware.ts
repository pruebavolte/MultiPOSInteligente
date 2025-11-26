import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Make all routes public in development mode if Clerk key is invalid
const isPublicRoute = createRouteMatcher([
  '/login(.*)',
  '/signup(.*)',
  '/api(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth()
  const url = new URL(request.url)
  
  // If authenticated user tries to access login/signup, redirect to dashboard
  if (userId && (url.pathname === '/login' || url.pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  
  // If authenticated user is on home page, redirect to dashboard
  if (userId && url.pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  
  // Protect non-public routes
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
