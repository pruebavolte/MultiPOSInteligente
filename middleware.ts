import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Make all routes public in development mode if Clerk key is invalid
const isPublicRoute = createRouteMatcher([
  '/',
  '/login(.*)',
  '/signup(.*)',
  '/dashboard(.*)',
  '/dashboard-user(.*)',
  '/api(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  // In development with invalid keys, allow all access
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
