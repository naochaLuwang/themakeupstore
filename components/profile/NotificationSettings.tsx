"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Capacitor } from "@capacitor/core"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"
import type { PushStatus } from "@/lib/capacitor-push"

export function NotificationSettings() {
    const [status, setStatus] = useState<PushStatus | null>(null)
    const [checking, setChecking] = useState(true)
    const [toggling, setToggling] = useState(false)
    const [actionError, setActionError] = useState<string | null>(null)
    const requestId = useRef(0)
    const busy = useRef(false)
    const invalidateRequests = useCallback(() => { requestId.current++ }, [])

    const refresh = useCallback(async () => {
        if (busy.current) return
        const id = ++requestId.current
        setChecking(true)
        try {
            const next = Capacitor.isNativePlatform()
                ? await (await import('@/lib/capacitor-push')).getPushStatus()
                : { state: 'unavailable' as const, message: 'Open the mobile app to manage push notifications on your phone.' }
            if (id === requestId.current) setStatus(next)
        } catch {
            if (id === requestId.current) setStatus({ state: 'error', message: 'Unable to check notification status. Please try again.' })
        } finally {
            if (id === requestId.current) setChecking(false)
        }
    }, [])

    useEffect(() => {
        void refresh()
        const onVisible = () => { if (document.visibilityState === 'visible') void refresh() }
        window.addEventListener('focus', refresh)
        window.addEventListener('tms-push-change', refresh)
        document.addEventListener('visibilitychange', onVisible)
        let disposed = false
        let removeAppListener: (() => Promise<void>) | undefined
        if (Capacitor.isNativePlatform()) {
            import('@capacitor/app').then(async ({ App }) => {
                const handle = await App.addListener('appStateChange', ({ isActive }) => { if (isActive) void refresh() })
                if (disposed) await handle.remove()
                else removeAppListener = () => handle.remove()
            }).catch(error => console.warn('Notification resume listener failed:', error))
        }
        return () => {
            disposed = true
            invalidateRequests()
            window.removeEventListener('focus', refresh)
            window.removeEventListener('tms-push-change', refresh)
            document.removeEventListener('visibilitychange', onVisible)
            void removeAppListener?.()
        }
    }, [refresh, invalidateRequests])

    const enabled = status?.state === 'enabled'

    async function togglePush() {
        if (busy.current || !status) return
        busy.current = true
        invalidateRequests()
        setToggling(true)
        setActionError(null)
        try {
            const push = await import('@/lib/capacitor-push')
            if (enabled) await push.disablePushForCurrentDevice()
            else {
                const result = await push.registerForFCM({ enable: true })
                if (!result.ok) throw new Error(result.reason || 'Unable to enable notifications. Please try again.')
            }
            const next = await push.getPushStatus()
            setStatus(next)
            if ((enabled && next.state !== 'disabled') || (!enabled && next.state !== 'enabled')) throw new Error(next.message)
            toast.success(enabled ? 'Notifications disabled on this device' : 'Notifications enabled on this device')
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to update notifications. Please try again.'
            setActionError(message)
            toast.error(message)
        } finally {
            busy.current = false
            setToggling(false)
            setChecking(false)
            void refresh()
        }
    }

    const label = status?.state === 'unavailable' ? 'App only'
        : status?.state === 'error' ? 'Unable to check'
        : enabled ? 'Enabled' : 'Disabled'

    return (
        <div className="space-y-4 p-3 sm:p-4" aria-busy={checking || toggling}>
            <div className="flex flex-wrap items-center justify-between gap-3" role="status" aria-live="polite">
                <span className="text-sm font-semibold text-slate-900">Push notifications</span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${enabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    {!status ? 'Checking…' : label}
                </span>
            </div>
            <p className="text-xs leading-relaxed text-slate-500">{status?.message || 'Checking notification settings on this device…'}</p>
            {actionError && <p className="text-xs leading-relaxed text-rose-600" role="alert">{actionError}</p>}
            {status && status.state !== 'unavailable' && (
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant={enabled ? 'outline' : 'default'}
                        className={enabled ? 'rounded-xl' : 'rounded-xl bg-pink-600 text-white hover:bg-pink-700'}
                        onClick={togglePush}
                        disabled={checking || toggling || status.state === 'signed_out' || status.state === 'error'}
                    >
                        {toggling ? 'Updating…' : enabled ? 'Disable Notifications' : 'Enable Notifications'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setActionError(null); void refresh() }} disabled={checking || toggling} className="text-slate-500">
                        <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`} />
                        Check again
                    </Button>
                </div>
            )}
        </div>
    )
}
