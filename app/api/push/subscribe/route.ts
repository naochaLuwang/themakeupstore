import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { subscription } = await req.json()

    if (!subscription || !subscription.endpoint) {
        return NextResponse.json({ error: "Invalid subscription" }, { status: 400 })
    }

    const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
            user_id: user.id,
            endpoint: subscription.endpoint,
            subscription_json: subscription,
            last_notified_at: new Date().toISOString()
        }, {
            onConflict: 'endpoint'
        })

    if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}