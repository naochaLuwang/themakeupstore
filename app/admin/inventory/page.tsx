import { createClient } from "@/utils/supabase/server"
import InventoryRegistryWrapper from "./inventory-registry-wrapper"

export default async function InventoryPage() {
    const supabase = await createClient()

    const [{ data: categories }, { data: products }] = await Promise.all([
        supabase.from("categories").select("id, name").order("name"),
        supabase
            .from("products")
            .select(`
                id, name, brand, thumbnail_url,
                product_categories(category_id),
                product_variants(id, sku, title, stock, price, discount_type, discount_value)
            `)
            .order("name"),
    ])

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-2xl font-black tracking-tight text-slate-900">Inventory</h1>
                <p className="text-sm text-slate-500">Global stock and SKU management</p>
            </div>

            <InventoryRegistryWrapper
                initialProducts={products || []}
                categories={categories || []}
            />
        </div>
    )
}
