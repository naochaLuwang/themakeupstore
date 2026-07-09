import { redirect } from "next/navigation"
import { getLoyaltyData, getMyCoupons } from "@/app/actions/loyalty"
import { CatalogClient } from "./client"

export default async function RewardsCatalogPage() {
    const data = await getLoyaltyData()
    if (!data) redirect("/login")

    const coupons = await getMyCoupons()
    const allRewards = data.rewards || []
    const productRewards = allRewards.filter((r: any) => r.reward_type !== "coupon")
    const couponRewards = allRewards.filter((r: any) => r.reward_type === "coupon")

    const tabs = [
        { id: "all", label: "All", rewards: productRewards },
        { id: "under500", label: "Under 499", rewards: productRewards.filter((r: any) => r.coins_required < 500) },
        { id: "exact500", label: "500", rewards: productRewards.filter((r: any) => r.coins_required === 500) },
        { id: "above500", label: "Above 500", rewards: productRewards.filter((r: any) => r.coins_required > 500) },
    ].filter(t => t.rewards.length > 0 || t.id === "all")

    return (
        <CatalogClient
            tabs={tabs}
            coupons={coupons}
            couponRewards={couponRewards}
            balance={data.points.balance}
            tier={data.points.tier}
        />
    )
}
