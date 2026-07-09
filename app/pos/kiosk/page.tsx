import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import KioskClient from "./kiosk-client"

export default async function KioskPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    const [productsRes, categoriesRes, brandsRes] = await Promise.all([
        supabase
            .from("products")
            .select(`
                id, name, slug, brand, thumbnail_url, base_price, has_variants,
                product_variants(id, title, price, stock, sku, image_url),
                product_categories!inner(category_id)
            `)
            .eq("status", "active")
            .order("name"),
        supabase
            .from("categories")
            .select("id, name, slug")
            .order("name"),
        supabase
            .from("products")
            .select("brand")
            .eq("status", "active")
            .not("brand", "is", null)
            .neq("brand", "")
            .order("brand"),
    ])

    const brands = [...new Set((brandsRes.data || []).map(r => r.brand))].sort()

    return (
        <KioskClient
            products={productsRes.data || []}
            categories={categoriesRes.data || []}
            brands={brands}
        />
    )
}
