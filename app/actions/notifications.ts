import webpush from 'web-push';
import { createClient } from '@/utils/supabase/server';

// Generate these once and put them in your .env
webpush.setVapidDetails(
    'mailto:admin@themakeupstore.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: Request) {
    const { title, message } = await req.json();
    const supabase = await createClient();

    // 1. Get all subscribers
    const { data: subs } = await supabase.from('push_subscriptions').select('*');

    // 2. Send to everyone
    const notifications = subs?.map((s) =>
        webpush.sendNotification(s.subscription, JSON.stringify({
            title,
            body: message,
            icon: '/logo.png', // Path to your store logo
        })).catch(err => {
            if (err.statusCode === 410) {
                // Remove expired/invalid subscriptions
                return supabase.from('push_subscriptions').delete().eq('id', s.id);
            }
        })
    );

    await Promise.all(notifications || []);
    return Response.json({ success: true });
}