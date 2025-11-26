import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    
    // Get the session token from cookies
    const session = request.cookies.get('__session')?.value;
    
    // Public routes that don't require auth
    const publicRoutes = [
        '/login', 
        '/register',
        '/a/about',
        '/c/about',
        '/a/tour',
        '/a/dashboard',
        '/c/dashbpard',
        '/a/appointments',
        '/a/events',
        '/c/appointments/',
        '/a/users',
        '/c/tour',
    ];
    
    const isPublicRoute = publicRoutes.some(route => pathname === route);
    
    // Admin routes (excluding public ones)
    const isAdminRoute = pathname.startsWith('/a/') && !publicRoutes.includes(pathname);
    
    // Client routes (excluding public ones)
    const isClientRoute = pathname.startsWith('/c/') && !publicRoutes.includes(pathname);
    
    // If user is not logged in and trying to access protected routes
    if (!session && (isAdminRoute || isClientRoute)) {
        return NextResponse.redirect(new URL('/login', request.url));
    }
    
    // If user is logged in and trying to access login/register, redirect to dashboard
    if (session && (pathname === '/login' || pathname === '/register')) {
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