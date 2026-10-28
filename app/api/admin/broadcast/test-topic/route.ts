import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single()

        if (!profile?.is_admin) {
            return NextResponse.json({ error: "Admin only" }, { status: 403 })
        }

        const { title, body, url } = await req.json()
        if (!title || !body) {
            return NextResponse.json({ error: "title and body required" }, { status: 400 })
        }

        // FCM topics are public subscriptions; old clients joined every user
        // to "admin". Resolve admin-owned devices through the database instead.
        const { data: admins, error: adminError } = await supabase
            .from('profiles').select('id').eq('is_admin', true)
        if (adminError) throw adminError
        const { data: devices, error } = admins?.length
            ? await supabase.from('push_subscriptions').select('fcm_token')
                .in('user_id', admins.map(admin => admin.id)).not('fcm_token', 'is', null)
            : { data: [], error: null }
        if (error) throw error
        const { sendFcmMulticast } = await import('@/lib/fcm-send')
        const result = await sendFcmMulticast((devices || []).map(device => device.fcm_token), title, body, url || '/')

        return NextResponse.json({
            success: true,
            sent: result.sentCount,
            message: `Firebase accepted the message for ${result.sentCount} admin device(s)`
        })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
