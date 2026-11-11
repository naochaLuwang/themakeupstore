"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import {
    Sheet, SheetContent,
} from "@/components/ui/sheet"
import { Eye, Package, CreditCard, User, Calendar, Tag, X } from "lucide-react"

const statusStyles: Record<string, string> = {
    pending: "bg-amber-50 text-amber-600 border-amber-200",
    packed: "bg-blue-50 text-blue-600 border-blue-200",
    shipped: "bg-purple-50 text-purple-600 border-purple-200",
    delivered: "bg-emerald-50 text-emerald-600 border-emerald-200",
    cancelled: "bg-red-50 text-red-600 border-red-200",
}

export function RecentOrdersTable({ orders }: { orders: any[] }) {
    const [selected, setSelected] = useState<any | null>(null)

    return (
        <>
            <div className="relative w-full overflow-auto overflow-x-auto min-w-0 max-w-full">
                <table className="w-full caption-bottom text-sm">
                    <thead>
                        <tr className="border-b border-slate-100">
                            <th className="py-3 px-3 sm:px-5 text-left text-xs font-semibold text-slate-500 tracking-normal">Order ID</th>
                            <th className="py-3 px-3 sm:px-5 text-left text-xs font-semibold text-slate-500 tracking-normal hidden sm:table-cell">Customer</th>
                            <th className="py-3 px-3 sm:px-5 text-left text-xs font-semibold text-slate-500 tracking-normal">Status</th>
                            <th className="py-3 px-3 sm:px-5 text-left text-xs font-semibold text-slate-500 tracking-normal">Total</th>
                            <th className="py-3 px-3 sm:px-5 text-right text-xs font-semibold text-slate-500 tracking-normal">View</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.length === 0 ? (
                            <tr><td colSpan={5} className="h-24 text-center text-slate-500 text-xs tabular-nums">No orders found in this range.</td></tr>
                        ) : (
                            orders.map((order) => (
                                <tr key={order.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                    <td className="py-3 px-3 sm:px-5 font-mono text-xs font-medium text-slate-700 truncate max-w-[80px] sm:max-w-none tabular-nums">#{order.id.slice(0, 8)}</td>
                                    <td className="py-3 px-3 sm:px-5 text-xs text-slate-700 hidden sm:table-cell truncate max-w-[120px] tabular-nums">{order.profiles?.full_name || "Guest"}</td>
                                    <td className="py-3 px-3 sm:px-5 tabular-nums">
                                        <Badge variant="outline"
                                            className={`text-xs font-semibold px-1.5 py-0.5 border ${statusStyles[order.status] || "bg-slate-50 text-slate-600"}`}
                                        >
                                            {order.status}
                                        </Badge>
                                    </td>
                                    <td className="py-3 px-3 sm:px-5 text-xs font-semibold text-emerald-600 tabular-nums">₹{Number(order.total).toLocaleString('en-IN')}</td>
                                    <td className="py-3 px-3 sm:px-5 text-right tabular-nums">
                                        <button onClick={() => setSelected(order)}
                                            className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-1 text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                        >
                                            <Eye className="w-4 h-4 stroke-[1.5]" />
                                            <span className="hidden sm:inline">View</span>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <Sheet open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null) }}>
                <SheetContent className="w-full sm:w-[480px] sm:max-w-[480px] p-0 overflow-y-auto [&>button]:flex [&>button]:h-9 [&>button]:w-9 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-lg [&>button]:border [&>button]:border-slate-200 [&>button]:bg-white">
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
                <div className="min-w-0 pr-12">
                    <p className="truncate text-xs text-slate-500 font-mono">#{order.id}</p>
                    <p className="text-base font-semibold text-slate-900 tracking-tight mt-0.5">Order Details</p>
                </div>
                <button onClick={onClose}
                    className="hidden w-7 h-7 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                    <X className="w-4 h-4 text-slate-500 stroke-[1.5]" />
                </button>
            </div>

            {/* Status badges */}
            <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-2 py-1 rounded-md border ${
                    statusStyles[order.status] || "bg-slate-50 text-slate-600"
                }`}>
                    {order.status}
                </span>
                <span className={`text-xs font-semibold px-2 py-1 rounded-md border ${
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
                    <User className="w-4 h-4 text-slate-500 shrink-0 stroke-[1.5]" />
                    <div className="min-w-0">
                        <p className="text-xs text-slate-500">Customer</p>
                        <p className="text-xs font-medium text-slate-700 truncate">{order.profiles?.full_name || "Guest"}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50">
                    <Calendar className="w-4 h-4 text-slate-500 shrink-0 stroke-[1.5]" />
                    <div className="min-w-0">
                        <p className="text-xs text-slate-500">Date</p>
                        <p className="text-xs font-medium text-slate-700">{new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50">
                    <CreditCard className="w-4 h-4 text-slate-500 shrink-0 stroke-[1.5]" />
                    <div className="min-w-0">
                        <p className="text-xs text-slate-500">Payment</p>
                        <p className="text-xs font-medium text-slate-700">{order.payment_method || "COD"}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50">
                    <Tag className="w-4 h-4 text-slate-500 shrink-0 stroke-[1.5]" />
                    <div className="min-w-0">
                        <p className="text-xs text-slate-500">Promo</p>
                        <p className="text-xs font-medium text-slate-700">{order.promo_code || "—"}</p>
                    </div>
                </div>
            </div>

            {/* Items */}
            <div>
                <div className="flex items-center gap-1.5 mb-2">
                    <Package className="w-4 h-4 text-slate-500 stroke-[1.5]" />
                    <span className="text-xs font-semibold text-slate-500 tracking-normal">Items ({items.length})</span>
                </div>
                <div className="space-y-1">
                    {items.map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-50">
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-slate-700 truncate">{item.product_name}</p>
                                <p className="text-xs text-slate-500">×{item.quantity} @ ₹{Number(item.unit_price || 0).toLocaleString('en-IN')}</p>
                            </div>
                            <p className="text-xs font-semibold text-slate-700">₹{((item.quantity || 1) * Number(item.unit_price || 0)).toLocaleString('en-IN')}</p>
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
                <div className="flex items-center justify-between text-sm font-semibold text-slate-900 pt-1 border-t border-slate-100">
                    <span>Total</span>
                    <span>₹{total.toLocaleString('en-IN')}</span>
                </div>
            </div>
        </div>
    )
}
