// app/admin/pricing/page.tsx
import { createClient } from "@/utils/supabase/server"
import PricingTable from "./pricing-table"

export default async function PricingPage() {
    const supabase = await createClient()

    // Fetch products with their category links
    const { data: products } = await supabase
        .from('products')
        .select(`
      id, name, base_price, discount_type, discount_value, has_variants,
      product_categories(category_id),
      product_variants (id, title, price, discount_type, discount_value, sku)
    `)
        .order('name')

    // Fetch all categories for the filter dropdown
    const { data: categories } = await supabase
        .from('categories')
        .select('id, name')
        .order('name')

    return (
        <div className="p-8 max-w-7xl mx-auto min-h-screen bg-slate-50/30">
            <header className="mb-10">
                <h1 className="text-4xl font-black uppercase tracking-tighter italic text-slate-900">Price Registry</h1>
                <p className="text-slate-500 text-xs uppercase tracking-[0.2em] font-bold mt-2">Global MSRP & Active Promotions Management</p>
            </header>

            <PricingTable
                initialProducts={products || []}
                categories={categories || []}
            />
        </div>
    )
}