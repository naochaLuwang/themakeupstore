"use client"

import { cancelOrderAndRestoreStock, updateOrderStatus } from "@/app/actions/orders"
import { getDeliveryPartners } from "@/app/actions/delivery-partners"
import { STATUS_LABELS, getValidNextStatuses, getTypeStatuses } from "@/lib/order-status"
import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/utils/supabase/client"
import { Input } from "@/components/ui/input"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { format, startOfDay, endOfDay, subDays } from "date-fns"
import {
    Eye, Clock, Calendar as CalendarIcon, FilterX, Search, ChevronDown,
    ShoppingBag, PackageCheck, X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DateRange } from "react-day-picker"

const GROUP_TABS = [
    { id: "pending", label: "Pending" },
    { id: "active", label: "Active" },
    { id: "completed", label: "Completed" },
    { id: "cancelled", label: "Cancelled" },
]

const DELIVERY_ACTIVE = ["confirmed", "packed", "shipped", "out_for_delivery", "failed_delivery"]
const PICKUP_ACTIVE = ["confirmed", "packed", "ready_for_pickup", "no_show"]

function getGroupForOrder(order: any): string {
    if (order.status === "pending") return "pending"
    if (order.status === "cancelled") return "cancelled"
    const type = order.order_type || "delivery"
    if (type === "delivery") {
        if (order.status === "delivered") return "completed"
        if (DELIVERY_ACTIVE.includes(order.status)) return "active"
    } else {
        if (order.status === "picked_up") return "completed"
        if (PICKUP_ACTIVE.includes(order.status)) return "active"
    }
    return "pending"
}

export default function AdminOrdersPage() {
    const supabase = createClient()
    const [orders, setOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [activeTab, setActiveTab] = useState("pending")
    const [paymentFilter, setPaymentFilter] = useState<string>("all")
    const [partnerFilter, setPartnerFilter] = useState<string>("all")
    const [date, setDate] = useState<DateRange | undefined>({
        from: subDays(new Date(), 30),
        to: new Date(),
    })
    const [deliveryPartners, setDeliveryPartners] = useState<any[]>([])
    const [shipModal, setShipModal] = useState<{ orderId: string; orderType: string } | null>(null)
    const [shipPartnerId, setShipPartnerId] = useState("")
    const [shipTracking, setShipTracking] = useState("")
    const [cancelModal, setCancelModal] = useState<{ orderId: string } | null>(null)
    const [cancelReason, setCancelReason] = useState("")

    useEffect(() => {
        fetchOrders()
        getDeliveryPartners().then(setDeliveryPartners).catch(() => {})
    }, [date])

    async function fetchOrders() {
        setLoading(true)
        let query = supabase
            .from('orders')
            .select(`*, order_items(*)`)
            .order('created_at', { ascending: false })
            .limit(1000)

        if (date?.from) query = query.gte('created_at', startOfDay(date.from).toISOString())
        if (date?.to) query = query.lte('created_at', endOfDay(date.to).toISOString())

        const { data, error } = await query
        if (error) toast.error("Failed to load orders")
        else setOrders(data || [])
        setLoading(false)
    }

    const stats = useMemo(() => {
        const pending = orders.filter(o => getGroupForOrder(o) === "pending").length
        const active = orders.filter(o => getGroupForOrder(o) === "active").length
        const totalRev = orders.filter(o => o.payment_status === 'paid').reduce((acc, curr) => acc + Number(curr.total), 0)
        return { pending, active, totalRev }
    }, [orders])

    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            if (activeTab !== "all" && getGroupForOrder(order) !== activeTab) return false
            if (paymentFilter !== "all" && order.payment_status !== paymentFilter) return false
            if (partnerFilter !== "all" && order.delivery_partner_id !== partnerFilter) return false
            const q = searchQuery.toLowerCase()
            return !q ||
                order.shipping_address?.full_name?.toLowerCase().includes(q) ||
                order.id.toLowerCase().includes(q) ||
                order.shipping_address?.phone?.includes(q)
        })
    }, [orders, activeTab, searchQuery, paymentFilter, partnerFilter])

    const tabCounts = useMemo(() => {
        const counts: Record<string, number> = {}
        for (const tab of GROUP_TABS) {
            counts[tab.id] = orders.filter(o => getGroupForOrder(o) === tab.id).length
        }
        return counts
    }, [orders])

    async function updateOrderType(orderId: string, currentType: string, currentStatus: string) {
        const newType = currentType === "delivery" ? "pickup" : "delivery"
        const update: Record<string, any> = { order_type: newType }
        const allowed = getTypeStatuses(newType)
        if (!allowed.includes(currentStatus)) update.status = "pending"
        const { error } = await supabase.from('orders').update(update).eq('id', orderId)
        if (error) return toast.error("Failed to update order type")
        toast.success(`Order type changed to ${newType}${update.status ? ", status reset" : ""}`)
        fetchOrders()
    }

    async function updateStatus(orderId: string, field: 'status' | 'payment_status', val: string) {
        const currentOrder = orders.find(o => o.id === orderId)

        if (field === 'status' && val === 'cancelled') {
            const protectedStatuses = ['shipped', 'out_for_delivery', 'delivered', 'picked_up']
            if (currentOrder && protectedStatuses.includes(currentOrder.status)) {
                toast.error(`Cannot cancel order once it is ${currentOrder.status}`)
                fetchOrders()
                return
            }

            setCancelModal({ orderId })
            setCancelReason("")
            return
        }

        if (field === 'payment_status') {
            const { error } = await supabase.from('orders').update({ payment_status: val }).eq('id', orderId)
            if (error) toast.error("Payment status update failed")
            else toast.success("Payment status updated")
            fetchOrders()
            return
        }

        if (field === 'status' && val === 'shipped') {
            const currentOrder = orders.find(o => o.id === orderId)
            setShipModal({ orderId, orderType: currentOrder?.order_type || 'delivery' })
            setShipPartnerId("")
            setShipTracking("")
            return
        }

        setLoading(true)
        const res = await updateOrderStatus(orderId, val)
        if (!res.success) toast.error(res.message || "Status update failed")
        else toast.success("Order status updated")
        setLoading(false)
        fetchOrders()
    }

    async function handleShipConfirm() {
        if (!shipModal) return
        setLoading(true)
        const res = await updateOrderStatus(shipModal.orderId, 'shipped', shipPartnerId || undefined, shipTracking || undefined)
        if (!res.success) toast.error(res.message || "Status update failed")
        else toast.success("Order marked as shipped")
        setLoading(false)
        setShipModal(null)
        fetchOrders()
    }

    const StatusBadge = ({ status }: { status: string }) => {
        const colors: Record<string, string> = {
            pending: "bg-amber-50 text-amber-700 border-amber-200",
            confirmed: "bg-blue-50 text-blue-700 border-blue-200",
            packed: "bg-indigo-50 text-indigo-700 border-indigo-200",
            shipped: "bg-sky-50 text-sky-700 border-sky-200",
            out_for_delivery: "bg-purple-50 text-purple-700 border-purple-200",
            failed_delivery: "bg-red-50 text-red-700 border-red-200",
            ready_for_pickup: "bg-teal-50 text-teal-700 border-teal-200",
            no_show: "bg-orange-50 text-orange-700 border-orange-200",
            delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
            picked_up: "bg-green-50 text-green-700 border-green-200",
            cancelled: "bg-slate-100 text-slate-500 border-slate-200",
        }
        return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${colors[status] || "bg-slate-50 text-slate-500 border-slate-200"}`}>
                {STATUS_LABELS[status] || status}
            </span>
        )
    }

    return (
        <div className="space-y-6">

            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">Orders</h1>
                    <p className="text-sm text-slate-500">Manage fulfillment and track revenue.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-amber-50 border border-amber-200">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-bold text-amber-700">{stats.pending} pending</span>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-indigo-50 border border-indigo-200">
                        <PackageCheck className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-bold text-indigo-700">{stats.active} active</span>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
                        <span className="text-xs font-bold text-emerald-700">₹{stats.totalRev.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* GROUPED TABS */}
            <div className="flex flex-wrap items-center gap-1.5 bg-white rounded-2xl border border-slate-200 p-1.5 shadow-sm">
                {GROUP_TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            activeTab === tab.id
                                ? "bg-slate-900 text-white shadow-sm"
                                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                        }`}
                    >
                        {tab.label}
                        <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] ${
                            activeTab === tab.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                        }`}>
                            {tabCounts[tab.id] || 0}
                        </span>
                    </button>
                ))}
            </div>

            {/* PAYMENT FILTER */}
            <div className="flex flex-wrap items-center gap-1.5">
                {[
                    { id: "all", label: "All" },
                    { id: "paid", label: "Paid" },
                    { id: "unpaid", label: "Unpaid" },
                    { id: "refunded", label: "Refunded" },
                ].map(opt => (
                    <button
                        key={opt.id}
                        onClick={() => setPaymentFilter(opt.id)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
                            paymentFilter === opt.id
                                ? opt.id === "paid" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                                  opt.id === "unpaid" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                                  opt.id === "refunded" ? "bg-red-50 text-red-600 border border-red-200" :
                                  "bg-slate-900 text-white"
                                : "bg-white text-slate-500 border border-slate-200 hover:border-slate-300"
                        }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            {/* PARTNER FILTER */}
            <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Partner</span>
                <Select value={partnerFilter} onValueChange={setPartnerFilter}>
                    <SelectTrigger className="h-9 w-44 rounded-xl border-slate-200 bg-white text-xs font-medium">
                        <SelectValue placeholder="All partners" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                        <SelectItem value="all" className="text-xs">All Partners</SelectItem>
                        {deliveryPartners.filter(p => p.is_active).map(p => (
                            <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* SEARCH & DATE FILTER */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by name, phone, or order ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-11 pl-10 pr-4 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-200 focus:bg-white transition-all"
                    />
                </div>
                <Popover>
                    <PopoverTrigger asChild>
                        <button className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium flex items-center gap-2 hover:bg-slate-50 transition-all whitespace-nowrap">
                            <CalendarIcon className="w-4 h-4 text-slate-400" />
                            {date?.from ? (date.to ? `${format(date.from, "d MMM")} – ${format(date.to, "d MMM")}` : format(date.from, "d MMM")) : "Select dates"}
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                        <Calendar mode="range" selected={date} onSelect={setDate} numberOfMonths={1} />
                    </PopoverContent>
                </Popover>
                {date && (
                    <button onClick={() => setDate(undefined)}
                        className="h-11 w-11 rounded-xl border border-slate-200 bg-white flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all text-slate-400"
                    >
                        <FilterX className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* DESKTOP TABLE */}
            <div className="hidden lg:block rounded-2xl border bg-white overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow className="border-b border-slate-100">
                            <TableHead className="py-4 px-6 font-bold text-slate-600 text-xs uppercase tracking-wider">Order</TableHead>
                            <TableHead className="py-4 px-6 font-bold text-slate-600 text-xs uppercase tracking-wider">Customer</TableHead>
                            <TableHead className="py-4 px-6 font-bold text-slate-600 text-xs uppercase tracking-wider">Type</TableHead>
                            <TableHead className="py-4 px-6 font-bold text-slate-600 text-xs uppercase tracking-wider">Payment</TableHead>
                            <TableHead className="py-4 px-6 font-bold text-slate-600 text-xs uppercase tracking-wider">Fulfillment</TableHead>
                            <TableHead className="py-4 px-6 font-bold text-slate-600 text-xs uppercase tracking-wider">Partner</TableHead>
                            <TableHead className="py-4 px-6 font-bold text-slate-600 text-xs uppercase tracking-wider text-right">Total</TableHead>
                            <TableHead className="py-4 px-6 text-right font-bold text-slate-600 text-xs uppercase tracking-wider">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredOrders.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} className="h-32 text-center text-slate-400 font-medium">
                                    {loading ? "Loading..." : "No orders found"}
                                </TableCell>
                            </TableRow>
                        )}
                        {filteredOrders.map((order) => {
                            const orderType = order.order_type || "delivery"
                            const validNext = getValidNextStatuses(orderType, order.status)
                            return (
                                <TableRow key={order.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                                    <TableCell className="py-4 px-6">
                                        <div className="flex flex-col">
                                            <span className="font-mono text-xs font-semibold text-slate-900 uppercase">#{order.id.slice(0, 8)}</span>
                                            <span className="text-xs text-slate-400 mt-0.5">{format(new Date(order.created_at), "d MMM yyyy, h:mm a")}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4 px-6">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-slate-800">{order.shipping_address?.full_name || "—"}</span>
                                            {order.shipping_address?.phone && (
                                                <span className="text-xs text-slate-500">{order.shipping_address.phone}</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4 px-6">
                                        <button
                                            onClick={() => updateOrderType(order.id, orderType, order.status)}
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all hover:opacity-80 ${
                                                orderType === "delivery"
                                                    ? "bg-sky-50 text-sky-700 border-sky-200"
                                                    : "bg-teal-50 text-teal-700 border-teal-200"
                                            }`}
                                            title={`Click to switch to ${orderType === "delivery" ? "pickup" : "delivery"}`}
                                        >
                                            {orderType === "delivery" ? <ShoppingBag className="w-3 h-3" /> : <PackageCheck className="w-3 h-3" />}
                                            {orderType}
                                        </button>
                                    </TableCell>
                                    <TableCell className="py-4 px-6">
                                        <Select defaultValue={order.payment_status} onValueChange={(v) => updateStatus(order.id, 'payment_status', v)}>
                                            <SelectTrigger className={`h-8 w-28 rounded-full border-none text-[10px] font-semibold uppercase ${
                                                order.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700' : order.payment_status === 'refunded' ? 'bg-red-50 text-red-600' : 'bg-orange-100 text-orange-700'
                                            }`}>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                {["unpaid", "paid", "refunded"].map(opt => (
                                                    <SelectItem key={opt} value={opt} className="capitalize">{opt}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell className="py-4 px-6">
                                        <Select
                                            defaultValue={order.status}
                                            onValueChange={(v) => updateStatus(order.id, 'status', v)}
                                        >
                                            <SelectTrigger className="h-8 w-36 rounded-full border border-slate-200 text-[10px] font-semibold uppercase shadow-none bg-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                {getTypeStatuses(orderType).map(opt => {
                                                    const isDisabled = !validNext.includes(opt) && opt !== order.status
                                                    return (
                                                        <SelectItem
                                                            key={opt}
                                                            value={opt}
                                                            disabled={isDisabled}
                                                            className="capitalize"
                                                        >
                                                            {STATUS_LABELS[opt] || opt}
                                                        </SelectItem>
                                                    )
                                                })}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell className="py-4 px-6">
                                        {order.delivery_partner_id ? (
                                            <div className="flex flex-col">
                                                <span className="text-xs font-semibold text-slate-700">
                                                    {deliveryPartners.find(p => p.id === order.delivery_partner_id)?.name || "Unknown"}
                                                </span>
                                                {order.tracking_number && (
                                                    <span className="text-[10px] font-mono text-slate-400 mt-0.5">{order.tracking_number}</span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-300">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="py-4 px-6 text-right font-semibold text-slate-900">
                                        ₹{Number(order.total).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="py-4 px-6 text-right">
                                        <div className="flex justify-end items-center gap-2">
                                            <Button variant="outline" size="icon" asChild className="rounded-lg h-9 w-9 border border-slate-200 hover:bg-slate-100 transition-all text-slate-400">
                                                <Link href={`/admin/orders/${order.id}`}>
                                                    <Eye className="w-4 h-4" />
                                                </Link>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* MOBILE CARDS */}
            <div className="lg:hidden space-y-4">
                {filteredOrders.length === 0 && !loading && (
                    <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
                        <Search className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">No orders found</p>
                    </div>
                )}
                {filteredOrders.map((order) => {
                    const orderType = order.order_type || "delivery"
                    const validNext = getValidNextStatuses(orderType, order.status)
                    return (
                        <div key={order.id} className="rounded-2xl border bg-white shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div className="flex flex-col">
                                    <span className="font-mono text-xs font-semibold text-slate-900 uppercase">#{order.id.slice(0, 8)}</span>
                                    <span className="text-xs text-slate-400">{format(new Date(order.created_at), "d MMM yyyy")}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <StatusBadge status={order.status} />
                                    <Button variant="outline" size="icon" asChild className="h-9 w-9 rounded-lg border border-slate-200 hover:bg-slate-100 transition-all text-slate-400">
                                        <Link href={`/admin/orders/${order.id}`}>
                                            <Eye className="w-4 h-4" />
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                            <div className="px-5 py-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-slate-800">{order.shipping_address?.full_name || "No name"}</p>
                                        {order.shipping_address?.phone && (
                                            <p className="text-xs text-slate-500">{order.shipping_address.phone}</p>
                                        )}
                                    </div>
                                    <p className="text-base font-bold text-slate-900">₹{Number(order.total).toLocaleString()}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => updateOrderType(order.id, orderType, order.status)}
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all hover:opacity-80 ${
                                            orderType === "delivery"
                                                ? "bg-sky-50 text-sky-700 border-sky-200"
                                                : "bg-teal-50 text-teal-700 border-teal-200"
                                        }`}
                                    >
                                        {orderType === "delivery" ? <ShoppingBag className="w-3 h-3" /> : <PackageCheck className="w-3 h-3" />}
                                        {orderType}
                                    </button>
                                    <Select defaultValue={order.payment_status} onValueChange={(v) => updateStatus(order.id, 'payment_status', v)}>
                                        <SelectTrigger className={`h-8 w-auto px-3 rounded-full border-none text-[10px] font-semibold uppercase ${
                                            order.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700' : order.payment_status === 'refunded' ? 'bg-red-50 text-red-600' : 'bg-orange-100 text-orange-700'
                                        }`}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            {["unpaid", "paid", "refunded"].map(opt => (
                                                <SelectItem key={opt} value={opt} className="capitalize">{opt}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Select
                                        defaultValue={order.status}
                                        onValueChange={(v) => updateStatus(order.id, 'status', v)}
                                    >
                                        <SelectTrigger className="h-8 w-auto px-3 rounded-full border border-slate-200 text-[10px] font-semibold uppercase shadow-none bg-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            {getTypeStatuses(orderType).map(opt => {
                                                const isDisabled = !validNext.includes(opt) && opt !== order.status
                                                return (
                                                    <SelectItem key={opt} value={opt} disabled={isDisabled} className="capitalize">
                                                        {STATUS_LABELS[opt] || opt}
                                                    </SelectItem>
                                                )
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {order.delivery_partner_id && (
                                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Partner:</span>
                                        <span className="text-xs font-medium text-slate-700">
                                            {deliveryPartners.find(p => p.id === order.delivery_partner_id)?.name || "Unknown"}
                                        </span>
                                        {order.tracking_number && (
                                            <span className="text-[10px] font-mono text-slate-400 ml-auto">{order.tracking_number}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* SHIP MODAL */}
            {shipModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-black text-slate-900">Mark as Shipped</h3>
                            <button onClick={() => setShipModal(null)} className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-all">
                                <X className="w-4 h-4 text-slate-400" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Delivery Partner</label>
                                <Select value={shipPartnerId} onValueChange={setShipPartnerId}>
                                    <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50 text-sm">
                                        <SelectValue placeholder="Select delivery partner..." />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {deliveryPartners.filter(p => p.is_active).map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tracking Number (optional)</label>
                                <Input
                                    placeholder="e.g. AWB123456789"
                                    value={shipTracking}
                                    onChange={(e) => setShipTracking(e.target.value)}
                                    className="h-11 rounded-xl border-slate-200 bg-slate-50 text-sm"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <Button variant="outline" onClick={() => setShipModal(null)} className="rounded-xl h-10 px-6 text-xs font-bold">
                                Cancel
                            </Button>
                            <Button onClick={handleShipConfirm} className="rounded-xl h-10 px-6 bg-sky-600 hover:bg-sky-700 text-xs font-bold">
                                Confirm Shipped
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* CANCEL MODAL */}
            {cancelModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-black text-slate-900">Cancel Order</h3>
                            <button onClick={() => setCancelModal(null)} className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-all">
                                <X className="w-4 h-4 text-slate-400" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            {(() => {
                                const co = orders.find(o => o.id === cancelModal.orderId)
                                const isRazorpay = co?.payment_method === 'razorpay' && co?.payment_status === 'paid'
                                return (
                                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs font-medium text-amber-800">
                                        {isRazorpay
                                            ? "This will cancel the order, restore stock, and process a Razorpay refund."
                                            : "This will cancel the order and restore stock."}
                                    </div>
                                )
                            })()}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cancellation Reason</label>
                                <textarea
                                    placeholder="e.g. Customer requested cancellation, out of stock, etc."
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    rows={3}
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 text-sm p-3 focus:outline-none focus:ring-2 focus:ring-slate-200 resize-none"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <Button variant="outline" onClick={() => setCancelModal(null)} className="rounded-xl h-10 px-6 text-xs font-bold">
                                Back
                            </Button>
                            <Button
                                onClick={async () => {
                                    setLoading(true)
                                    setCancelModal(null)
                                    const res = await cancelOrderAndRestoreStock(cancelModal.orderId, cancelReason.trim() || undefined)
                                    if (res.success) toast.success("Order cancelled and stock restored")
                                    else toast.error(res.message)
                                    setLoading(false)
                                    fetchOrders()
                                }}
                                className="rounded-xl h-10 px-6 bg-red-600 hover:bg-red-700 text-xs font-bold text-white"
                            >
                                Confirm Cancel
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
