import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
    const supabase = await createClient()
    const { subscription, userId } = await req.json()

    if (!subscription || !subscription.endpoint) {
        return NextResponse.json({ error: "Invalid subscription" }, { status: 400 })
    }

    // UPSERT: Updates the row if the 'endpoint' already exists
    const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
            user_id: userId,
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