"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft, ShoppingBag, Package, ImageIcon } from "lucide-react"
import { motion } from "framer-motion"

const statusVariant: Record<string, { label: string; color: string }> = {
    pending:    { label: "PENDING",    color: "bg-amber-50 text-amber-600 border-amber-200" },
    processing: { label: "PROCESSING", color: "bg-blue-50 text-blue-600 border-blue-200" },
    shipped:    { label: "SHIPPED",    color: "bg-indigo-50 text-indigo-600 border-indigo-200" },
    delivered:  { label: "DELIVERED",  color: "bg-emerald-50 text-emerald-600 border-emerald-200" },
    cancelled:  { label: "CANCELLED",  color: "bg-red-50 text-red-500 border-red-200" },
}

function getDeliveryLine(order: any): string | null {
    const addr = order.shipping_address as any
    if (!addr) return null
    const deliveryLabel = (addr as any)?.delivery_label
    if (!deliveryLabel) return null
    const created = new Date(order.created_at)
    const prefix = order.status === 'delivered' ? 'Delivered on' : 'Arriving by'
    const match = deliveryLabel.match(/(\d+)\s*-\s*\d+/)
    if (match) {
        const days = parseInt(match[1], 10)
        const d = new Date(created)
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
    const [orders] = useState(initialOrders)
    const router = useRouter()

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
                            const config = statusVariant[order.status] || statusVariant.pending
                            const deliveryLine = order.status !== 'cancelled' ? getDeliveryLine(order) : null
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
                                                                alt=""
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
