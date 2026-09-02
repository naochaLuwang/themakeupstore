import { getAdminRewardProducts } from "@/app/actions/rewards-admin"
import { RewardProductsClient } from "./client"

export default async function AdminRewardProductsPage() {
    const products = await getAdminRewardProducts()
    return <RewardProductsClient products={products} />
}
