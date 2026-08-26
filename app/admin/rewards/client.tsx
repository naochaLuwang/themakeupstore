"use client"

import { useState } from "react"
import { Award, Users, Coins, TrendingDown, Loader2 } from "lucide-react"
import { backfillDeliveredOrderPoints } from "@/app/actions/loyalty"
import { toast } from "sonner"

export function AdminRewardsClient({ stats }: { stats: any }) {
    const [backfilling, setBackfilling] = useState(false)

    const handleBackfill = async () => {
        setBackfilling(true)
        try {
            const res = await backfillDeliveredOrderPoints()
            toast.success(`Backfilled ${res.backfilled} order(s)`)
        } catch (err: any) {
            toast.error(err.message || "Backfill failed")
        }
        setBackfilling(false)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">M Beauty Rewards</h1>
                    <p className="text-sm text-slate-500">Loyalty program overview</p>
                </div>
                <button
                    onClick={handleBackfill}
                    disabled={backfilling}
                    className="inline-flex items-center gap-2 rounded-xl h-10 px-4 bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition-all disabled:opacity-50"
                >
                    {backfilling ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Backfill Missing Points
                </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-2xl border bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                            <Coins className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-black text-slate-900">{stats.totalCoins.toLocaleString("en-IN")}</div>
                            <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Total Coins</div>
                        </div>
                    </div>
                </div>
                <div className="rounded-2xl border bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                            <Users className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-black text-emerald-600">{stats.totalUsers}</div>
                            <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Active Users</div>
                        </div>
                    </div>
                </div>
                <div className="rounded-2xl border bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                            <TrendingDown className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-black text-blue-600">{(stats.totalRedeemed || 0).toLocaleString("en-IN")}</div>
                            <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Coins Redeemed</div>
                        </div>
                    </div>
                </div>
                <div className="rounded-2xl border bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                            <Award className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <div className="text-sm font-black text-slate-900">
                                B:{stats.tiers.bronze} S:{stats.tiers.silver} G:{stats.tiers.gold}
                            </div>
                            <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Tier Dist.</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border bg-white p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-2">How It Works</h3>
                <ul className="space-y-1.5 text-sm text-slate-600">
                    <li>• Customers earn <strong>1 M Coin per ₹100</strong> spent</li>
                    <li>• Coins are created as <strong>pending</strong> on order placement</li>
                    <li>• Coins become <strong>available</strong> when order is marked delivered</li>
                    <li>• Customers can apply <strong>all available coins</strong> at checkout (1 coin = ₹1)</li>
                    <li>• Tiers are visual badges: Bronze (₹0+), Silver (₹10K+), Gold (₹25K+)</li>
                    <li>• Use "Backfill Missing Points" to credit points for historically delivered orders</li>
                </ul>
            </div>
        </div>
    )
}
