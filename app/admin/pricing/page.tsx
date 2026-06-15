import { createClient } from "@/utils/supabase/server"
import PricingTable from "./pricing-table"

export default async function PricingPage() {
    const supabase = await createClient()

    const { data: products } = await supabase
        .from('products')
        .select(`
            id, name, base_price, discount_type, discount_value, has_variants,
            product_categories(category_id, categories(name)),
            product_variants (id, title, price, discount_type, discount_value, sku)
        `)
        .order('name')

    const { data: categories } = await supabase
        .from('categories')
        .select('id, name')
        .order('name')

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-2xl font-black tracking-tight text-slate-900">Pricing</h1>
                <p className="text-sm text-slate-500">Global MSRP and promotions management</p>
            </div>

            <PricingTable
                initialProducts={products || []}
                categories={categories || []}
            />
        </div>
    )
}
