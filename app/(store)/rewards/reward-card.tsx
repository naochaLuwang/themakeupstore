"use client"

import { useState } from "react"
import { Loader2, Tag, Gift } from "lucide-react"
import { redeemReward } from "@/app/actions/loyalty"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

function fmt(n: number) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)
}

export function RewardCard({ reward, balance, canAfford }: {
    reward: any
    balance: number
    canAfford: boolean
}) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleRedeem = async () => {
        if (!canAfford) return toast.error("Not enough M Coins")
        setLoading(true)
        const res = await redeemReward(reward.id)
        setLoading(false)
        if (res.success) {
            if (res.type === "coupon") {
                toast.success(`${reward.product_name} — coupon code generated!`)
            } else {
                toast.success(`${reward.product_name} redeemed!`)
            }
            router.refresh()
        } else {
            toast.error(res.message || "Redemption failed")
        }
    }

    const isCoupon = reward.reward_type === "coupon"
    const outOfStock = reward.stock <= 0

    if (isCoupon) {
        const discount = reward.discount_amount || reward.coins_required * 100
        const minOrder = reward.min_order_value || 0

        return (
            <div className="rounded-xl bg-white border border-emerald-200 overflow-hidden hover:border-emerald-300 transition-colors">
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 text-white text-center">
                    {reward.tier_restriction && (
                        <span className={`text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full mb-1 inline-block bg-white/20 ${
                            reward.tier_restriction === "gold" ? "text-amber-200" : ""
                        }`}>
                            {reward.tier_restriction}
                        </span>
                    )}
                    <Tag className="w-6 h-6 mx-auto mb-1 opacity-80" />
                    <p className="text-lg font-black tracking-tight">{fmt(discount)} OFF</p>
                    {minOrder > 0 && (
                        <p className="text-[10px] font-medium text-white/70 mt-0.5">on orders above {fmt(minOrder)}</p>
                    )}
                </div>
                <div className="p-3">
                    <p className="text-xs font-bold text-slate-900 text-center">{reward.product_name}</p>
                    <div className="flex items-center justify-center gap-1 mt-1.5">
                        <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                            {reward.coins_required} coins
                        </span>
                    </div>
                    <button
                        onClick={handleRedeem}
                        disabled={loading || !canAfford || outOfStock}
                        className="w-full mt-2.5 py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98]"
                        style={{
                            backgroundColor: canAfford && !outOfStock ? "#059669" : "#f1f5f9",
                            color: canAfford && !outOfStock ? "#fff" : "#94a3b8",
                        }}
                    >
                        {loading ? (
                            <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                        ) : outOfStock ? (
                            "Unavailable"
                        ) : !canAfford ? (
                            `Need ${reward.coins_required - balance} more`
                        ) : (
                            "Redeem Coupon"
                        )}
                    </button>
                </div>
            </div>
        )
    }

    // Product card
    return (
        <div className="rounded-xl bg-white border border-slate-200 overflow-hidden hover:border-pink-200 transition-colors">
            <div className="aspect-[4/3] bg-slate-50 relative">
                {reward.thumbnail_url ? (
                    <img
                        src={reward.thumbnail_url}
                        alt={reward.product_name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Gift className="w-6 h-6 text-slate-200" />
                    </div>
                )}
                {reward.tier_restriction && (
                    <span className={`absolute top-2 right-2 text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-white/90 backdrop-blur-sm ${
                        reward.tier_restriction === "gold" ? "text-amber-700"
                        : reward.tier_restriction === "silver" ? "text-slate-600"
                        : "text-orange-700"
                    }`}>
                        {reward.tier_restriction}
                    </span>
                )}
                {(outOfStock || reward.stock <= 5) && (
                    <span className={`absolute top-2 left-2 text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-sm ${
                        outOfStock ? "text-rose-500" : "text-amber-600"
                    }`}>
                        {outOfStock ? "Out of stock" : `Only ${reward.stock} left`}
                    </span>
                )}
            </div>
            <div className="p-3">
                <p className="text-xs font-bold text-slate-900 leading-snug">{reward.product_name}</p>
                <div className="flex items-center gap-1 mt-1.5">
                    <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                        {reward.coins_required} coins
                    </span>
                </div>
                <button
                    onClick={handleRedeem}
                    disabled={loading || !canAfford || outOfStock}
                    className="w-full mt-2.5 py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98]"
                    style={{
                        backgroundColor: canAfford && !outOfStock ? "#fc2779" : "#f1f5f9",
                        color: canAfford && !outOfStock ? "#fff" : "#94a3b8",
                    }}
                >
                    {loading ? (
                        <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                    ) : outOfStock ? (
                        "Unavailable"
                    ) : !canAfford ? (
                        `Need ${reward.coins_required - balance} more`
                    ) : (
                        "Redeem"
                    )}
                </button>
            </div>
        </div>
    )
}
