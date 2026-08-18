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
      if (isCapacitor()) {
        console.log('[Push] Capacitor detected, registering FCM...')
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const { registerForFCM, setupFCMListeners } = await import('@/lib/capacitor-push')
          setupFCMListeners()
          if (session) {
            await registerForFCM()
          } else {
            console.log('[Push] No session, skipping token registration')
          }
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
      }
    }
    init();
  }, []);

  return isOffline ? (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-white text-center text-xs font-bold py-2 px-4 tracking-wide uppercase">
      You're offline — some features may not work
    </div>
  ) : null;
}
