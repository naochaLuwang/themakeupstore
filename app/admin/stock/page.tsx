import { createClient } from "@/utils/supabase/server"
import InventoryClient from "./inventory-client"

export default async function InventoryPage() {
    const supabase = await createClient()

    const { data: stats } = await supabase
        .from('inventory_dashboard')
        .select('*')
        .order('current_balance', { ascending: true })

    return (
        <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
            <main className="flex-1 p-8">
                <div className="max-w-7xl mx-auto space-y-8">
                    <header className="flex justify-between items-end">
                        <div className="space-y-1">
                            <h1 className="text-2xl font-bold tracking-tight">Stock Intelligence</h1>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Global Inventory Overview</p>
                        </div>
                    </header>

                    <InventoryClient initialData={stats || []} />
                </div>
            </main>
        </div>
    )
}