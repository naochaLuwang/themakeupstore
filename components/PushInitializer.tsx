"use client"

import { useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function PushInitializer() {
    const supabase = createClient();

    useEffect(() => {
        // Only run if user is logged in and browser supports it
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session && 'serviceWorker' in navigator && 'PushManager' in window) {
                registerPush(session.user.id);
            }
        }
        init();
    }, []);

    async function registerPush(userId: string) {
        try {
            const registration = await navigator.serviceWorker.ready;
            let subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
                const convertedVapidKey = urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!);
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: convertedVapidKey
                });
            }

            // UPSERT into dedicated table to handle multiple devices
            await supabase
                .from('push_subscriptions')
                .upsert({
                    user_id: userId,
                    endpoint: subscription.endpoint,
                    subscription_json: subscription
                }, { onConflict: 'endpoint' });

        } catch (err) {
            console.error("Push registration failed:", err);
        }
    }

    return null;
}

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}