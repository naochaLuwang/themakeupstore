import { createClient } from "@/utils/supabase/server"
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { SalesFilter } from "@/components/admin/sales-filter"
import { ReportExportButtons } from "@/components/admin/report-export-buttons"
import { Package, TrendingUp, ShoppingCart, BarChart3 } from "lucide-react"

export default async function SalesReportPage({
    searchParams,
}: {
    searchParams: Promise<{ range?: string; from?: string; to?: string }>
}) {
    const { range, from, to } = await searchParams
    const supabase = await createClient()

    let startDate: string;
    let endDate: string = endOfDay(new Date()).toISOString();
    const today = new Date();

    switch (range) {
        case "today": startDate = startOfDay(today).toISOString(); break;
        case "7d": startDate = startOfDay(subDays(today, 7)).toISOString(); break;
        case "30d": startDate = startOfDay(subDays(today, 30)).toISOString(); break;
        case "last_month":
            startDate = startOfMonth(subMonths(today, 1)).toISOString();
            endDate = endOfMonth(subMonths(today, 1)).toISOString();
            break;
        case "all":
            startDate = startOfDay(subDays(today, 3650)).toISOString();
            break;
        case "custom":
            startDate = from ? startOfDay(new Date(from)).toISOString() : startOfDay(subDays(today, 7)).toISOString();
            endDate = to ? endOfDay(new Date(to)).toISOString() : endOfDay(today).toISOString();
            break;
        default: startDate = startOfDay(subDays(today, 365)).toISOString();
    }

    const [
        salesRes,
        ordersRes,
        catRes,
    ] = await Promise.all([
        supabase.from("order_items")
            .select(`
                product_name, variant_title, quantity, unit_price, product_id,
                product_variants ( stock ),
                orders!inner ( created_at, status, total, id )
            `)
            .neq("orders.status", "cancelled")
            .gte("orders.created_at", startDate)
            .lte("orders.created_at", endDate),
        supabase.from("orders")
            .select("id, total", { count: "exact" })
            .neq("status", "cancelled")
            .gte("created_at", startDate)
            .lte("created_at", endDate),
        supabase.from("product_categories")
            .select("product_id, categories!inner(name)"),
    ])

    const salesData = salesRes.data || []
    const orderCount = ordersRes.count || 0
    const periodRevenue = (ordersRes.data || []).reduce((s, o: any) => s + Number(o.total || 0), 0)

    // Category map
    const catMap = new Map<string, string>()
    catRes.data?.forEach((pc: any) => {
        if (!catMap.has(pc.product_id)) catMap.set(pc.product_id, pc.categories?.name || "Uncategorized")
    })

    let totalQuantity = 0
    let totalRevenue = 0
    const velocityMap: Record<string, any> = {}

    salesData.forEach((item: any) => {
        totalQuantity += item.quantity
        totalRevenue += (item.quantity || 0) * Number(item.unit_price || 0)
        const key = `${item.product_name} ${item.variant_title ? `(${item.variant_title})` : ''}`
        if (!velocityMap[key]) {
            velocityMap[key] = {
                name: key,
                productName: item.product_name,
                category: catMap.get(item.product_id) || "",
                unitsSold: 0,
                revenue: 0,
                currentStock: item.product_variants?.stock ?? 0,
            }
        }
        velocityMap[key].unitsSold += item.quantity
        velocityMap[key].revenue += (item.quantity || 0) * Number(item.unit_price || 0)
    })

    const sortedVelocity = Object.values(velocityMap).sort((a: any, b: any) => b.unitsSold - a.unitsSold) as any[]
    const avgDaily = Math.round(totalQuantity / Math.max(1, (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000))

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">Sales Report</h1>
                    <p className="text-sm text-slate-500">
                        {format(new Date(startDate), "MMM dd, yyyy")} — {format(new Date(endDate), "MMM dd, yyyy")}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <ReportExportButtons data={sortedVelocity} type="velocity" />
                    <SalesFilter />
                </div>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-4 gap-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Units Sold</span>
                        <div className="w-6 h-6 flex items-center justify-center rounded-md bg-slate-50 border border-slate-100">
                            <Package className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 tracking-tight">{totalQuantity.toLocaleString()}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Orders</span>
                        <div className="w-6 h-6 flex items-center justify-center rounded-md bg-slate-50 border border-slate-100">
                            <ShoppingCart className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 tracking-tight">{orderCount.toLocaleString()}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Avg Daily</span>
                        <div className="w-6 h-6 flex items-center justify-center rounded-md bg-slate-50 border border-slate-100">
                            <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 tracking-tight">{avgDaily}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Revenue</span>
                        <div className="w-6 h-6 flex items-center justify-center rounded-md bg-slate-50 border border-slate-100">
                            <BarChart3 className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 tracking-tight">₹{totalRevenue.toLocaleString('en-IN')}</p>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                            <th className="py-3 px-4 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Variant</th>
                            <th className="py-3 px-4 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Category</th>
                            <th className="py-3 px-4 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider">In Stock</th>
                            <th className="py-3 px-4 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Sold</th>
                            <th className="py-3 px-4 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {sortedVelocity.map((item: any, i: number) => {
                            const isDanger = item.unitsSold > item.currentStock
                            return (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="py-3 px-4">
                                        <p className="text-sm font-semibold text-slate-800">{item.productName}</p>
                                        {item.name !== item.productName && (
                                            <p className="text-xs text-slate-400">{item.name.replace(item.productName, '').trim()}</p>
                                        )}
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className="text-xs text-slate-500 font-medium">{item.category || "—"}</span>
                                    </td>
                                    <td className="py-3 px-4 text-center font-mono text-sm text-slate-500">{item.currentStock}</td>
                                    <td className="py-3 px-4 text-center">
                                        <span className="text-sm font-bold text-slate-900">{item.unitsSold}</span>
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                            isDanger
                                                ? 'bg-orange-50 text-orange-600 border-orange-200'
                                                : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                        }`}>
                                            {isDanger ? 'Refill' : 'Stable'}
                                        </span>
                                    </td>
                                </tr>
                            )
                        })}
                        {sortedVelocity.length === 0 && (
                            <tr>
                                <td colSpan={5} className="h-24 text-center text-xs text-slate-400">
                                    No sales data found for this period.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
