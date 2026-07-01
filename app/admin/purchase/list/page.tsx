import { createClient } from "@/utils/supabase/server"
import PurchaseListClient from "./list-client"

export default async function PurchaseListPage() {
    const supabase = await createClient()

    // Query the main purchase_orders table and join the suppliers table
    const { data: orders, error } = await supabase
        .from('purchase_orders')
        .select(`
            *,
            suppliers (
                name
            )
        `)
        .order('created_at', { ascending: false })

    if (error) {
        console.error("Fetch Error:", error)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">Procurement History</h1>
                    <p className="text-sm text-slate-500">Manage and inward inventory</p>
                </div>
            </div>
            <PurchaseListClient initialOrders={orders || []} />
        </div>
    )
}