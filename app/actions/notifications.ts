"use server";

import webpush from "web-push";

webpush.setVapidDetails(
    "mailto:your-email@example.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
);

export async function sendTestNotification(subscriptionRaw: string) {
    try {
        const subscription = JSON.parse(subscriptionRaw);

        const payload = JSON.stringify({
            title: "THE MAKEUP STORE",
            body: "Test notification working!",
            url: "/profile/notifications"
        });

        await webpush.sendNotification(subscription, payload);
        return { success: true };
    } catch (error) {
        console.error("Error sending test notification:", error);
        return { success: false, error: "Failed to send notification" };
    }
}