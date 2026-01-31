"use client"

import { useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function PushInitializer() {
    const supabase = createClient();

    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
            registerPush();
        }
    }, []);

    async function registerPush() {
        const registration = await navigator.serviceWorker.ready;

        // Check for existing subscription
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            // Convert VAPID key to Uint8Array
            const convertedVapidKey = urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!);

            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey
            });
        }

        // Save to Supabase
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase
                .from('profiles')
                .update({ push_subscription: JSON.stringify(subscription) })
                .eq('id', user.id);
        }
    }

    return null;
}

// Utility function
function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}