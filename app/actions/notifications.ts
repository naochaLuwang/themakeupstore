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

        await webpush.sendNotification(
            subscription,
            JSON.stringify({
                title: "Success! 🎉",
                body: "Your notifications are working perfectly for THE MAKEUP STORE WANGKHEI.",
                url: "/profile/notifications",
            })
        );

        return { success: true };
    } catch (error) {
        console.error("Error sending test notification:", error);
        return { success: false, error: "Failed to send notification" };
    }
}