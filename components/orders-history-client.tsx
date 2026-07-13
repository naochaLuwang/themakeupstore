"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { ChevronLeft, ShoppingBag, Package, ImageIcon } from "lucide-react"
import { motion } from "framer-motion"

const statusVariant: Record<string, { label: string; color: string }> = {
    pending:          { label: "PENDING",           color: "bg-amber-50 text-amber-600 border-amber-200" },
    confirmed:        { label: "CONFIRMED",         color: "bg-blue-50 text-blue-600 border-blue-200" },
    packed:           { label: "PACKED",           color: "bg-indigo-50 text-indigo-600 border-indigo-200" },
    shipped:          { label: "SHIPPED",           color: "bg-sky-50 text-sky-600 border-sky-200" },
    out_for_delivery: { label: "OUT FOR DELIVERY",  color: "bg-purple-50 text-purple-600 border-purple-200" },
    failed_delivery:  { label: "FAILED DELIVERY",   color: "bg-red-50 text-red-500 border-red-200" },
    ready_for_pickup: { label: "READY FOR PICKUP",  color: "bg-teal-50 text-teal-600 border-teal-200" },
    no_show:          { label: "NO SHOW",           color: "bg-orange-50 text-orange-600 border-orange-200" },
    delivered:        { label: "DELIVERED",         color: "bg-emerald-50 text-emerald-600 border-emerald-200" },
    picked_up:        { label: "PICKED UP",         color: "bg-green-50 text-green-600 border-green-200" },
    cancelled:        { label: "CANCELLED",         color: "bg-red-50 text-red-500 border-red-200" },
    return_requested: { label: "RETURN REQUESTED",  color: "bg-purple-50 text-purple-600 border-purple-200" },
    return_approved:  { label: "RETURN APPROVED",   color: "bg-sky-50 text-sky-600 border-sky-200" },
    return_refunded:  { label: "REFUNDED",          color: "bg-blue-50 text-blue-600 border-blue-200" },
    return_rejected:  { label: "RETURN REJECTED",   color: "bg-orange-50 text-orange-600 border-orange-200" },
}

function getDeliveryLine(order: any, fallbackMap: Record<string, string>): string | null {
    if (['shipped', 'out_for_delivery'].includes(order.status)) return 'Out for delivery'
    if (order.status === 'delivered') {
        if (order.delivered_at) {
            const d = new Date(order.delivered_at)
            return `Delivered on ${d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}`
        }
        return 'Delivered'
    }
    const addr = order.shipping_address as any
    if (!addr) return null
    const deliveryLabel = addr.delivery_label || fallbackMap[order.id] || ""
    if (!deliveryLabel) return null
    const baseDate = order.shipped_at ? new Date(order.shipped_at) : new Date(order.created_at)
    const prefix = 'Arriving by'
    if (/FRI\/SAT/i.test(deliveryLabel)) {
        const d = new Date(baseDate)
        const currentDay = d.getDay()
        let diff = 6 - currentDay
        if (diff <= 0) diff += 7
        d.setDate(d.getDate() + diff)
        return `${prefix} ${d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}`
    }
    if (/same\s*day/i.test(deliveryLabel)) {
        const d = new Date(baseDate)
        return `${prefix} ${d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}`
    }
    const match = deliveryLabel.match(/(\d+)\s*-\s*(\d+)/)
    if (match) {
        const days = parseInt(match[2], 10)
        const d = new Date(baseDate)
        d.setDate(d.getDate() + days)
        return `${prefix} ${d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}`
    }
    return `${prefix} — ${deliveryLabel}`
}

function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function OrdersHistoryClient({ initialOrders }: { initialOrders: any[] }) {
    const [orders, setOrders] = useState(() => {
        const priority = ["pending", "approved", "refunded", "rejected"]
        return initialOrders.map(o => {
            const returns: any[] = (o as any).return_requests || []
            const best = returns.filter(r => r.status).sort(
                (a: any, b: any) => priority.indexOf(a.status) - priority.indexOf(b.status)
            )[0]
            return { ...o, return_status: best?.status || null }
        })
    })
    const [fallbackLabels, setFallbackLabels] = useState<Record<string, string>>({})
    const router = useRouter()
    const supabase = createClient()

    // Refresh orders when user returns to the tab (admin may have updated status)
    const fetchLatestOrders = useCallback(async () => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase
            .from("orders")
            .select(`
                id, created_at, status, total, payment_status, payment_method,
                shipping_address, delivered_at,
                return_requests (status),
                order_items (id, product_id, product_name, variant_title, quantity, unit_price)
            `)
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
        if (data) {
            const priority = ["pending", "approved", "refunded", "rejected"]
            setOrders(data.map(o => {
                const returns: any[] = (o as any).return_requests || []
                const best = returns.filter(r => r.status).sort(
                    (a: any, b: any) => priority.indexOf(a.status) - priority.indexOf(b.status)
                )[0]
                return { ...o, return_status: best?.status || null }
            }))
        }
    }, [])

    useEffect(() => {
        const onVisible = () => { if (document.visibilityState === 'visible') fetchLatestOrders() }
        const onFocus = () => fetchLatestOrders()
        document.addEventListener('visibilitychange', onVisible)
        window.addEventListener('focus', onFocus)
        return () => {
            document.removeEventListener('visibilitychange', onVisible)
            window.removeEventListener('focus', onFocus)
        }
    }, [fetchLatestOrders])

    // Realtime subscription for live order status updates
    useEffect(() => {
        const channel = supabase
            .channel('orders-live')
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'orders' },
                () => fetchLatestOrders()
            )
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [fetchLatestOrders])

    // Fallback delivery labels
    useEffect(() => {
        const missing = orders.filter(o => {
            const addr = o.shipping_address as any
            return addr?.pincode && !addr?.delivery_label
        })
        if (missing.length === 0) return
        ;(async () => {
            const map: Record<string, string> = {}
            for (const o of missing) {
                const pincode = (o.shipping_address as any).pincode
                if (!pincode) continue
                const { data: zone } = await supabase
                    .from("shipping_zones")
                    .select("id")
                    .eq("pincode", pincode)
                    .maybeSingle()
                if (zone) {
                    const { data: methods } = await supabase
                        .from("shipping_methods")
                        .select("delivery_time_label")
                        .eq("zone_id", zone.id)
                        .eq("is_active", true)
                        .order("price", { ascending: true })
                        .limit(1)
                    if (methods?.length) map[o.id] = methods[0].delivery_time_label
                }
            }
            setFallbackLabels(map)
        })()
    }, [])

    function getStatusConfig(order: any) {
        if (order.status === "delivered" && order.return_status) {
            const key = `return_${order.return_status}` as keyof typeof statusVariant
            return statusVariant[key] || statusVariant.delivered
        }
        return statusVariant[order.status] || statusVariant.pending
    }

    return (
        <div className="min-h-screen bg-[#F8F8F8] pb-12">
            {/* HEADER */}
            <div className="bg-white border-b border-slate-100">
                <div className="max-w-3xl mx-auto px-6 h-16 flex items-center gap-4">
                    <button
                        onClick={() => router.push('/profile')}
                        className="w-10 h-10 rounded-full bg-[#F8F8F8] flex items-center justify-center hover:bg-slate-200 transition-all"
                    >
                        <ChevronLeft className="w-5 h-5 text-slate-700" />
                    </button>
                    <h1 className="text-xl font-black tracking-tight text-slate-900">
                        My Orders
                    </h1>
                </div>
            </div>

            {/* LIST */}
            <div className="max-w-3xl mx-auto px-6 pt-6">
                {orders.length > 0 ? (
                    <div className="space-y-4">
                        {orders.map((order, idx) => {
                            const config = getStatusConfig(order)
                            const deliveryLine = order.status !== 'cancelled' ? getDeliveryLine(order, fallbackLabels) : null
                            const items = order.order_items || []
                            const previewItems = items.slice(0, 3)
                            const remainder = items.length - 3

                            return (
                                <motion.div
                                    key={order.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.03 }}
                                >
                                    {/* DELIVERY LINE */}
                                    {deliveryLine && (
                                        <p className="text-sm font-semibold text-emerald-600 mb-1.5 ml-1">
                                            {deliveryLine}
                                        </p>
                                    )}

                                    {/* ORDER NO + DATE */}
                                    <div className="flex items-center justify-between mb-2 px-1">
                                        <p className="text-[10px] font-semibold text-slate-400 tracking-wider">
                                            Order No: MUS-{order.id.toUpperCase()}
                                        </p>
                                        <p className="text-[10px] font-semibold text-slate-400">
                                            {formatDate(order.created_at)}
                                        </p>
                                    </div>

                                    {/* ORDER CARD */}
                                    <Link
                                        href={`/profile/orders/${order.id}`}
                                        className="block bg-white rounded-[1.25rem] border border-slate-100 hover:border-pink-100 hover:shadow-sm transition-all overflow-hidden"
                                    >
                                        <div className="p-4">
                                            {/* STATUS TOP */}
                                            <div className="flex items-center justify-between mb-3">
                                                <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${config.color}`}>
                                                    {config.label}
                                                </span>
                                            </div>

                                            {/* ITEMS PREVIEW */}
                                            <div className="space-y-2 mb-3">
                                                {previewItems.map((oi: any) => (
                                                    <div key={oi.id} className="flex items-center gap-2.5">
                                                        {oi.image_url ? (
                                                            <img
                                                                src={oi.image_url}
alt={oi.product_name || "Order item"}
                                                            className="w-10 h-10 rounded-lg object-cover bg-slate-50"
                                                        />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center">
                                                                <ImageIcon className="w-4 h-4 text-slate-300" />
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-medium text-slate-800 truncate">
                                                                {oi.product_name}
                                                            </p>
                                                            <p className="text-[10px] font-semibold text-slate-400">
                                                                ×{oi.quantity}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                                {remainder > 0 && (
                                                    <p className="text-xs font-semibold text-slate-400 ml-12">
                                                        +{remainder} more item{remainder > 1 ? 's' : ''}
                                                    </p>
                                                )}
                                            </div>

                                            {/* FOOTER */}
                                            <div className="flex items-center justify-between pt-2.5 border-t border-slate-50">
                                                <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                                    <span>{order.payment_method}</span>
                                                    <span className="text-slate-200">•</span>
                                                    <span className={order.payment_status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}>
                                                        {order.payment_status}
                                                    </span>
                                                </div>
                                                <span className="text-base font-black text-slate-900">
                                                    ₹{Math.round(Number(order.total))}
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            )
                        })}
                    </div>
                ) : (
                    /* EMPTY STATE */
                    <div className="flex flex-col items-center justify-center py-32">
                        <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mb-8 shadow-sm border border-slate-100">
                            <ShoppingBag className="w-9 h-9 text-slate-200" />
                        </div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-900 text-center mb-2">
                            No orders yet
                        </h1>
                        <p className="text-sm text-slate-400 text-center max-w-[280px] leading-relaxed">
                            Your order history will appear here
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
