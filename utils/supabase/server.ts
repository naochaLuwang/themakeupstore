import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
    const cookieStore = await cookies()

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            // --- ADDED: CUSTOM NETWORK CONFIG ---
            global: {
                fetch: (url, options) => {
                    return fetch(url, {
                        ...options,
                        // Increase timeout from default 10s to 30s
                        signal: AbortSignal.timeout(30000),
                        // Prevents Node.js from hanging on broken IPv6 routes
                        next: { revalidate: 0 }
                    });
                },
            },
            // --- END CUSTOM CONFIG ---

            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // The `setAll` method was called from a Server Component.
                    }
                },
            },
        }
    )
}