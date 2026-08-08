"use client"

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

function isCapacitor() {
  return typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform()
}

export default function PushInitializer() {
  const supabase = createClient();
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { console.log('[Push] No session'); return; }

      if (isCapacitor()) {
        console.log('[Push] Capacitor detected, registering FCM...')
        try {
          const { registerForFCM, setupFCMListeners } = await import('@/lib/capacitor-push')
          await registerForFCM()
          setupFCMListeners()
        } catch (err) {
          console.error('[Push] Capacitor registration failed:', err)
        }

        try {
          const { App } = await import('@capacitor/app')
          App.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
            if (canGoBack) {
              window.history.back()
            } else {
              App.exitApp()
            }
          })
        } catch (err) {
          console.error('Back button handler failed:', err)
        }

        try {
          const { Device } = await import('@capacitor/device')
          const info = await Device.getInfo()
          console.log('[Device]', info.model, info.operatingSystem, info.osVersion)
        } catch (err) {
          console.error('Device info failed:', err)
        }

        try {
          const { Network } = await import('@capacitor/network')
          const status = await Network.getStatus()
          setIsOffline(!status.connected)

          Network.addListener('networkStatusChange', (status) => {
            setIsOffline(!status.connected)
          })
        } catch (err) {
          console.error('Network listener failed:', err)
        }
      } else if ('serviceWorker' in navigator && 'PushManager' in window) {
        console.log('[Push] Browser detected, registering web push...')
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

  return isOffline ? (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-white text-center text-xs font-bold py-2 px-4 tracking-wide uppercase">
      You're offline — some features may not work
    </div>
  ) : null;
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
