"use client"
import { useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { usePathname } from "next/navigation"

export default function PresenceTracker({ user }: { user: any }) {
    const supabase = createClient()
    const pathname = usePathname()

    useEffect(() => {
        // DEBUG: Ensure this component is actually mounting
        console.log("Presence Tracker Mounted for:", user?.email || "Guest")

        const sessionKey = user?.id || `guest_${Math.random().toString(36).substring(2, 7)}`

        // Use 'online-traffic' exactly as in the Admin Page
        const channel = supabase.channel('online-traffic', {
            config: { presence: { key: sessionKey } }
        })

        channel
            .on('presence', { event: 'sync' }, () => {
                console.log("Presence Synced:", channel.presenceState())
            })
            .subscribe(async (status) => {
                console.log("Subscription Status:", status)
                if (status === 'SUBSCRIBED') {
                    const tracked = await channel.track({
                        id: sessionKey,
                        name: user?.user_metadata?.full_name || 'Anonymous Guest',
                        email: user?.email || null,
                        entry_time: new Date().toISOString(),
                        current_page: pathname,
                        device: window.innerWidth < 768 ? 'Mobile' : 'Desktop'
                    })
                    console.log("Tracking Result:", tracked)
                }
            })

        return () => {
            console.log("Unsubscribing from Presence")
            channel.unsubscribe()
        }
    }, [user, pathname]) // Re-track when pathname changes

    return null
}