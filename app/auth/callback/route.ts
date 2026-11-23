import { safeReturnPath, returnPathFromCookie, AUTH_RETURN_COOKIE } from '@/lib/storefront-navigation'
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')

    const local = ['localhost', '127.0.0.1', '[::1]'].includes(requestUrl.hostname)
    const cleanOrigin = local && process.env.NODE_ENV !== 'production' ? requestUrl.origin
        : new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://themakeupstorewangkhei.com').origin
    const target = safeReturnPath(requestUrl.searchParams.get('next') || returnPathFromCookie(request.headers.get('cookie')))

    if (code) {
        const supabase = await createClient()

        // Exchange code for session
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            const response = NextResponse.redirect(new URL(target, cleanOrigin))
            response.cookies.delete(AUTH_RETURN_COOKIE)
            return response
        }

        console.warn('Authentication callback could not be completed')
    }

    // Failure: Redirect to login on the REAL domain
    const response = NextResponse.redirect(`${cleanOrigin}/login?${new URLSearchParams({ error: "auth-callback-failed", next: target })}`)
    response.cookies.delete(AUTH_RETURN_COOKIE)
    return response
}
