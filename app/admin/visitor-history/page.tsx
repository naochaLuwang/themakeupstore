"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/utils/supabase/client"
import { formatDistanceToNow, format } from "date-fns"
import {
    User, Clock, ChevronDown, ChevronUp,
    Monitor, Smartphone, MapPin, MousePointer2
} from "lucide-react"

export default function VisitorHistoryPage() {
    const [logs, setLogs] = useState<any[]>([])
    const [expandedVisitor, setExpandedVisitor] = useState<string | null>(null)
    const supabase = createClient()

    useEffect(() => {
        const fetchAll = async () => {
            const { data } = await supabase
                .from('visitor_history')
                .select('*')
                .order('created_at', { ascending: false })
            setLogs(data || [])
        }
        fetchAll()

        const channel = supabase.channel('history-realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'visitor_history' },
                (p) => setLogs(prev => [p.new, ...prev]))
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [supabase])

    const visitors = useMemo(() => {
        const groups: Record<string, any> = {}
        logs.forEach(log => {
            if (!groups[log.visitor_id]) {
                groups[log.visitor_id] = {
                    ...log,
                    totalHits: 0,
                    history: []
                }
            }
            groups[log.visitor_id].totalHits++
            groups[log.visitor_id].history.push(log)
        })
        return Object.values(groups).sort((a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
    }, [logs])

    return (
        <div className="min-h-screen bg-white text-slate-900 p-8 lg:p-12 font-sans selection:bg-black selection:text-white antialiased">
            <header className="mb-16">
                <h1 className="text-4xl font-black uppercase italic tracking-tighter">Signal<span className="text-indigo-600">.</span>Archive</h1>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-3">Persistent Node Tracking — {visitors.length} Unique Identities</p>
            </header>

            <div className="space-y-1">
                {/* TABLE HEADER */}
                <div className="grid grid-cols-12 px-8 py-4 text-[9px] font-black uppercase tracking-widest text-slate-300 border-b border-slate-50">
                    <div className="col-span-4">Visitor Identity</div>
                    <div className="col-span-4">Latest Interaction</div>
                    <div className="col-span-2 text-center">Hits</div>
                    <div className="col-span-2 text-right">Hardware</div>
                </div>

                {/* VISITOR ROWS */}
                {visitors.map((v: any) => (
                    <div key={v.visitor_id} className="border-b border-slate-50 last:border-0">
                        <div
                            onClick={() => setExpandedVisitor(expandedVisitor === v.visitor_id ? null : v.visitor_id)}
                            className={`grid grid-cols-12 px-8 py-6 items-center cursor-pointer transition-all hover:bg-slate-50 ${expandedVisitor === v.visitor_id ? 'bg-slate-50' : ''}`}
                        >
                            <div className="col-span-4 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-black">
                                    <User className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-tight">{v.user_name}</p>
                                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">UID: {v.visitor_id.slice(-8)}</p>
                                </div>
                            </div>

                            <div className="col-span-4">
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl shadow-sm">
                                    <MousePointer2 className="w-3 h-3 text-slate-400" />
                                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">{v.path}</span>
                                </div>
                            </div>

                            <div className="col-span-2 text-center text-xs font-black italic text-slate-300">
                                {v.totalHits} Clicks
                            </div>

                            <div className="col-span-2 flex items-center justify-end gap-6">
                                {v.device === 'Mobile' ? <Smartphone className="w-4 h-4 text-slate-300" /> : <Monitor className="w-4 h-4 text-slate-300" />}
                                {expandedVisitor === v.visitor_id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 text-slate-200" />}
                            </div>
                        </div>

                        {/* TIMELINE DETAIL */}
                        {expandedVisitor === v.visitor_id && (
                            <div className="bg-slate-50/50 px-24 py-12 border-t border-slate-100">
                                <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mb-10">Historical Timeline</h4>
                                <div className="relative space-y-8 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
                                    {v.history.map((step: any, idx: number) => (
                                        <div key={step.id} className="flex items-start gap-10 relative pl-8 group">
                                            {/* Timeline Node */}
                                            <div className={`absolute left-0 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm z-10 ${idx === 0 ? 'bg-indigo-600' : 'bg-slate-300'}`} />

                                            <div className="min-w-[120px]">
                                                <p className="text-[10px] font-black text-slate-900 uppercase">
                                                    {format(new Date(step.created_at), 'MMM dd, HH:mm')}
                                                </p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                                    {formatDistanceToNow(new Date(step.created_at), { addSuffix: true })}
                                                </p>
                                            </div>

                                            <div className="flex-1">
                                                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm inline-block min-w-[300px] group-hover:border-indigo-200 transition-all">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-[8px] font-black text-indigo-500 uppercase tracking-[0.2em]">Navigation Event</span>
                                                        <span className="text-[8px] font-bold text-slate-300 uppercase italic">Session: {step.session_id.slice(-5)}</span>
                                                    </div>
                                                    <p className="text-[11px] font-black uppercase text-slate-700">{step.path}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}