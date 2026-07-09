import { listRewardProducts, getLoyaltyStats } from "@/app/actions/loyalty"
import { AdminRewardsClient } from "./client"

export default async function AdminRewardsPage() {
    const [rewards, stats] = await Promise.all([
        listRewardProducts(),
        getLoyaltyStats(),
    ])

    return <AdminRewardsClient rewards={rewards} stats={stats} />
}
