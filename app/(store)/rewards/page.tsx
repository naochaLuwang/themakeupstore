import { redirect } from "next/navigation"
import { getLoyaltyData } from "@/app/actions/loyalty"
import { ChevronLeft, Gift, Award, Crown, Star, Zap, Coins, Sparkles, ArrowRight, History } from "lucide-react"
import Link from "next/link"

const TIERS = [
    { id: "bronze", label: "Bronze", range: "₹0 – ₹4,999", earnRate: "1 coin / ₹60", icon: Star, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200", ring: "ring-orange-300" },
    { id: "silver", label: "Silver", range: "₹5,000 – ₹12,999", earnRate: "1 coin / ₹60", icon: Zap, color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-300", ring: "ring-slate-300" },
    { id: "gold", label: "Gold", range: "₹13,000+", earnRate: "1 coin / ₹60", icon: Crown, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-300", ring: "ring-amber-300" },
]

function fmt(n: number) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)
}

export default async function RewardsPage() {
    const data = await getLoyaltyData()
    if (!data) redirect("/login")

    const { points, totalSpend, nextTier, transactions } = data
    const tierIndex = TIERS.findIndex(t => t.id === points.tier)
    const currentTier = TIERS[tierIndex]
    const progress = nextTier ? Math.min(100, (totalSpend / nextTier.minSpend) * 100) : 100

    return (
        <div className="min-h-screen bg-[#FDFBF7]">
            <div className="max-w-lg mx-auto px-4 pt-6 pb-28">

                {/* Back */}
                <Link href="/profile" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-800 mb-6">
                    <ChevronLeft className="w-4 h-4" /> Back
                </Link>

                {/* Balance Card */}
                <div className="rounded-2xl bg-gradient-to-br from-pink-500 to-pink-600 p-6 mb-6 text-white shadow-lg shadow-pink-200/30">
                    <p className="text-[11px] font-semibold text-white/70 uppercase tracking-wider mb-3">M Beauty Rewards</p>
                    <p className="text-5xl font-black tracking-tight">{points.balance}</p>
                    <p className="text-sm font-medium text-white/80">M Coins</p>
                </div>

                {/* Tier Indicator — horizontal row of circles like Nykaa/Tira */}
                <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">Your Tier</h2>
                        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            points.tier === "gold" ? "bg-amber-100 text-amber-700"
                            : points.tier === "silver" ? "bg-slate-100 text-slate-600"
                            : "bg-orange-100 text-orange-700"
                        }`}>
                            {currentTier.label}
                        </span>
                    </div>

                    {/* 3 tier circles in a row */}
                    <div className="flex items-center justify-center gap-3 mb-4">
                        {TIERS.map((tier, i) => {
                            const Icon = tier.icon
                            const isCurrent = points.tier === tier.id
                            const isReached = tierIndex >= i

                            return (
                                <div key={tier.id} className="flex flex-col items-center gap-1.5 flex-1">
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                                        isCurrent
                                            ? `${tier.bg} ${tier.ring} ring-2 ring-offset-2 scale-110 shadow-sm`
                                            : isReached
                                            ? `${tier.bg} opacity-70`
                                            : "bg-slate-50 border border-slate-100"
                                    }`}>
                                        <Icon className={`w-5 h-5 ${isCurrent ? tier.color : isReached ? tier.color : "text-slate-300"}`} />
                                    </div>
                                    <span className={`text-[9px] font-bold uppercase tracking-wider ${isCurrent ? "text-slate-900" : "text-slate-400"}`}>
                                        {tier.label}
                                    </span>
                                    <span className="text-[8px] text-slate-400 -mt-0.5">{tier.range}</span>
                                </div>
                            )
                        })}
                    </div>

                    {/* Progress to next tier */}
                    {nextTier && (
                        <div className="rounded-xl bg-slate-50 p-3">
                            <div className="flex items-center justify-between text-[10px] mb-1.5">
                                <span className="font-medium text-slate-500">Spent {fmt(totalSpend)}</span>
                                <span className="font-semibold text-pink-600">
                                    {fmt(Math.max(0, nextTier.minSpend - totalSpend))} to go
                                </span>
                            </div>
                            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-gradient-to-r from-pink-400 to-pink-500 transition-all" style={{ width: `${progress}%` }} />
                            </div>
                            <p className="text-[9px] text-slate-400 mt-1.5">
                                Next tier: {nextTier.tier === "gold" ? "Gold" : "Silver"} · Unlocks at {fmt(nextTier.minSpend)}
                            </p>
                        </div>
                    )}
                    {!nextTier && (
                        <div className="rounded-xl bg-amber-50 p-3 text-center">
                            <p className="text-[11px] font-semibold text-amber-700">You&apos;re at the top tier — enjoy all Gold perks!</p>
                        </div>
                    )}
                </div>

                {/* Beauty Rewards — hero link to catalog */}
                <Link href="/rewards/catalog" className="block rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 p-5 mb-6 text-white shadow-lg shadow-pink-200/40 hover:shadow-pink-300/50 transition-shadow active:scale-[0.99]">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                            <Gift className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-black tracking-tight">Beauty Rewards</p>
                            <p className="text-[11px] text-white/70 mt-0.5">{points.balance} M Coins available · Browse the catalog</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-white/60" />
                    </div>
                </Link>

                {/* Transaction History — always visible */}
                <Link href="/rewards/history" className="block rounded-xl border border-slate-100 bg-white p-4 shadow-sm mb-4 hover:border-slate-200 transition-colors">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                                <History className="w-4 h-4 text-slate-400" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-800">Transaction History</p>
                                <p className="text-[9px] text-slate-400 mt-0.5">Every coin earned, spent, and remaining</p>
                            </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300" />
                    </div>
                </Link>

                {/* How It Works */}
                <div className="mb-6 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                    <h2 className="text-[10px] font-bold text-slate-800 uppercase tracking-wider mb-3">How It Works</h2>
                    <div className="space-y-2.5">
                        {[
                            { icon: Sparkles, text: "Earn 1 coin per ₹60 spent, credited as soon as your product is delivered" },
                            { icon: Gift, text: "Redeem M Coins for free products or discount coupons" },
                            { icon: Award, text: "Level up your tier to earn faster and unlock more perks" },
                        ].map((item, i) => (
                            <div key={i} className="flex items-start gap-2.5">
                                <div className="w-6 h-6 rounded-lg bg-pink-50 flex items-center justify-center shrink-0 mt-0.5">
                                    <item.icon className="w-3.5 h-3.5 text-pink-500" />
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed">{item.text}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Activity */}
                {transactions.filter((t: any) => t.type === "spend" || t.status === "available").length > 0 && (
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">Recent Activity</h2>
                            <Link href="/rewards/history" className="flex items-center gap-1 text-[8px] font-semibold text-pink-500 uppercase tracking-wider hover:text-pink-600 transition-colors">
                                <History className="w-3 h-3" /> View All
                            </Link>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-white shadow-sm divide-y divide-slate-50">
                            {transactions.slice(0, 5).map((tx: any) => {
                                const isEarn = tx.type === "earn" || tx.type === "bonus"
                                return (
                                    <div key={tx.id} className="flex items-center justify-between px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-7 h-7 rounded-lg ${isEarn ? "bg-emerald-50" : "bg-rose-50"} flex items-center justify-center shrink-0`}>
                                                <Coins className={`w-3.5 h-3.5 ${isEarn ? "text-emerald-500" : "text-rose-400"}`} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-slate-800">{tx.note || tx.reference_type}</p>
                                                <p className="text-[9px] text-slate-400">
                                                    {new Date(tx.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                                    {tx.status === "pending" && <span className="text-amber-500 ml-1">· Pending</span>}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`text-xs font-bold tabular-nums ${isEarn ? "text-emerald-600" : "text-rose-500"}`}>
                                            {isEarn ? "+" : "-"}{tx.amount}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="flex flex-col items-center gap-2 pt-4">
                    <div className="w-6 h-px bg-slate-200" />
                    <Link href="/legal/rewards-terms" className="text-[8px] font-semibold text-slate-300 uppercase tracking-[0.3em] hover:text-pink-500 transition-colors">
                        Terms &amp; Conditions
                    </Link>
                </div>
            </div>
        </div>
    )
}
