// import { createClient } from '@/utils/supabase/server'
// import { NextResponse } from 'next/server'

// export async function GET(request: Request) {
//     const requestUrl = new URL(request.url)
//     const code = requestUrl.searchParams.get('code')

//     // This dynamically gets 'https://themakeupstorewangkhei.com' 
//     // without any extra characters or wildcards.
//     const origin = requestUrl.origin

//     if (code) {
//         const supabase = await createClient()

//         // Exchange the code for a session
//         const { error } = await supabase.auth.exchangeCodeForSession(code)

//         if (!error) {
//             // Success! Redirect to the clean homepage
//             return NextResponse.redirect(`${origin}/`)
//         }

//         console.error("Auth Exchange Error:", error.message)
//     }

//     // Failure: Send back to login
//     return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`)
// }

import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')

    // 1. DYNAMICALLY DETECT THE REAL DOMAIN
    // Hostinger's proxy tells us the real domain in these headers
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
    const protocol = request.headers.get('x-forwarded-proto') || 'https'

    // Fallback to your hardcoded domain if the headers are missing for any reason
    const cleanOrigin = host ? `${protocol}://${host}` : 'https://themakeupstorewangkhei.com'

    if (code) {
        const supabase = await createClient()

        // Exchange code for session
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            // Success: Redirect to the REAL domain homepage
            return NextResponse.redirect(`${cleanOrigin}/`)
        }

        console.error("Auth Exchange Error:", error.message)
    }

    // Failure: Redirect to login on the REAL domain
    return NextResponse.redirect(`${cleanOrigin}/login?error=auth-callback-failed`)
}