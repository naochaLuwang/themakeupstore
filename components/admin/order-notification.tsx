"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { createClient } from "@/utils/supabase/client"
import { Bell, ShoppingBag } from "lucide-react"
import Link from "next/link"

function playNotificationSound() {
    try {
        const ctx = new AudioContext()
        const g = ctx.createGain()
        g.connect(ctx.destination)
        g.gain.value = 0.15

        const o1 = ctx.createOscillator()
        o1.type = "sine"
        o1.frequency.value = 880
        o1.connect(g)
        o1.start(ctx.currentTime)
        o1.stop(ctx.currentTime + 0.1)

        const o2 = ctx.createOscillator()
        o2.type = "sine"
        o2.frequency.value = 1100
        o2.connect(g)
        o2.start(ctx.currentTime + 0.1)
        o2.stop(ctx.currentTime + 0.25)

        setTimeout(() => ctx.close(), 500)
    } catch {
        // Audio not supported
    }
}

async function enrichOrder(order: any, supabase: any) {
    if (order.customer_name) return order
    const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", order.user_id)
        .maybeSingle()
    return { ...order, customer_name: profile?.full_name || "a customer" }
}

export function OrderNotification() {
    const [pendingCount, setPendingCount] = useState(0)
    const [open, setOpen] = useState(false)
    const [recentOrders, setRecentOrders] = useState<any[]>([])
    const supabase = createClient()

    useEffect(() => {
        supabase
            .from("orders")
            .select("id, status, created_at, total", { count: "exact", head: true })
            .in("status", ["pending", "confirmed"])
            .then(({ count }) => setPendingCount(count || 0))
    }, [supabase])

    useEffect(() => {
        const channel = supabase
            .channel("admin-orders")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "orders" },
                async (payload) => {
                    const order = await enrichOrder(payload.new, supabase)
                    setPendingCount((c) => c + 1)
                    playNotificationSound()
                    setRecentOrders((prev) => [order, ...prev].slice(0, 5))
                }
            )
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [supabase])

    const fetchRecent = useCallback(async () => {
        const { data } = await supabase
            .from("orders")
            .select("id, user_id, status, created_at, total, profiles(full_name)")
            .in("status", ["pending", "confirmed"])
            .order("created_at", { ascending: false })
            .limit(5)
        if (data) {
            setRecentOrders(data.map((o: any) => ({
                ...o,
                customer_name: o.profiles?.full_name || "a customer",
            })))
        }
    }, [supabase])

    return (
        <div className="relative">
            <button
                onClick={() => { setOpen(!open); if (!open) fetchRecent() }}
                className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
                <Bell className="h-4 w-4 text-slate-500" />
                {pendingCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[14px] flex items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white px-1">
                        {pendingCount > 99 ? "99+" : pendingCount}
                    </span>
                )}
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-[20rem] z-50 rounded-xl border bg-white shadow-lg overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100">
                            <p className="text-xs font-semibold text-slate-900">New Orders</p>
                            <p className="text-[10px] text-slate-400">{pendingCount} pending</p>
                        </div>
                        <div className="max-h-72 overflow-y-auto">
                            {recentOrders.length === 0 ? (
                                <p className="px-4 py-6 text-xs text-slate-400 text-center">No new orders</p>
                            ) : (
                                recentOrders.map((order) => (
                                    <Link
                                        key={order.id}
                                        href={`/admin/orders/${order.id}`}
                                        onClick={() => setOpen(false)}
                                        className="block px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
                                                <ShoppingBag className="h-4 w-4 text-emerald-500" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-medium text-slate-900 leading-snug">
                                                    You received a new order from <span className="text-emerald-600">{order.customer_name}</span>
                                                </p>
                                                <p className="text-[10px] text-slate-400 mt-1">
                                                    ₹{Number(order.total).toLocaleString()} · {new Date(order.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                        <Link
                            href="/admin/orders"
                            onClick={() => setOpen(false)}
                            className="block px-4 py-2.5 text-[11px] font-semibold text-center text-rose-500 hover:bg-rose-50 transition-colors border-t border-slate-100"
                        >
                            View all orders
                        </Link>
                    </div>
                </>
            )}
        </div>
    )
}
