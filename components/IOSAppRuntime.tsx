"use client"

import { useEffect } from 'react'
import { Capacitor, type PluginListenerHandle } from '@capacitor/core'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { completeIOSAuth } from '@/lib/ios-auth'
import { parseNativeAppLink } from '@/lib/native-app-links'

export default function IOSAppRuntime() {
  const router = useRouter()
  useEffect(() => {
    if (Capacitor.getPlatform() !== 'ios' || !Capacitor.isPluginAvailable('App')) return
    let disposed = false
    const listeners: PluginListenerHandle[] = []
    const delivered = new Set<string>()
    document.documentElement.dataset.nativePlatform = 'ios'
    const viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]')
    const original = viewport?.content
    if (viewport) viewport.content = viewport.content.split(',').filter(part => !/^\s*(maximum-scale|user-scalable)\s*=/i.test(part)).join(',')
    const handle = async (url: string) => {
      const link = parseNativeAppLink(url)
      if (!link || disposed) return
      if (link.type === 'route') { router.push(link.path); return }
      await completeIOSAuth(url, {
        success: () => { if (!disposed) { router.replace('/'); router.refresh() } },
        failure: () => { if (!disposed) toast.error('Sign-in could not be completed. Please try again.') },
      })
    }
    void import('@capacitor/app').then(async ({ App }) => {
      if (disposed) return
      const listener = await App.addListener('appUrlOpen', ({ url }) => {
        delivered.add(url)
        if (!disposed) void handle(url)
      })
      if (disposed) { await listener.remove(); return }
      listeners.push(listener)
      const launch = await App.getLaunchUrl()
      if (launch?.url && !disposed && !delivered.has(launch.url)) await handle(launch.url)
    }).catch(() => console.warn('[iOS] App navigation setup failed'))
    return () => {
      disposed = true
      listeners.forEach(listener => { void listener.remove() })
      delete document.documentElement.dataset.nativePlatform
      if (viewport && original !== undefined) viewport.content = original
    }
  }, [router])
  return null
}
