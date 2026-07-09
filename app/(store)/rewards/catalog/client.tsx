"use client"

import { useState, useRef, useEffect } from "react"
import { Gift, Coins, ChevronLeft, Tag, Loader2 } from "lucide-react"
import Link from "next/link"
import { redeemReward } from "@/app/actions/loyalty"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

function fmt(n: number) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)
}

interface TabData {
    id: string
    label: string
    rewards: any[]
}

export function CatalogClient({ tabs, coupons, couponRewards, balance, tier }: {
    tabs: TabData[]
    coupons: any[]
    couponRewards: any[]
    balance: number
    tier: string
}) {
    const [activeTab, setActiveTab] = useState(tabs[0]?.id || "all")
    const [sticky, setSticky] = useState(false)
    const sentinelRef = useRef<HTMLDivElement>(null)
    const current = tabs.find(t => t.id === activeTab) || tabs[0]

    useEffect(() => {
        const sentinel = sentinelRef.current
        if (!sentinel) return
        const observer = new IntersectionObserver(
            ([entry]) => setSticky(!entry.isIntersecting),
            { threshold: 0, rootMargin: "-1px 0px 0px 0px" }
        )
        observer.observe(sentinel)
        return () => observer.disconnect()
    }, [])

    return (
        <div className="min-h-screen bg-[#FDFBF7]">
            <div className="max-w-lg mx-auto px-4 pt-6 pb-28">

                {/* Back + Title */}
                <div className="flex items-center justify-between mb-5">
                    <Link href="/rewards" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-800">
                        <ChevronLeft className="w-4 h-4" /> Back
                    </Link>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rewards Catalog</span>
                    <div className="w-12" />
                </div>

                {/* Balance Banner */}
                <div className="rounded-xl bg-gradient-to-r from-pink-500 to-pink-600 p-4 mb-5 text-white flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                            <Coins className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-black tracking-tight">{balance}</p>
                            <p className="text-[10px] font-medium text-white/70 -mt-0.5">M Coins</p>
                        </div>
                    </div>
                    <span className={`text-[8px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                        tier === "gold" ? "bg-amber-400/20 text-amber-200"
                        : tier === "silver" ? "bg-slate-400/20 text-slate-200"
                        : "bg-orange-400/20 text-orange-200"
                    }`}>
                        {tier}
                    </span>
                </div>

                {/* Sentinel */}
                <div ref={sentinelRef} />

                {/* Earned Coupons Strip */}
                {coupons.length > 0 && (
                    <div className="mb-5">
                        <div className="flex gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory">
                            {coupons.map((c: any) => (
                                <div key={c.id} className="snap-start shrink-0 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-3 w-40">
                                    <p className="text-lg font-black text-emerald-600 tracking-tight">
                                        ₹{c.discount_amount}
                                        <span className="text-[7px] font-semibold ml-0.5">OFF</span>
                                    </p>
                                    <p className="text-[7px] font-bold font-mono text-emerald-700 tracking-wider mt-1 bg-white/60 rounded-md px-1.5 py-0.5 inline-block">
                                        {c.code}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Coupon Rewards Row */}
                {couponRewards.length > 0 && (
                    <div className="mb-5">
                        <div className="flex items-center gap-1.5 mb-2.5">
                            <Tag className="w-3 h-3 text-emerald-500" />
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Coupon Rewards</span>
                        </div>
                        <div className="flex gap-2.5 overflow-x-auto no-scrollbar snap-x snap-mandatory">
                            {couponRewards.map((r: any) => {
                                const discount = r.discount_amount || r.coins_required * 100
                                const canAfford = balance >= r.coins_required
                                const tierBlocked = r.tier_restriction && r.tier_restriction !== tier
                                return (
                                    <CouponRewardCard
                                        key={r.id}
                                        reward={r}
                                        discount={discount}
                                        canAfford={canAfford && !tierBlocked}
                                        tierBlocked={tierBlocked}
                                        balance={balance}
                                        userTier={tier}
                                    />
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Filter Pills */}
                {tabs.length > 1 && (
                    <div className={`flex gap-1.5 mb-5 overflow-x-auto no-scrollbar transition-all ${
                        sticky ? "sticky top-0 z-10 bg-[#FDFBF7] -mx-4 px-4 py-3 shadow-sm" : ""
                    }`}>
                        {tabs.map((tab) => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                className={`shrink-0 px-3.5 py-2 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all ${
                                    activeTab === tab.id
                                        ? "bg-slate-900 text-white shadow-sm"
                                        : "bg-white border border-slate-200 text-slate-500 hover:border-slate-300"
                                }`}
                            >
                                {tab.label}
                                <span className="ml-1 text-[8px] font-normal opacity-60">({tab.rewards.length})</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Product Grid */}
                {current?.rewards.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                        {current.rewards.map((reward: any) => (
                            <ProductRewardCard key={reward.id} reward={reward} balance={balance} userTier={tier} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
                        <Gift className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                        <p className="text-sm font-semibold text-slate-400">Nothing here yet</p>
                        <p className="text-[10px] text-slate-300 mt-1">Try a different filter</p>
                    </div>
                )}

                {/* Footer */}
                <div className="mt-8 flex flex-col items-center gap-2">
                    <div className="w-6 h-px bg-slate-200" />
                    <p className="text-[7px] font-semibold text-slate-300 uppercase tracking-[0.3em]">The Makeup Store</p>
                </div>
            </div>
        </div>
    )
}

// ─── Product Reward Card ───
function ProductRewardCard({ reward, balance, userTier }: { reward: any; balance: number; userTier: string }) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const canAfford = balance >= reward.coins_required
    const outOfStock = reward.stock <= 0
    const tierBlocked = !!(reward.tier_restriction && reward.tier_restriction !== userTier)

    const handleRedeem = async () => {
        setLoading(true)
        const res = await redeemReward(reward.id)
        setLoading(false)
        if (res.success) {
            toast.success(`${reward.product_name} redeemed!`)
            router.refresh()
        } else {
            toast.error(res.message || "Redemption failed")
        }
    }

    return (
            <div className="rounded-xl bg-white border border-slate-100 shadow-sm overflow-hidden">
            <div className="aspect-[4/3] bg-slate-50 relative">
                {reward.thumbnail_url ? (
                    <img src={reward.thumbnail_url} alt={reward.product_name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Gift className="w-6 h-6 text-slate-200" />
                    </div>
                )}
                {tierBlocked && (
                    <div className="absolute inset-0 bg-white/10 flex items-center justify-center">
                        <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-white/90 text-slate-500 shadow-sm">
                            {reward.tier_restriction} only
                        </span>
                    </div>
                )}
            </div>
            <div className="p-3">
                <p className="text-xs font-semibold text-slate-800 leading-tight line-clamp-1">{reward.product_name}</p>
                <div className="flex items-center gap-1 mt-1.5 mb-2.5">
                    <Coins className="w-3 h-3 text-amber-500 shrink-0" />
                    <span className="text-[9px] font-bold text-slate-900">{reward.coins_required}</span>
                </div>
                <button
                    onClick={handleRedeem}
                    disabled={loading || !canAfford || outOfStock || tierBlocked}
                    className="w-full py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all disabled:cursor-not-allowed active:scale-[0.98]"
                    style={{
                        backgroundColor: canAfford && !outOfStock && !tierBlocked ? "#fc2779" : "#1A1A1A",
                        color: canAfford && !outOfStock && !tierBlocked ? "#fff" : "#fff",
                    }}
                >
                    {loading ? (
                        <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                    ) : outOfStock ? (
                        "Unavailable"
                    ) : tierBlocked ? (
                        `${reward.tier_restriction} tier`
                    ) : canAfford ? (
                        "Add to Bag"
                    ) : (
                        <span className="flex items-center justify-center gap-1">
                            <Coins className="w-2.5 h-2.5" /> {reward.coins_required}
                        </span>
                    )}
                </button>
            </div>
        </div>
    )
}

// ─── Coupon Reward Card ───
function CouponRewardCard({ reward, discount, canAfford, tierBlocked, balance, userTier }: {
    reward: any
    discount: number
    canAfford: boolean
    tierBlocked: boolean
    balance: number
    userTier: string
}) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const disabled = !canAfford || tierBlocked

    const handleRedeem = async () => {
        setLoading(true)
        const res = await redeemReward(reward.id)
        setLoading(false)
        if (res.success) {
            toast.success(`${reward.product_name} — coupon generated!`)
            router.refresh()
        } else {
            toast.error(res.message || "Redemption failed")
        }
    }

    return (
        <div className={`snap-start shrink-0 w-48 rounded-xl border overflow-hidden transition-all ${
            canAfford && !tierBlocked ? "border-emerald-200" : "border-slate-200"
        }`}>
            <div className={`p-4 text-white text-center ${
                tierBlocked ? "bg-slate-300"
                : "bg-gradient-to-br from-emerald-500 to-emerald-600"
            }`}>
                {tierBlocked && (
                    <span className="text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full mb-1 inline-block bg-white/20">
                        {reward.tier_restriction} only
                    </span>
                )}
                <Tag className="w-5 h-5 mx-auto mb-0.5 opacity-80" />
                <p className="text-base font-black tracking-tight">{fmt(discount)} OFF</p>
                {reward.min_order_value > 0 && (
                    <p className="text-[8px] font-medium text-white/70">Min. {fmt(reward.min_order_value)}</p>
                )}
            </div>
            <div className="p-3">
                <p className="text-[10px] font-semibold text-slate-700 leading-tight line-clamp-1">{reward.product_name}</p>
                <button
                    onClick={handleRedeem}
                    disabled={loading || disabled}
                    className="w-full mt-2 py-1.5 rounded-lg text-[8px] font-bold uppercase tracking-wider transition-all disabled:cursor-not-allowed active:scale-[0.98]"
                    style={{
                        backgroundColor: canAfford && !tierBlocked ? "#059669" : "#f1f5f9",
                        color: canAfford && !tierBlocked ? "#fff" : "#94a3b8",
                    }}
                >
                    {loading ? (
                        <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                    ) : tierBlocked ? (
                        `${reward.tier_restriction} tier`
                    ) : !canAfford ? (
                        <span className="flex items-center justify-center gap-1">
                            <Coins className="w-2.5 h-2.5" /> {reward.coins_required}
                        </span>
                    ) : (
                        "Add to Bag"
                    )}
                </button>
            </div>
        </div>
    )
}
