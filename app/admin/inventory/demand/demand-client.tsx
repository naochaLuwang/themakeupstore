"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { markNotified, batchMarkNotified } from "@/app/actions/demand"
import { toast } from "sonner"
import {
    Search, Package, Square, CheckSquare, Bell, BellOff,
    Download, ExternalLink, Clock, TrendingUp,
    ChevronDown, ChevronRight, Loader2, Zap,
} from "lucide-react"
import Link from "next/link"

export default function DemandPageClient({
    initialData,
    searchParams,
}: {
    initialData: any[]
    searchParams: { from?: string; to?: string }
}) {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState("")
    const [showNotified, setShowNotified] = useState(false)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [notifyingId, setNotifyingId] = useState<string | null>(null)
    const [isBatchNotifying, setIsBatchNotifying] = useState(false)
    const [expanded, setExpanded] = useState<Set<string>>(new Set())

    const filtered = useMemo(() => {
        const q = searchQuery.toLowerCase()
        return initialData.filter((n) => {
            if (!showNotified && n.is_notified) return false
            return (
                n.products?.name?.toLowerCase().includes(q) ||
                n.product_variants?.title?.toLowerCase().includes(q) ||
                n.user_name?.toLowerCase().includes(q) ||
                n.email?.toLowerCase().includes(q)
            )
        })
    }, [searchQuery, showNotified, initialData])

    // Group by variant
    const grouped = useMemo(() => {
        const map = new Map<string, any>()
        filtered.forEach((n) => {
            const key = n.product_variant_id
            if (!map.has(key)) {
                map.set(key, {
                    variantId: key,
                    productId: n.product_id,
                    productName: n.products?.name || "Unknown",
                    brand: n.products?.brand || "",
                    thumbnail: n.products?.thumbnail_url || "",
                    shade: n.product_variants?.title || "Default",
                    hex: n.product_variants?.hex_code || "",
                    stock: n.product_variants?.stock ?? 0,
                    count: 0,
                    notifiedCount: 0,
                    leads: [],
                })
            }
            const g = map.get(key)!
            g.count++
            if (n.is_notified) g.notifiedCount++
            g.leads.push({
                id: n.id,
                name: n.user_name,
                email: n.email,
                phone: n.phone,
                date: n.created_at,
                is_notified: n.is_notified,
                notified_at: n.notified_at,
            })
        })
        return [...map.values()].sort((a, b) => b.count - a.count)
    }, [filtered])

    // Weekly trend
    const trend = useMemo(() => {
        const weeks: { label: string; count: number }[] = []
        const now = new Date()
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now)
            d.setDate(d.getDate() - i * 7)
            const weekLabel = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
            const weekStart = new Date(d)
            weekStart.setDate(weekStart.getDate() - weekStart.getDay())
            const weekEnd = new Date(weekStart)
            weekEnd.setDate(weekEnd.getDate() + 7)
            const count = initialData.filter((n) => {
                const nd = new Date(n.created_at)
                return nd >= weekStart && nd < weekEnd
            }).length
            weeks.push({ label: weekLabel, count })
        }
        return weeks
    }, [initialData])

    const maxTrend = Math.max(...trend.map((w) => w.count), 1)

    const pendingCount = grouped.reduce((s, g) => s + g.count - g.notifiedCount, 0)
    const totalLeads = initialData.length

    const toggleExpand = (id: string) => {
        setExpanded((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id); else next.add(id)
            return next
        })
    }

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id); else next.add(id)
            return next
        })
    }

    const toggleSelectAll = () => {
        if (selectedIds.size === grouped.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(grouped.map((g) => g.variantId)))
        }
    }

    const handleNotify = async (variantId: string) => {
        setNotifyingId(variantId)
        try {
            const res = await markNotified(variantId)
            if (res?.delivered && res?.failed) {
                toast.success(`${res.delivered} email${res.delivered !== 1 ? "s" : ""} sent`)
                if (res.failed > 0) toast.error(`${res.failed} failed`)
            } else {
                toast.success("Marked as notified")
            }
            router.refresh()
        } catch (err: any) {
            toast.error(err.message || "Error")
        } finally {
            setNotifyingId(null)
        }
    }

    const handleBatchNotify = async () => {
        setIsBatchNotifying(true)
        try {
            const res = await batchMarkNotified([...selectedIds])
            if (res?.delivered && res?.failed) {
                toast.success(`${res.delivered} email${res.delivered !== 1 ? "s" : ""} sent`)
                if (res.failed > 0) toast.error(`${res.failed} failed`)
            } else {
                toast.success(`Notified for ${selectedIds.size} variants`)
            }
            setSelectedIds(new Set())
            router.refresh()
        } catch (err: any) {
            toast.error(err.message || "Error")
        } finally {
            setIsBatchNotifying(false)
        }
    }

    const exportCSV = () => {
        const rows = [["Product", "Variant", "Customer", "Email", "Phone", "Date", "Status"]]
        filtered.forEach((n) => {
            rows.push([
                n.products?.name || "",
                n.product_variants?.title || "",
                n.user_name,
                n.email,
                n.phone,
                new Date(n.created_at).toLocaleDateString("en-IN"),
                n.is_notified ? "Notified" : "Pending",
            ])
        })
        const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n")
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `back-in-stock-demand-${new Date().toISOString().split("T")[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <>
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">Back-in-Stock Demand</h1>
                    <p className="text-sm text-slate-500">Customer requests for out-of-stock products</p>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2.5">
                        <span className="text-xs font-medium text-slate-400">Leads</span>
                        <span className="text-lg font-bold text-slate-900 tabular-nums">{totalLeads}</span>
                    </div>
                    <div className="w-px h-8 bg-slate-200" />
                    <div className="flex items-center gap-2.5">
                        <Bell className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-xs font-medium text-slate-400">Pending</span>
                        <span className="text-lg font-bold text-amber-600 tabular-nums">{pendingCount}</span>
                    </div>
                </div>
            </div>

            {/* Trend sparkline */}
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="flex items-center gap-1.5 mb-3">
                    <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Weekly Demand</span>
                </div>
                <div className="flex items-end gap-2 h-16">
                    {trend.map((w, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-[9px] font-medium text-slate-400 tabular-nums">{w.count}</span>
                            <div
                                className="w-full rounded-t-sm bg-rose-400/30"
                                style={{ height: `${(w.count / maxTrend) * 100}%` }}
                            />
                            <span className="text-[8px] text-slate-400 font-medium">{w.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Toolbar */}
            <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
                <div className="flex items-center gap-3 p-3 border-b border-slate-100 flex-wrap">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                            placeholder="Search products or customers..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300"
                        />
                    </div>
                    <button
                        onClick={() => setShowNotified(!showNotified)}
                        className={`h-9 px-3 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1.5 ${
                            showNotified
                                ? "bg-slate-100 border-slate-300 text-slate-600"
                                : "bg-white border-slate-200 text-slate-500 hover:text-slate-700"
                        }`}
                    >
                        {showNotified ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                        {showNotified ? "All" : "Pending only"}
                    </button>
                    <button
                        onClick={exportCSV}
                        className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-all flex items-center gap-1.5"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Export
                    </button>
                    {selectedIds.size > 0 && (
                        <button
                            onClick={handleBatchNotify}
                            disabled={isBatchNotifying}
                            className="h-9 px-4 rounded-lg bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-slate-800 transition-colors disabled:opacity-50"
                        >
                            {isBatchNotifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                            Notify {selectedIds.size}
                        </button>
                    )}
                </div>

                {/* Results bar */}
                <div className="flex items-center justify-between px-4 py-2 bg-slate-50/50">
                    <p className="text-xs text-slate-400">
                        <span className="font-semibold text-slate-600">{grouped.length}</span> variants
                        {" · "}
                        <span className="font-semibold text-slate-600">{filtered.length}</span> leads
                    </p>
                    {grouped.length > 0 && (
                        <button
                            onClick={toggleSelectAll}
                            className="text-[10px] font-semibold text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            {selectedIds.size === grouped.length ? "Deselect all" : "Select all"}
                        </button>
                    )}
                </div>

                {/* Demand cards */}
                {grouped.length === 0 ? (
                    <div className="py-16 text-center">
                        <div className="flex flex-col items-center gap-2">
                            <Bell className="w-8 h-8 text-slate-200" />
                            <p className="text-sm text-slate-400">
                                {showNotified ? "No demand data found." : "No pending requests."}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {grouped.map((group) => {
                            const isExpanded = expanded.has(group.variantId)
                            const isSelected = selectedIds.has(group.variantId)
                            const allNotified = group.notifiedCount === group.count

                            return (
                                <div key={group.variantId} className="group hover:bg-slate-50/50 transition-colors">
                                    {/* Group header */}
                                    <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => toggleExpand(group.variantId)}>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); toggleSelect(group.variantId) }}
                                            className={`shrink-0 ${isSelected ? "text-blue-600" : "text-slate-200"} hover:text-blue-400 transition-colors`}
                                        >
                                            {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                        </button>
                                        <button className="p-0.5 rounded hover:bg-slate-200/50 transition-colors shrink-0">
                                            {isExpanded
                                                ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                                : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                            }
                                        </button>
                                        <div
                                            className="w-8 h-8 rounded-full border-2 border-slate-100 shrink-0"
                                            style={{ backgroundColor: group.hex || "#f1f5f9" }}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-slate-900 truncate">{group.productName}</p>
                                            <p className="text-[10px] text-slate-400">{group.shade}{group.brand ? ` · ${group.brand}` : ""}</p>
                                        </div>
                                        <div className="flex items-center gap-4 shrink-0">
                                            <div className="text-right">
                                                <p className="text-lg font-bold tabular-nums text-slate-900">{group.count}</p>
                                                <p className="text-[9px] text-slate-400">leads</p>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-lg font-bold tabular-nums ${group.stock === 0 ? "text-red-500" : "text-emerald-600"}`}>
                                                    {group.stock}
                                                </p>
                                                <p className="text-[9px] text-slate-400">stock</p>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Link
                                                    href={`/admin/inventory?search=${encodeURIComponent(group.productName)}`}
                                                    className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-all"
                                                    title="View in Inventory"
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                </Link>
                                                {!allNotified && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleNotify(group.variantId) }}
                                                        disabled={notifyingId === group.variantId}
                                                        className="w-8 h-8 rounded-lg border border-sky-200 bg-sky-50 flex items-center justify-center text-sky-600 hover:bg-sky-100 transition-all disabled:opacity-50"
                                                        title="Mark as Notified"
                                                    >
                                                        {notifyingId === group.variantId
                                                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            : <Bell className="w-3.5 h-3.5" />
                                                        }
                                                    </button>
                                                )}
                                                {allNotified && (
                                                    <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg whitespace-nowrap">
                                                        Done
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded lead list */}
                                    {isExpanded && (
                                        <div className="border-t border-slate-50 bg-slate-50/30">
                                            {group.leads.map((lead: any) => (
                                                <div key={lead.id} className="flex items-center gap-3 px-4 py-2.5 pl-20 hover:bg-slate-50/50 transition-colors">
                                                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
                                                        {lead.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs font-medium text-slate-700">{lead.name}</p>
                                                        <p className="text-[10px] text-slate-400">{lead.email} · {lead.phone}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] text-slate-400 shrink-0">
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(lead.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                                    </div>
                                                    {lead.is_notified && (
                                                        <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                                            Notified
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </>
    )
}
