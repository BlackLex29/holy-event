import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Get the session token from cookies
    const session = request.cookies.get('__session')?.value;

    // Public routes that don't require auth
    const publicRoutes = ['/login', '/register'];
    const isPublicRoute = publicRoutes.includes(pathname);

    // Admin routes
    const isAdminRoute = pathname.startsWith('/a/');

    // Client routes
    const isClientRoute = pathname.startsWith('/c/');

    // If user is not logged in and trying to access protected routes
    if (!session && (isAdminRoute || isClientRoute)) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // If user is logged in and trying to access public routes, redirect to dashboard
    // (You'll need to store role in session/cookie to determine which dashboard)
    if (session && isPublicRoute) {
        // Default redirect - you can make this smarter by storing role in cookie
        return NextResponse.redirect(new URL('/a/dashboard', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/login',
        '/register',
        '/a/:path*',
        '/c/:path*',
    ],
};