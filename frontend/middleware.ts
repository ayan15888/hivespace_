import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // Define routes that require authentication
  const isProtectedRoute = pathname.startsWith('/dashboard') || 
                           pathname.startsWith('/settings') ||
                           pathname.startsWith('/account');
  
  // Define routes that should not be accessed if already authenticated
  const isAuthRoute = pathname === '/signin' || pathname === '/signup';

  if (isProtectedRoute && !token) {
    // Redirect unauthenticated users to the signin page
    const signinUrl = new URL('/signin', request.url);
    return NextResponse.redirect(signinUrl);
  }

  if (isAuthRoute && token) {
    // Redirect authenticated users away from auth pages
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
