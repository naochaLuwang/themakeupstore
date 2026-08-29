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

        const { title, body, url, targetUserIds } = await req.json()

        let query = supabase
            .from('push_subscriptions')
            .select('fcm_token, user_id')
            .not('fcm_token', 'is', null)

        if (Array.isArray(targetUserIds) && targetUserIds.length > 0) {
            const { data, error } = await supabase
                .from('push_subscriptions')
                .select('user_id, profiles!push_subscriptions_user_id_fkey(full_name)')
                .in('user_id', targetUserIds)

            if (error) {
                return NextResponse.json({ success: false, error: "Target lookup failed" }, { status: 500 })
            }

            if (!data?.length) {
                return NextResponse.json({ success: true, totalDevices: 0, details: "No FCM devices found for the selected user(s)" })
            }

            const { data: targetTokens, error: tokenErr } = await query.in('user_id', targetUserIds)
            if (tokenErr) {
                return NextResponse.json({ success: false, error: "Target token lookup failed" }, { status: 500 })
            }

            const fcmTokens = (targetTokens || []).map((s: any) => s.fcm_token).filter(Boolean)

            if (fcmTokens.length === 0) {
                return NextResponse.json({ success: true, totalDevices: 0, details: "No FCM devices found for the selected user(s)" })
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

            const targetNames = (data as any[])
                .filter((d: any) => d.profiles?.full_name)
                .map((d: any) => d.profiles!.full_name as string)

            return NextResponse.json({
                success: true,
                totalDevices: result.sentCount,
                failedDevices: result.invalidTokens.length,
                targeted: true,
                userCount: data.length,
                users: [...new Set(targetNames)],
                details: `TARGETED: SENT TO ${result.sentCount} DEVICE(S) FOR ${data.length} USER(S)`
            })
        }

        const { data: subs, error: subError } = await query

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
