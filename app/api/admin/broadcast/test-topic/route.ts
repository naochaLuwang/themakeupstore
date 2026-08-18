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

        const { sendFcmToTopic } = await import('@/lib/fcm-send')
        await sendFcmToTopic('admin', title, body, url || '/')

        return NextResponse.json({
            success: true,
            message: 'Sent to admin topic — all subscribed admin devices will receive this'
        })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
