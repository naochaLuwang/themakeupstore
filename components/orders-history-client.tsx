"use client"

import { useState } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Search, Calendar, ChevronRight, Clock, CheckCircle2, XCircle, ShoppingBag } from "lucide-react"

// Ensure the prop name matches what you pass from the page
export default function OrdersHistoryClient({ initialOrders }: { initialOrders: any[] }) {
    const [filter, setFilter] = useState("all")
    const [search, setSearch] = useState("")

    // We filter the data based on user input
    const filteredOrders = initialOrders?.filter(order => {
        const matchesSearch = order.id.toLowerCase().includes(search.toLowerCase())
        const matchesFilter = filter === "all" || order.status === filter
        return matchesSearch && matchesFilter
    })

    return (
        <div className="bg-white min-h-screen">
            <div className="max-w-5xl mx-auto px-6 py-10">

                {/* FILTERS */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div>
                        <h1 className="text-xl font-black uppercase tracking-tighter italic">Orders Archive</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {filteredOrders?.length || 0} Orders Found
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        <div className="relative w-full sm:w-48">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                            <Input
                                placeholder="Search ID..."
                                className="pl-8 h-9 text-[11px] rounded-lg border-slate-100 bg-slate-50/50"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                            {['all', 'pending', 'delivered'].map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`flex-1 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filter === f ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                                        }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* LIST */}
                <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                    {filteredOrders && filteredOrders.length > 0 ? (
                        <div className="divide-y divide-slate-50">
                            {filteredOrders.map((order) => (
                                <Link
                                    key={order.id}
                                    href={`/profile/orders/${order.id}`}
                                    className="flex items-center justify-between p-4 hover:bg-slate-50 transition-all group"
                                >
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${order.status === 'delivered' ? 'bg-emerald-50 text-emerald-500' :
                                            order.status === 'cancelled' ? 'bg-red-50 text-red-400' : 'bg-slate-900 text-white'
                                            }`}>
                                            {order.status === 'delivered' ? <CheckCircle2 className="w-4 h-4" /> :
                                                order.status === 'cancelled' ? <XCircle className="w-4 h-4" /> :
                                                    <Clock className="w-4 h-4" />}
                                        </div>

                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-black tracking-tight text-slate-900 uppercase">
                                                    #{order.id.slice(0, 8)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">
                                                <Calendar className="w-2.5 h-2.5" />
                                                {new Date(order.created_at).toLocaleDateString('en-GB')}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6 shrink-0">
                                        <div className="text-right">
                                            <p className="text-[10px] font-black tracking-tighter text-slate-900 italic">
                                                ₹{order.total?.toLocaleString('en-IN')}
                                            </p>
                                            <p className={`text-[8px] font-black uppercase tracking-widest ${order.status === 'delivered' ? 'text-emerald-500' : 'text-slate-400'
                                                }`}>
                                                {order.status}
                                            </p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="py-20 text-center">
                            <ShoppingBag className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No orders Found</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}