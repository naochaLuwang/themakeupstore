import { NextResponse } from 'next/server';
import webpush from 'web-push';

// Configuration
webpush.setVapidDetails(
    'mailto:admin@themakeupstore.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: Request) {
    try {
        const { subscription, payload } = await request.json();

        await webpush.sendNotification(
            subscription,
            JSON.stringify(payload)
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Push Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}