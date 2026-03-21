"use client"

import { useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { usePathname } from "next/navigation"

export default function PresenceTracker({ user }: { user: any }) {
    const supabase = createClient()
    const pathname = usePathname()

    useEffect(() => {
        // 1. VISITOR ID: Stays the same forever on this browser
        let visitorId = localStorage.getItem('site_visitor_id')
        if (!visitorId) {
            visitorId = `v_${Math.random().toString(36).substring(2, 15)}`
            localStorage.setItem('site_visitor_id', visitorId)
        }

        // 2. SESSION ID: Stays the same until the tab is closed
        let sessionId = sessionStorage.getItem('site_session_id')
        if (!sessionId) {
            sessionId = `s_${Math.random().toString(36).substring(2, 15)}`
            sessionStorage.setItem('site_session_id', sessionId)
        }

        const logHit = async () => {
            await supabase.from('visitor_history').insert({
                visitor_id: visitorId,
                session_id: sessionId,
                user_id: user?.id || null,
                user_name: user?.user_metadata?.full_name || 'Guest',
                path: pathname,
                device: window.innerWidth < 768 ? 'Mobile' : 'Desktop',
                referrer: document.referrer || 'Direct'
            })
        }

        logHit()
    }, [user, pathname, supabase])

    return null
}