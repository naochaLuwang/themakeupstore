"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export function NotificationSettings() {
    const supabase = createClient()
    const [isSubscribed, setIsSubscribed] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        checkSubscription()
    }, [])

    async function checkSubscription() {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            const registration = await navigator.serviceWorker.ready
            const subscription = await registration.pushManager.getSubscription()
            setIsSubscribed(!!subscription)
        }
        setLoading(false)
    }

    async function togglePush() {
        setLoading(true)
        try {
            if (isSubscribed) {
                // Logic to unsubscribe
                const registration = await navigator.serviceWorker.ready
                const subscription = await registration.pushManager.getSubscription()
                if (subscription) {
                    await subscription.unsubscribe()
                    await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
                    setIsSubscribed(false)
                    toast.success("Notifications disabled")
                }
            } else {
                // Logic to subscribe
                const registration = await navigator.serviceWorker.ready
                const convertedVapidKey = urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)

                const subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: convertedVapidKey
                })

                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    await supabase.from('push_subscriptions').upsert({
                        user_id: user.id,
                        endpoint: subscription.endpoint,
                        subscription_json: subscription
                    }, { onConflict: 'endpoint' })

                    setIsSubscribed(true)
                    toast.success("Notifications enabled!")
                }
            }
        } catch (error) {
            console.error(error)
            toast.error("Failed to update notification settings")
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div className="h-10 w-32 bg-slate-200 animate-pulse rounded-lg" />

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status: {isSubscribed ? "Active" : "Disabled"}</span>
                <Button
                    variant={isSubscribed ? "outline" : "default"}
                    onClick={togglePush}
                    disabled={loading}
                >
                    {isSubscribed ? "Disable Notifications" : "Enable Notifications"}
                </Button>
            </div>
            {!isSubscribed && (
                <p className="text-xs text-slate-500 italic">
                    Note: If you already blocked notifications in your browser, you may need to reset permissions in your browser settings.
                </p>
            )}
        </div>
    )
}

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
}