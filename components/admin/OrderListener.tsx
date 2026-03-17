"use client"

import { useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { toast } from "sonner"
import { ShoppingBag } from "lucide-react"
import { useRouter } from 'next/navigation'

export function OrderListener() {
    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        // 1. Check if browser supports notifications & request permission
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }

        // 2. Realtime Listener
        const channel = supabase
            .channel('realtime-orders')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'orders' },
                (payload) => {
                    const order = payload.new;

                    // A. Visual "Force Popup" (Toast)
                    toast.custom((t) => (
                        <div className="bg-slate-950 text-white p-5 rounded-[2rem] border border-white/10 shadow-2xl flex items-center gap-5 w-[350px]">
                            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center animate-pulse">
                                <ShoppingBag className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">New Order</p>
                                <p className="text-sm font-bold">₹{Number(order.total).toLocaleString()}</p>
                            </div>
                            <button
                                onClick={() => {
                                    toast.dismiss(t);
                                    router.push(`/admin/orders/${order.id}`);
                                }}
                                className="px-4 py-2 bg-white text-black text-[10px] font-black uppercase rounded-xl"
                            >
                                View
                            </button>
                        </div>
                    ), { duration: 8000 });

                    // B. Audio Alert
                    const audio = new Audio('/order-alert.mp3');
                    audio.play().catch(() => console.log("Sound blocked by browser"));
                }
            )
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [supabase, router])

    return null;
}