"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { sendTestNotification } from "@/app/actions/notifications";
import { SendHorizonal, BellRing, Loader2 } from "lucide-react";

export function NotificationSettings() {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [loading, setLoading] = useState(true);
    const [testLoading, setTestLoading] = useState(false);
    const [subscription, setSubscription] = useState<PushSubscription | null>(null);

    const supabase = createClient();

    // On mount, check if the browser already has an active subscription
    useEffect(() => {
        async function checkSubscription() {
            if ("serviceWorker" in navigator && "PushManager" in window) {
                try {
                    const registration = await navigator.serviceWorker.ready;
                    const sub = await registration.pushManager.getSubscription();
                    setSubscription(sub);
                    setIsSubscribed(!!sub);
                } catch (error) {
                    console.error("Error checking subscription:", error);
                }
            }
            setLoading(false);
        }
        checkSubscription();
    }, []);

    // Convert VAPID key for the browser
    function urlBase64ToUint8Array(base64String: string) {
        const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    const handleToggle = async (checked: boolean) => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error("You must be logged in.");
                return;
            }

            const registration = await navigator.serviceWorker.ready;

            if (checked) {
                // 1. Request Permission & Subscribe
                const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
                if (!publicKey) throw new Error("VAPID Public Key missing");

                const newSub = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(publicKey),
                });

                // 2. Save to Supabase
                const { error } = await supabase
                    .from("profiles")
                    .update({ push_subscription: JSON.stringify(newSub) })
                    .eq("id", user.id);

                if (error) throw error;

                setSubscription(newSub);
                setIsSubscribed(true);
                toast.success("Notifications enabled!");
            } else {
                // 1. Unsubscribe in Browser
                if (subscription) {
                    await subscription.unsubscribe();
                }

                // 2. Remove from Supabase
                await supabase
                    .from("profiles")
                    .update({ push_subscription: null })
                    .eq("id", user.id);

                setSubscription(null);
                setIsSubscribed(false);
                toast.info("Notifications disabled.");
            }
        } catch (error: any) {
            console.error("Toggle error:", error);
            toast.error(error.message || "Failed to update settings.");
        } finally {
            setLoading(false);
        }
    };

    const handleTest = async () => {
        if (!subscription) return;
        setTestLoading(true);
        try {
            const result = await sendTestNotification(JSON.stringify(subscription));
            if (result.success) {
                toast.success("Check your device for the test notification!");
            } else {
                toast.error("Failed to send test. Check browser permissions.");
            }
        } catch (err) {
            toast.error("Something went wrong.");
        } finally {
            setTestLoading(false);
        }
    };

    if (loading && !subscription) {
        return (
            <div className="flex items-center justify-center p-8 border border-dashed rounded-lg">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between p-5 bg-white border rounded-xl shadow-sm">
                <div className="flex gap-4 items-center">
                    <div className={`p-2 rounded-full ${isSubscribed ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                        <BellRing className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900 text-base">Push Notifications</h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            {isSubscribed
                                ? "Active on this device"
                                : "Receive real-time alerts for your orders"}
                        </p>
                    </div>
                </div>
                <Switch
                    checked={isSubscribed}
                    onCheckedChange={handleToggle}
                    disabled={loading}
                />
            </div>

            {isSubscribed && (
                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all animate-in fade-in zoom-in-95">
                    <p className="text-xs text-slate-600 max-w-[280px]">
                        <strong>Verify Setup:</strong> Send a test message to ensure your device is receiving data correctly.
                    </p>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleTest}
                        disabled={testLoading}
                        className="w-full sm:w-auto gap-2 bg-white border shadow-sm hover:bg-slate-50"
                    >
                        {testLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <SendHorizonal className="w-4 h-4" />
                        )}
                        {testLoading ? "Sending..." : "Send Test Notification"}
                    </Button>
                </div>
            )}

            {!isSubscribed && !loading && (
                <p className="text-[11px] text-slate-400 px-1 italic">
                    * You can disable these at any time from this page or your browser settings.
                </p>
            )}
        </div>
    );
}