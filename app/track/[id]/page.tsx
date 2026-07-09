import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { STATUS_LABELS, STATUS_TIMESTAMPS } from "@/lib/order-status"
import { Clock, CheckCircle2, Package, Truck, XCircle, Store } from "lucide-react"
import Link from "next/link"

type tParams = Promise<{ id: string }>

const statusIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    pending: Clock,
    confirmed: CheckCircle2,
    processing: Package,
    shipped: Truck,
    out_for_delivery: Truck,
    delivered: CheckCircle2,
    failed_delivery: XCircle,
    ready_for_pickup: Store,
    picked_up: CheckCircle2,
    no_show: XCircle,
    cancelled: XCircle,
}

function formatDate(dateStr: string | null | undefined): string | null {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    })
}

function getTimelineSteps(order: any): string[] {
    const isPickup = order.order_type === "pickup"
    const baseSteps = isPickup
        ? ["pending", "confirmed", "processing", "ready_for_pickup", "picked_up"]
        : ["pending", "confirmed", "processing", "shipped", "out_for_delivery", "delivered"]

    if (order.status === "cancelled") {
        const checkOrder = isPickup
            ? ["ready_for_pickup", "confirmed"]
            : ["out_for_delivery", "confirmed"]
        let lastIdx = 0
        for (const s of checkOrder) {
            const tsCol = STATUS_TIMESTAMPS[s]
            if (tsCol && order[tsCol]) {
                const idx = baseSteps.indexOf(s)
                if (idx >= 0) lastIdx = idx
                break
            }
        }
        return [...baseSteps.slice(0, lastIdx + 1), "cancelled"]
    }

    if (order.status === "failed_delivery") {
        return [...baseSteps.slice(0, -1), "failed_delivery"]
    }

    if (order.status === "no_show") {
        return [...baseSteps.slice(0, -1), "no_show"]
    }

    return baseSteps
}

export default async function PublicTrackingPage(props: { params: tParams }) {
    const { id } = await props.params
    const supabase = await createClient()

    const { data: order, error } = await supabase
        .from("orders")
        .select(`
            id, status, created_at, shipping_label, shipping_price,
            shipping_address, total, payment_status, payment_method,
            order_type, promo_code, promo_discount_amount,
            delivered_at, confirmed_at, out_for_delivery_at,
            failed_delivery_at, ready_for_pickup_at, picked_up_at, no_show_at,
            order_items(id, product_name, variant_title, quantity, unit_price, mrp)
        `)
        .eq("id", id)
        .single()

    if (error || !order) return notFound()

    const steps = getTimelineSteps(order)
    const currentIdx = steps.indexOf(order.status)

    const address = order.shipping_address || {}

    return (
        <div className="min-h-screen bg-slate-50 py-20 px-4">
            <div className="max-w-2xl mx-auto space-y-6">

                {/* Brand Header */}
                <div className="text-center">
                    <Link href="/" className="inline-flex flex-col items-center group">
                        <span className="text-2xl md:text-3xl font-black font-daciana tracking-[0.15em] leading-none text-slate-900 group-hover:text-[#fc2779] transition-colors uppercase">
                            THE MAKEUP STORE
                        </span>
                        <span className="text-[8px] md:text-[9px] font-bold tracking-[0.3em] text-slate-400 uppercase whitespace-nowrap mt-1">
                            WANGKHEI
                        </span>
                    </Link>
                </div>

                {/* Timeline Card */}
                <div className="rounded-[2.5rem] border bg-white p-8 md:p-12 shadow-sm">
                    <div className="text-center mb-10">
                        <h1 className="text-3xl font-black uppercase tracking-tighter">Track Order</h1>
                        <p className="text-slate-400 font-mono text-xs mt-2 uppercase">ID: {order.id.slice(0, 8)}</p>
                    </div>

                    <div className="relative space-y-8">
                        {steps.map((status, idx) => {
                            const Icon = statusIcons[status] || Clock
                            const isCompleted = idx < currentIdx
                            const isCurrent = idx === currentIdx
                            const isFailure = status === "failed_delivery" || status === "no_show" || status === "cancelled"
                            const tsCol = STATUS_TIMESTAMPS[status]
                            const timestamp = tsCol ? (order as any)[tsCol] : null
                            const showCheckmark = isCompleted && !isFailure

                            return (
                                <div key={status} className="flex items-start gap-4 relative">
                                    {idx !== steps.length - 1 && (
                                        <div
                                            className={`absolute left-5 top-10 w-0.5 h-10 ${
                                                idx < currentIdx ? "bg-[#fc2779]" : "bg-slate-100"
                                            }`}
                                        />
                                    )}

                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 flex-shrink-0 transition-colors ${
                                            isCurrent
                                                ? "bg-[#fc2779] border-[#fc2779] text-white shadow-lg shadow-[#fc2779]/20"
                                                : isCompleted
                                                  ? "bg-[#fc2779] border-[#fc2779] text-white"
                                                  : "bg-white border-slate-100 text-slate-300"
                                        }`}
                                    >
                                        {showCheckmark ? (
                                            <CheckCircle2 className="w-5 h-5" />
                                        ) : (
                                            <Icon className="w-5 h-5" />
                                        )}
                                    </div>

                                    <div className="pt-1 min-w-0">
                                        <p
                                            className={`font-black uppercase text-sm tracking-tight ${
                                                isCompleted || isCurrent
                                                    ? isFailure
                                                        ? "text-red-500"
                                                        : "text-slate-900"
                                                    : "text-slate-300"
                                            }`}
                                        >
                                            {STATUS_LABELS[status] || status}
                                        </p>
                                        {status === "pending" && (
                                            <p className="text-xs text-slate-400 font-medium mt-0.5">
                                                {formatDate(order.created_at)}
                                            </p>
                                        )}
                                        {timestamp && (
                                            <p className="text-xs text-slate-400 font-medium mt-0.5">
                                                {formatDate(timestamp)}
                                            </p>
                                        )}
                                        {isCurrent && !isFailure && (
                                            <Badge
                                                variant="outline"
                                                className="mt-1 text-[9px] font-bold uppercase bg-rose-50 text-[#fc2779] border-rose-200"
                                            >
                                                Current Status
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Order Details Card */}
                <div className="rounded-[2.5rem] border bg-white p-8 md:p-12 shadow-sm space-y-8">
                    <h2 className="text-lg font-black uppercase tracking-tight text-slate-900">Order Details</h2>

                    <div className="grid grid-cols-2 gap-6 text-sm">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Order ID</p>
                            <p className="font-mono font-semibold text-slate-900 uppercase">{order.id.slice(0, 8)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date</p>
                            <p className="font-medium text-slate-900">{formatDate(order.created_at)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total</p>
                            <p className="font-black text-slate-900">₹{Number(order.total).toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Payment</p>
                            <p className="font-medium text-slate-900 capitalize">{order.payment_method || "—"}</p>
                            {order.payment_status && (
                                <span
                                    className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                                        order.payment_status === "paid"
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                            : order.payment_status === "refunded"
                                              ? "bg-red-50 text-red-600 border-red-200"
                                              : "bg-amber-50 text-amber-700 border-amber-200"
                                    }`}
                                >
                                    {order.payment_status}
                                </span>
                            )}
                        </div>
                        {order.order_type && (
                            <div className="col-span-2">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Order Type</p>
                                <p className="font-medium text-slate-900 capitalize">{order.order_type}</p>
                            </div>
                        )}
                        {order.promo_code && (
                            <div className="col-span-2">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Promo Code</p>
                                <p className="font-medium text-slate-900">
                                    {order.promo_code}
                                    {order.promo_discount_amount
                                        ? ` (-₹${Number(order.promo_discount_amount).toLocaleString()})`
                                        : ""}
                                </p>
                            </div>
                        )}
                    </div>

                    {address.full_name && (
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                Shipping Address
                            </p>
                            <div className="bg-slate-50 rounded-2xl p-4 text-sm text-slate-700 space-y-0.5">
                                <p className="font-semibold text-slate-900">{address.full_name}</p>
                                {address.phone && <p>{address.phone}</p>}
                                {address.street && <p>{address.street}</p>}
                                {address.area_name && <p>{address.area_name}</p>}
                                {address.pincode && <p>PIN: {address.pincode}</p>}
                            </div>
                        </div>
                    )}

                    {order.order_items && order.order_items.length > 0 && (
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                                Items ({order.order_items.length})
                            </p>
                            <div className="divide-y divide-slate-100">
                                {order.order_items.map((item: any) => (
                                    <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                                        <div className="min-w-0">
                                            <p className="font-bold text-sm text-slate-900 uppercase truncate">
                                                {item.product_name}
                                            </p>
                                            {item.variant_title && (
                                                <p className="text-xs text-slate-500 font-medium mt-0.5">
                                                    {item.variant_title}
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="font-bold text-sm text-slate-900">
                                                ₹{Number(item.unit_price).toLocaleString()}
                                            </p>
                                            <p className="text-xs text-slate-400">x{item.quantity}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="pt-4 border-t border-dashed border-slate-200 text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Carrier</p>
                        <div className="flex items-center justify-center gap-2 font-bold text-slate-900">
                            <Truck className="w-4 h-4 text-slate-400" />
                            {order.shipping_label || "Standard Delivery"}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
