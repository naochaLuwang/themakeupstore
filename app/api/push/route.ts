import { NextResponse } from 'next/server';
import webpush from 'web-push';

webpush.setVapidDetails(
    'mailto:your-email@example.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: Request) {
    const { subscription, payload } = await request.json();

    try {
        await webpush.sendNotification(subscription, JSON.stringify(payload));
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Push error:', error);
        return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
    }
}