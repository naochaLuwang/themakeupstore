

import { createClient } from "@/utils/supabase/server"
import InventoryRegistryWrapper from "./inventory-registry-wrapper"

export default async function InventoryPage() {
    const supabase = await createClient()

    const { data: categories } = await supabase
        .from("categories")
        .select("id, name")
        .order("name")

    const { data: inventory, error } = await supabase
        .from("product_variants")
        .select(`
            id, 
            sku, 
            title, 
            stock, 
            price,
            product_id,
            products ( 
                name,
                product_categories (category_id)
            )
        `)
        .order("stock", { ascending: true })

    if (error) console.error("Fetch Error:", error.message)

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 pb-24 lg:pb-12 bg-slate-50/30 min-h-screen">
            <header className="mb-10">
                <h2 className="text-3xl lg:text-4xl font-black tracking-tighter uppercase italic text-slate-900">
                    Inventory Registry
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Global Stock Sync & SKU Management
                </p>
            </header>

            <InventoryRegistryWrapper
                initialInventory={inventory || []}
                categories={categories || []}
            />
        </div>
    )
}