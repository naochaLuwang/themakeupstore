"use client"

import { cancelOrderAndRestoreStock, updateOrderStatus, deleteOrder } from "@/app/actions/orders"
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
    Eye, Clock, Calendar as CalendarIcon, FilterX, Search, ChevronDown, ChevronUp,
    ShoppingBag, PackageCheck, X, Trash2, CreditCard, Banknote, FileText,
    IndianRupee, Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DateRange } from "react-day-picker"

const GROUP_TABS = [
    { id: "all", label: "All" },
    { id: "pending", label: "Pending" },
    { id: "active", label: "Active" },
    { id: "completed", label: "Completed" },
    { id: "cancelled", label: "Cancelled" },
]

const DELIVERY_ACTIVE = ["confirmed", "packed", "shipped", "out_for_delivery", "failed_delivery"]
const PICKUP_ACTIVE = ["confirmed", "packed", "ready_for_pickup", "no_show"]

const STEP_FLOW: Record<string, string[]> = {
    delivery: ["pending", "confirmed", "packed", "shipped", "out_for_delivery", "delivered"],
    pickup: ["pending", "confirmed", "packed", "ready_for_pickup", "picked_up"],
}

const FLOW_BADGE_COLORS: Record<string, string> = {
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

const PAGE_SIZE = 100

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

function getModeBadge(paymentMethod: string) {
    if (paymentMethod === "razorpay") {
        return <><CreditCard className="w-3 h-3" /> Razorpay</>
    }
    if (paymentMethod === "B2B_INVOICE") {
        return <><FileText className="w-3 h-3" /> B2B</>
    }
    return <><Banknote className="w-3 h-3" /> COD</>
}

function getModeColor(paymentMethod: string) {
    if (paymentMethod === "razorpay") return "bg-violet-50 text-violet-700 border-violet-200"
    if (paymentMethod === "B2B_INVOICE") return "bg-slate-100 text-slate-700 border-slate-200"
    return "bg-sky-50 text-sky-700 border-sky-200"
}

function OrderStepper({ order, onSelect }: { order: any; onSelect: (v: string) => void }) {
    const orderType = order.order_type || "delivery"
    const flow = STEP_FLOW[orderType]
    const current = order.status
    const currentIdx = flow.indexOf(current)
    const validNext = getValidNextStatuses(orderType, current)

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center">
                {flow.map((step, i) => {
                    const done = currentIdx >= 0 && i < currentIdx
                    const isCurrent = step === current
                    const clickable = validNext.includes(step)
                    return (
                        <div key={step} className="flex items-center">
                            {i > 0 && (
                                <span className={`h-[2px] w-3 sm:w-4 rounded-full ${done || isCurrent ? "bg-emerald-400" : "bg-slate-200"}`} />
                            )}
                            <button
                                onClick={clickable ? () => onSelect(step) : undefined}
                                disabled={!clickable}
                                title={STATUS_LABELS[step]}
                                className={`w-2.5 h-2.5 rounded-full transition-all ${
                                    done
                                        ? "bg-emerald-500"
                                        : isCurrent
                                        ? "bg-pink-600 ring-4 ring-pink-100"
                                        : clickable
                                        ? "bg-slate-300 hover:bg-pink-400 hover:scale-110 cursor-pointer"
                                        : "bg-slate-200"
                                }`}
                            />
                        </div>
                    )
                })}
            </div>
            <div className="flex items-center gap-1.5">
                <Select value={current} onValueChange={onSelect}>
                    <SelectTrigger className={`h-6 px-2 rounded-md border text-[10px] font-bold uppercase tracking-wider shadow-none gap-1 ${FLOW_BADGE_COLORS[current] || "bg-slate-50 text-slate-500 border-slate-200"}`}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                        {getTypeStatuses(orderType).map(opt => {
                            const isDisabled = !validNext.includes(opt) && opt !== current
                            return (
                                <SelectItem key={opt} value={opt} disabled={isDisabled} className="capitalize">
                                    {STATUS_LABELS[opt] || opt}
                                </SelectItem>
                            )
                        })}
                    </SelectContent>
                </Select>
                {(current === "failed_delivery" || current === "no_show") && (
                    <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">needs attention</span>
                )}
            </div>
        </div>
    )
}

export default function AdminOrdersPage() {
    const supabase = createClient()
    const [orders, setOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [activeTab, setActiveTab] = useState("pending")
    const [paymentFilter, setPaymentFilter] = useState<string>("all")
    const [modeFilter, setModeFilter] = useState<string>("all")
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
    const [sortKey, setSortKey] = useState<"created_at" | "total">("created_at")
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
    const [fetchLimit, setFetchLimit] = useState(PAGE_SIZE)
    const [total, setTotal] = useState(0)

    useEffect(() => {
        fetchOrders()
        getDeliveryPartners().then(setDeliveryPartners).catch(() => {})
    }, [date, fetchLimit])

    async function fetchOrders() {
        setLoading(true)
        let query = supabase
            .from('orders')
            .select(`*, order_items(*)`, { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(0, fetchLimit - 1)

        if (date?.from) query = query.gte('created_at', startOfDay(date.from).toISOString())
        if (date?.to) query = query.lte('created_at', endOfDay(date.to).toISOString())

        const { data, error, count } = await query
        if (error) toast.error("Failed to load orders")
        else {
            setOrders(data || [])
            setTotal(count || 0)
        }
        setLoading(false)
    }

    const stats = useMemo(() => {
        const pending = orders.filter(o => getGroupForOrder(o) === "pending").length
        const active = orders.filter(o => getGroupForOrder(o) === "active").length
        const paid = orders.filter(o => o.payment_status === 'paid').reduce((acc, curr) => acc + Number(curr.total), 0)
        return { pending, active, paid, total: orders.length }
    }, [orders])

    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            if (activeTab !== "all" && getGroupForOrder(order) !== activeTab) return false
            if (paymentFilter !== "all" && order.payment_status !== paymentFilter) return false
            if (modeFilter !== "all") {
                const mode = order.payment_method === "razorpay" ? "razorpay" : order.payment_method === "B2B_INVOICE" ? "B2B_INVOICE" : "cod"
                if (mode !== modeFilter) return false
            }
            if (partnerFilter !== "all" && order.delivery_partner_id !== partnerFilter) return false
            const q = searchQuery.toLowerCase()
            return !q ||
                order.shipping_address?.full_name?.toLowerCase().includes(q) ||
                order.id.toLowerCase().includes(q) ||
                order.shipping_address?.phone?.includes(q)
        })
    }, [orders, activeTab, searchQuery, paymentFilter, modeFilter, partnerFilter])

    const sortedOrders = useMemo(() => {
        const arr = [...filteredOrders]
        arr.sort((a, b) => {
            const av = sortKey === "total" ? Number(a[sortKey]) : new Date(a[sortKey]).getTime()
            const bv = sortKey === "total" ? Number(b[sortKey]) : new Date(b[sortKey]).getTime()
            return sortDir === "asc" ? av - bv : bv - av
        })
        return arr
    }, [filteredOrders, sortKey, sortDir])

    const tabCounts = useMemo(() => {
        const counts: Record<string, number> = {}
        for (const tab of GROUP_TABS) {
            counts[tab.id] = tab.id === "all" ? orders.length : orders.filter(o => getGroupForOrder(o) === tab.id).length
        }
        return counts
    }, [orders])

    const activeFilterCount = useMemo(() => {
        return (searchQuery ? 1 : 0) +
            (paymentFilter !== "all" ? 1 : 0) +
            (modeFilter !== "all" ? 1 : 0) +
            (partnerFilter !== "all" ? 1 : 0) +
            (date ? 1 : 0)
    }, [searchQuery, paymentFilter, modeFilter, partnerFilter, date])

    function clearFilters() {
        setSearchQuery("")
        setPaymentFilter("all")
        setModeFilter("all")
        setPartnerFilter("all")
        setDate(undefined)
    }

    function toggleSort(key: "created_at" | "total") {
        if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc")
        else { setSortKey(key); setSortDir("desc") }
    }

    function partnerName(order: any) {
        return deliveryPartners.find(p => p.id === order.delivery_partner_id)?.name || "Unknown"
    }

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

    async function handleDelete(orderId: string) {
        if (!window.confirm("Permanently delete this order? This cannot be undone.")) return
        setLoading(true)
        const res = await deleteOrder(orderId)
        if (!res.success) toast.error(res.error || "Failed to delete order")
        else toast.success("Order deleted")
        setLoading(false)
        fetchOrders()
    }

    const SortIndicator = ({ k }: { k: "created_at" | "total" }) => {
        const active = sortKey === k
        return (
            <span className="inline-flex flex-col -space-y-0.5 ml-1">
                <ChevronUp className={`w-2.5 h-2.5 ${active && sortDir === "asc" ? "text-pink-600" : "text-slate-300"}`} />
                <ChevronDown className={`w-2.5 h-2.5 ${active && sortDir === "desc" ? "text-pink-600" : "text-slate-300"}`} />
            </span>
        )
    }

    return (
        <div className="space-y-6">

            {/* HEADER */}
            <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">Orders</h1>
                <p className="text-sm text-slate-500">Manage fulfillment and track revenue.</p>
            </div>

            {/* STAT STRIP */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-2xl border bg-white p-4 shadow-sm flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <IndianRupee className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Paid Revenue</p>
                        <p className="text-base font-black text-slate-900 truncate">₹{stats.paid.toLocaleString()}</p>
                    </div>
                </div>
                <div className="rounded-2xl border bg-white p-4 shadow-sm flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                        <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Orders</p>
                        <p className="text-base font-black text-slate-900 truncate">{total.toLocaleString()}</p>
                    </div>
                </div>
                <div className="rounded-2xl border bg-white p-4 shadow-sm flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pending</p>
                        <p className="text-base font-black text-slate-900 truncate">{stats.pending}</p>
                    </div>
                </div>
                <div className="rounded-2xl border bg-white p-4 shadow-sm flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <PackageCheck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active</p>
                        <p className="text-base font-black text-slate-900 truncate">{stats.active}</p>
                    </div>
                </div>
            </div>

            {/* FILTER TOOLBAR */}
            <div className="rounded-2xl border bg-white shadow-sm p-3 space-y-2">
                <div className="flex flex-col lg:flex-row lg:items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by name, phone, or order ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-9 pl-9 pr-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-100 focus:border-pink-300 focus:bg-white transition-all"
                        />
                    </div>
                    <Select value={modeFilter} onValueChange={setModeFilter}>
                        <SelectTrigger className="h-9 w-full lg:w-32 rounded-xl border-slate-200 bg-slate-50 text-xs font-medium">
                            <SelectValue placeholder="All modes" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="all" className="text-xs">All Modes</SelectItem>
                            <SelectItem value="cod" className="text-xs">COD</SelectItem>
                            <SelectItem value="razorpay" className="text-xs">Razorpay</SelectItem>
                            <SelectItem value="B2B_INVOICE" className="text-xs">B2B</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                        <SelectTrigger className="h-9 w-full lg:w-32 rounded-xl border-slate-200 bg-slate-50 text-xs font-medium">
                            <SelectValue placeholder="Payment status" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="all" className="text-xs">All Payments</SelectItem>
                            <SelectItem value="paid" className="text-xs">Paid</SelectItem>
                            <SelectItem value="unpaid" className="text-xs">Unpaid</SelectItem>
                            <SelectItem value="refunded" className="text-xs">Refunded</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={partnerFilter} onValueChange={setPartnerFilter}>
                        <SelectTrigger className="h-9 w-full lg:w-36 rounded-xl border-slate-200 bg-slate-50 text-xs font-medium">
                            <SelectValue placeholder="All partners" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="all" className="text-xs">All Partners</SelectItem>
                            {deliveryPartners.filter(p => p.is_active).map(p => (
                                <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Popover>
                        <PopoverTrigger asChild>
                            <button className={`h-9 px-3 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
                                date ? "border-pink-200 bg-pink-50 text-pink-700" : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                            }`}>
                                <CalendarIcon className="w-3.5 h-3.5" />
                                {date?.from ? (date.to ? `${format(date.from, "d MMM")} – ${format(date.to, "d MMM")}` : format(date.from, "d MMM")) : "Date"}
                                <ChevronDown className="w-3 h-3 opacity-60" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar mode="range" selected={date} onSelect={setDate} numberOfMonths={1} />
                        </PopoverContent>
                    </Popover>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={clearFilters}
                        className="h-9 w-9 rounded-xl border-slate-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all text-slate-400 relative"
                        title="Clear filters"
                    >
                        <FilterX className="w-4 h-4" />
                        {activeFilterCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-pink-600 text-white text-[9px] font-bold flex items-center justify-center">
                                {activeFilterCount}
                            </span>
                        )}
                    </Button>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2">
                    {GROUP_TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
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
            </div>

            {/* DESKTOP TABLE */}
            <div className="hidden lg:block rounded-2xl border bg-white overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-slate-50 sticky top-0 z-10">
                            <TableRow className="border-b border-slate-100">
                                <TableHead className="py-3.5 px-6 font-bold text-slate-600 text-xs uppercase tracking-wider">
                                    <button onClick={() => toggleSort("created_at")} className="inline-flex items-center text-slate-600 active:opacity-70">
                                        Order <SortIndicator k="created_at" />
                                    </button>
                                </TableHead>
                                <TableHead className="py-3.5 px-6 font-bold text-slate-600 text-xs uppercase tracking-wider">Customer</TableHead>
                                <TableHead className="py-3.5 px-6 font-bold text-slate-600 text-xs uppercase tracking-wider">Type</TableHead>
                                <TableHead className="py-3.5 px-6 font-bold text-slate-600 text-xs uppercase tracking-wider">Payment</TableHead>
                                <TableHead className="py-3.5 px-6 font-bold text-slate-600 text-xs uppercase tracking-wider">Fulfillment</TableHead>
                                <TableHead className="py-3.5 px-6 text-right font-bold text-slate-600 text-xs uppercase tracking-wider">
                                    <button onClick={() => toggleSort("total")} className="inline-flex items-center text-slate-600 active:opacity-70">
                                        Total <SortIndicator k="total" />
                                    </button>
                                </TableHead>
                                <TableHead className="py-3.5 px-6 text-right font-bold text-slate-600 text-xs uppercase tracking-wider">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedOrders.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-slate-400 font-medium">
                                        {loading ? "Loading..." : "No orders found"}
                                    </TableCell>
                                </TableRow>
                            )}
                            {sortedOrders.map((order) => {
                                const orderType = order.order_type || "delivery"
                                return (
                                    <TableRow key={order.id} className="hover:bg-slate-50/70 transition-colors border-b border-slate-50">
                                        <TableCell className="py-3.5 px-6">
                                            <div className="flex flex-col">
                                                <span className="font-mono text-xs font-semibold text-slate-900 uppercase">#{order.id.slice(0, 8)}</span>
                                                <span className="text-[11px] text-slate-400 mt-0.5">{format(new Date(order.created_at), "d MMM yyyy, h:mm a")}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-3.5 px-6">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-slate-800">{order.shipping_address?.full_name || "—"}</span>
                                                <span className="text-[11px] text-slate-400 mt-0.5">
                                                    {order.shipping_address?.phone}
                                                    {order.order_items?.length ? ` · ${order.order_items.length} item${order.order_items.length > 1 ? "s" : ""}` : ""}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-3.5 px-6">
                                            <button
                                                onClick={() => updateOrderType(order.id, orderType, order.status)}
                                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all hover:opacity-80 ${
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
                                        <TableCell className="py-3.5 px-6">
                                            <div className="flex flex-col gap-1">
                                                <Select value={order.payment_status} onValueChange={(v) => updateStatus(order.id, 'payment_status', v)}>
                                                    <SelectTrigger className={`h-6 w-[86px] px-2 rounded-md border text-[10px] font-semibold uppercase shadow-none gap-1 ${
                                                        order.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : order.payment_status === 'refunded' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-orange-100 text-orange-700 border-orange-200'
                                                    }`}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl">
                                                        {["unpaid", "paid", "refunded"].map(opt => (
                                                            <SelectItem key={opt} value={opt} className="capitalize">{opt}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border w-fit ${getModeColor(order.payment_method)}`}>
                                                    {getModeBadge(order.payment_method)}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-3.5 px-6">
                                            <div className="flex flex-col gap-1.5">
                                                <OrderStepper order={order} onSelect={(v) => updateStatus(order.id, 'status', v)} />
                                                {order.delivery_partner_id && (
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[10px] font-semibold text-slate-500">{partnerName(order)}</span>
                                                        {order.tracking_number && (
                                                            <span className="text-[9px] font-mono text-slate-400">{order.tracking_number}</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-3.5 px-6 text-right">
                                            <span className={`font-semibold ${
                                                order.payment_status === 'paid' ? "text-slate-900" :
                                                order.payment_status === 'refunded' ? "text-red-500 line-through" : "text-slate-400"
                                            }`}>
                                                ₹{Number(order.total).toLocaleString()}
                                            </span>
                                        </TableCell>
                                        <TableCell className="py-3.5 px-6 text-right">
                                            <div className="flex justify-end items-center gap-2">
                                                <Button variant="outline" size="icon" asChild className="rounded-lg h-9 w-9 border border-slate-200 hover:bg-slate-100 transition-all text-slate-400">
                                                    <Link href={`/admin/orders/${order.id}`}>
                                                        <Eye className="w-4 h-4" />
                                                    </Link>
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="rounded-lg h-9 w-9 border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all text-slate-400"
                                                    onClick={() => handleDelete(order.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
                <div className="flex items-center justify-between gap-3 px-6 py-3 border-t border-slate-100 bg-slate-50/50">
                    <span className="text-xs font-medium text-slate-400">
                        Showing {orders.length} of {total.toLocaleString()} orders
                    </span>
                    {total > fetchLimit && (
                        <Button
                            variant="outline"
                            onClick={() => setFetchLimit(l => l + PAGE_SIZE)}
                            disabled={loading}
                            className="rounded-xl h-8 px-4 text-xs font-bold border-slate-200"
                        >
                            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Load more"}
                        </Button>
                    )}
                </div>
            </div>

            {/* MOBILE CARDS */}
            <div className="lg:hidden space-y-4">
                {sortedOrders.length === 0 && !loading && (
                    <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
                        <Search className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">No orders found</p>
                    </div>
                )}
                {sortedOrders.map((order) => {
                    const orderType = order.order_type || "delivery"
                    return (
                        <div key={order.id} className="rounded-2xl border bg-white shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div className="flex flex-col">
                                    <span className="font-mono text-xs font-semibold text-slate-900 uppercase">#{order.id.slice(0, 8)}</span>
                                    <span className="text-xs text-slate-400">{format(new Date(order.created_at), "d MMM yyyy")}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${FLOW_BADGE_COLORS[order.status] || "bg-slate-50 text-slate-500 border-slate-200"}`}>
                                        {STATUS_LABELS[order.status] || order.status}
                                    </span>
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
                                    <p className={`text-base font-bold ${order.payment_status === 'paid' ? "text-slate-900" : order.payment_status === 'refunded' ? "text-red-500 line-through" : "text-slate-400"}`}>
                                        ₹{Number(order.total).toLocaleString()}
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
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
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getModeColor(order.payment_method)}`}>
                                        {getModeBadge(order.payment_method)}
                                    </span>
                                    <Select value={order.payment_status} onValueChange={(v) => updateStatus(order.id, 'payment_status', v)}>
                                        <SelectTrigger className={`h-7 w-auto px-3 rounded-full border-none text-[10px] font-semibold uppercase ${
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
                                <div className="rounded-xl bg-slate-50/60 border border-slate-100 p-3 space-y-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fulfillment</span>
                                    <OrderStepper order={order} onSelect={(v) => updateStatus(order.id, 'status', v)} />
                                    {order.delivery_partner_id && (
                                        <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                                            <span className="text-[10px] font-semibold text-slate-500">Partner: {partnerName(order)}</span>
                                            {order.tracking_number && (
                                                <span className="text-[10px] font-mono text-slate-400 ml-auto">{order.tracking_number}</span>
                                            )}
                                        </div>
                                    )}
                                </div>
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