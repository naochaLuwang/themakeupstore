"use client"

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { createClient } from '@/utils/supabase/client';

function isCapacitor() {
  return Capacitor.isNativePlatform()
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
    let unsubscribeAuth: (() => void) | undefined;
    const nativeListeners: PluginListenerHandle[] = [];
    const trackListener = async (pending: Promise<PluginListenerHandle>) => {
      const handle = await pending;
      if (cancelled) await handle.remove();
      else nativeListeners.push(handle);
    };
    let retryRegistration = async () => {};

    const init = async () => {
      console.log('[Push] Capacitor detected, initializing...');

      try {
        const { registerForFCM, setupFCMListeners, unregisterFCM, isPushDisabled } = await import('@/lib/capacitor-push');
        if (cancelled) return;
        setupFCMListeners();

        const doRegister = async (userId: string, force = false) => {
          if (cancelled || isPushDisabled() || (!force && registeredFor === userId)) return;
          try {
            const result = await registerForFCM();
            if (cancelled || lastUserId !== userId) return;
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

        // Register as soon as the user signs in (password / Google / Apple / OAuth
        // return all emit SIGNED_IN) and revoke the token when they sign out.
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, sess: Session | null) => {
          if (cancelled) return;
          if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && sess?.user) {
            lastUserId = sess.user.id;
            // Defer off the auth callback (supabase-js runs listeners under its lock)
            setTimeout(() => doRegister(sess.user.id), 0);
          } else if (event === 'SIGNED_OUT') {
            lastUserId = null;
            registeredFor = null;
            setTimeout(() => {
              if (cancelled || lastUserId) return;
              // RLS cannot delete the former user's row after sign-out. Revoke
              // the device token so it cannot keep receiving private updates.
              unregisterFCM({ disable: false }).catch((err) =>
                console.warn('[Push] Token revocation failed:', err)
              );
            }, 0);
          }
        });
        unsubscribeAuth = () => subscription.unsubscribe();
        retryRegistration = async () => {
          if (cancelled || isPushDisabled()) return;
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            lastUserId = session.user.id;
            await doRegister(session.user.id, true);
          }
        };
        const { data: { session } } = await supabase.auth.getSession();
        if (session && !cancelled) {
          lastUserId = session.user.id;
          void doRegister(session.user.id);
        }
      } catch (err) {
        console.error('[Push] Capacitor initialization failed:', err);
      }

      try {
        const { App } = await import('@capacitor/app');
        await trackListener(App.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
          if (canGoBack) {
            window.history.back()
          } else {
            App.exitApp()
          }
        }));
        await trackListener(App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) retryRegistration().catch((err) => console.warn('[Push] Resume registration failed:', err));
        }));

        // OAuth return from Google sign-in (themakeupstore://auth/callback?code=...)
        await trackListener(App.addListener('appUrlOpen', async ({ url }: { url: string }) => {
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
        }));
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

        await trackListener(Network.addListener('networkStatusChange', (status) => {
          if (cancelled) return;
          setIsOffline(!status.connected)
          if (status.connected) retryRegistration().catch((err) => console.warn('[Push] Network registration failed:', err));
        }));
      } catch (err) {
        console.error('Network listener failed:', err)
      }
    }
    init();

    return () => {
      cancelled = true;
      unsubscribeAuth?.();
      for (const handle of nativeListeners) void handle.remove();
    };
  }, [supabase]);

  return isOffline ? (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-white text-center text-xs font-bold py-2 px-4 tracking-wide uppercase">
      You&apos;re offline — some features may not work
    </div>
  ) : null;
}
