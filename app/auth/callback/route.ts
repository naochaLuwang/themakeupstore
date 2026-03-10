import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url) // Removed 'origin' from here
    const code = searchParams.get('code')

    // Fallback logic for the URL
    // This checks if you have the env variable set, otherwise it defaults to your domain
    const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.themakeupstorewangkhei.com'

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            // FORCE the redirect to your live site instead of using 'origin'
            return NextResponse.redirect(`${SITE_URL}/`)
        }
    }

    return NextResponse.redirect(`${SITE_URL}/login?error=auth-callback-failed`)
}