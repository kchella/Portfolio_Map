import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // IMPORTANT: Avoid throwing on getUser() during middleware execution
    const { data: { user } } = await supabase.auth.getUser()

    // Server-side guard: /map and /admin need a session. Role checks happen
    // client-side, and the database (RLS) is what actually protects the data.
    const path = request.nextUrl.pathname
    if (!user && (path.startsWith('/admin') || path.startsWith('/map'))) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('next', request.nextUrl.pathname)
      return NextResponse.redirect(loginUrl)
    }
  } catch (e) {
    // If middleware fails, we prefer to fall through to the page and let 
    // client-side auth handlers take over, rather than showing a 500 error.
    console.error('Middleware auth error:', e)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/map', '/map/:path*'],
}
