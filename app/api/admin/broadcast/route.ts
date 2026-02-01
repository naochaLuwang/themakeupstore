import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@/utils/supabase/server';

webpush.setVapidDetails(
    'mailto:admin@themakeupstore.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: Request) {
    try {
        const { title, body, url } = await request.json();
        const supabase = await createClient();

        // 1. Fetch ALL subscriptions from the database
        const { data: subscribers, error } = await supabase
            .from('push_subscriptions')
            .select('*');

        if (error) throw error;
        if (!subscribers || subscribers.length === 0) {
            return NextResponse.json({ success: true, message: "No subscribers found" });
        }

        // 2. Send notifications in parallel
        const results = await Promise.allSettled(
            subscribers.map((item) =>
                webpush.sendNotification(
                    item.subscription,
                    JSON.stringify({
                        title: title,
                        body: body,
                        data: { url: url || '/shop' },
                        icon: '/icon-512x512.png', // Ensure this exists in your public folder
                    })
                ).catch(async (err) => {
                    // 3. Clean up: If the subscription is expired (410), delete it
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        await supabase.from('push_subscriptions').delete().eq('id', item.id);
                    }
                    throw err; // Re-throw for Promise.allSettled to track
                })
            )
        );

        const successful = results.filter(r => r.status === 'fulfilled').length;

        return NextResponse.json({
            success: true,
            details: `Broadcast sent to ${successful} of ${subscribers.length} devices.`
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}