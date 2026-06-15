"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/utils/supabase/client"
import { getLiveCarts } from "@/app/actions/admin-carts"
import {
    ShoppingCart, RefreshCw, User, Package, Clock,
    ChevronDown, ChevronUp, Search, IndianRupee,
    Mail, MessageCircle, Smartphone, Eye
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"

export default function LiveCartsPage() {
    const [carts, setCarts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const supabase = createClient()

    const load = async () => {
        const data = await getLiveCarts()
        setCarts(data)
        setLoading(false)
    }

    useEffect(() => { load() }, [])

    // Realtime subscription
    useEffect(() => {
        const channel = supabase.channel('carts-live')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'carts' },
                () => load()
            )
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'cart_items' },
                () => load()
            )
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [supabase])

    // Auto-refresh every 30s as fallback
    useEffect(() => {
        const interval = setInterval(load, 30000)
        return () => clearInterval(interval)
    }, [])

    const filtered = useMemo(() =>
        carts.filter(c =>
            !searchQuery ||
            c.customer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.items?.some((i: any) => i.name?.toLowerCase().includes(searchQuery.toLowerCase()))
        ),
        [carts, searchQuery]
    )

    const totalItems = carts.reduce((s, c) => s + (c.totalItems || 0), 0)
    const totalValue = carts.reduce((s, c) => s + (c.totalValue || 0), 0)
    const staleCount = carts.filter(c => Date.now() - new Date(c.updatedAt).getTime() > 86400000).length

    if (loading) return (
        <div className="space-y-6 animate-pulse">
            <div className="space-y-1"><div className="h-8 w-48 bg-slate-200 rounded-lg" /><div className="h-4 w-64 bg-slate-100 rounded" /></div>
            <div className="grid grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-slate-100 rounded-xl" />)}
            </div>
            <div className="h-96 bg-slate-100 rounded-2xl" />
        </div>
    )

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">Live Carts</h1>
                    <p className="text-sm text-slate-500">{carts.length} active carts</p>
                </div>
                <button onClick={load}
                    className="h-9 px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Refresh
                </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-4 gap-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Active Carts</span>
                        <ShoppingCart className="w-4 h-4 text-slate-400" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900 tracking-tight">{carts.length}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Items</span>
                        <Package className="w-4 h-4 text-slate-400" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900 tracking-tight">{totalItems}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Cart Value</span>
                        <IndianRupee className="w-4 h-4 text-slate-400" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900 tracking-tight">₹{totalValue.toLocaleString('en-IN')}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Stale (&gt;24h)</span>
                        <Clock className="w-4 h-4 text-amber-500" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900 tracking-tight">{staleCount}</p>
                </div>
            </div>

            {/* Search */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <Input
                        placeholder="Search customer or cart ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 text-sm border-slate-200 bg-slate-50 rounded-lg"
                    />
                </div>
            </div>

            {/* Carts list */}
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/50 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    <div className="col-span-1">ID</div>
                    <div className="col-span-3">Customer</div>
                    <div className="col-span-3">Items</div>
                    <div className="col-span-1 text-center">Qty</div>
                    <div className="col-span-2 text-center">Value</div>
                    <div className="col-span-1 text-right">Seen</div>
                    <div className="col-span-1"></div>
                </div>

                {filtered.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400 italic">
                        {searchQuery ? "No carts match your search." : "No active carts right now."}
                    </div>
                ) : (
                    filtered.map((cart) => {
                        const isExpanded = expandedId === cart.id
                        const isStale = Date.now() - new Date(cart.updatedAt).getTime() > 86400000
                        return (
                            <div key={cart.id} className="border-b border-slate-50 last:border-0">
                                {/* Row */}
                                <div
                                    onClick={() => setExpandedId(isExpanded ? null : cart.id)}
                                    className={`grid grid-cols-12 gap-2 px-4 py-3 items-center cursor-pointer transition-colors hover:bg-slate-50/50 ${isExpanded ? 'bg-blue-50/20' : ''}`}
                                >
                                    <div className="col-span-1 font-mono text-[10px] text-slate-400">#{cart.id.slice(0, 4)}</div>
                                    <div className="col-span-3 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                                <User className="w-3.5 h-3.5 text-slate-400" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold text-slate-800 truncate">{cart.customer?.full_name || "Guest"}</p>
                                                <p className="text-[10px] text-slate-400 truncate">{cart.customer?.phone || "No contact"}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-span-3 flex -space-x-1 overflow-hidden items-center">
                                        {cart.items.slice(0, 4).map((item: any, i: number) => (
                                            <div key={i} className="w-7 h-7 bg-slate-100 rounded border-2 border-white shrink-0 flex items-center justify-center text-[8px] font-bold text-slate-400 overflow-hidden">
                                                {item.name?.charAt(0) || "?"}
                                            </div>
                                        ))}
                                        {cart.items.length > 4 && (
                                            <div className="w-7 h-7 bg-slate-200 text-[8px] font-bold text-slate-500 flex items-center justify-center rounded border-2 border-white shrink-0">
                                                +{cart.items.length - 4}
                                            </div>
                                        )}
                                    </div>
                                    <div className="col-span-1 text-center text-sm font-bold text-slate-700">{cart.totalItems}</div>
                                    <div className="col-span-2 text-center text-xs font-semibold text-emerald-600 font-mono">₹{cart.totalValue?.toLocaleString('en-IN') || 0}</div>
                                    <div className="col-span-1 text-right">
                                        <div className={`inline-flex items-center gap-1 text-[10px] font-medium ${isStale ? 'text-amber-500' : 'text-slate-400'}`}>
                                            <Clock className={`w-3 h-3 ${isStale ? 'text-amber-400' : 'text-slate-300'}`} />
                                            {formatDistanceToNow(new Date(cart.updatedAt), { addSuffix: false })}
                                        </div>
                                    </div>
                                    <div className="col-span-1 flex justify-end">
                                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-300" /> : <ChevronDown className="w-4 h-4 text-slate-300" />}
                                    </div>
                                </div>

                                {/* Expanded detail */}
                                {isExpanded && (
                                    <div className="bg-slate-50/50 px-6 py-5 border-t border-slate-100">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Cart Items</p>
                                                {cart.items.map((item: any, i: number) => (
                                                    <div key={i} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-100">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 w-5 h-5 flex items-center justify-center rounded shrink-0">
                                                                {item.qty}
                                                            </span>
                                                            <span className="text-xs font-medium text-slate-700 truncate">{item.name}</span>
                                                        </div>
                                                        <span className="text-[10px] text-slate-400 ml-2 shrink-0">{item.variant || ""}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex flex-col justify-end gap-2">
                                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Actions</p>
                                                <button
                                                    onClick={() => toast.success("Email notification queued")}
                                                    className="h-10 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <Mail className="w-3.5 h-3.5" /> Send Email
                                                </button>
                                                <button
                                                    onClick={() => cart.customer?.phone && window.open(`https://wa.me/${cart.customer.phone.replace(/[^0-9]/g, '')}`)}
                                                    className="h-10 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })
                )}
            </div>

            <p className="text-[11px] text-slate-400 text-center">
                Auto-refreshes every 30s · {carts.length} active · {totalItems} items · ₹{totalValue.toLocaleString('en-IN')} total
            </p>
        </div>
    )
}
