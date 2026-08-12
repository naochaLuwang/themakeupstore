import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single()

        if (!profile?.is_admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
        }

        const { title, body, url } = await req.json()

        const { data: subs, error: subError } = await supabase
            .from('push_subscriptions')
            .select('fcm_token')
            .not('fcm_token', 'is', null)

        if (subError || !subs) {
            return NextResponse.json({ success: false, error: "Database unreachable" }, { status: 500 })
        }

        const fcmTokens = subs.map((s: any) => s.fcm_token).filter(Boolean)

        if (fcmTokens.length === 0) {
            return NextResponse.json({ success: true, totalDevices: 0, details: "No FCM devices found" })
        }

        const { sendFcmMulticast } = await import('@/lib/fcm-send')
        const result = await sendFcmMulticast(
            fcmTokens,
            title || "Broadcast",
            body || "New Message",
            url || "/"
        )

        if (result.invalidTokens.length > 0) {
            for (const token of result.invalidTokens) {
                await supabase.from('push_subscriptions').delete().eq('fcm_token', token)
            }
        }

        return NextResponse.json({
            success: true,
            totalDevices: result.sentCount,
            failedDevices: result.invalidTokens.length,
            details: `SUCCESS: ${result.sentCount} DEVICES REACHED`
        })
    } catch (err: any) {
        console.error('Broadcast error:', err)
        return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 })
    }
}
