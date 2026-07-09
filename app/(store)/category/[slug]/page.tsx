import { createClient } from "@/utils/supabase/server"
import { CategoryProducts } from "./category-products"

interface CategoryPageProps {
    params: Promise<{ slug: string }>
}

export default async function CategoryPage({ params }: CategoryPageProps) {
    const { slug } = await params
    const supabase = await createClient()

    const { data: parent } = await supabase
        .from("categories")
        .select("id, name, slug, image_url")
        .eq("slug", slug)
        .single()

    let subcategories: any[] = []
    let concerns: any[] = []
    let initialProducts: any[] = []

    if (parent) {
        const [subsResult, concernsResult] = await Promise.all([
            supabase.from("categories")
                .select("id, name, slug, image_url")
                .eq("parent_id", parent.id)
                .order("name"),
            supabase.from("concerns")
                .select("id, name, slug, image_url")
                .order("name"),
        ])

        subcategories = subsResult.data || []
        concerns = concernsResult.data || []

        const childIds = subcategories.map((s: any) => s.id)

        if (childIds.length > 0) {
            const { data: junction } = await supabase
                .from("product_categories")
                .select("product_id")
                .in("category_id", childIds)

            const productIds = junction?.map((j: any) => j.product_id) || []

            if (productIds.length > 0) {
                const { data: products } = await supabase
                    .from("products")
                    .select("*, product_variants(id, price, stock), product_concerns(concern_id), product_categories(category_id)")
                    .eq("status", "active")
                    .in("id", productIds)
                    .order("created_at", { ascending: false })

                initialProducts = products || []
            }
        }
    }

    return (
        <CategoryProducts
            slug={slug}
            parent={parent}
            subcategories={subcategories}
            concerns={concerns}
            initialProducts={initialProducts}
            showConcerns={slug === "skincare"}
        />
    )
}
