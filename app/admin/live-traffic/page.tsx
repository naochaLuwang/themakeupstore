"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/utils/supabase/client"
import {
    Activity, Eye, Clock, Monitor,
    Smartphone, Globe, ArrowUpRight,
    Search, RefreshCcw, User, Zap,
    Navigation, MousePointer2
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export default function WhiteSignalTerminal() {
    const [presenceState, setPresenceState] = useState<any>({})
    const [searchQuery, setSearchQuery] = useState("")
    const supabase = createClient()

    useEffect(() => {
        const channel = supabase.channel('online-traffic')
        channel.on('presence', { event: 'sync' }, () => {
            setPresenceState(channel.presenceState())
        }).subscribe()
        return () => { channel.unsubscribe() }
    }, [supabase])

    const liveUsers = useMemo(() => {
        const flattened = Object.values(presenceState).flat() as any[]
        return searchQuery
            ? flattened.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.current_page.toLowerCase().includes(searchQuery.toLowerCase()))
            : flattened
    }, [presenceState, searchQuery])

    const hotPaths = useMemo(() => {
        const counts: Record<string, number> = {}
        liveUsers.forEach(u => counts[u.current_page] = (counts[u.current_page] || 0) + 1)
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5)
    }, [liveUsers])

    return (
        <div className="min-h-screen bg-[#F9FAFB] text-slate-900 font-sans selection:bg-black selection:text-white antialiased">

            {/* TOP UTILITY NAV */}
            <nav className="h-20 bg-white border-b border-slate-200/60 flex items-center justify-between px-10 sticky top-0 z-50 backdrop-blur-md bg-white/80">
                <div className="flex items-center gap-10">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
                        <h1 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-900">Signal<span className="text-emerald-500">.</span>Live</h1>
                    </div>

                    <div className="hidden lg:flex items-center gap-6">
                        <div className="h-4 w-px bg-slate-200" />
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Active Nodes</span>
                            <span className="text-xs font-bold text-slate-900">{liveUsers.length}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 group-focus-within:text-slate-900 transition-colors" />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="FILTER LIVE PATHS..."
                            className="bg-slate-50 border border-slate-200 rounded-xl h-10 pl-10 pr-6 text-[10px] w-64 focus:w-80 focus:bg-white focus:ring-4 focus:ring-slate-100 outline-none transition-all placeholder:text-slate-300"
                        />
                    </div>
                    <button onClick={() => window.location.reload()} className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center hover:bg-slate-50 transition-all shadow-sm">
                        <RefreshCcw className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                </div>
            </nav>

            <main className="p-10 grid grid-cols-12 gap-8 max-w-[1800px] mx-auto">

                {/* LEFT COLUMN: ANALYTICS CARDS */}
                <div className="col-span-12 lg:col-span-3 space-y-6">
                    <div className="p-8 bg-white border border-slate-200/60 rounded-[2.5rem] shadow-sm relative overflow-hidden">
                        <Zap className="absolute -top-4 -right-4 w-24 h-24 text-slate-50" />
                        <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
                            <Activity className="w-3 h-3" /> Live Snapshot
                        </h3>
                        <div className="space-y-8">
                            <div>
                                <p className="text-5xl font-black tracking-tighter text-slate-900">{liveUsers.length}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-2 tracking-widest">Visitors Online</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <Monitor className="w-3.5 h-3.5 text-slate-300 mb-2" />
                                    <p className="text-sm font-black text-slate-900">{Math.round((liveUsers.filter(u => u.device === 'Desktop').length / liveUsers.length || 0) * 100)}%</p>
                                    <p className="text-[7px] font-black text-slate-400 uppercase">Desktop</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <Smartphone className="w-3.5 h-3.5 text-slate-300 mb-2" />
                                    <p className="text-sm font-black text-slate-900">{Math.round((liveUsers.filter(u => u.device === 'Mobile').length / liveUsers.length || 0) * 100)}%</p>
                                    <p className="text-[7px] font-black text-slate-400 uppercase">Mobile</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 bg-white border border-slate-200/60 rounded-[2.5rem] shadow-sm">
                        <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                            <Navigation className="w-3 h-3" /> Trailing Clusters
                        </h3>
                        <div className="space-y-4">
                            {hotPaths.map(([path, count], i) => (
                                <div key={i} className="flex items-center justify-between group">
                                    <span className="text-[10px] font-bold text-slate-400 truncate max-w-[150px] group-hover:text-slate-900 transition-colors uppercase tracking-tight">{path}</span>
                                    <span className="text-[9px] font-black px-2 py-0.5 bg-slate-100 rounded text-slate-500">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: DATA GRID */}
                <div className="col-span-12 lg:col-span-9">
                    <div className="bg-white border border-slate-200/60 rounded-[2.5rem] overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-100 text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 bg-slate-50/50">
                                    <th className="p-8">Visitor Node</th>
                                    <th className="p-8">Current Protocol</th>
                                    <th className="p-8">Uptime</th>
                                    <th className="p-8 text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {liveUsers.map((visitor, i) => (
                                    <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                                        <td className="p-8">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300 group-hover:bg-black group-hover:text-white transition-all">
                                                    <User className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black uppercase tracking-tight text-slate-900">{visitor.name}</p>
                                                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-1">{visitor.device} SESSION</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-8">
                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200/50 group-hover:border-slate-300 transition-colors">
                                                <MousePointer2 className="w-3 h-3 text-slate-400" />
                                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">{visitor.current_page}</span>
                                            </div>
                                        </td>
                                        <td className="p-8 text-[10px] font-bold text-slate-400">
                                            {formatDistanceToNow(new Date(visitor.entry_time), { addSuffix: false })} active
                                        </td>
                                        <td className="p-8 text-right">
                                            <button className="h-10 w-10 border border-slate-200 rounded-xl flex items-center justify-center hover:bg-black hover:text-white transition-all shadow-sm">
                                                <ArrowUpRight className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {liveUsers.length === 0 && (
                            <div className="py-32 flex flex-col items-center justify-center text-center opacity-20">
                                <Globe className="w-12 h-12 mb-6 stroke-[1] text-slate-900" />
                                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-900">Scanning for frequency...</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}