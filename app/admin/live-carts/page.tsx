"use client"

import { useEffect, useState, useMemo } from "react"
import { getLiveCarts } from "@/app/actions/admin-carts"
import {
    User, Clock, ShoppingBag, RefreshCw,
    Mail, MessageCircle, ChevronDown, ChevronUp,
    ExternalLink, Smartphone, Hash
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"

export default function CompactTerminal() {
    const [carts, setCarts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedId, setExpandedId] = useState<string | null>(null)

    const load = async () => {
        const data = await getLiveCarts()
        setCarts(data)
        setLoading(false)
    }

    useEffect(() => { load() }, [])

    if (loading) return (
        <div className="h-screen bg-black flex items-center justify-center font-mono text-[10px] text-emerald-500 uppercase tracking-widest">
            Fetching Buffer...
        </div>
    )

    return (
        <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-slate-900 selection:text-white">
            {/* HEADER BAR */}
            <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6 sticky top-0 bg-white/80 backdrop-blur-md z-20">
                <div className="flex items-center gap-4">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <h1 className="text-[11px] font-black uppercase tracking-[0.3em]">Live Feed</h1>
                    <span className="text-[10px] font-bold text-slate-300">/ {carts.length} Active</span>
                </div>
                <button onClick={load} className="p-2 hover:bg-slate-50 rounded-lg transition-colors">
                    <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                </button>
            </div>

            {/* TABLE HEADER */}
            <div className="grid grid-cols-12 px-6 py-4 border-b border-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-50/30">
                <div className="col-span-1">ID</div>
                <div className="col-span-3 px-2">Customer / Contact</div>
                <div className="col-span-4 px-2">Item Preview</div>
                <div className="col-span-1 text-center">Units</div>
                <div className="col-span-2 text-right">Last Seen</div>
                <div className="col-span-1"></div>
            </div>

            {/* LIST ROWS */}
            <div className="flex flex-col">
                {carts.map((cart) => (
                    <div key={cart.id} className="border-b border-slate-50 transition-colors">
                        {/* MAIN ROW */}
                        <div
                            onClick={() => setExpandedId(expandedId === cart.id ? null : cart.id)}
                            className={`grid grid-cols-12 px-6 py-5 items-center cursor-pointer hover:bg-slate-50/50 ${expandedId === cart.id ? 'bg-slate-50' : ''}`}
                        >
                            <div className="col-span-1 font-mono text-[10px] text-slate-300">#{cart.id.slice(0, 4)}</div>

                            <div className="col-span-3 px-2">
                                <p className="text-[11px] font-black uppercase truncate">{cart.customer?.full_name || "Guest User"}</p>
                                <p className="text-[9px] font-bold text-slate-400">{cart.customer?.phone || "Anon Session"}</p>
                            </div>

                            <div className="col-span-4 px-2 flex -space-x-1.5 overflow-hidden">
                                {cart.items.slice(0, 5).map((item: any, i: number) => (
                                    <div key={i} className="w-6 h-8 bg-slate-100 rounded border border-white relative shrink-0">
                                        <img src={item.image} className="w-full h-full object-cover rounded" alt="" />
                                    </div>
                                ))}
                                {cart.items.length > 5 && (
                                    <div className="w-6 h-8 bg-slate-900 text-white text-[7px] font-black flex items-center justify-center rounded border border-white shrink-0">
                                        +{cart.items.length - 5}
                                    </div>
                                )}
                            </div>

                            <div className="col-span-1 text-center text-[11px] font-black italic">{cart.totalItems}</div>

                            <div className="col-span-2 text-right text-[10px] font-bold text-slate-400">
                                {formatDistanceToNow(new Date(cart.updatedAt), { addSuffix: false })}
                            </div>

                            <div className="col-span-1 flex justify-end">
                                {expandedId === cart.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 text-slate-300" />}
                            </div>
                        </div>

                        {/* EXPANDED DETAIL PANEL */}
                        {expandedId === cart.id && (
                            <div className="bg-slate-50/80 px-12 py-8 border-y border-slate-100/50">
                                <div className="max-w-4xl grid grid-cols-2 gap-12">
                                    {/* Sub-list */}
                                    <div className="space-y-2">
                                        <h4 className="text-[9px] font-black uppercase text-slate-400 mb-4 tracking-widest">Bag Manifest</h4>
                                        {cart.items.map((item: any, i: number) => (
                                            <div key={i} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] font-black bg-slate-100 w-5 h-5 flex items-center justify-center rounded">{item.qty}</span>
                                                    <p className="text-[10px] font-bold uppercase truncate max-w-[150px]">{item.name}</p>
                                                </div>
                                                <span className="text-[9px] font-bold text-slate-300 italic">{item.variant}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col justify-end gap-3 pb-2">
                                        <h4 className="text-[9px] font-black uppercase text-slate-400 mb-2 tracking-widest">Protocol</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => toast.success("Email Queued")}
                                                className="h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase hover:border-slate-900 transition-colors"
                                            >
                                                <Mail className="w-3.5 h-3.5" /> Email
                                            </button>
                                            <button
                                                onClick={() => window.open(`https://wa.me/${cart.customer?.phone}`)}
                                                className="h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase hover:border-emerald-500 hover:text-emerald-600 transition-colors"
                                            >
                                                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}