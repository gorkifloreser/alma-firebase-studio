import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          supabaseResponse.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          supabaseResponse.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const publicRoutes = [
    '/', // Add the root path to public routes
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/auth/callback',
  ];

  const isPublicRoute = publicRoutes.some(route => pathname === route); // Use exact match for root
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup');
  
  if (user && isPublicRoute && pathname === '/') {
    // If the user is logged in and tries to access the public landing page,
    // redirect them to their dashboard/user-guide.
    const url = request.nextUrl.clone()
    url.pathname = '/user-guide'
    return NextResponse.redirect(url)
  }

  if (!user && !isPublicRoute && !pathname.startsWith('/lp/')) { // Also protect non /lp routes
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/user-guide' // Redirect to user guide if logged in
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
