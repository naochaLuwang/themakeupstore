import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/'

    if (code) {
        const supabase = await createClient()

        // This exchanges the code for a session using the current request's origin
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            // Success! Redirect to the page the user was trying to reach
            return NextResponse.redirect(`${origin}${next}`)
        }

        console.error("Auth Error:", error.message)
    }

    // Return the user to the login page on the current origin if it fails
    return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`)
}