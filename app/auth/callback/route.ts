// import { createClient } from '@/utils/supabase/server'
// import { NextResponse } from 'next/server'

// // Replace the start of your GET function with this
// export async function GET(request: Request) {
//     const requestUrl = new URL(request.url)
//     const code = requestUrl.searchParams.get('code')

//     // Check if we are in production
//     const isProd = process.env.NODE_ENV === 'production'
//     const SITE_URL = isProd
//         ? 'https://themakeupstorewangkhei.com'
//         : 'http://localhost:3000'

//     if (code) {
//         const supabase = await createClient()
//         // The exchangeCodeForSession is where it usually fails if URLs don't match
//         const { error } = await supabase.auth.exchangeCodeForSession(code)

//         if (!error) {
//             return NextResponse.redirect(`${SITE_URL}/`)
//         }

//         // Log the actual error to your Hostinger console so you can see it
//         console.error("Auth Callback Error:", error.message)
//     }

//     return NextResponse.redirect(`${SITE_URL}/login?error=auth-callback-failed`)
// }


import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')

    // Use the naked domain since that is your code's preference
    const SITE_URL = 'https://themakeupstorewangkhei.com'

    if (code) {
        const supabase = await createClient()

        // We tell Supabase EXACTLY which callback URL was registered
        // This fixes the mismatch caused by Hostinger's CDN proxy
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            // Success! Send them to the homepage
            return NextResponse.redirect(`${SITE_URL}/`)
        }

        console.error("Auth Callback Error:", error.message)
    }

    // If we reach here, something failed
    return NextResponse.redirect(`${SITE_URL}/login?error=auth-callback-failed`)
}