import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/login(.*)',
  '/signup(.*)',
]);

// Check if the menu page has a restaurantId param (public sharing)
function isPublicMenuRoute(request: Request) {
  const url = new URL(request.url);
  return url.pathname === '/dashboard-user/menu' && url.searchParams.has('restaurantId');
}

// Check if the API route is for public menu access
function isPublicMenuApiRoute(request: Request) {
  const url = new URL(request.url);
  // Allow public access to menu products API and orders API when restaurantId is provided
  return (url.pathname === '/api/menu-products' && url.searchParams.has('restaurantId')) ||
         url.pathname === '/api/orders'; // Orders can be placed publicly (restaurantId is in request body)
}

const isAuthRoute = createRouteMatcher([
  '/login(.*)',
  '/signup(.*)',
]);

const isAdminRoute = createRouteMatcher([
  '/dashboard/admin(.*)',
]);

const isCustomerOnlyRoute = createRouteMatcher([
  '/dashboard-user(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth();

  // If user is on an auth page and already signed in, redirect based on role
  if (isAuthRoute(request)) {
    if (userId) {
      try {
        const response = await fetch(`${request.nextUrl.origin}/api/auth/user-role`, {
          headers: {
            'x-user-id': userId,
          },
        });

        if (response.ok) {
          const { role } = await response.json();

          if (role === 'CUSTOMER' || role === 'USER') {
            const dashboardUserUrl = new URL('/dashboard-user', request.url);
            return Response.redirect(dashboardUserUrl);
          } else {
            const dashboardUrl = new URL('/dashboard', request.url);
            return Response.redirect(dashboardUrl);
          }
        }
      } catch (error) {
        console.error('Error getting user role:', error);
      }

      // Default redirect to dashboard
      const dashboardUrl = new URL('/dashboard', request.url);
      return Response.redirect(dashboardUrl);
    }
  }

  // Protect all routes except public ones
  // Allow public access to menu page and menu API with restaurantId
  if (!isPublicRoute(request) && !isPublicMenuRoute(request) && !isPublicMenuApiRoute(request)) {
    await auth.protect();
  }

  // Redirect CUSTOMER users from dashboard to menu
  if (userId && request.nextUrl.pathname.startsWith('/dashboard')) {
    try {
      const response = await fetch(`${request.nextUrl.origin}/api/auth/user-role`, {
        headers: {
          'x-user-id': userId,
        },
      });

      if (response.ok) {
        const { role } = await response.json();

        // Redirect CUSTOMER and USER to dashboard-user IMMEDIATELY
        if (role === 'CUSTOMER' || role === 'USER') {
          const dashboardUserUrl = new URL('/dashboard-user', request.url);
          return Response.redirect(dashboardUserUrl);
        }
      }
    } catch (error) {
      console.error('Error checking user role:', error);
      // On error, still try to redirect CUSTOMER (safe default)
    }
  }

  // Check admin routes
  if (isAdminRoute(request)) {
    if (!userId) {
      const loginUrl = new URL('/login', request.url);
      return Response.redirect(loginUrl);
    }

    // Check if user is admin
    try {
      const response = await fetch(`${request.nextUrl.origin}/api/auth/check-admin`, {
        headers: {
          'x-user-id': userId,
        },
      });

      if (!response.ok || !(await response.json()).isAdmin) {
        // Redirect non-admin users to their appropriate dashboard
        const response = await fetch(`${request.nextUrl.origin}/api/auth/user-role`, {
          headers: {
            'x-user-id': userId,
          },
        });

        if (response.ok) {
          const { role } = await response.json();

          if (role === 'CUSTOMER' || role === 'USER') {
            const dashboardUserUrl = new URL('/dashboard-user', request.url);
            return Response.redirect(dashboardUserUrl);
          }
        }

        const dashboardUrl = new URL('/dashboard', request.url);
        return Response.redirect(dashboardUrl);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      const dashboardUrl = new URL('/dashboard', request.url);
      return Response.redirect(dashboardUrl);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
