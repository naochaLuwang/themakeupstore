import { createClient } from "@/utils/supabase/server"
import { DateRangePicker } from "@/components/admin/date-range-picker"
import { StatsCards } from "@/components/admin/stats-cards"
import { RecentOrdersTable } from "@/components/admin/recent-orders-table"
import { LowStockList } from "@/components/admin/low-stock-list"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Suspense } from "react"
import { Loader2, TrendingUp, AlertCircle, CheckCircle2, Truck, Wallet } from "lucide-react"
import { RevenueChart } from "@/components/admin/revenue-chart"
import { BestSellersChart } from "@/components/admin/bestseller-chart"
import { startOfDay, endOfDay, subDays, parseISO } from "date-fns"

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

    // Query now explicitly includes order_items for the BestSellers chart
    const { data: orders, error } = await supabase
        .from("orders")
        .select(`
            id,
            total,
            status,
            payment_status,
            created_at,
            order_items (
                quantity,
                product_name,
                variant_title
            ),
            profiles!orders_user_id_fkey (
                full_name
            )
        `)
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .order("created_at", { ascending: false })

    if (error) console.error("Dashboard Fetch Error:", error)

    const allOrders = orders || []
    // THE SOURCE OF TRUTH: Only non-cancelled orders count towards revenue
    const netOrders = allOrders.filter(o => o.status !== 'cancelled')

    const paidRevenue = netOrders
        .filter(o => o.payment_status === 'paid')
        .reduce((sum, o) => sum + Number(o.total || 0), 0)

    const pendingRevenue = netOrders
        .filter(o => o.payment_status !== 'paid')
        .reduce((sum, o) => sum + Number(o.total || 0), 0)

    const deliveredCount = netOrders.filter(o => o.status === 'delivered').length
    const fulfillmentRate = netOrders.length > 0 ? (deliveredCount / netOrders.length) * 100 : 0

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

            {/* MAIN STATS */}
            <StatsCards orders={netOrders} />

            {/* OPERATIONAL STATS */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
                <QuickStat
                    title="Settled Cash"
                    value={`₹${paidRevenue.toLocaleString()}`}
                    subtitle="Confirmed in bank"
                    icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                />
                <QuickStat
                    title="Unpaid Balance"
                    value={`₹${pendingRevenue.toLocaleString()}`}
                    subtitle="Pending/COD/Processing"
                    icon={<Wallet className="w-4 h-4 text-orange-500" />}
                />
                <QuickStat
                    title="Fulfillment"
                    value={`${fulfillmentRate.toFixed(0)}%`}
                    subtitle={`${deliveredCount} Orders Delivered`}
                    icon={<Truck className="w-4 h-4 text-blue-500" />}
                />
                <QuickStat
                    title="Dropped"
                    value={`${allOrders.length - netOrders.length}`}
                    subtitle="Cancelled Transactions"
                    icon={<AlertCircle className="w-4 h-4 text-rose-500" />}
                />
            </div>



            {/* CHARTS */}
            <div className="grid gap-6 md:grid-cols-7">
                <div className="md:col-span-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
                    <CardTitle className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Revenue Flow</CardTitle>
                    <RevenueChart orders={netOrders} startDate={startDate} endDate={endDate} />
                </div>
                <div className="md:col-span-3 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
                    <CardTitle className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Top 5 Shades (Best Sellers)</CardTitle>
                    {/* Passing netOrders which now includes the nested order_items */}
                    <BestSellersChart orders={netOrders} />
                </div>
            </div>

            {/* TABLES */}
            <div className="grid gap-6 md:grid-cols-7">
                <Card className="col-span-4 border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
                    <RecentOrdersTable orders={allOrders.slice(0, 10)} />
                </Card>

                <div className="col-span-3">
                    <Suspense fallback={<Loader2 className="animate-spin" />}>
                        <LowStockList />
                    </Suspense>
                </div>
            </div>
        </div>
    )
}

function QuickStat({ title, value, subtitle, icon }: any) {
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