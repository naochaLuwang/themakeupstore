// @/utils/push-notification.ts
export async function sendPushToUser(supabase: any, userId: string, payload: { title: string, body: string, url: string }) {
    // 1. Get the subscription from your 'push_subscriptions' table
    const { data: subscription } = await supabase
        .from('push_subscriptions')
        .select('subscription_json')
        .eq('user_id', userId)
        .single();

    if (!subscription) return;

    // 2. Send to your API route (we will create this next)
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            subscription: subscription.subscription_json,
            payload
        }),
    });
}