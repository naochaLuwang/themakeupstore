import { safeReturnPath } from '@/lib/storefront-navigation'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    // This read-only guest endpoint validates its own session. Avoid a duplicate auth round trip.
    if (request.nextUrl.pathname === '/api/products/search' || request.nextUrl.pathname === '/api/cart/quote' || /^\/api\/offers\/[^/]+\/products$/.test(request.nextUrl.pathname)) return NextResponse.next({ request })
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return request.cookies.getAll() },
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

    const path = request.nextUrl.pathname;
    const isPublicRoute =
        path === '/' ||
        path.startsWith('/login') ||
        path.startsWith('/signup') ||
        path.startsWith('/auth') ||
        path.startsWith('/product') ||
        path.startsWith('/offers') ||
        path.startsWith('/shop') ||
        path.startsWith('/categories') ||
        path.startsWith('/category') ||
        path.startsWith('/fun-size') ||
        path.startsWith('/exclusive') ||
        path.startsWith('/essentials') ||
        path.startsWith('/skincare-accessories') ||
        path.startsWith('/brands') ||
        path === '/new-arrivals' ||
        path === '/contact' ||
        path === '/cart' ||
        path.startsWith('/legal/') ||
        path.startsWith('/concern/') ||
        path.startsWith('/search') ||
        path.startsWith('/careers') ||
        path.startsWith('/labels') ||
        path.startsWith('/api/labels-verify') ||
        path === '/api/cart/quote' ||
        path === '/api/webhooks/razorpay' ||
        path.startsWith('/wholesale/register');

    const loginUrl = () => {
        const url = new URL('/login', request.url)
        url.searchParams.set('next', safeReturnPath(request.nextUrl.pathname + request.nextUrl.search))
        return url
    }

    let user = null
    try {
        const { data } = await supabase.auth.getUser()
        user = data.user
    } catch {
        // A stale session must not block public browsing or erase unrelated cookies.
        const response = isPublicRoute ? supabaseResponse : NextResponse.redirect(loginUrl())
        request.cookies.getAll().forEach(({ name }) => {
            if (name.startsWith('sb-')) response.cookies.set(name, '', { maxAge: 0 })
        })
        return response
    }

    // --- ADMIN & WHOLESALE PROTECTION ---
    if (path.startsWith('/admin') || path.startsWith('/wholesale/portal')) {
        if (!user) {
            return NextResponse.redirect(loginUrl())
        }

        // Fetch profile data once for all role-based checks
        const { data: profile } = await supabase
            .from('profiles')
            .select('user_type, is_admin')
            .eq('id', user.id)
            .single()

        // 1. Check Admin Access (Check both columns to be safe)
        if (path.startsWith('/admin')) {
            if (profile?.user_type !== 'admin' && !profile?.is_admin) {
                return NextResponse.redirect(new URL('/', request.url))
            }
        }

        // 2. Check Wholesale Access
        if (path.startsWith('/wholesale/portal')) {
            if (profile?.user_type !== 'wholesale' && !profile?.is_admin) {
                return NextResponse.redirect(new URL('/wholesale/register', request.url))
            }
        }
    }



    if (!user && !isPublicRoute) {
        return NextResponse.redirect(loginUrl())
    }

    return supabaseResponse
}
