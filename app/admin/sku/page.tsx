import { createClient } from "@/utils/supabase/server"
import SkuTable from "./sku-table"

export default async function SkuPage() {
    const supabase = await createClient()

    const { data: products } = await supabase
        .from("products")
        .select(`
            id, name, has_variants,
            product_categories(category_id, categories(name)),
            product_variants (id, title, sku, is_default)
        `)
        .order("name")

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-2xl font-black tracking-tight text-slate-900">SKU Management</h1>
                <p className="text-sm text-slate-500">Edit stock-keeping unit codes for products and variants</p>
            </div>

            <SkuTable initialProducts={products || []} />
        </div>
    )
}
