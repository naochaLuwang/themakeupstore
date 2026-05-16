import { createClient } from "@/utils/supabase/server"
import { DateRangePicker } from "@/components/admin/date-range-picker"
import { StatsCards } from "@/components/admin/stats-cards"
import { RecentOrdersTable } from "@/components/admin/recent-orders-table"
import { LowStockList } from "@/components/admin/low-stock-list"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Suspense } from "react"
import {
    Loader2, TrendingUp, AlertCircle, CheckCircle2, Truck, Wallet,
    PackagePlus, Send, Tag, MessageSquare, UserPlus, BarChart3,
    ShoppingBag, Clock, ArrowUpRight, Box
} from "lucide-react"
import { RevenueChart } from "@/components/admin/revenue-chart"
import { BestSellersChart } from "@/components/admin/bestseller-chart"
import { startOfDay, endOfDay, subDays, parseISO } from "date-fns"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

interface QuickStatProps {
    title: string;
    value: string;
    subtitle: string;
    icon: React.ReactNode;
}

export default async function AdminDashboard({
    searchParams
}: {
    searchParams: Promise<{ from?: string; to?: string }>
}) {
    const { from, to } = await searchParams
    const supabase = await createClient()

    const startDate = from
        ? startOfDay(parseISO(from)).toISOString()
        : startOfDay(subDays(new Date(), 30)).toISOString()
    const endDate = to
        ? endOfDay(parseISO(to)).toISOString()
        : endOfDay(new Date()).toISOString()

    const todayStart = startOfDay(new Date()).toISOString()
    const todayEnd = endOfDay(new Date()).toISOString()
    const lastWeekStart = startOfDay(subDays(new Date(), 7)).toISOString()
    const lastWeekEnd = endOfDay(subDays(new Date(), 7)).toISOString()

    const [ordersResult, todayResult, lastWeekResult, messagesResult, waitlistResult, inventoryResult] = await Promise.all([
        supabase.from("orders")
            .select(`id, total, status, payment_status, created_at, user_id,
                order_items (quantity, product_name, variant_title),
                profiles!orders_user_id_fkey (full_name)`)
            .gte("created_at", startDate).lte("created_at", endDate)
            .order("created_at", { ascending: false }),
        supabase.from("orders")
            .select("id, total, status, created_at", { count: "exact" })
            .gte("created_at", todayStart).lte("created_at", todayEnd),
        supabase.from("orders")
            .select("total", { count: "exact" })
            .gte("created_at", lastWeekStart).lte("created_at", lastWeekEnd),
        supabase.from("contact_messages")
            .select("id, name, subject, created_at, status")
            .order("created_at", { ascending: false }).limit(5),
        supabase.from("wholesale_applications")
            .select("id, company_name, created_at, status", { count: "exact" })
            .order("created_at", { ascending: false }).limit(5),
        supabase.from("product_variants")
            .select("id, stock"),
    ])

    const orderError = ordersResult.error
    const allOrders = ordersResult.data || []
    const netOrders = allOrders.filter(o => o.status !== 'cancelled')

    const todayOrders = todayResult.data || []
    const todayNet = todayOrders.filter(o => o.status !== 'cancelled')
    const todayRevenue = todayNet.reduce((sum, o) => sum + Number(o.total || 0), 0)
    const todayCount = todayNet.length

    const lastWeekData = lastWeekResult.data || []
    const lastWeekNet = lastWeekData.filter(o => o.total)
    const lastWeekRevenue = lastWeekNet.reduce((sum, o) => sum + Number(o.total || 0), 0)

    const paidRevenue = netOrders.filter(o => o.payment_status === 'paid')
        .reduce((sum, o) => sum + Number(o.total || 0), 0)
    const pendingRevenue = netOrders.filter(o => o.payment_status !== 'paid')
        .reduce((sum, o) => sum + Number(o.total || 0), 0)

    const deliveredCount = netOrders.filter(o => o.status === 'delivered').length
    const fulfillmentRate = netOrders.length > 0 ? (deliveredCount / netOrders.length) * 100 : 0

    const totalRevenue = netOrders.reduce((sum, o) => sum + Number(o.total || 0), 0)
    const aov = netOrders.length > 0 ? Math.round(totalRevenue / netOrders.length) : 0

    const statusBreakdown = [
        { label: "Pending", count: allOrders.filter(o => o.status === 'pending').length, color: "text-amber-600", bg: "bg-amber-50" },
        { label: "Processing", count: allOrders.filter(o => o.status === 'processing').length, color: "text-blue-600", bg: "bg-blue-50" },
        { label: "Shipped", count: allOrders.filter(o => o.status === 'shipped').length, color: "text-purple-600", bg: "bg-purple-50" },
        { label: "Delivered", count: allOrders.filter(o => o.status === 'delivered').length, color: "text-emerald-600", bg: "bg-emerald-50" },
        { label: "Cancelled", count: allOrders.filter(o => o.status === 'cancelled').length, color: "text-rose-600", bg: "bg-rose-50" },
    ]

    const uniqueCustomerIds = new Set(allOrders.map(o => o.user_id).filter(Boolean))
    const activeCustomers = uniqueCustomerIds.size

    const totalVariants = inventoryResult.data?.length || 0
    const inStockVariants = (inventoryResult.data || []).filter((v: any) => v.stock > 0).length
    const stockHealthPct = totalVariants > 0 ? Math.round((inStockVariants / totalVariants) * 100) : 0

    const pendingFulfillment = allOrders.filter(o =>
        o.status === 'pending' || o.status === 'processing'
    ).length

    const recentMessages = (messagesResult.data || []).slice(0, 3)
    const recentWaitlist = (waitlistResult.data || []).slice(0, 3)

    const quickActions = [
        { label: "New Product", href: "/admin/products/add", icon: PackagePlus, color: "bg-blue-500" },
        { label: "Broadcast", href: "/admin/broadcast", icon: Send, color: "bg-purple-500" },
        { label: "Promo Codes", href: "/admin/promos", icon: Tag, color: "bg-emerald-500" },
        { label: "Messages", href: "/admin/messages", icon: MessageSquare, color: "bg-amber-500" },
    ]

    return (
        <div className="flex-1 space-y-8 p-8 pt-6 bg-slate-50/40 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter italic text-slate-900 leading-none">
                        Admin Dashboard
                    </h2>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2">
                        Reporting Period: {new Date(startDate).toLocaleDateString()} — {new Date(endDate).toLocaleDateString()}
                    </p>
                </div>
                <DateRangePicker />
            </div>

            {orderError && (
                <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl">
                    <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                    <p className="text-sm font-bold text-rose-700">Failed to load dashboard data. Some metrics may be incomplete.</p>
                </div>
            )}

            {/* QUICK ACTIONS */}
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                {quickActions.map(action => (
                    <Link key={action.label} href={action.href}
                        className="flex items-center gap-3 px-5 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all shrink-0"
                    >
                        <div className={`p-2 rounded-xl ${action.color} bg-opacity-10`}>
                            <action.icon className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">{action.label}</span>
                        <ArrowUpRight className="w-3 h-3 text-slate-300" />
                    </Link>
                ))}
                <Link href="/admin/orders"
                    className="flex items-center gap-3 px-5 py-3 bg-slate-900 text-white rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all shrink-0"
                >
                    <ShoppingBag className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">All Orders</span>
                    <ArrowUpRight className="w-3 h-3 text-slate-400" />
                </Link>
            </div>

            {/* MAIN STATS */}
            <StatsCards orders={netOrders} />

            {/* TODAY'S SNAPSHOT + AOV + ACTIVE CUSTOMERS */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                <QuickStat
                    title="Today's Revenue"
                    value={`₹${todayRevenue.toLocaleString('en-IN')}`}
                    subtitle={`${todayCount} orders today`}
                    icon={<TrendingUp className="w-4 h-4 text-emerald-500" />}
                />
                <QuickStat
                    title="Average Order Value"
                    value={`₹${aov.toLocaleString('en-IN')}`}
                    subtitle="Per order in period"
                    icon={<BarChart3 className="w-4 h-4 text-blue-500" />}
                />
                <QuickStat
                    title="Active Customers"
                    value={activeCustomers.toString()}
                    subtitle="Placed orders in period"
                    icon={<UserPlus className="w-4 h-4 text-violet-500" />}
                />
                <QuickStat
                    title="Pending Fulfillment"
                    value={pendingFulfillment.toString()}
                    subtitle="Awaiting shipment"
                    icon={<Clock className="w-4 h-4 text-orange-500" />}
                />
            </div>

            {/* OPERATIONAL STATS */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
                <QuickStat
                    title="Settled Cash"
                    value={`₹${paidRevenue.toLocaleString('en-IN')}`}
                    subtitle="Confirmed in bank"
                    icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                />
                <QuickStat
                    title="Unpaid Balance"
                    value={`₹${pendingRevenue.toLocaleString('en-IN')}`}
                    subtitle="Pending/COD"
                    icon={<Wallet className="w-4 h-4 text-orange-500" />}
                />
                <QuickStat
                    title="Fulfillment Rate"
                    value={`${fulfillmentRate.toFixed(0)}%`}
                    subtitle={`${deliveredCount} Delivered`}
                    icon={<Truck className="w-4 h-4 text-blue-500" />}
                />
                <QuickStat
                    title="Stock Health"
                    value={`${stockHealthPct}%`}
                    subtitle={`${inStockVariants}/${totalVariants} variants in stock`}
                    icon={<Box className="w-4 h-4 text-cyan-500" />}
                />
            </div>

            {/* ORDER STATUS BREAKDOWN */}
            <Card className="border-slate-200 shadow-sm rounded-2xl">
                <CardHeader>
                    <CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                        Order Status Breakdown
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-5 gap-4">
                        {statusBreakdown.map(s => {
                            const pct = allOrders.length > 0 ? Math.round((s.count / allOrders.length) * 100) : 0
                            return (
                                <div key={s.label} className="text-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className={`text-2xl font-black ${s.color}`}>{s.count}</div>
                                    <div className={`text-[9px] font-black uppercase tracking-widest mt-1 ${s.color}`}>{s.label}</div>
                                    <div className="text-[10px] text-slate-400 font-bold mt-0.5">{pct}%</div>
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* CHARTS */}
            <div className="grid gap-6 md:grid-cols-7">
                <div className="md:col-span-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
                    <CardTitle className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Revenue Flow</CardTitle>
                    <RevenueChart orders={netOrders} startDate={startDate} endDate={endDate} />
                </div>
                <div className="md:col-span-3 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
                    <CardTitle className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Top 5 Best Sellers</CardTitle>
                    <BestSellersChart orders={netOrders} />
                </div>
            </div>

            {/* TABLES + ACTIVITY FEED */}
            <div className="grid gap-6 md:grid-cols-7">
                <Card className="col-span-4 border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
                    <RecentOrdersTable orders={allOrders.slice(0, 10)} />
                </Card>

                <div className="col-span-3 space-y-6">
                    {/* RECENT ACTIVITY */}
                    <Card className="border-slate-200 shadow-sm rounded-2xl">
                        <CardHeader>
                            <CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                                <Activity className="w-3.5 h-3.5" />
                                Recent Activity
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {recentMessages.length === 0 && recentWaitlist.length === 0 ? (
                                <p className="text-[11px] text-slate-400 italic text-center py-4">No recent activity</p>
                            ) : (
                                <>
                                    {recentMessages.map((msg: any) => (
                                        <div key={msg.id} className="flex items-start gap-3">
                                            <div className="p-1.5 bg-amber-50 rounded-lg mt-0.5">
                                                <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[10px] font-bold text-slate-700 truncate">{msg.name}</p>
                                                <p className="text-[9px] text-slate-400 truncate">{msg.subject}</p>
                                            </div>
                                            <Badge variant="outline" className="text-[8px] uppercase shrink-0">
                                                {msg.status}
                                            </Badge>
                                        </div>
                                    ))}
                                    {recentWaitlist.map((w: any) => (
                                        <div key={w.id} className="flex items-start gap-3">
                                            <div className="p-1.5 bg-violet-50 rounded-lg mt-0.5">
                                                <UserPlus className="w-3.5 h-3.5 text-violet-600" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[10px] font-bold text-slate-700 truncate">{w.company_name}</p>
                                                <p className="text-[9px] text-slate-400">Wholesale Application</p>
                                            </div>
                                            <Badge variant="outline" className="text-[8px] uppercase shrink-0">
                                                {w.status}
                                            </Badge>
                                        </div>
                                    ))}
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>}>
                        <LowStockList />
                    </Suspense>
                </div>
            </div>
        </div>
    )
}

function QuickStat({ title, value, subtitle, icon }: QuickStatProps) {
    return (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-start justify-between shadow-sm">
            <div>
                <p className="text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest leading-none">{title}</p>
                <p className="text-2xl font-black text-slate-900 leading-none">{value}</p>
                <p className="text-[9px] text-slate-400 font-bold mt-2 italic uppercase">{subtitle}</p>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">{icon}</div>
        </div>
    )
}

function Activity(props: any) {
    return (
        <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
    )
}