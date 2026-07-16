import { createClient } from "@/utils/supabase/server"
import ShopClient from "./shop-client"

export const metadata = {
    title: "Shop All Products | THE MAKEUP STORE WANGKHEI",
    description: "Browse our latest collection of premium products.",
}

export default async function ShopPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; search?: string }>
}) {
    const supabase = await createClient()
    const params = await searchParams
    const query = params.q || params.search || ""

    // Initial Data Fetch
    let supabaseQuery = supabase
        .from('products')
        .select(`*, product_variants(id, price, stock, discount_type, discount_value, title, image_url)`)
        .eq('status', 'active')

    if (query) {
        supabaseQuery = supabaseQuery.textSearch("search_vector", query, { type: "websearch", config: "english" })
    }

    const { data: products } = await supabaseQuery.order('created_at', { ascending: false }).limit(100)

    return <ShopClient initialProducts={products || []} searchQuery={query} />
}