"use client"

import { useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

function isCapacitor() {
  return typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform()
}

export default function PushInitializer() {
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      if (isCapacitor()) {
        const { registerForFCM, setupFCMListeners } = await import('@/lib/capacitor-push')
        await registerForFCM()
        setupFCMListeners()
      } else if ('serviceWorker' in navigator && 'PushManager' in window) {
        registerWebPush(session.user.id);
      }
    }
    init();
  }, []);

  async function registerWebPush(userId: string) {
    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key)
        });
      }

      await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: userId,
          endpoint: subscription.endpoint,
          subscription_json: subscription,
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
