import { createClient } from "@/utils/supabase/server"
import { AlertCircle, ArrowLeft, Package, UserCheck, TrendingUp } from "lucide-react"
import Link from "next/link"

export default async function DemandIntelligencePage() {
    const supabase = await createClient()

    // Fetch notifications joined with product/variant info
    const { data: notifications, error } = await supabase
        .from('back_in_stock_notifications')
        .select(`
            *,
            products(name, brand),
            product_variants(title, stock, hex_code)
        `)
        .eq('is_notified', false)
        .order('created_at', { ascending: false })

    if (error) return <div className="p-10 text-red-500 font-black uppercase tracking-tighter">System Error: Connectivity Failure</div>

    // Grouping logic to see which shade has the highest demand
    const demandSummary = notifications?.reduce((acc: any, item: any) => {
        const key = item.product_variant_id;
        if (!acc[key]) {
            acc[key] = {
                id: key,
                name: item.products.name,
                shade: item.product_variants.title,
                hex: item.product_variants.hex_code,
                currentStock: item.product_variants.stock,
                count: 0,
                leads: []
            };
        }
        acc[key].count += 1;
        acc[key].leads.push({ name: item.user_name, email: item.email, phone: item.phone, date: item.created_at });
        return acc;
    }, {});

    const sortedDemand = Object.values(demandSummary || {}).sort((a: any, b: any) => b.count - a.count);

    return (
        <div className="p-8 space-y-10 bg-white min-h-screen">
            {/* HEADER */}
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <Link href="/admin/products" className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <h1 className="text-4xl font-black uppercase tracking-tighter italic">Demand Radar</h1>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] ml-12">Unfulfilled Customer Interest</p>
                </div>

                <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl flex items-center gap-4 shadow-xl">
                    <div className="text-right">
                        <p className="text-[8px] font-black uppercase tracking-widest opacity-50">Total Leads</p>
                        <p className="text-xl font-black">{notifications?.length || 0}</p>
                    </div>
                    <UserCheck className="w-5 h-5 text-emerald-400" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* RANKING LIST */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 mb-6">
                        <TrendingUp className="w-4 h-4" /> Priority Restock Ranking
                    </h2>

                    {sortedDemand.map((item: any, i: number) => (
                        <div key={item.id} className="group relative bg-white border border-slate-100 rounded-[2.5rem] p-8 hover:border-slate-900 transition-all duration-500 shadow-sm hover:shadow-2xl">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="relative">
                                        <div className="w-16 h-16 rounded-full border-4 border-slate-50 shadow-inner" style={{ backgroundColor: item.hex || '#f1f5f9' }} />
                                        <div className="absolute -top-2 -right-2 bg-slate-900 text-white w-8 h-8 rounded-full flex items-center justify-center text-xs font-black italic">
                                            #{i + 1}
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black tracking-tight text-slate-900 leading-none">{item.name}</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Shade: <span className="text-slate-900">{item.shade}</span></p>
                                    </div>
                                </div>

                                <div className="text-right space-y-1">
                                    <p className="text-4xl font-black tracking-tighter text-slate-900">{item.count}</p>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-none">Customers Waiting</p>
                                </div>
                            </div>

                            {/* LEAD MINI TABLE */}
                            <div className="mt-8 pt-8 border-t border-slate-50 grid grid-cols-3 gap-4">
                                <div className="bg-slate-50/50 p-4 rounded-2xl">
                                    <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Inventory Status</p>
                                    <p className={`text-[10px] font-black uppercase mt-1 ${item.currentStock > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {item.currentStock} Units in Stock
                                    </p>
                                </div>
                                <div className="col-span-2 flex -space-x-3 overflow-hidden items-center justify-end">
                                    {item.leads.slice(0, 5).map((lead: any, idx: number) => (
                                        <div key={idx} className="w-10 h-10 rounded-full bg-white border-2 border-slate-100 flex items-center justify-center text-[10px] font-black uppercase text-slate-400 shadow-sm">
                                            {lead.name.substring(0, 1)}
                                        </div>
                                    ))}
                                    {item.count > 5 && (
                                        <div className="pl-6 text-[10px] font-black text-slate-300">+{item.count - 5} MORE</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* LOGS PANEL */}
                <div className="space-y-6">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 mb-6">
                        <AlertCircle className="w-4 h-4" /> Live Transmission Log
                    </h2>
                    <div className="bg-slate-50 rounded-[2.5rem] p-6 space-y-4 max-h-[800px] overflow-y-auto custom-scrollbar border border-slate-100">
                        {notifications?.map((note: any) => (
                            <div key={note.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2 group hover:border-slate-900 transition-all">
                                <div className="flex justify-between items-start">
                                    <p className="text-[10px] font-black uppercase text-slate-900 leading-tight">{note.user_name}</p>
                                    <p className="text-[8px] font-bold text-slate-300">{new Date(note.created_at).toLocaleDateString()}</p>
                                </div>
                                <p className="text-[10px] font-medium text-slate-500 lowercase">{note.email}</p>
                                <p className="text-[10px] font-bold text-slate-900">{note.phone}</p>
                                <div className="pt-2 border-t border-slate-50 mt-2 flex items-center gap-2">
                                    <Package className="w-3 h-3 text-slate-300" />
                                    <p className="text-[9px] font-black uppercase tracking-tighter text-slate-400 truncate">
                                        {note.products.name} — {note.product_variants.title}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}