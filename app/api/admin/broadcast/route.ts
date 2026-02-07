import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"
import webpush from "web-push"

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || "";
const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() || "";

webpush.setVapidDetails('mailto:admin@yourstore.com', publicKey, privateKey);

export async function POST(req: Request) {
    const supabase = await createClient()
    const { title, body, url } = await req.json()

    // 1. Fetch all subscriptions
    const { data: subs, error: subError } = await supabase
        .from('push_subscriptions')
        .select('id, user_id, subscription_json');

    if (subError || !subs) {
        return NextResponse.json({ success: false, error: "Database unreachable" }, { status: 500 });
    }

    // 2. Fetch profile names
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name');

    const nameMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

    const payload = JSON.stringify({
        title: title || "Broadcast",
        body: body || "New Message",
        url: url || "/"
    });

    const successfulNames = new Set<string>();
    let totalDevicesReached = 0;

    // 3. Execute Broadcast
    const results = await Promise.allSettled(
        subs.map(async (row) => {
            try {
                const subObj = typeof row.subscription_json === 'string'
                    ? JSON.parse(row.subscription_json)
                    : row.subscription_json;

                await webpush.sendNotification(subObj, payload);

                totalDevicesReached++;

                // FALLBACK: If profile name is missing, use user_id prefix
                const name = nameMap.get(row.user_id) || `User_${row.user_id?.slice(0, 5) || 'Guest'}`;
                successfulNames.add(name);
            } catch (err: any) {
                // Cleanup 410 (Gone) or 404 (Not Found)
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await supabase.from('push_subscriptions').delete().eq('id', row.id);
                }
            }
        })
    );

    return NextResponse.json({
        success: true,
        recipients: Array.from(successfulNames),
        totalDevices: totalDevicesReached,
        uniqueUsers: successfulNames.size,
        details: `SUCCESS: ${totalDevicesReached} DEVICES / ${successfulNames.size} USERS`
    });
}