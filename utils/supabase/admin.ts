import { createServerClient } from '@supabase/ssr'

export async function createAdminClient() {
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            global: {
                fetch: (url, options) => {
                    return fetch(url, {
                        ...options,
                        signal: AbortSignal.timeout(30000),
                        next: { revalidate: 0 }
                    })
                },
            },
            cookies: {
                getAll: () => [],
                setAll: () => {},
            },
        }
    )
}
