"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import {
    Search, Filter, Loader2, Clock, CheckCircle2, CookingPot,
    PackageCheck, RotateCcw, X, ChevronRight, Phone, User
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const STATUS_FLOW = ["pending", "preparing", "ready", "delivered"]
const STATUS_LABELS: Record<string, string> = {
    pending: "Pending",
    preparing: "Preparing",
    ready: "Ready",
    delivered: "Delivered",
    refunded: "Refunded",
    voided: "Voided",
}
const STATUS_COLORS: Record<string, string> = {
    pending: "bg-slate-100 text-slate-600",
    preparing: "bg-amber-50 text-amber-600",
    ready: "bg-emerald-50 text-emerald-600",
    delivered: "bg-blue-50 text-blue-600",
    refunded: "bg-red-50 text-red-600",
    voided: "bg-slate-100 text-slate-400",
}
const STATUS_ICONS: Record<string, any> = {
    pending: Clock,
    preparing: CookingPot,
    ready: CheckCircle2,
    delivered: PackageCheck,
}

function nextStatus(current: string): string | null {
    const idx = STATUS_FLOW.indexOf(current)
    return idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null
}

export default function OrdersPage() {
    const supabase = createClient()
    const [orders, setOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState<string | null>(null)
    const [search, setSearch] = useState("")
    const [processingId, setProcessingId] = useState<string | null>(null)

    useEffect(() => { fetchOrders() }, [])

    const fetchOrders = async () => {
        setLoading(true)
        const { data } = await supabase
            .from("pos_orders")
            .select(`
                *, pos_order_items(id, product_name, variant_title, quantity)
            `)
            .order("created_at", { ascending: false })
            .limit(100)
        setOrders(data || [])
        setLoading(false)
    }

    const filtered = useMemo(() => {
        let list = orders
        if (statusFilter) list = list.filter(o => o.status === statusFilter)
        if (search.trim()) {
            const q = search.toLowerCase()
            list = list.filter(o =>
                o.token_number?.toLowerCase().includes(q) ||
                o.customer_name?.toLowerCase().includes(q) ||
                o.customer_phone?.includes(q)
            )
        }
        return list
    }, [orders, statusFilter, search])

    const handleStatusChange = async (orderId: string, newStatus: string) => {
        setProcessingId(orderId)
        try {
            const update: any = { status: newStatus }
            if (newStatus === "preparing") update.prepared_at = new Date().toISOString()
            if (newStatus === "ready") update.ready_at = new Date().toISOString()
            if (newStatus === "delivered") update.delivered_at = new Date().toISOString()
            if (newStatus === "refunded") update.payment_status = "refunded"

            const { error } = await supabase.from("pos_orders").update(update).eq("id", orderId)
            if (error) throw error

            // Restore stock on refund
            if (newStatus === "refunded") {
                const { data: items } = await supabase
                    .from("pos_order_items")
                    .select("variant_id, quantity")
                    .eq("pos_order_id", orderId)
                if (items) {
                    for (const item of items) {
                        const { data: v } = await supabase
                            .from("product_variants")
                            .select("stock")
                            .eq("id", item.variant_id)
                            .single()
                        if (v) {
                            await supabase
                                .from("product_variants")
                                .update({ stock: (v.stock || 0) + item.quantity })
                                .eq("id", item.variant_id)
                        }
                    }
                }
            }

            fetchOrders()
            toast.success(`Order marked as ${STATUS_LABELS[newStatus] || newStatus}`)
        } catch (err: any) {
            toast.error(err.message || "Failed to update status")
        } finally {
            setProcessingId(null)
        }
    }

    const StatsBar = () => {
        const counts: Record<string, number> = {}
        orders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1 })
        return (
            <div className="flex gap-3">
                {["pending", "preparing", "ready", "delivered"].map(status => (
                    <button
                        key={status}
                        onClick={() => setStatusFilter(statusFilter === status ? null : status)}
                        className={`flex items-center gap-2 h-10 px-4 rounded-xl text-xs font-bold transition-all ${
                            statusFilter === status
                                ? "bg-slate-900 text-white"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                    >
                        {status === "preparing" && <CookingPot className="w-3.5 h-3.5" />}
                        {status === "ready" && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {status === "delivered" && <PackageCheck className="w-3.5 h-3.5" />}
                        {status === "pending" && <Clock className="w-3.5 h-3.5" />}
                        {STATUS_LABELS[status]}
                        {counts[status] > 0 && (
                            <span className="ml-1 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                                {counts[status]}
                            </span>
                        )}
                    </button>
                ))}
                {statusFilter && (
                    <button onClick={() => setStatusFilter(null)} className="text-xs text-slate-400 hover:text-slate-600">
                        Clear
                    </button>
                )}
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col p-6 space-y-6 overflow-y-auto">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-black tracking-tight">Orders</h1>
                <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search by token, name, or phone..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9 h-10 text-sm"
                    />
                </div>
            </div>

            <StatsBar />

            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-slate-300">
                    <PackageCheck className="w-12 h-12 mb-3" />
                    <p className="text-sm font-medium">No orders found</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(order => {
                        const next = nextStatus(order.status)
                        const StatusIcon = STATUS_ICONS[order.status] || Clock
                        return (
                            <div
                                key={order.id}
                                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-5">
                                        {/* Token */}
                                        <div className="text-center min-w-[80px]">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                {order.token_prefix}{order.token_number}
                                            </p>
                                            <p className="text-3xl font-black text-slate-900 tracking-tight">
                                                {order.token_number}
                                            </p>
                                        </div>
                                        {/* Details */}
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_COLORS[order.status] || "bg-slate-100 text-slate-500"}`}>
                                                    <StatusIcon className="w-3 h-3" />
                                                    {STATUS_LABELS[order.status] || order.status}
                                                </span>
                                                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                                                    order.payment_status === "paid" ? "text-emerald-600" : "text-amber-600"
                                                }`}>
                                                    {order.payment_status === "paid" ? "Paid" : "Unpaid"}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-medium uppercase">
                                                    {order.order_type === "kiosk" ? "Kiosk" : "Counter"}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-slate-500">
                                                {order.customer_name && (
                                                    <span className="flex items-center gap-1">
                                                        <User className="w-3 h-3" /> {order.customer_name}
                                                    </span>
                                                )}
                                                {order.customer_phone && (
                                                    <span className="flex items-center gap-1">
                                                        <Phone className="w-3 h-3" /> {order.customer_phone}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mt-2 text-xs text-slate-400 space-y-0.5">
                                                {(order.pos_order_items || []).map((item: any) => (
                                                    <p key={item.id}>
                                                        {item.product_name}{item.variant_title ? ` (${item.variant_title})` : ""} × {item.quantity}
                                                    </p>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-2">
                                        <p className="text-xl font-black">₹{order.grand_total?.toLocaleString()}</p>
                                        <p className="text-[10px] text-slate-400">
                                            {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                        </p>
                                        <div className="flex gap-2">
                                            {order.status === "pending" && order.payment_status === "pending" && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        supabase.from("pos_orders").update({ payment_status: "paid" }).eq("id", order.id)
                                                            .then(() => fetchOrders())
                                                    }}
                                                    className="h-8 px-3 text-[10px] font-bold bg-emerald-500 hover:bg-emerald-600 text-white border-none"
                                                >
                                                    Mark Paid
                                                </Button>
                                            )}
                                            {next && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleStatusChange(order.id, next)}
                                                    disabled={processingId === order.id}
                                                    className="h-8 px-3 text-[10px] font-bold bg-slate-900 hover:bg-slate-800 text-white border-none"
                                                >
                                                    {processingId === order.id ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        <>
                                                            {next === "preparing" && <>Start Preparing</>}
                                                            {next === "ready" && <>Mark Ready</>}
                                                            {next === "delivered" && <>Delivered</>}
                                                        </>
                                                    )}
                                                </Button>
                                            )}
                                            {order.status !== "refunded" && order.status !== "voided" && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleStatusChange(order.id, "refunded")}
                                                    className="h-8 px-2 text-slate-300 hover:text-red-500 hover:bg-red-50"
                                                >
                                                    <RotateCcw className="w-3.5 h-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
