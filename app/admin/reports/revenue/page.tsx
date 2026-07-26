import { createClient } from "@/utils/supabase/server"
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, parseISO } from "date-fns"
import { DollarSign, CreditCard, TrendingUp, Clock, CheckCircle, Truck } from "lucide-react"
import { SalesFilter } from "@/components/admin/sales-filter"
import { ReportExportButtons } from "@/components/admin/report-export-buttons"
import { ReceiptButton } from "@/components/admin/receipt-button"

export default async function RevenueReportPage({
    searchParams,
}: {
    searchParams: Promise<{ range?: string; from?: string; to?: string }>
}) {
    const { range, from, to } = await searchParams
    const supabase = await createClient()

    let startDate: string;
    let endDate: string = endOfDay(new Date()).toISOString();
    const today = new Date();

    // 1. Date Selection Logic
    switch (range) {
        case "today": startDate = startOfDay(today).toISOString(); break;
        case "7d": startDate = startOfDay(subDays(today, 7)).toISOString(); break;
        case "30d": startDate = startOfDay(subDays(today, 30)).toISOString(); break;
        case "custom":
            startDate = from ? startOfDay(parseISO(from)).toISOString() : startOfDay(subDays(today, 7)).toISOString();
            endDate = to ? endOfDay(parseISO(to)).toISOString() : endOfDay(today).toISOString();
            break;
        default: startDate = startOfDay(subDays(today, 30)).toISOString();
    }

    const { data: orders, error } = await supabase
        .from("orders")
        .select(`id, total, status, payment_status, created_at, profiles!orders_user_id_fkey ( full_name )`)
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .order("created_at", { ascending: true });

    if (error) return <div className="p-10 text-red-500 font-bold">Query Error: {error.message}</div>

    // 2. Safe Financial Aggregations
    const safeOrders = orders || [];
    const netOrders = safeOrders.filter(o => o.status !== 'cancelled');

    const totalPaid = netOrders.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + Number(o.total || 0), 0);
    const totalUnpaid = netOrders.filter(o => o.payment_status === 'unpaid').reduce((sum, o) => sum + Number(o.total || 0), 0);
    const netRevenue = netOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const deliveredCount = netOrders.filter(o => o.status === 'delivered').length;

    // 3. Chart Logic
    const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });
    const trendData = days.map(day => {
        const formattedDay = format(day, 'yyyy-MM-dd');
        const dayTotal = netOrders
            .filter(o => format(parseISO(o.created_at), 'yyyy-MM-dd') === formattedDay)
            .reduce((sum, o) => sum + Number(o.total || 0), 0);
        return { label: format(day, 'dd MMM'), amount: dayTotal };
    });
    const maxAmount = Math.max(...trendData.map(d => d.amount), 1);

    return (
        <div className="p-4 space-y-4 bg-slate-50 min-h-screen">
            <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <h1 className="text-lg font-black uppercase tracking-tighter italic">Revenue Intelligence</h1>
                <div className="flex items-center gap-2">
                    <ReportExportButtons data={safeOrders} type="revenue" />
                    <SalesFilter />
                </div>
            </div>

            {/* Visual Trend Chart */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Revenue Flow (₹)</p>
                    <p className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-tighter">
                        Peak: ₹{maxAmount.toLocaleString()}
                    </p>
                </div>
                <div className="flex items-end justify-between h-40 gap-1.5 px-2 border-b border-slate-100 pb-2">
                    {trendData.map((d, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                            <div
                                className="w-full bg-slate-900 rounded-t-[2px] transition-all duration-500 hover:bg-emerald-500 cursor-pointer min-h-[1px]"
                                style={{ height: `${(d.amount / maxAmount) * 100}%` }}
                            />
                            <div className="absolute -top-10 hidden group-hover:flex flex-col items-center bg-slate-800 text-white text-[9px] px-2 py-1.5 rounded-lg z-50 whitespace-nowrap shadow-2xl pointer-events-none">
                                <span className="font-black text-emerald-400">₹{d.amount.toLocaleString()}</span>
                                <span className="opacity-60 text-[7px] uppercase">{d.label}</span>
                                <div className="absolute -bottom-1 w-2 h-2 bg-slate-800 rotate-45"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* STATS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <StatCard title="Net Revenue" value={`₹${netRevenue.toLocaleString()}`} icon={<DollarSign className="w-4 h-4 text-slate-400" />} />
                <StatCard title="Paid" value={`₹${totalPaid.toLocaleString()}`} icon={<CheckCircle className="w-4 h-4 text-emerald-500" />} />
                <StatCard title="Unpaid" value={`₹${totalUnpaid.toLocaleString()}`} icon={<Clock className="w-4 h-4 text-orange-500" />} />
                <StatCard title="Delivered" value={deliveredCount.toString()} icon={<Truck className="w-4 h-4 text-blue-500" />} />
                <StatCard title="Orders" value={netOrders.length.toString()} icon={<CreditCard className="w-4 h-4 text-purple-500" />} />
            </div>

            {/* DATA TABLE */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 border-b border-slate-100 uppercase text-[9px] font-black text-slate-400">
                        <tr>
                            <th className="px-4 py-3">Customer / ID</th>
                            <th className="px-4 py-3 text-center">Delivery</th>
                            <th className="px-4 py-3 text-center">Payment</th>
                            <th className="px-4 py-3 text-right">Amount</th>
                            <th className="px-4 py-3 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {safeOrders.length > 0 ? (
                            [...safeOrders].reverse().map((order: any) => {
                                const profileData = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles;
                                return (
                                    <tr key={order.id} className="hover:bg-slate-50/50 group transition-colors">
                                        <td className="px-4 py-2.5 font-bold text-slate-700">
                                            {profileData?.full_name || "Guest User"}
                                            <p className="text-[8px] font-medium text-slate-400 uppercase tracking-tighter">#{order.id.split('-')[0]}</p>
                                        </td>
                                        <td className="px-4 py-2.5 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${order.status === 'delivered' ? 'text-blue-600 bg-blue-50' : 'text-slate-400 bg-slate-50'
                                                }`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${order.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-orange-50 text-orange-600 border-orange-100'
                                                }`}>
                                                {order.payment_status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-right font-black text-slate-900">₹{Number(order.total).toLocaleString()}</td>
                                        <td className="px-4 py-2.5 text-center">
                                            <ReceiptButton order={order} />
                                        </td>
                                    </tr>
                                )
                            })
                        ) : (
                            <tr>
                                <td colSpan={5} className="py-20 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest italic">
                                    No transaction data available for this range
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function StatCard({ title, value, icon }: any) {
    return (
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm hover:border-slate-300 transition-all">
            <div>
                <p className="text-[9px] font-black uppercase text-slate-400 mb-1 leading-none tracking-widest">{title}</p>
                <p className="text-xl font-black text-slate-900 leading-none">{value}</p>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>
        </div>
    )
}