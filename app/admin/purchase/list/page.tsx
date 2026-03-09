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
        <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
            <main className="flex-1 p-8">
                <div className="max-w-6xl mx-auto space-y-6">
                    <header className="flex justify-between items-end">
                        <div className="space-y-1">
                            <h1 className="text-2xl font-bold tracking-tight text-slate-800">Procurement History</h1>
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">Manage and inward inventory</p>
                        </div>
                    </header>

                    {/* Pass the data to the client component */}
                    <PurchaseListClient initialOrders={orders || []} />
                </div>
            </main>
        </div>
    )
}