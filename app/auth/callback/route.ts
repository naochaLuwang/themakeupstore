import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

// Replace the start of your GET function with this
export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    
    // Check if we are in production
    const isProd = process.env.NODE_ENV === 'production'
    const SITE_URL = isProd 
        ? 'https://www.themakeupstorewangkhei.com' 
        : 'http://localhost:3000'

    if (code) {
        const supabase = await createClient()
        // The exchangeCodeForSession is where it usually fails if URLs don't match
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        
        if (!error) {
            return NextResponse.redirect(`${SITE_URL}/`) 
        }
        
        // Log the actual error to your Hostinger console so you can see it
        console.error("Auth Callback Error:", error.message)
    }
    
    return NextResponse.redirect(`${SITE_URL}/login?error=auth-callback-failed`)
}