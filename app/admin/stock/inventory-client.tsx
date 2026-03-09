"use client"

import { useState } from "react"
import { Search, AlertTriangle, ArrowUpRight, ArrowDownRight, Package, BarChart3, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"

export default function InventoryClient({ initialData }: any) {
    const [search, setSearch] = useState("")

    const filtered = initialData.filter((item: any) =>
        item.product_name.toLowerCase().includes(search.toLowerCase()) ||
        item.sku?.toLowerCase().includes(search.toLowerCase())
    )

    const lowStockCount = initialData.filter((i: any) => i.current_balance < 10).length
    const totalInwardValue = initialData.reduce((acc: number, i: any) => acc + i.lifetime_inward, 0)

    return (
        <div className="space-y-8">
            {/* 1. ANALYTICS CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                        <Package className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Total Lifetime Stock</p>
                        <p className="text-2xl font-bold">{totalInwardValue.toLocaleString()}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Low Stock Alerts</p>
                        <p className="text-2xl font-bold text-amber-600">{lowStockCount}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                        <BarChart3 className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Current Inventory</p>
                        <p className="text-2xl font-bold text-emerald-600">
                            {initialData.reduce((acc: number, i: any) => acc + i.current_balance, 0).toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>

            {/* 2. SEARCH & FILTER TOOLBAR */}
            <div className="flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search product or SKU..."
                        className="pl-10 h-11 bg-white border-slate-200 text-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <button className="px-4 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                    <Filter className="w-4 h-4" />
                </button>
            </div>

            {/* 3. STOCK TABLE */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            <th className="px-6 py-4">Product Detail</th>
                            <th className="px-6 py-4">SKU</th>
                            <th className="px-6 py-4 text-center">Current Balance</th>
                            <th className="px-6 py-4 text-center">Lifetime Inward</th>
                            <th className="px-6 py-4 text-center">Lifetime Outward</th>
                            <th className="px-6 py-4 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filtered.map((item: any) => (
                            <tr key={item.variant_id} className="hover:bg-slate-50/50 transition-all group">
                                <td className="px-6 py-4">
                                    <p className="text-sm font-semibold text-slate-900">{item.product_name}</p>
                                    <p className="text-[10px] font-medium text-slate-400 uppercase">{item.variant_title}</p>
                                </td>
                                <td className="px-6 py-4 font-mono text-[11px] text-slate-500 uppercase tracking-tighter">
                                    {item.sku || 'N/A'}
                                </td>
                                <td className="px-6 py-4 text-center font-bold text-sm">
                                    {item.current_balance}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                        <ArrowUpRight className="w-3 h-3" /> {item.lifetime_inward}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="inline-flex items-center gap-1 text-[11px] font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded">
                                        <ArrowDownRight className="w-3 h-3" /> {item.lifetime_outward}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {item.current_balance < 10 ? (
                                        <span className="text-[9px] font-black uppercase text-amber-600 bg-amber-50 px-2 py-1 rounded tracking-tighter ring-1 ring-amber-200/50">Low Stock</span>
                                    ) : (
                                        <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-1 rounded tracking-tighter ring-1 ring-emerald-200/50">Optimal</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}