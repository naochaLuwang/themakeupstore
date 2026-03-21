"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/utils/supabase/client"
import {
    Activity, MousePointer2, User,
    Smartphone, Monitor, ChevronDown,
    ChevronUp, Clock, Calendar,
    ArrowRight, History
} from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"

export default function TrafficCommandCenter() {
    const [presence, setPresence] = useState<any>({})
    const [rawLogs, setRawLogs] = useState<any[]>([])
    const [heatmap, setHeatmap] = useState<any[]>([])
    const [expandedVisitor, setExpandedVisitor] = useState<string | null>(null)
    const supabase = createClient()

    useEffect(() => {
        const loadInitialData = async () => {
            // Fetching more logs to build a better history
            const { data: logs } = await supabase.from('traffic_log').select('*').order('created_at', { ascending: false }).limit(1000)
            const { data: heat } = await supabase.from('traffic_heatmap').select('*')
            setRawLogs(logs || [])
            setHeatmap(heat || [])
        }
        loadInitialData()

        const channel = supabase.channel('traffic-monitor')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'traffic_log' }, (p) => {
                setRawLogs(prev => [p.new, ...prev])
            })
            .on('presence', { event: 'sync' }, () => setPresence(channel.presenceState()))
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [supabase])

    // --- CRITICAL CHANGE: GROUP BY VISITOR_ID ---
    const visitorAggregates = useMemo(() => {
        const groups: Record<string, any> = {}

        rawLogs.forEach(log => {
            const vid = log.visitor_id || log.session_id // Fallback if old data doesn't have visitor_id
            if (!groups[vid]) {
                groups[vid] = {
                    ...log,
                    history: []
                }
            }
            groups[vid].history.push(log)
        })

        return Object.values(groups).sort((a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
    }, [rawLogs])

    // Presence check (Presence still uses session_id for real-time accuracy)
    const onlineSessionIds = Object.values(presence).flat().map((p: any) => p.id)

    return (
        <div className="min-h-screen bg-[#FBFBFC] text-slate-900 p-8 font-sans antialiased">

            {/* HEATMAP SECTION */}
            <section className="mb-10 bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-sm">
                <header className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3">
                        <Activity className="w-4 h-4 text-emerald-500" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Traffic Density (24H)</h3>
                    </div>
                </header>
                <div className="flex items-end gap-1.5 h-16">
                    {Array.from({ length: 24 }).map((_, i) => {
                        const hourData = heatmap.find(h => h.hour_of_day === i)
                        const height = hourData ? Math.min(100, (hourData.hit_count / 50) * 100) : 5
                        return (
                            <div key={i} className="flex-1 group relative h-full flex items-end">
                                <div
                                    style={{ height: `${height}%` }}
                                    className={`w-full rounded-t-lg transition-all duration-500 ${height > 60 ? 'bg-slate-900' : 'bg-slate-200'} group-hover:bg-emerald-500`}
                                />
                            </div>
                        )
                    })}
                </div>
            </section>

            {/* ONE ROW PER VISITOR TABLE */}
            <div className="bg-white border border-slate-200/60 rounded-[3rem] overflow-hidden shadow-sm">
                <div className="grid grid-cols-12 px-10 py-5 bg-slate-50/50 border-b border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400">
                    <div className="col-span-1">Live</div>
                    <div className="col-span-3">Visitor Identity</div>
                    <div className="col-span-4">Latest Path</div>
                    <div className="col-span-2 text-center">Total Engagement</div>
                    <div className="col-span-2 text-right">Recency</div>
                </div>

                {visitorAggregates.map((visitor: any) => {
                    const isExpanded = expandedVisitor === visitor.visitor_id
                    // Check if any of this visitor's history IDs are currently online
                    const isOnline = visitor.history.some((h: any) => onlineSessionIds.includes(h.session_id))

                    return (
                        <div key={visitor.visitor_id} className="border-b border-slate-50 last:border-0">
                            <div
                                onClick={() => setExpandedVisitor(isExpanded ? null : visitor.visitor_id)}
                                className={`grid grid-cols-12 px-10 py-7 items-center cursor-pointer hover:bg-slate-50 transition-all ${isExpanded ? 'bg-slate-50' : ''}`}
                            >
                                <div className="col-span-1">
                                    <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.6)]' : 'bg-slate-200'}`} />
                                </div>
                                <div className="col-span-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-tight">{visitor.user_name}</p>
                                            <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mt-0.5">VID: {visitor.visitor_id?.slice(-6) || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-span-4">
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 uppercase">
                                        <MousePointer2 className="w-3 h-3 text-slate-300" />
                                        {visitor.path}
                                    </div>
                                </div>
                                <div className="col-span-2 text-center">
                                    <span className="text-[10px] font-black italic text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                                        {visitor.history.length} Hits
                                    </span>
                                </div>
                                <div className="col-span-2 text-right flex items-center justify-end gap-5">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                                        {formatDistanceToNow(new Date(visitor.created_at), { addSuffix: true })}
                                    </span>
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 text-slate-200" />}
                                </div>
                            </div>

                            {/* DETAIL TIMELINE */}
                            {isExpanded && (
                                <div className="px-24 py-12 bg-slate-50/50 border-t border-slate-100">
                                    <div className="max-w-4xl">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-10 flex items-center gap-2">
                                            <History className="w-3 h-3" /> Full Narrative History
                                        </h4>

                                        <div className="space-y-6 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
                                            {visitor.history.map((step: any, idx: number) => {
                                                // Check if this step is a new session
                                                const isNewSession = idx > 0 && step.session_id !== visitor.history[idx - 1].session_id;

                                                return (
                                                    <div key={step.id} className="group">
                                                        {isNewSession && (
                                                            <div className="flex items-center gap-4 my-8 opacity-40">
                                                                <div className="h-px bg-slate-300 flex-1" />
                                                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">New Session Started</span>
                                                                <div className="h-px bg-slate-300 flex-1" />
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-8 relative pl-8">
                                                            <div className={`absolute left-0 w-3.5 h-3.5 rounded-full border-2 border-white z-10 ${idx === 0 ? 'bg-indigo-600 shadow-lg' : 'bg-slate-300'}`} />
                                                            <div className="min-w-[100px]">
                                                                <p className="text-[10px] font-black text-slate-900 uppercase">
                                                                    {format(new Date(step.created_at), 'MMM dd, HH:mm')}
                                                                </p>
                                                            </div>
                                                            <div className="px-4 py-2 bg-white border border-slate-200 rounded-2xl text-[10px] font-bold uppercase group-hover:border-slate-900 transition-all shadow-sm">
                                                                {step.path}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-slate-300">
                                                                {step.device === 'Mobile' ? <Smartphone className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}