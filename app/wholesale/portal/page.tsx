import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import OrderFormClient from "./OrderFormClient"

export default async function WholesalePortal() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Fetch variants using the direct category_id link on the products table
    const { data: variants, error } = await supabase
        .from('product_variants')
        .select(`
            id, 
            title, 
            sku, 
            price,
            product_id,
            products!inner (
                id,
                name, 
                thumbnail_url,
                status,
                category_id,
                categories!products_category_id_fkey (
                    id, 
                    name,
                    category_wholesale_rules (
                        discount_percentage, 
                        min_order_quantity, 
                        is_active
                    )
                )
            )
        `)
        .eq('products.status', 'active')
        .order('sku');

    if (error) {
        console.error("Supabase Error:", error)
        return <div className="p-10 text-red-500">Error loading data.</div>
    }

    return (
        <div className="bg-slate-50 min-h-screen">
            <div className="max-w-[1400px] mx-auto p-4 md:p-8">
                <OrderFormClient initialVariants={variants || []} userId={user.id} />
            </div>
        </div>
    )
}