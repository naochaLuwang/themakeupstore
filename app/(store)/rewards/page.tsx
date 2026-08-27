import { redirect } from "next/navigation"
import { getLoyaltyData } from "@/app/actions/loyalty"
import { ChevronLeft, ChevronRight, Award, Crown, Star, Zap, Coins, Sparkles, History } from "lucide-react"
import Link from "next/link"

const TIERS = [
    { id: "bronze", label: "Bronze", range: "₹0 – ₹9,999", icon: Star, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200", ring: "ring-orange-300" },
    { id: "silver", label: "Silver", range: "₹10,000 – ₹24,999", icon: Zap, color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-300", ring: "ring-slate-300" },
    { id: "gold", label: "Gold", range: "₹25,000+", icon: Crown, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-300", ring: "ring-amber-300" },
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
    const recentCount = (transactions || []).length

    return (
        <div className="min-h-screen bg-[#FDFBF7]">
            <div className="max-w-lg mx-auto px-4 pt-6 pb-28">

                {/* Back */}
                <Link href="/profile" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-800 mb-6">
                    <ChevronLeft className="w-4 h-4" /> Back
                </Link>

                {/* Balance Card — Signature Anders M */}
                <div className="relative overflow-hidden rounded-2xl bg-slate-900 text-white p-6 mb-6 shadow-xl shadow-slate-900/20">
                    {/* Ghost Anders M watermark */}
                    <span
                        aria-hidden
                        className="pointer-events-none absolute -top-2 right-2 font-daciana leading-none select-none bg-clip-text text-transparent"
                        style={{
                            fontSize: "9rem",
                            backgroundImage: "linear-gradient(180deg, rgba(252,39,121,0.55) 0%, rgba(252,39,121,0.12) 75%)",
                        }}
                    >
                        M
                    </span>

                    {/* subtle radial glow */}
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0"
                        style={{
                            backgroundImage: "radial-gradient(600px 300px at 30% -20%, rgba(252,39,121,0.18), transparent 60%)",
                        }}
                    />

                    <div className="relative">
                        <div className="flex items-center justify-between mb-6">
                            <p className="text-[11px] font-semibold text-white/60 uppercase tracking-[0.25em]">M Beauty Rewards</p>
                            <span className="w-1.5 h-1.5 rounded-full bg-[#fc2779]" />
                        </div>

                        <p className="text-6xl font-black tracking-tight leading-none">{points.balance}</p>
                        <div className="flex items-center gap-2 mt-2">
                            <p className="text-sm font-semibold text-white/80">M Coins</p>
                            <span className="text-[10px] font-bold text-white/50">1 coin = ₹1 off</span>
                        </div>

                        <div className="h-px bg-white/10 mt-6 mb-3" />

                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                                {currentTier?.label} member
                            </span>
                            <span className="text-[10px] font-semibold text-[#fc2779]">
                                {(transactions || []).filter(t => t.status === "available").length} active txn
                            </span>
                        </div>
                    </div>
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
                            <div className="flex items-center justify-between mb-1.5">
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

                {/* Transaction History — always visible */}
                <Link href="/rewards/history" className="block rounded-xl border border-slate-100 bg-white p-4 shadow-sm mb-4 hover:border-slate-200 transition-colors">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                                <History className="w-4 h-4 text-slate-400" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-800">Transaction History</p>
                                <p className="text-[9px] text-slate-400 mt-0.5">{recentCount} recent activities</p>
                            </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                    </div>
                </Link>

                {/* How It Works */}
                <div className="mb-6 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                    <h2 className="text-[10px] font-bold text-slate-800 uppercase tracking-wider mb-3">How It Works</h2>
                    <div className="space-y-2.5">
                        {[
                            { icon: Sparkles, text: "Earn 1 coin per ₹100 spent, credited as soon as your product is delivered" },
                            { icon: Coins, text: "Use all your M Coins at checkout — 1 coin = ₹1 off your order" },
                            { icon: Award, text: "Level up your tier: Bronze (₹0+), Silver (₹10K+), Gold (₹25K+)" },
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
            </div>
        </div>
    )
}