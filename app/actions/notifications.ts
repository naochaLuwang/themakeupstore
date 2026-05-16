import webpush from 'web-push';
import { createClient } from '@/utils/supabase/server';

webpush.setVapidDetails(
    'mailto:admin@themakeupstore.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401 })
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

    if (!profile?.is_admin) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 })
    }

    const { title, message } = await req.json();

    const { data: subs } = await supabase.from('push_subscriptions').select('*');

    const notifications = subs?.map((s) =>
        webpush.sendNotification(s.subscription, JSON.stringify({
            title,
            body: message,
            icon: '/logo.png',
        })).catch(err => {
            if (err.statusCode === 410) {
                return supabase.from('push_subscriptions').delete().eq('id', s.id);
            }
        })
    );

    await Promise.all(notifications || []);
    return Response.json({ success: true });
}