import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"
import EssentialCategoryClient from "./essential-category-client"

const ADDITIONAL_SLUGS: Record<string, string[]> = {
    "skincare-accessories": ["brushes", "accessories"],
}

export default async function EssentialsCategoryPage({
    params,
}: {
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params
    const supabase = await createClient()

    // 1. Fetch current category
    const { data: category, error: catError } = await supabase
        .from("categories")
        .select("id, name, slug, parent_id")
        .eq("slug", slug)
        .single()

    if (catError || !category) return notFound()

    // 2. Fetch parent ("essentials")
    const { data: parent } = await supabase
        .from("categories")
        .select("id, slug")
        .eq("id", category.parent_id)
        .single()

    // 3. Fetch sibling subcategories (for the nav pills)
    const { data: siblings } = await supabase
        .from("categories")
        .select("name, slug, image_url")
        .eq("parent_id", category.parent_id)
        .order("name", { ascending: true })

    // 4. Resolve ALL category IDs to fetch products for
    const additionalSlugs = ADDITIONAL_SLUGS[slug] || []
    let targetCategoryIds = [category.id]

    if (additionalSlugs.length > 0) {
        // These are top-level parent categories (parent_id IS NULL).
        // We need to fetch each parent + all of its subcategories.
        for (const extraSlug of additionalSlugs) {
            const { data: parentCat } = await supabase
                .from("categories")
                .select("id")
                .eq("slug", extraSlug)
                .is("parent_id", null)
                .single()

            if (!parentCat) continue

            targetCategoryIds.push(parentCat.id)

            // Fetch all subcategories under this parent
            const { data: children } = await supabase
                .from("categories")
                .select("id")
                .eq("parent_id", parentCat.id)

            if (children) {
                targetCategoryIds.push(...children.map((c) => c.id))
            }
        }
    }

    // 5. Fetch products using embedded join
    const { data: products, error: prodError } = await supabase
        .from("products")
        .select("*, product_variants(id, price, stock), product_categories!inner(category_id)")
        .in("product_categories.category_id", targetCategoryIds)
        .eq("status", "active")
        .order("created_at", { ascending: false })

    if (prodError) {
        console.error("Error fetching products for slug:", slug, prodError)
    }

    const deduped = (products || []).filter(
        (p, i, arr) => arr.findIndex((x) => x.id === p.id) === i
    ).map(p => ({
        ...p,
        outOfStock: (p as any).product_variants?.length > 0
            ? (p as any).product_variants.every((v: any) => v.stock != null && Number(v.stock) <= 0)
            : ((p as any).stock != null && Number((p as any).stock) <= 0),
    })).sort((a, b) => (a.outOfStock === b.outOfStock ? 0 : a.outOfStock ? 1 : -1))

    return (
        <EssentialCategoryClient
            category={category}
            siblings={siblings || []}
            products={deduped}
            parentSlug={parent?.slug || "essentials"}
        />
    )
}