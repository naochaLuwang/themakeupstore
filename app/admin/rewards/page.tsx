import { getEnhancedLoyaltyStats, getStuckPendingPoints } from "@/app/actions/rewards-admin"
import { AdminRewardsClient } from "./client"

export default async function AdminRewardsPage() {
    const [stats, stuckPending] = await Promise.all([
        getEnhancedLoyaltyStats(),
        getStuckPendingPoints(),
    ])
    return <AdminRewardsClient stats={stats} stuckPending={stuckPending} />
}