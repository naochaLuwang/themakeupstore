import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"
import webpush from "web-push"

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || "";
const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() || "";

webpush.setVapidDetails('mailto:admin@yourstore.com', publicKey, privateKey);

export async function POST(req: Request) {
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
        .select('id, user_id, subscription_json');

    if (subError || !subs) {
        return NextResponse.json({ success: false, error: "Database unreachable" }, { status: 500 });
    }

    const payload = JSON.stringify({
        title: title || "Broadcast",
        body: body || "New Message",
        url: url || "/"
    });

    let totalDevicesReached = 0;

    const results = await Promise.allSettled(
        subs.map(async (row) => {
            try {
                const subObj = typeof row.subscription_json === 'string'
                    ? JSON.parse(row.subscription_json)
                    : row.subscription_json;

                await webpush.sendNotification(subObj, payload);

                totalDevicesReached++;
            } catch (err: any) {
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await supabase.from('push_subscriptions').delete().eq('id', row.id);
                }
            }
        })
    );

    return NextResponse.json({
        success: true,
        totalDevices: totalDevicesReached,
        details: `SUCCESS: ${totalDevicesReached} DEVICES`
    });
}