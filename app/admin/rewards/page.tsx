import { getLoyaltyStats } from "@/app/actions/loyalty"
import { AdminRewardsClient } from "./client"

export default async function AdminRewardsPage() {
    const stats = await getLoyaltyStats()
    return <AdminRewardsClient stats={stats} />
}
