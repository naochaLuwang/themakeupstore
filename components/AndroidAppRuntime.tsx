"use client"

import { useEffect } from 'react'
import { consumeReturnPath } from '@/lib/storefront-navigation'
import { Capacitor, type PluginListenerHandle } from '@capacitor/core'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/utils/supabase/client'
import { createAndroidLinkHandler, handleAndroidBack } from '@/lib/android-app-links'

export default function AndroidAppRuntime() {
  const router = useRouter()
  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android' || !Capacitor.isPluginAvailable('App')) return
    let disposed = false
    const handles: PluginListenerHandle[] = []
    document.documentElement.dataset.nativePlatform = 'android'
    const viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]')
    const oldViewport = viewport?.content
    if (viewport) viewport.content = viewport.content.split(',').filter(part => !/^\s*(maximum-scale|user-scalable)\s*=/i.test(part)).join(',')
    const supabase = createClient()
    const delivered = new Set<string>()
    const handleUrl = createAndroidLinkHandler({
      navigate: path => { if (!disposed) router.push(path) },
      exchangeCode: code => supabase.auth.exchangeCodeForSession(code),
      signedIn: () => { if (!disposed) { router.replace(consumeReturnPath()); router.refresh() } },
      authFailed: () => { if (!disposed) toast.error('Sign-in could not be completed. Please try again.') },
    })
    const track = async (pending: Promise<PluginListenerHandle>) => {
      const handle = await pending
      if (disposed) await handle.remove()
      else handles.push(handle)
    }
    void import('@capacitor/app').then(async ({ App }) => {
      if (disposed) return
      // Subscribe before reading the launch URL, including when auth is offline.
      await track(App.addListener('appUrlOpen', ({ url }) => {
        delivered.add(url)
        if (!disposed) void handleUrl(url)
      }))
      if (disposed) return
      await track(App.addListener('backButton', ({ canGoBack }) => {
        if (!disposed) handleAndroidBack(canGoBack, () => window.history.back(), () => { void App.exitApp() })
      }))
      if (disposed) return
      const launch = await App.getLaunchUrl()
      if (launch?.url && !disposed && !delivered.has(launch.url)) await handleUrl(launch.url)
    }).catch(() => {
      // Never include a callback URL, OAuth code or account data in logs.
      console.warn('[Android] App navigation setup failed')
    })
    return () => {
      disposed = true
      for (const handle of handles) void handle.remove()
      delete document.documentElement.dataset.nativePlatform
      if (viewport && oldViewport !== undefined) viewport.content = oldViewport
    }
  }, [router])
  return null
}
