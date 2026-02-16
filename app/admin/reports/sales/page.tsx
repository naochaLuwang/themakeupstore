import { createClient } from "@/utils/supabase/server"
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { Package, AlertTriangle, CheckCircle2 } from "lucide-react"
import { SalesFilter } from "@/components/admin/sales-filter"
import { ReportExportButtons } from "@/components/admin/report-export-buttons"

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
        case "custom":
            startDate = from ? startOfDay(new Date(from)).toISOString() : startOfDay(subDays(today, 7)).toISOString();
            endDate = to ? endOfDay(new Date(to)).toISOString() : endOfDay(today).toISOString();
            break;
        default: startDate = startOfDay(subDays(today, 365)).toISOString();
    }

    const { data: salesData } = await supabase
        .from("order_items")
        .select(`
            product_name, variant_title, quantity,
            product_variants ( stock ),
            orders!inner ( created_at, status )
        `)
        .neq("orders.status", "cancelled")
        .gte("orders.created_at", startDate)
        .lte("orders.created_at", endDate);

    let totalQuantity = 0;
    const velocityMap: Record<string, any> = {};

    salesData?.forEach((item: any) => {
        totalQuantity += item.quantity;
        const key = `${item.product_name} ${item.variant_title ? `(${item.variant_title})` : ''}`;
        if (!velocityMap[key]) {
            velocityMap[key] = { name: key, unitsSold: 0, currentStock: item.product_variants?.stock ?? 0 };
        }
        velocityMap[key].unitsSold += item.quantity;
    });

    const sortedVelocity = Object.values(velocityMap).sort((a, b) => b.unitsSold - a.unitsSold);

    return (
        <div className="p-4 space-y-4 bg-slate-50 min-h-screen font-sans">
            <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
                <div>
                    <h1 className="text-lg font-black uppercase tracking-tighter text-slate-900 italic">Item Sales Report</h1>
                    <p className="text-[9px] font-bold text-slate-400 uppercase leading-none">
                        {format(new Date(startDate), "dd MMM")} — {format(new Date(endDate), "dd MMM")}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <ReportExportButtons data={sortedVelocity} type="velocity" />
                    <SalesFilter />
                </div>
            </div>



            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 p-4 rounded-xl text-white">
                    <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Total Sold</p>
                    <p className="text-4xl font-black">{totalQuantity.toLocaleString()}</p>
                </div>
                <div className="md:col-span-3 bg-white p-4 rounded-xl border border-slate-200 flex items-center text-[11px] text-slate-500 font-medium italic">
                    Note: "Refill" status triggers when units sold in the selected period exceed current shelf stock.
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-4 py-2 font-black text-slate-400 uppercase text-[9px]">Variant Description</th>
                            <th className="px-4 py-2 font-black text-slate-400 uppercase text-[9px] text-center">In Stock</th>
                            <th className="px-4 py-2 font-black text-slate-400 uppercase text-[9px] text-center">Sold</th>
                            <th className="px-4 py-2 font-black text-slate-400 uppercase text-[9px] text-right">Burn Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {sortedVelocity.map((item, i) => {
                            const isDanger = item.unitsSold > item.currentStock;
                            return (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-4 py-2 font-bold text-slate-800">{item.name}</td>
                                    <td className="px-4 py-2 text-center font-mono text-slate-400">{item.currentStock}</td>
                                    <td className="px-4 py-2 text-center font-black text-slate-900">{item.unitsSold}</td>
                                    <td className="px-4 py-2 text-right">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase border ${isDanger ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                            }`}>
                                            {isDanger ? 'Refill' : 'Stable'}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}