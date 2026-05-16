import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from "@/utils/supabase/server"

webpush.setVapidDetails(
    'mailto:admin@themakeupstore.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: Request) {
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