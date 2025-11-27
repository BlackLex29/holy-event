import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Function to decode JWT token and get user role
async function getUserRoleFromSession(session: string): Promise<string | null> {
    try {
        // Decode the JWT token (assuming it's a standard JWT)
        const payload = JSON.parse(atob(session.split('.')[1]));
        return payload.role || payload.userType || null;
    } catch (error) {
        console.error('Error decoding session token:', error);
        return null;
    }
}

// Function to validate session and get user data
async function validateSession(session: string): Promise<{ isValid: boolean; role?: string }> {
    try {
        // Here you would typically validate the session with your backend
        // For now, we'll just decode the token
        const role = await getUserRoleFromSession(session);
        
        if (role) {
            return { isValid: true, role };
        }
        return { isValid: false };
    } catch (error) {
        return { isValid: false };
    }
}

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
        '/c/tour',
        '/unauthorized',
    ];
    
    // Routes that are accessible by both roles once authenticated
    const sharedAuthRoutes = [
        '/a/dashboard',
        '/c/dashboard',
        '/a/appointments',
        '/c/appointments',
        '/a/events',
    ];
    
    // Admin-only routes
    const adminOnlyRoutes = [
        '/a/users',
        '/a/settings',
        '/a/admin',
        '/a/reports',
    ];
    
    // Client-only routes
    const clientOnlyRoutes = [
        '/c/profile',
        '/c/settings',
        '/c/history',
    ];
    
    const isPublicRoute = publicRoutes.some(route => pathname === route);
    const isSharedAuthRoute = sharedAuthRoutes.some(route => pathname.startsWith(route));
    const isAdminOnlyRoute = adminOnlyRoutes.some(route => pathname.startsWith(route));
    const isClientOnlyRoute = clientOnlyRoutes.some(route => pathname.startsWith(route));
    
    // Check route prefixes
    const isAdminRoute = pathname.startsWith('/a/');
    const isClientRoute = pathname.startsWith('/c/');

    // If user is not logged in
    if (!session) {
        // Allow public routes
        if (isPublicRoute) {
            return NextResponse.next();
        }
        // Redirect to login for protected routes
        if (isAdminRoute || isClientRoute || isSharedAuthRoute || isAdminOnlyRoute || isClientOnlyRoute) {
            return NextResponse.redirect(new URL('/login', request.url));
        }
        return NextResponse.next();
    }

    // If user is logged in, validate session and get role
    const sessionValidation = await validateSession(session);
    
    if (!sessionValidation.isValid) {
        // Invalid session, clear cookie and redirect to login
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('__session');
        return response;
    }

    const userRole = sessionValidation.role;

    // Block access to login/register for logged-in users
    if ((pathname === '/login' || pathname === '/register') && userRole) {
        const redirectPath = userRole === 'admin' ? '/a/dashboard' : '/c/dashboard';
        return NextResponse.redirect(new URL(redirectPath, request.url));
    }

    // Role-based access control
    if (userRole === 'client') {
        // Client trying to access admin-only routes
        if (isAdminOnlyRoute || (isAdminRoute && !publicRoutes.includes(pathname) && !sharedAuthRoutes.some(route => pathname.startsWith(route)))) {
            return NextResponse.redirect(new URL('/unauthorized', request.url));
        }
        
        // Client trying to access client routes - ALLOW
        if (isClientRoute || isClientOnlyRoute || isSharedAuthRoute) {
            return NextResponse.next();
        }
    }

    if (userRole === 'admin') {
        // Admin trying to access client-only routes
        if (isClientOnlyRoute || (isClientRoute && !publicRoutes.includes(pathname) && !sharedAuthRoutes.some(route => pathname.startsWith(route)))) {
            return NextResponse.redirect(new URL('/unauthorized', request.url));
        }
        
        // Admin trying to access admin routes - ALLOW
        if (isAdminRoute || isAdminOnlyRoute || isSharedAuthRoute) {
            return NextResponse.next();
        }
    }

    // Block direct access to sensitive API routes and files
    const blockedRoutes = [
        '/api/secure/',
        '/admin/config/',
        '/.env',
        '/config/',
        '/database/',
        '/backup/',
        '/.git/',
    ];

    if (blockedRoutes.some(route => pathname.includes(route))) {
        return new NextResponse('Access Denied', { status: 403 });
    }

    // Additional security - block common exploit attempts
    const exploitPatterns = [
        /\.\.\//, // Path traversal
        /\/\/+/ // Multiple slashes
    ];

    if (exploitPatterns.some(pattern => pattern.test(pathname))) {
        return new NextResponse('Invalid request', { status: 400 });
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/login',
        '/register',
        '/a/:path*',
        '/c/:path*',
        '/api/:path*',
        '/unauthorized',
    ],
};