import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function proxy(request: NextRequest) {
    return await updateSession(request)
}

export const config = {

    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - manifest.json (PWA manifest)
         * - .well-known (Digital Asset Links for Android TWA)
         * - Any file with an extension (e.g., .png, .jpg, .svg)
         */
        '/((?!_next/static|_next/image|favicon.ico|manifest\\.json|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}

