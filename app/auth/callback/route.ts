import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')

    // This dynamically gets 'https://themakeupstorewangkhei.com' 
    // without any extra characters or wildcards.
    const origin = requestUrl.origin

    if (code) {
        const supabase = await createClient()

        // Exchange the code for a session
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            // Success! Redirect to the clean homepage
            return NextResponse.redirect(`${origin}/`)
        }

        console.error("Auth Exchange Error:", error.message)
    }

    // Failure: Send back to login
    return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`)
}