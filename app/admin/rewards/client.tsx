"use client"

import { useState } from "react"
import { Award, Users, Coins, TrendingDown, Loader2, BarChart3, Package, Ticket, ArrowUpRight, ArrowUp, ArrowDown, AlertTriangle, Clock, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { backfillDeliveredOrderPoints } from "@/app/actions/loyalty"
import { reconcileStuckPendingPoints } from "@/app/actions/rewards-admin"
import Link from "next/link"
import { useRouter } from "next/navigation"

function StatCard({ label, value, subtitle, icon, change, className = "" }: {
    label: string; value: string; subtitle?: string; icon: React.ReactNode; change?: number; className?: string
}) {
    return (
        <div className={`rounded-xl border border-slate-200 bg-white p-3 shadow-sm ${className}`}>
            <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate">{label}</span>
                <div className="w-6 h-6 flex items-center justify-center rounded-md bg-slate-50 border border-slate-100 shrink-0 ml-1">
                    <div className="w-3.5 h-3.5 text-slate-500">{icon}</div>
                </div>
            </div>
            <div className="flex items-end justify-between gap-1">
                <p className="text-lg font-bold text-slate-900 tracking-tight truncate">{value}</p>
                {change !== undefined && (
                    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1 py-0.5 rounded ${
                        change >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'
                    }`}>
                        {change >= 0 ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                        {Math.abs(change).toFixed(0)}%
                    </span>
                )}
            </div>
            {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
    )
}

export function AdminRewardsClient({ stats, stuckPending }: { stats: any; stuckPending: any[] }) {
    const router = useRouter()
    const [backfilling, setBackfilling] = useState(false)
    const [reconciling, setReconciling] = useState(false)

    const handleBackfill = async () => {
        setBackfilling(true)
        try {
            const res = await backfillDeliveredOrderPoints()
            toast.success(`Backfilled ${res.backfilled} order(s)`)
            router.refresh()
        } catch (err: any) {
            toast.error(err.message || "Backfill failed")
        }
        setBackfilling(false)
    }

    const handleReconcile = async () => {
        setReconciling(true)
        try {
            const res = await reconcileStuckPendingPoints()
            toast.success(`Successfully reconciled and released points for ${res.released} order(s)!`)
            router.refresh()
        } catch (err: any) {
            toast.error(err.message || "Reconciliation failed")
        }
        setReconciling(false)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">M Beauty Rewards</h1>
                    <p className="text-sm text-slate-500">Loyalty program analytics & operations</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleBackfill}
                        disabled={backfilling}
                        className="inline-flex items-center gap-2 rounded-xl h-10 px-4 bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
                    >
                        {backfilling ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Backfill Missing Points
                    </button>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <StatCard label="Total Liability" value={`₹${stats.totalLiabilityRs.toLocaleString()}`} icon={<Coins />} />
                <StatCard label="Redemption Rate" value={`${stats.redemptionRate}%`} icon={<TrendingDown />} />
                <StatCard label="Total Users" value={stats.totalUsers.toLocaleString()} icon={<Users />} />
                <StatCard label="Pending" value={stats.totalPending.toLocaleString()} icon={<Award />} />
                <StatCard label="Products" value={stats.rewardProductsCount.toLocaleString()} icon={<Package />} />
                <StatCard label="Coupons" value={stats.rewardCouponsCount.toLocaleString()} icon={<Ticket />} />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 rounded-2xl border bg-white p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900 mb-4">Earnings vs Spend (Last 6 Months)</h3>
                    <div className="flex items-end gap-2 h-48">
                        {stats.monthlyTrends.map((t: any) => {
                            const maxVal = Math.max(...stats.monthlyTrends.map((x: any) => Math.max(x.earned, x.spent)), 1)
                            return (
                                <div key={t.month} className="flex-1 flex flex-col items-center gap-1">
                                    <div className="w-full flex flex-col gap-1 justify-end" style={{ height: '150px' }}>
                                        <div className="bg-emerald-400 rounded-t-sm" style={{ height: `${(t.earned / maxVal) * 100}%`, minHeight: t.earned > 0 ? '2px' : '0' }} />
                                        <div className="bg-rose-400 rounded-b-sm" style={{ height: `${(t.spent / maxVal) * 100}%`, minHeight: t.spent > 0 ? '2px' : '0' }} />
                                    </div>
                                    <span className="text-[10px] text-slate-500">{t.month}</span>
                                </div>
                            )
                        })}
                    </div>
                    <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-emerald-400" /><span className="text-[10px] text-slate-500">Earned</span></div>
                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-rose-400" /><span className="text-[10px] text-slate-500">Spent</span></div>
                    </div>
                </div>

                <div className="rounded-2xl border bg-white p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900 mb-4">Tier Distribution</h3>
                    <div className="space-y-4">
                    {Object.entries(stats.tiers as Record<string, number>).map(([tier, count]) => {
                        const total = Object.values(stats.tiers as Record<string, number>).reduce((a, b) => a + b, 0)
                            const pct = total > 0 ? Math.round(((count as number) / total) * 100) : 0
                            const colors: Record<string, string> = { gold: 'bg-amber-400', silver: 'bg-slate-400', bronze: 'bg-orange-400' }
                            return (
                                <div key={tier}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium capitalize text-slate-700">{tier}</span>
                                        <span className="text-xs font-bold text-slate-900">{count as number} ({pct}%)</span>
                                    </div>
                                    <div className="w-full h-2 rounded-full bg-slate-100">
                                        <div className={`h-full rounded-full ${colors[tier] || 'bg-slate-300'}`} style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Source Breakdown */}
                    <h3 className="text-sm font-bold text-slate-900 mt-6 mb-3">Earning Sources</h3>
                    <div className="space-y-2">
                    {Object.entries(stats.sourceBreakdown as Record<string, number>).map(([src, amt]) => {
                        const total = Object.values(stats.sourceBreakdown as Record<string, number>).reduce((a, b) => a + b, 0)
                            const pct = total > 0 ? Math.round(((amt as number) / total) * 100) : 0
                            return (
                                <div key={src}>
                                    <div className="flex items-center justify-between mb-0.5">
                                        <span className="text-xs text-slate-600 capitalize">{src}</span>
                                        <span className="text-xs font-semibold text-slate-500">{pct}%</span>
                                    </div>
                                    <div className="w-full h-1.5 rounded-full bg-slate-100">
                                        <div className="h-full rounded-full bg-blue-400" style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Stuck Pending Alert & Reconcile */}
            {stuckPending.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            <h3 className="text-sm font-bold text-amber-800">Stuck Pending Points ({stuckPending.length})</h3>
                            <span className="text-[10px] text-amber-600">Orders marked delivered/picked_up with unreleased loyalty points</span>
                        </div>
                        <button
                            onClick={handleReconcile}
                            disabled={reconciling}
                            className="inline-flex items-center gap-1.5 rounded-xl h-9 px-4 bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition-all disabled:opacity-50"
                        >
                            {reconciling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                            Reconcile All Stuck Points
                        </button>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {stuckPending.map((tx: any) => (
                            <div key={tx.id} className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-amber-200/50">
                                <div>
                                    <span className="text-xs font-semibold text-slate-900">{tx.profiles?.full_name || "Unknown"}</span>
                                    <span className="text-[10px] text-slate-400 ml-2">{tx.note}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-amber-700">{tx.amount} coins</span>
                                    <span className="text-[10px] text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(tx.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Operational Links */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { label: "Manage Reward Products", href: "/admin/rewards/products", icon: Package, desc: "Add, edit, or remove catalog items" },
                    { label: "Coupon Management", href: "/admin/rewards/coupons", icon: Ticket, desc: "View issued coupons and usage" },
                    { label: "Transaction Logs", href: "/admin/rewards/transactions", icon: BarChart3, desc: "Global history of all point movements" },
                ].map(item => (
                    <Link key={item.href} href={item.href} className="flex items-center justify-between p-5 rounded-xl border border-slate-200 bg-white hover:border-rose-300 hover:shadow-md transition-all">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                                <item.icon className="w-5 h-5 text-slate-500" />
                            </div>
                            <div>
                                <span className="text-sm font-semibold text-slate-900 block">{item.label}</span>
                                <span className="text-[11px] text-slate-400">{item.desc}</span>
                            </div>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-slate-400" />
                    </Link>
                ))}
            </div>
        </div>
    )
}
