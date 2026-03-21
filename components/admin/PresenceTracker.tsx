"use client"

import { useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { usePathname } from "next/navigation"

export default function PresenceTracker({ user }: { user: any }) {
    const supabase = createClient()
    const pathname = usePathname()

    useEffect(() => {
        // Create a unique key for the session
        const sessionKey = user?.id || `guest_${Math.random().toString(36).substring(2, 7)}`

        const channel = supabase.channel('online-traffic', {
            config: { presence: { key: sessionKey } }
        })

        channel
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        id: sessionKey,
                        name: user?.user_metadata?.full_name || 'Anonymous Guest',
                        email: user?.email || null,
                        entry_time: new Date().toISOString(),
                        current_page: pathname,
                        device: window.innerWidth < 768 ? 'Mobile' : 'Desktop'
                    })
                }
            })

        return () => { channel.unsubscribe() }
    }, [user, pathname, supabase])

    return null
}