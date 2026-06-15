"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/utils/supabase/client"
import { formatDistanceToNow, format } from "date-fns"
import {
    User, ChevronDown, ChevronUp,
    Monitor, Smartphone, MousePointer2, Search,
    Eye, Users, ExternalLink
} from "lucide-react"
import { Input } from "@/components/ui/input"

export default function VisitorHistoryPage() {
    const [logs, setLogs] = useState<any[]>([])
    const [expandedVisitor, setExpandedVisitor] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const supabase = createClient()

    useEffect(() => {
        const fetchAll = async () => {
            const { data } = await supabase
                .from('visitor_history')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(500)
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
                groups[log.visitor_id] = { ...log, totalHits: 0, history: [] }
            }
            groups[log.visitor_id].totalHits++
            groups[log.visitor_id].history.push(log)
        })
        return Object.values(groups)
            .filter((v: any) =>
                !searchQuery ||
                v.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                v.visitor_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                v.path?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                v.session_id?.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }, [logs, searchQuery])

    const totalHits = logs.length
    const uniqueVisitors = visitors.length
    const mobilePct = logs.length > 0
        ? Math.round((logs.filter(l => l.device === 'Mobile').length / logs.length) * 100)
        : 0

    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <h1 className="text-2xl font-black tracking-tight text-slate-900">Visitor History</h1>
                <p className="text-sm text-slate-500">Track page visits and user behavior</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Visitors</span>
                        <Users className="w-4 h-4 text-slate-400" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900 tracking-tight">{uniqueVisitors.toLocaleString()}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Page Hits</span>
                        <Eye className="w-4 h-4 text-slate-400" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900 tracking-tight">{totalHits.toLocaleString()}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Mobile</span>
                        <Smartphone className="w-4 h-4 text-slate-400" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900 tracking-tight">{mobilePct}%</p>
                </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <Input
                        placeholder="Search visitor, ID, or path..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 text-sm border-slate-200 bg-slate-50 rounded-lg"
                    />
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/50 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    <div className="col-span-4">Visitor</div>
                    <div className="col-span-3">Last Page</div>
                    <div className="col-span-2 text-center">Hits</div>
                    <div className="col-span-2 text-center">Device</div>
                    <div className="col-span-1"></div>
                </div>

                {visitors.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400 italic">No visitor data found.</div>
                ) : (
                    visitors.map((v: any) => {
                        const isExpanded = expandedVisitor === v.visitor_id
                        return (
                            <div key={v.visitor_id} className="border-b border-slate-50 last:border-0">
                                <div
                                    onClick={() => setExpandedVisitor(isExpanded ? null : v.visitor_id)}
                                    className={`grid grid-cols-12 gap-2 px-4 py-3 items-center cursor-pointer transition-colors hover:bg-slate-50/50 ${isExpanded ? 'bg-blue-50/20' : ''}`}
                                >
                                    <div className="col-span-4 flex items-center gap-3 min-w-0">
                                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                            <User className="w-3.5 h-3.5 text-slate-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-slate-800 truncate">{v.user_name}</p>
                                            <p className="text-[10px] font-mono text-slate-400 truncate">ID: {v.visitor_id.slice(-8)}</p>
                                        </div>
                                    </div>
                                    <div className="col-span-3 min-w-0">
                                        <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-medium text-slate-600 truncate max-w-full">
                                            <MousePointer2 className="w-3 h-3 text-slate-400 shrink-0" />
                                            <span className="truncate">{v.path}</span>
                                        </div>
                                    </div>
                                    <div className="col-span-2 text-center text-sm font-bold text-slate-700">{v.totalHits}</div>
                                    <div className="col-span-2 flex items-center justify-center gap-1.5">
                                        {v.device === 'Mobile' ? <Smartphone className="w-3 h-3 text-slate-400" /> : <Monitor className="w-3 h-3 text-slate-400" />}
                                        <span className="text-xs text-slate-500">{v.device || "—"}</span>
                                    </div>
                                    <div className="col-span-1 flex justify-end">
                                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-300" /> : <ChevronDown className="w-4 h-4 text-slate-300" />}
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="bg-slate-50/50 px-6 py-6 border-t border-slate-100">
                                        <div className="relative space-y-3 before:absolute before:left-[3px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
                                            {v.history.map((step: any, idx: number) => (
                                                <div key={step.id} className="flex items-start gap-4 pl-6 relative">
                                                    <div className={`absolute left-0 w-2 h-2 rounded-full border-2 border-white shadow-sm z-10 mt-1.5 ${idx === 0 ? 'bg-blue-500' : 'bg-slate-300'}`} />
                                                    <div className="min-w-[100px]">
                                                        <p className="text-[10px] font-semibold text-slate-700">
                                                            {format(new Date(step.created_at), 'MMM dd, HH:mm')}
                                                        </p>
                                                        <p className="text-[9px] text-slate-400">
                                                            {formatDistanceToNow(new Date(step.created_at), { addSuffix: true })}
                                                        </p>
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="bg-white px-3 py-2 rounded-lg border border-slate-100 inline-flex items-center gap-2">
                                                            <ExternalLink className="w-3 h-3 text-slate-300" />
                                                            <span className="text-xs font-medium text-slate-700">{step.path}</span>
                                                            {step.referrer && (
                                                                <>
                                                                    <span className="text-slate-200">|</span>
                                                                    <span className="text-[10px] text-slate-400">via {step.referrer}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })
                )}
            </div>

            {visitors.length > 0 && (
                <p className="text-[11px] text-slate-400 text-center">
                    {uniqueVisitors} visitor{uniqueVisitors !== 1 ? 's' : ''} · {totalHits} page hits
                </p>
            )}
        </div>
    )
}
