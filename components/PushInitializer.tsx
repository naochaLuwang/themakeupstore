"use client"

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';

function isCapacitor() {
  return typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform()
}

export default function PushInitializer() {
  const supabase = createClient();
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (!isCapacitor()) return;

    let cancelled = false;
    let registeredFor: string | null = null;
    let lastUserId: string | null = null;
    let toastedFailure = false;

    const init = async () => {
      console.log('[Push] Capacitor detected, initializing...');

      try {
        const { registerForFCM, setupFCMListeners } = await import('@/lib/capacitor-push');
        setupFCMListeners();

        const doRegister = async (userId: string) => {
          if (cancelled || registeredFor === userId) return;
          try {
            const result = await registerForFCM();
            if (cancelled) return;
            if (result.ok) {
              registeredFor = userId;
              toastedFailure = false;
              console.log('[Push] Device registered for push');
            } else {
              console.warn('[Push] Registration failed:', result.reason);
              if (!toastedFailure) {
                toastedFailure = true;
                toast.error(result.reason || 'Push registration failed', { duration: 6000 });
              }
            }
          } catch (err) {
            console.error('[Push] Registration error:', err);
          }
        };

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          lastUserId = session.user.id;
          await doRegister(session.user.id);
        } else {
          console.log('[Push] No session yet — will register after sign-in');
        }

        // Register as soon as the user signs in (password / Google / Apple / OAuth
        // return all emit SIGNED_IN) and drop the row when they sign out.
        supabase.auth.onAuthStateChange((event: AuthChangeEvent, sess: Session | null) => {
          if (cancelled) return;
          if (event === 'SIGNED_IN' && sess?.user) {
            lastUserId = sess.user.id;
            // Defer off the auth callback (supabase-js runs listeners under its lock)
            setTimeout(() => doRegister(sess.user.id), 0);
          } else if (event === 'SIGNED_OUT' && lastUserId) {
            const uid = lastUserId;
            lastUserId = null;
            registeredFor = null;
            setTimeout(() => {
              if (cancelled) return;
              supabase
                .from('push_subscriptions')
                .delete()
                .eq('user_id', uid)
                .then(() => console.log('[Push] Removed push subscription on sign-out'))
                .catch(() => {});
            }, 0);
          }
        });
      } catch (err) {
        console.error('[Push] Capacitor initialization failed:', err);
      }

      try {
        const { App } = await import('@capacitor/app');
        App.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
          if (canGoBack) {
            window.history.back()
          } else {
            App.exitApp()
          }
        })

        // OAuth return from Google sign-in (themakeupstore://auth/callback?code=...)
        App.addListener('appUrlOpen', async ({ url }: { url: string }) => {
          try {
            if (!url.startsWith('themakeupstore://')) return
            const parsed = new URL(url)
            const errDesc = parsed.searchParams.get('error_description') || parsed.searchParams.get('error')
            if (errDesc) {
              console.error('[Auth deep link] provider error:', errDesc)
              return
            }
            const code = parsed.searchParams.get('code')
            if (!code) return
            const { error } = await supabase.auth.exchangeCodeForSession(code)
            if (error) {
              console.error('[Auth deep link] exchange failed:', error.message)
              return
            }
            // Session cookies now set for the app origin — land on home
            window.location.href = '/'
          } catch (err) {
            console.error('[Auth deep link] failed:', err)
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
    init();

    return () => {
      cancelled = true;
    };
  }, []);

  return isOffline ? (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-white text-center text-xs font-bold py-2 px-4 tracking-wide uppercase">
      You're offline — some features may not work
    </div>
  ) : null;
}
