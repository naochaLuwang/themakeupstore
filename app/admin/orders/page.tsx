// "use client"

// // Find your imports at the top and update this line:
// import { cancelOrderAndRestoreStock } from "@/app/actions/orders"

// import { useState, useEffect, useMemo } from "react"
// import { createClient } from "@/utils/supabase/client"
// import {
//     Table, TableBody, TableCell, TableHead, TableHeader, TableRow
// } from "@/components/ui/table"
// import {
//     Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
// } from "@/components/ui/select"
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { toast } from "sonner"
// import { format, startOfDay, endOfDay, subDays } from "date-fns"
// import {
//     Eye, Package, Truck, CheckCircle, XCircle, Clock,
//     Calendar as CalendarIcon, FilterX, CreditCard, ArrowUpRight, Search
// } from "lucide-react"
// import { Button } from "@/components/ui/button"
// import Link from "next/link"
// import { Calendar } from "@/components/ui/calendar"
// import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
// import { DateRange } from "react-day-picker"
// import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
// import { Input } from "@/components/ui/input"

// export default function AdminOrdersPage() {
//     const supabase = createClient()
//     const [orders, setOrders] = useState<any[]>([])
//     const [loading, setLoading] = useState(true)
//     const [searchQuery, setSearchQuery] = useState("")
//     const [activeTab, setActiveTab] = useState("pending")

//     const [date, setDate] = useState<DateRange | undefined>({
//         from: subDays(new Date(), 30),
//         to: new Date(),
//     })

//     useEffect(() => {
//         fetchOrders()
//     }, [date])

//     async function fetchOrders() {
//         setLoading(true)
//         let query = supabase
//             .from('orders')
//             .select(`*, order_items(*)`)
//             .order('created_at', { ascending: false })

//         if (date?.from) query = query.gte('created_at', startOfDay(date.from).toISOString())
//         if (date?.to) query = query.lte('created_at', endOfDay(date.to).toISOString())

//         const { data, error } = await query
//         if (error) toast.error("Failed to load orders")
//         else setOrders(data || [])
//         setLoading(false)
//     }

//     // Logic for Stats Cards
//     const stats = useMemo(() => {
//         const pending = orders.filter(o => o.status === 'pending').length
//         const totalRev = orders.filter(o => o.payment_status === 'paid').reduce((acc, curr) => acc + Number(curr.total), 0)
//         return { pending, totalRev }
//     }, [orders])

//     // Filtered orders based on Search and Tabs
//     const filteredOrders = orders.filter(order => {
//         const matchesTab = activeTab === "all" || order.status === activeTab
//         const matchesSearch = order.shipping_address?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
//             order.id.toLowerCase().includes(searchQuery.toLowerCase())
//         return matchesTab && matchesSearch
//     })

//     // Inside AdminOrdersPage component
//     async function updateStatus(orderId: string, field: 'status' | 'payment_status', val: string) {
//         // Find the current order in our local state to check its status
//         const currentOrder = orders.find(o => o.id === orderId)

//         if (field === 'status' && val === 'cancelled') {
//             // PREVENT CANCELLATION IF SHIPPED
//             if (currentOrder?.status === 'shipped' || currentOrder?.status === 'delivered') {
//                 toast.error(`Operation Denied: Order is already ${currentOrder.status}`)
//                 // We force the table to re-fetch to reset the select dropdown UI
//                 fetchOrders()
//                 return
//             }

//             const confirmCancel = confirm("Cancel order and restock items?")
//             if (!confirmCancel) {
//                 fetchOrders()
//                 return
//             }

//             setLoading(true)
//             const res = await cancelOrderAndRestoreStock(orderId)
//             if (res.success) {
//                 toast.success("Order cancelled and stock restored")
//             } else {
//                 toast.error(res.message)
//             }
//             setLoading(false)
//             fetchOrders()
//             return
//         }

//         // Normal update for other statuses
//         const { error } = await supabase.from('orders').update({ [field]: val }).eq('id', orderId)
//         if (error) toast.error("Update failed")
//         else {
//             toast.success("Updated successfully")
//             fetchOrders()
//         }
//     }

//     return (
//         <div className="min-h-screen bg-slate-50/50 pb-12">
//             <div className="container mx-auto py-8 px-4 space-y-8">

//                 {/* Header & Quick Stats */}
//                 <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
//                     <div>
//                         <h1 className="text-4xl font-black tracking-tight text-slate-900">Orders</h1>
//                         <p className="text-slate-500">Overview of your store's fulfillment and revenue.</p>
//                     </div>

//                     <div className="flex flex-wrap gap-4 w-full lg:w-auto">
//                         <Card className="flex-1 lg:w-48 shadow-none border-slate-200">
//                             <CardContent className="p-4 flex items-center gap-4">
//                                 <div className="p-2 bg-amber-100 rounded-lg text-amber-600"><Clock className="w-5 h-5" /></div>
//                                 <div><p className="text-xs text-slate-500 font-medium uppercase">Pending</p><p className="text-xl font-bold">{stats.pending}</p></div>
//                             </CardContent>
//                         </Card>
//                         <Card className="flex-1 lg:w-56 shadow-none border-slate-200">
//                             <CardContent className="p-4 flex items-center gap-4">
//                                 <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600"><ArrowUpRight className="w-5 h-5" /></div>
//                                 <div><p className="text-xs text-slate-500 font-medium uppercase">Paid Revenue</p><p className="text-xl font-bold">₹{stats.totalRev.toLocaleString()}</p></div>
//                             </CardContent>
//                         </Card>
//                     </div>
//                 </div>

//                 {/* Filters Bar */}
//                 <div className="flex flex-col xl:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
//                     <Tabs defaultValue="pending" onValueChange={setActiveTab} className="w-full xl:w-auto">
//                         <TabsList className="bg-slate-100 p-1 rounded-xl">
//                             <TabsTrigger value="all" className="rounded-lg px-4">All</TabsTrigger>
//                             <TabsTrigger value="pending" className="rounded-lg px-4">Pending</TabsTrigger>
//                             <TabsTrigger value="processing" className="rounded-lg px-4">Processing</TabsTrigger>
//                             <TabsTrigger value="shipped" className="rounded-lg px-4">Shipped</TabsTrigger>
//                             <TabsTrigger value="delivered" className="rounded-lg px-4">Delivered</TabsTrigger>
//                             <TabsTrigger value="cancelled" className="rounded-lg px-4">Cancelled</TabsTrigger>
//                         </TabsList>
//                     </Tabs>

//                     <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
//                         <div className="relative flex-1 min-w-[200px]">
//                             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
//                             <Input
//                                 placeholder="Search Name or ID..."
//                                 className="pl-10 h-11 rounded-xl border-slate-200 focus-visible:ring-black"
//                                 value={searchQuery}
//                                 onChange={(e) => setSearchQuery(e.target.value)}
//                             />
//                         </div>

//                         <Popover>
//                             <PopoverTrigger asChild>
//                                 <Button variant="outline" className="h-11 px-4 rounded-xl border-slate-200 font-medium flex items-center gap-2">
//                                     <CalendarIcon className="w-4 h-4 text-slate-400" />
//                                     {date?.from ? (date.to ? `${format(date.from, "MMM d")} - ${format(date.to, "MMM d")}` : format(date.from, "MMM d")) : "Select Dates"}
//                                 </Button>
//                             </PopoverTrigger>
//                             <PopoverContent className="w-auto p-0" align="end">
//                                 <Calendar mode="range" selected={date} onSelect={setDate} numberOfMonths={2} />
//                             </PopoverContent>
//                         </Popover>

//                         <Button variant="ghost" size="icon" onClick={() => setDate(undefined)} className="h-11 w-11 rounded-xl hover:bg-red-50 hover:text-red-500 transition-colors">
//                             <FilterX className="w-5 h-5" />
//                         </Button>
//                     </div>
//                 </div>

//                 {/* Table Section */}
//                 <Card className="border-slate-200 shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden">
//                     <Table>
//                         <TableHeader className="bg-slate-50/50">
//                             <TableRow className="border-b border-slate-100">
//                                 <TableHead className="py-5 px-6 font-bold text-slate-600">Order Detail</TableHead>
//                                 <TableHead className="font-bold text-slate-600">Customer</TableHead>
//                                 <TableHead className="font-bold text-slate-600">Payment</TableHead>
//                                 <TableHead className="font-bold text-slate-600">Fulfillment</TableHead>
//                                 <TableHead className="font-bold text-slate-600">Total</TableHead>
//                                 <TableHead className="text-right px-6 font-bold text-slate-600">Actions</TableHead>
//                             </TableRow>
//                         </TableHeader>
//                         <TableBody className="bg-white">
//                             {filteredOrders.map((order) => (
//                                 <TableRow key={order.id} className="group border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
//                                     <TableCell className="px-6 py-5">
//                                         <div className="flex flex-col">
//                                             <span className="font-mono text-xs font-bold text-black uppercase">#{order.id.slice(0, 8)}</span>
//                                             <span className="text-[11px] text-slate-400 mt-1">{format(new Date(order.created_at), 'PPp')}</span>
//                                         </div>
//                                     </TableCell>
//                                     <TableCell>
//                                         <div className="flex flex-col">
//                                             <span className="text-sm font-semibold text-slate-800">{order.shipping_address?.full_name}</span>
//                                             <span className="text-xs text-slate-500">{order.shipping_address?.phone}</span>
//                                         </div>
//                                     </TableCell>
//                                     <TableCell>
//                                         <Select defaultValue={order.payment_status} onValueChange={(v) => updateStatus(order.id, 'payment_status', v)}>
//                                             <SelectTrigger className={`h-8 w-28 rounded-full border-none text-[10px] font-black uppercase ${order.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
//                                                 <div className="flex items-center gap-1.5"><CreditCard className="w-3 h-3" /><SelectValue /></div>
//                                             </SelectTrigger>
//                                             <SelectContent className="rounded-xl">
//                                                 <SelectItem value="unpaid">Unpaid</SelectItem>
//                                                 <SelectItem value="paid">Paid</SelectItem>
//                                                 <SelectItem value="refunded">Refunded</SelectItem>
//                                             </SelectContent>
//                                         </Select>
//                                     </TableCell>
//                                     <TableCell>
//                                         <Select defaultValue={order.status} onValueChange={(v) => updateStatus(order.id, 'status', v)}>
//                                             <SelectTrigger className="h-8 w-32 rounded-full border-slate-200 text-[10px] font-bold uppercase shadow-none bg-white">
//                                                 <SelectValue />
//                                             </SelectTrigger>
//                                             <SelectContent className="rounded-xl">
//                                                 <SelectItem value="pending">Pending</SelectItem>
//                                                 <SelectItem value="processing">Processing</SelectItem>
//                                                 <SelectItem value="shipped">Shipped</SelectItem>
//                                                 <SelectItem value="delivered">Delivered</SelectItem>
//                                                 <SelectItem
//                                                     value="cancelled"
//                                                     disabled={order.status === 'shipped' || order.status === 'delivered'}
//                                                 >
//                                                     Cancelled
//                                                 </SelectItem>
//                                             </SelectContent>
//                                         </Select>
//                                     </TableCell>
//                                     <TableCell className="font-bold text-slate-900">₹{Number(order.total).toLocaleString()}</TableCell>
//                                     <TableCell className="text-right px-6">
//                                         <Button variant="outline" size="sm" asChild className="rounded-lg h-9 w-9 p-0 border-slate-200 hover:bg-black hover:text-white transition-all">
//                                             <Link href={`/admin/orders/${order.id}`}><Eye className="w-4 h-4" /></Link>
//                                         </Button>
//                                     </TableCell>
//                                 </TableRow>
//                             ))}
//                         </TableBody>
//                     </Table>
//                     {filteredOrders.length === 0 && !loading && (
//                         <div className="p-20 text-center flex flex-col items-center gap-3">
//                             <Package className="w-12 h-12 text-slate-200" />
//                             <p className="text-slate-400 font-medium">No orders found matching these criteria.</p>
//                         </div>
//                     )}
//                 </Card>
//             </div>
//         </div>
//     )
// }


"use client"

import { cancelOrderAndRestoreStock } from "@/app/actions/orders"
import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/utils/supabase/client"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { format, startOfDay, endOfDay, subDays } from "date-fns"
import {
    Eye, Package, Truck, CheckCircle, XCircle, Clock,
    Calendar as CalendarIcon, FilterX, CreditCard, ArrowUpRight, Search
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DateRange } from "react-day-picker"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"

export default function AdminOrdersPage() {
    const supabase = createClient()
    const [orders, setOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [activeTab, setActiveTab] = useState("pending")

    const [date, setDate] = useState<DateRange | undefined>({
        from: subDays(new Date(), 30),
        to: new Date(),
    })

    useEffect(() => {
        fetchOrders()
    }, [date])

    async function fetchOrders() {
        setLoading(true)
        let query = supabase
            .from('orders')
            .select(`*, order_items(*)`)
            .order('created_at', { ascending: false })

        if (date?.from) query = query.gte('created_at', startOfDay(date.from).toISOString())
        if (date?.to) query = query.lte('created_at', endOfDay(date.to).toISOString())

        const { data, error } = await query
        if (error) toast.error("Failed to load orders")
        else setOrders(data || [])
        setLoading(false)
    }

    // --- PUSH NOTIFICATION HELPER ---
    async function triggerPushNotification(userId: string, payload: { title: string, body: string, url: string }) {
        // 1. Fetch subscriptions for this specific user
        const { data: subs } = await supabase
            .from('push_subscriptions')
            .select('subscription_json')
            .eq('user_id', userId)

        if (!subs || subs.length === 0) return

        // 2. Send to each registered device via our API
        try {
            await Promise.all(subs.map(s =>
                fetch('/api/push', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        subscription: s.subscription_json,
                        payload
                    })
                })
            ))
        } catch (err) {
            console.error("Push failed:", err)
        }
    }

    const stats = useMemo(() => {
        const pending = orders.filter(o => o.status === 'pending').length
        const totalRev = orders.filter(o => o.payment_status === 'paid').reduce((acc, curr) => acc + Number(curr.total), 0)
        return { pending, totalRev }
    }, [orders])

    const filteredOrders = orders.filter(order => {
        const matchesTab = activeTab === "all" || order.status === activeTab
        const matchesSearch = order.shipping_address?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.id.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesTab && matchesSearch
    })

    async function updateStatus(orderId: string, field: 'status' | 'payment_status', val: string) {
        const currentOrder = orders.find(o => o.id === orderId)

        if (field === 'status' && val === 'cancelled') {
            if (currentOrder?.status === 'shipped' || currentOrder?.status === 'delivered') {
                toast.error(`Operation Denied: Order is already ${currentOrder.status}`)
                fetchOrders()
                return
            }

            const confirmCancel = confirm("Cancel order and restock items?")
            if (!confirmCancel) {
                fetchOrders()
                return
            }

            setLoading(true)
            const res = await cancelOrderAndRestoreStock(orderId)
            if (res.success) {
                toast.success("Order cancelled and stock restored")
                // Notify user of cancellation
                await triggerPushNotification(currentOrder.user_id, {
                    title: "Order Cancelled",
                    body: `Your order #${orderId.slice(0, 8)} has been cancelled.`,
                    url: `/profile/orders/${orderId}`
                })
            } else {
                toast.error(res.message)
            }
            setLoading(false)
            fetchOrders()
            return
        }

        // Normal update logic
        const { error } = await supabase.from('orders').update({ [field]: val }).eq('id', orderId)

        if (error) {
            toast.error("Update failed")
        } else {
            toast.success("Updated successfully")

            // SEND NOTIFICATION ON STATUS CHANGE
            if (field === 'status') {
                const statusMessages: Record<string, string> = {
                    processing: "We are now preparing your order! ✨",
                    shipped: "Great news! Your order has been shipped. 🚚",
                    delivered: "Your package has been delivered! Enjoy. 💖",
                }

                const bodyText = statusMessages[val.toLowerCase()]
                if (bodyText && currentOrder) {
                    await triggerPushNotification(currentOrder.user_id, {
                        title: `Order Update: ${val.toUpperCase()}`,
                        body: bodyText,
                        url: `/profile/orders/${orderId}`
                    })
                }
            }

            fetchOrders()
        }
    }

    return (
        <div className="min-h-screen bg-slate-50/50 pb-12">
            <div className="container mx-auto py-8 px-4 space-y-8">

                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div>
                        <h1 className="text-4xl font-black tracking-tight text-slate-900">Orders</h1>
                        <p className="text-slate-500">Overview of your store's fulfillment and revenue.</p>
                    </div>

                    <div className="flex flex-wrap gap-4 w-full lg:w-auto">
                        <Card className="flex-1 lg:w-48 shadow-none border-slate-200">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="p-2 bg-amber-100 rounded-lg text-amber-600"><Clock className="w-5 h-5" /></div>
                                <div><p className="text-xs text-slate-500 font-medium uppercase">Pending</p><p className="text-xl font-bold">{stats.pending}</p></div>
                            </CardContent>
                        </Card>
                        <Card className="flex-1 lg:w-56 shadow-none border-slate-200">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600"><ArrowUpRight className="w-5 h-5" /></div>
                                <div><p className="text-xs text-slate-500 font-medium uppercase">Paid Revenue</p><p className="text-xl font-bold">₹{stats.totalRev.toLocaleString()}</p></div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div className="flex flex-col xl:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <Tabs defaultValue="pending" onValueChange={setActiveTab} className="w-full xl:w-auto">
                        <TabsList className="bg-slate-100 p-1 rounded-xl">
                            <TabsTrigger value="all" className="rounded-lg px-4">All</TabsTrigger>
                            <TabsTrigger value="pending" className="rounded-lg px-4">Pending</TabsTrigger>
                            <TabsTrigger value="processing" className="rounded-lg px-4">Processing</TabsTrigger>
                            <TabsTrigger value="shipped" className="rounded-lg px-4">Shipped</TabsTrigger>
                            <TabsTrigger value="delivered" className="rounded-lg px-4">Delivered</TabsTrigger>
                            <TabsTrigger value="cancelled" className="rounded-lg px-4">Cancelled</TabsTrigger>
                        </TabsList>
                    </Tabs>

                    <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Search Name or ID..."
                                className="pl-10 h-11 rounded-xl border-slate-200 focus-visible:ring-black"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="h-11 px-4 rounded-xl border-slate-200 font-medium flex items-center gap-2">
                                    <CalendarIcon className="w-4 h-4 text-slate-400" />
                                    {date?.from ? (date.to ? `${format(date.from, "MMM d")} - ${format(date.to, "MMM d")}` : format(date.from, "MMM d")) : "Select Dates"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar mode="range" selected={date} onSelect={setDate} numberOfMonths={2} />
                            </PopoverContent>
                        </Popover>

                        <Button variant="ghost" size="icon" onClick={() => setDate(undefined)} className="h-11 w-11 rounded-xl hover:bg-red-50 hover:text-red-500 transition-colors">
                            <FilterX className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                <Card className="border-slate-200 shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50/50">
                            <TableRow className="border-b border-slate-100">
                                <TableHead className="py-5 px-6 font-bold text-slate-600">Order Detail</TableHead>
                                <TableHead className="font-bold text-slate-600">Customer</TableHead>
                                <TableHead className="font-bold text-slate-600">Payment</TableHead>
                                <TableHead className="font-bold text-slate-600">Fulfillment</TableHead>
                                <TableHead className="font-bold text-slate-600">Total</TableHead>
                                <TableHead className="text-right px-6 font-bold text-slate-600">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="bg-white">
                            {filteredOrders.map((order) => (
                                <TableRow key={order.id} className="group border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                    <TableCell className="px-6 py-5">
                                        <div className="flex flex-col">
                                            <span className="font-mono text-xs font-bold text-black uppercase">#{order.id.slice(0, 8)}</span>
                                            <span className="text-[11px] text-slate-400 mt-1">{format(new Date(order.created_at), 'PPp')}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold text-slate-800">{order.shipping_address?.full_name}</span>
                                            <span className="text-xs text-slate-500">{order.shipping_address?.phone}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Select defaultValue={order.payment_status} onValueChange={(v) => updateStatus(order.id, 'payment_status', v)}>
                                            <SelectTrigger className={`h-8 w-28 rounded-full border-none text-[10px] font-black uppercase ${order.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                                                <div className="flex items-center gap-1.5"><CreditCard className="w-3 h-3" /><SelectValue /></div>
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="unpaid">Unpaid</SelectItem>
                                                <SelectItem value="paid">Paid</SelectItem>
                                                <SelectItem value="refunded">Refunded</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Select defaultValue={order.status} onValueChange={(v) => updateStatus(order.id, 'status', v)}>
                                            <SelectTrigger className="h-8 w-32 rounded-full border-slate-200 text-[10px] font-bold uppercase shadow-none bg-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="pending">Pending</SelectItem>
                                                <SelectItem value="processing">Processing</SelectItem>
                                                <SelectItem value="shipped">Shipped</SelectItem>
                                                <SelectItem value="delivered">Delivered</SelectItem>
                                                <SelectItem
                                                    value="cancelled"
                                                    disabled={order.status === 'shipped' || order.status === 'delivered'}
                                                >
                                                    Cancelled
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell className="font-bold text-slate-900">₹{Number(order.total).toLocaleString()}</TableCell>
                                    <TableCell className="text-right px-6">
                                        <Button variant="outline" size="sm" asChild className="rounded-lg h-9 w-9 p-0 border-slate-200 hover:bg-black hover:text-white transition-all">
                                            <Link href={`/admin/orders/${order.id}`}><Eye className="w-4 h-4" /></Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            </div>
        </div>
    )
}