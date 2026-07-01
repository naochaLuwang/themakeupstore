import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import PosClient from "./pos-client"

export default async function PosPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    const [productsRes, categoriesRes, pendingRes] = await Promise.all([
        supabase
            .from("products")
            .select(`
                id, name, slug, brand, thumbnail_url, base_price, has_variants,
                product_variants(id, title, price, stock, sku, image_url, discount_type, discount_value)
            `)
            .eq("status", "active")
            .order("name"),
        supabase
            .from("categories")
            .select("id, name, slug")
            .order("name"),
        supabase
            .from("pos_orders")
            .select(`
                *, pos_order_items(id, product_name, variant_title, quantity, unit_price, total_price)
            `)
            .in("status", ["pending", "preparing", "ready"])
            .order("created_at", { ascending: true }),
    ])

    return (
        <PosClient
            cashierId={user.id}
            products={productsRes.data || []}
            categories={categoriesRes.data || []}
            pendingOrders={pendingRes.data || []}
        />
    )
}
