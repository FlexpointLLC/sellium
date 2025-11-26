import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createClient } from '@supabase/supabase-js'

// Routes that don't require authentication (for admin subdomain)
const publicRoutes = ['/', '/login', '/verify', '/auth/callback', '/onboarding']

// Dashboard/admin routes that require authentication
const dashboardRoutes = ['/dashboard', '/login', '/verify', '/onboarding', '/auth']

// Known Sellium domains (not custom domains)
const selliumDomains = [
  'sellium.store',
  'my.sellium.store',
  'admin.sellium.store',
  'localhost',
  '127.0.0.1',
  'vercel.app'
]

// Check if hostname is a custom domain
function isCustomDomain(hostname: string): boolean {
  // Remove port if present
  const host = hostname.split(':')[0]
  
  // Check if it's NOT a known Sellium domain
  return !selliumDomains.some(domain => 
    host === domain || host.endsWith(`.${domain}`)
  )
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const pathname = request.nextUrl.pathname
  
  // Check if this is a custom domain request
  if (isCustomDomain(hostname)) {
    // Skip API routes and static files
    if (pathname.startsWith('/api/') || pathname.startsWith('/_next/')) {
      return NextResponse.next()
    }
    
    // Skip auth routes on custom domains - they shouldn't exist there
    if (pathname === '/login' || pathname === '/verify' || pathname.startsWith('/auth/') || pathname.startsWith('/dashboard') || pathname === '/onboarding') {
      // Redirect auth routes to the main admin domain
      return NextResponse.redirect(new URL(pathname, 'https://admin.sellium.store'))
    }
    
    try {
      // Create Supabase client for edge
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      // Look up the store by custom domain (check ANY status, not just verified)
      const domain = hostname.split(':')[0].toLowerCase()
      const { data: domainData } = await supabase
        .from('custom_domains')
        .select('store_id, status')
        .eq('domain', domain)
        .single()
      
      console.log('Custom domain lookup:', domain, domainData)
      
      if (domainData) {
        // Get the store username
        const { data: store } = await supabase
          .from('stores')
          .select('username')
          .eq('id', domainData.store_id)
          .single()
        
        if (store?.username) {
          // Rewrite the URL to the store's path
          // e.g., blenko.store/products -> /flexa/products
          const url = request.nextUrl.clone()
          
          if (pathname === '/') {
            url.pathname = `/${store.username}`
          } else {
            url.pathname = `/${store.username}${pathname}`
          }
          
          console.log('Rewriting custom domain:', domain, 'to', url.pathname)
          return NextResponse.rewrite(url)
        }
      }
      
      // Domain not found in database - just serve the root storefront or 404
      console.log('Custom domain not found in database:', domain)
      return NextResponse.next()
    } catch (error) {
      console.error('Custom domain lookup error:', error)
      return NextResponse.next()
    }
  }
  
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
