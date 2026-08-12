import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const { title, body, url } = await req.json()
        if (!title || !body) {
            return NextResponse.json({ error: "title and body required" }, { status: 400 })
        }

        const { data: subs } = await supabase
            .from('push_subscriptions')
            .select('fcm_token')
            .not('fcm_token', 'is', null)

        const fcmTokens = (subs || []).map(s => s.fcm_token).filter(Boolean)

        if (fcmTokens.length === 0) {
            return NextResponse.json({ error: "No FCM tokens found. Install the app and log in.", sent: 0 }, { status: 200 })
        }

        const { sendFcmMulticast } = await import('@/lib/fcm-send')
        const result = await sendFcmMulticast(fcmTokens, title, body, url || "/")

        for (const token of result.invalidTokens) {
            await supabase.from('push_subscriptions').delete().eq('fcm_token', token)
        }

        return NextResponse.json({ success: true, sent: result.sentCount })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
