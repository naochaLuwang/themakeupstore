import { getAdminRewardCoupons } from "@/app/actions/rewards-admin"
import { RewardCouponsClient } from "./client"

export default async function AdminRewardCouponsPage() {
    const coupons = await getAdminRewardCoupons()
    return <RewardCouponsClient coupons={coupons} />
}
