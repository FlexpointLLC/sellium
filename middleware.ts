import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Routes that don't require authentication (for admin subdomain)
const publicRoutes = ['/', '/login', '/verify', '/auth/callback', '/onboarding']

// Dashboard/admin routes that require authentication
const dashboardRoutes = ['/dashboard', '/login', '/verify', '/onboarding', '/auth']

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const pathname = request.nextUrl.pathname
  
  // Check if we're on the admin subdomain (admin.sellium.store)
  // For localhost, we determine admin vs storefront by the route path
  const isAdminSubdomain = hostname.startsWith('admin.')
  
  // For localhost development, check if it's a dashboard/admin route
  const isLocalhost = hostname.startsWith('localhost') || hostname.startsWith('127.0.0.1')
  const isDashboardRoute = dashboardRoutes.some(route => pathname.startsWith(route)) || pathname === '/'
  
  // Handle admin/dashboard routes (admin subdomain OR localhost dashboard routes)
  if (isAdminSubdomain || (isLocalhost && isDashboardRoute)) {
    const { response, user } = await updateSession(request)
    
    // Check if the route is public
    const isPublicRoute = publicRoutes.some(route => 
      pathname === route || pathname.startsWith('/auth/')
    )

    // If user is not authenticated and trying to access protected route
    if (!user && !isPublicRoute && pathname.startsWith('/dashboard')) {
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // If user is authenticated and trying to access login/verify pages
    if (user && (pathname === '/login' || pathname === '/verify')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return response
  }
  
  // For storefront routes (main domain or localhost with /[username] routes)
  // Just pass through - no auth required for storefront
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
