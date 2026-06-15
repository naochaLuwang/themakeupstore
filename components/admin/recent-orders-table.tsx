"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import {
    Sheet, SheetContent,
} from "@/components/ui/sheet"
import { Eye, Package, CreditCard, User, Calendar, Tag, X } from "lucide-react"

const statusStyles: Record<string, string> = {
    pending: "bg-amber-50 text-amber-600 border-amber-200",
    processing: "bg-blue-50 text-blue-600 border-blue-200",
    shipped: "bg-purple-50 text-purple-600 border-purple-200",
    delivered: "bg-emerald-50 text-emerald-600 border-emerald-200",
    cancelled: "bg-red-50 text-red-600 border-red-200",
}

export function RecentOrdersTable({ orders }: { orders: any[] }) {
    const [selected, setSelected] = useState<any | null>(null)

    return (
        <>
            <div className="relative w-full overflow-auto">
                <table className="w-full caption-bottom text-sm">
                    <thead>
                        <tr className="border-b border-slate-100">
                            <th className="py-3 px-4 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Order ID</th>
                            <th className="py-3 px-4 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Customer</th>
                            <th className="py-3 px-4 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                            <th className="py-3 px-4 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total</th>
                            <th className="py-3 px-4 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Quick View</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.length === 0 ? (
                            <tr><td colSpan={5} className="h-24 text-center text-slate-400 text-xs">No orders found in this range.</td></tr>
                        ) : (
                            orders.map((order) => (
                                <tr key={order.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                    <td className="py-3 px-4 font-mono text-xs font-medium text-slate-700">#{order.id.slice(0, 8)}</td>
                                    <td className="py-3 px-4 text-xs text-slate-700">{order.profiles?.full_name || "Guest"}</td>
                                    <td className="py-3 px-4">
                                        <Badge variant="outline"
                                            className={`uppercase text-[9px] font-semibold px-1.5 py-0.5 border ${statusStyles[order.status] || "bg-slate-50 text-slate-600"}`}
                                        >
                                            {order.status}
                                        </Badge>
                                    </td>
                                    <td className="py-3 px-4 text-xs font-bold text-emerald-600">₹{Number(order.total).toLocaleString('en-IN')}</td>
                                    <td className="py-3 px-4 text-right">
                                        <button onClick={() => setSelected(order)}
                                            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-slate-500 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                        >
                                            <Eye className="w-3 h-3" />
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <Sheet open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null) }}>
                <SheetContent className="w-[420px] sm:w-[480px] p-0 overflow-y-auto">
                    {selected && <QuickViewContent order={selected} onClose={() => setSelected(null)} />}
                </SheetContent>
            </Sheet>
        </>
    )
}

function QuickViewContent({ order, onClose }: { order: any; onClose: () => void }) {
    const items = order.order_items || []
    const subtotal = items.reduce((s: number, i: any) => s + (i.quantity || 1) * Number(i.unit_price || 0), 0)
    const total = Number(order.total || 0)

    return (
        <div className="p-5 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs text-slate-400 font-mono">#{order.id}</p>
                    <p className="text-base font-bold text-slate-900 tracking-tight mt-0.5">Order Details</p>
                </div>
                <button onClick={onClose}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                    <X className="w-3.5 h-3.5 text-slate-400" />
                </button>
            </div>

            {/* Status badges */}
            <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md border ${
                    statusStyles[order.status] || "bg-slate-50 text-slate-600"
                }`}>
                    {order.status}
                </span>
                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md border ${
                    order.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                    order.payment_status === 'refunded' ? 'bg-red-50 text-red-600 border-red-200' :
                    'bg-amber-50 text-amber-600 border-amber-200'
                }`}>
                    {order.payment_status || "unpaid"}
                </span>
            </div>

            {/* Info rows */}
            <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <div className="min-w-0">
                        <p className="text-[10px] text-slate-400">Customer</p>
                        <p className="text-xs font-medium text-slate-700 truncate">{order.profiles?.full_name || "Guest"}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <div className="min-w-0">
                        <p className="text-[10px] text-slate-400">Date</p>
                        <p className="text-xs font-medium text-slate-700">{new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50">
                    <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <div className="min-w-0">
                        <p className="text-[10px] text-slate-400">Payment</p>
                        <p className="text-xs font-medium text-slate-700">{order.payment_method || "COD"}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50">
                    <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <div className="min-w-0">
                        <p className="text-[10px] text-slate-400">Promo</p>
                        <p className="text-xs font-medium text-slate-700">{order.promo_code || "—"}</p>
                    </div>
                </div>
            </div>

            {/* Items */}
            <div>
                <div className="flex items-center gap-1.5 mb-2">
                    <Package className="w-3 h-3 text-slate-400" />
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Items ({items.length})</span>
                </div>
                <div className="space-y-1">
                    {items.map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-50">
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-slate-700 truncate">{item.product_name}</p>
                                <p className="text-[10px] text-slate-400">×{item.quantity} @ ₹{Number(item.unit_price || 0).toLocaleString('en-IN')}</p>
                            </div>
                            <p className="text-xs font-bold text-slate-700">₹{((item.quantity || 1) * Number(item.unit_price || 0)).toLocaleString('en-IN')}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Total */}
            <div className="border-t border-slate-100 pt-3 space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                {order.promo_code && (
                    <div className="flex items-center justify-between text-xs text-emerald-600">
                        <span>Discount ({order.promo_code})</span>
                        <span>-₹{(subtotal - total).toLocaleString('en-IN')}</span>
                    </div>
                )}
                <div className="flex items-center justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-100">
                    <span>Total</span>
                    <span>₹{total.toLocaleString('en-IN')}</span>
                </div>
            </div>
        </div>
    )
}
