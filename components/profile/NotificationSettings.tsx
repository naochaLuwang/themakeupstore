"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Capacitor } from "@capacitor/core"

function isCapacitor() {
    return Capacitor.isNativePlatform()
}

export function NotificationSettings() {
    const supabase = createClient()
    const [isNative, setIsNative] = useState(false)
    const [isSubscribed, setIsSubscribed] = useState(false)
    const [loading, setLoading] = useState(true)
    const [toggling, setToggling] = useState(false)

    useEffect(() => {
        setIsNative(isCapacitor())
        if (isCapacitor()) checkSubscription()
        else setLoading(false)
    }, [])

    async function checkSubscription() {
        setLoading(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.user) {
                const { isPushDisabled } = await import('@/lib/capacitor-push')
                const { FirebaseMessaging } = await import('@capacitor-firebase/messaging')
                if (isPushDisabled() || (await FirebaseMessaging.checkPermissions()).receive !== 'granted') {
                    setIsSubscribed(false)
                    return
                }
                const { token } = await FirebaseMessaging.getToken()
                const { data } = await supabase
                    .from('push_subscriptions')
                    .select('fcm_token')
                    .eq('user_id', session.user.id)
                    .eq('fcm_token', token)
                setIsSubscribed(!!data?.length)
            }
        } catch (err) {
            console.error('Failed to check push status:', err)
        } finally {
            setLoading(false)
        }
    }

    async function togglePush() {
        setToggling(true)
        try {
            if (isSubscribed) {
                const { data: { session } } = await supabase.auth.getSession()
                if (session?.user) {
                    const { unregisterFCM } = await import('@/lib/capacitor-push')
                    await unregisterFCM()
                    const { error } = await supabase.from('push_subscriptions').delete().eq('user_id', session.user.id)
                    if (error) throw error
                }
                setIsSubscribed(false)
                toast.success("Notifications disabled")
            } else {
                const { registerForFCM } = await import('@/lib/capacitor-push')
                const result = await registerForFCM({ enable: true })
                if (!result.ok) {
                    setIsSubscribed(false)
                    toast.error(result.reason || "Permission was denied or token registration failed")
                    return
                }
                const { data: { session } } = await supabase.auth.getSession()
                if (session?.user) {
                    const { data } = await supabase
                        .from('push_subscriptions')
                        .select('fcm_token')
                        .eq('user_id', session.user.id)
                        .not('fcm_token', 'is', null)
                    if (data?.length) {
                        setIsSubscribed(true)
                        toast.success("Notifications enabled!")
                    } else {
                        setIsSubscribed(false)
                        toast.error("Registration didn't save — try again")
                    }
                }
            }
        } catch (error) {
            console.error(error)
            toast.error("Failed to update notification settings")
        } finally {
            setToggling(false)
        }
    }

    if (!isNative) {
        return (
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Instant push updates</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">App only</span>
                </div>
                <p className="text-xs text-slate-500 italic">
                    Push notifications are delivered through our Android app. Sign in on the app to receive order updates and announcements.
                </p>
            </div>
        )
    }

    if (loading) return <div className="h-10 w-32 bg-slate-200 animate-pulse rounded-lg" />

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status: {isSubscribed ? "Active" : "Disabled"}</span>
                <Button
                    variant={isSubscribed ? "outline" : "default"}
                    className={isSubscribed ? "" : "bg-pink-600 hover:bg-pink-700 text-white"}
                    onClick={togglePush}
                    disabled={toggling}
                >
                    {toggling ? "Working..." : isSubscribed ? "Disable Notifications" : "Enable Notifications"}
                </Button>
            </div>
            {!isSubscribed && (
                <p className="text-xs text-slate-500 italic">
                    Enable to receive FCM push notifications for your orders and announcements on this device.
                </p>
            )}
        </div>
    )
}
