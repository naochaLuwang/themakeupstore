import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"
import webpush from "web-push"

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || "";
const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() || "";

webpush.setVapidDetails('mailto:admin@yourstore.com', publicKey, privateKey);

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
            .select('*');

        if (subError || !subs) {
            return NextResponse.json({ success: false, error: "Database unreachable" }, { status: 500 });
        }

    const payload = JSON.stringify({
        title: title || "Broadcast",
        body: body || "New Message",
        url: url || "/"
    });

    let totalDevicesReached = 0;
    let fcmTokens: string[] = [];

    // Separate Web Push and FCM subscriptions
    for (const row of subs) {
        if (row.fcm_token) {
            fcmTokens.push(row.fcm_token);
        } else if (row.subscription_json) {
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
        }
    }

    // Send FCM notifications
    if (fcmTokens.length > 0) {
        try {
            const { sendFcmMulticast } = await import('@/lib/fcm-send')
            const result = await sendFcmMulticast(fcmTokens, title || "Broadcast", body || "New Message", url || "/")
            totalDevicesReached += result.sentCount

            // Clean up invalid FCM tokens
            if (result.invalidTokens.length > 0) {
                for (const token of result.invalidTokens) {
                    await supabase.from('push_subscriptions').delete().eq('fcm_token', token);
                }
            }
        } catch (err) {
            console.error('FCM broadcast error:', err)
        }
    }

    return NextResponse.json({
        success: true,
        totalDevices: totalDevicesReached,
        details: `SUCCESS: ${totalDevicesReached} DEVICES`
    });
    } catch (err) {
        console.error('Broadcast error:', err)
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
    }
}
