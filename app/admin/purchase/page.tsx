import { createClient } from "@/utils/supabase/server"
import PurchaseClient from "./purchase-client"

export default async function PurchasePage() {
    const supabase = await createClient()

    const { data: suppliers } = await supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false })

    const { data: products } = await supabase
        .from('products')
        .select(`
            id, 
            name, 
            brand,
            product_variants (id, title, stock, sku, price)
        `)
        .eq('status', 'active')

    return (
        <PurchaseClient
            initialSuppliers={suppliers || []}
            initialProducts={products || []}
        />
    )
}