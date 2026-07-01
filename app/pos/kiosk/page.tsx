import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import KioskClient from "./kiosk-client"

export default async function KioskPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    const [productsRes, categoriesRes] = await Promise.all([
        supabase
            .from("products")
            .select(`
                id, name, slug, brand, thumbnail_url, base_price, has_variants,
                product_variants(id, title, price, stock, sku, image_url)
            `)
            .eq("status", "active")
            .order("name"),
        supabase
            .from("categories")
            .select("id, name, slug")
            .order("name"),
    ])

    return (
        <KioskClient
            products={productsRes.data || []}
            categories={categoriesRes.data || []}
        />
    )
}
