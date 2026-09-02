import { getGlobalTransactions } from "@/app/actions/rewards-admin"
import { GlobalTransactionsClient } from "./client"

export default async function AdminRewardsTransactionsPage() {
    const transactions = await getGlobalTransactions(100)
    return <GlobalTransactionsClient transactions={transactions} />
}
