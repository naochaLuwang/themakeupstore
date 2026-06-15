import { createClient } from "@/utils/supabase/server"
import InventoryClient from "./inventory-client"

export default async function InventoryPage() {
    const supabase = await createClient()

    const { data: stats } = await supabase
        .from('inventory_dashboard')
        .select('*')
        .order('current_balance', { ascending: true })

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-2xl font-black tracking-tight text-slate-900">Stock Intelligence</h1>
                <p className="text-sm text-slate-500">Global inventory overview</p>
            </div>
            <InventoryClient initialData={stats || []} />
        </div>
    )
}