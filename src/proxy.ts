import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse, NextRequest } from 'next/server';

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
  return (url.pathname === '/api/menu-products' && url.searchParams.has('restaurantId')) ||
         url.pathname === '/api/orders';
}

// Check if request is for a PWA asset (should be public)
function isPWAAsset(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  return pathname === '/manifest.json' ||
         pathname === '/sw.js' ||
         pathname.startsWith('/icons/') ||
         pathname.startsWith('/images/');
}

const isAuthRoute = createRouteMatcher([
  '/login(.*)',
  '/signup(.*)',
]);

const isAdminRoute = createRouteMatcher([
  '/dashboard/admin(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  // Allow PWA assets without authentication
  if (isPWAAsset(request)) {
    return NextResponse.next();
  }

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

      const dashboardUrl = new URL('/dashboard', request.url);
      return Response.redirect(dashboardUrl);
    }
  }

  // Protect all routes except public ones
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

        if (role === 'CUSTOMER' || role === 'USER') {
          const dashboardUserUrl = new URL('/dashboard-user', request.url);
          return Response.redirect(dashboardUserUrl);
        }
      }
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  }

  // Check admin routes
  if (isAdminRoute(request)) {
    if (!userId) {
      const loginUrl = new URL('/login', request.url);
      return Response.redirect(loginUrl);
    }

    try {
      const response = await fetch(`${request.nextUrl.origin}/api/auth/check-admin`, {
        headers: {
          'x-user-id': userId,
        },
      });

      if (!response.ok || !(await response.json()).isAdmin) {
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
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/.*|images/.*).*)',
  ],
};
