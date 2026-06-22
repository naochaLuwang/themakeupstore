import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"
import { CategoryClient } from "./category-client"
import type { Metadata, ResolvingMetadata } from "next"

export async function generateMetadata(
    { params }: { params: Promise<{ slug: string }> },
    parent: ResolvingMetadata
): Promise<Metadata> {
    const { slug } = await params
    const supabase = await createClient()
    const { data: category } = await supabase.from("categories").select("name, description, image_url").eq("slug", slug).single()

    if (!category) return {}

    const previousImages = (await parent).openGraph?.images || []

    return {
        title: category.name,
        description: category.description || `Explore ${category.name} collection at The Makeup Store Wangkhei.`,
        openGraph: {
            title: category.name,
            description: category.description,
            images: category.image_url ? [category.image_url, ...previousImages] : previousImages,
        },
    }
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const supabase = await createClient()

    const { data: category } = await supabase
        .from("categories")
        .select("*, parent:parent_id(id, name, slug)")
        .eq("slug", slug)
        .single()

    if (!category) notFound()

    let subcategories: any[] = []
    let subThumbnails: Record<string, string> = {}
    if (category.parent_id) {
        const { data: subs } = await supabase
            .from("categories")
            .select("id, name, slug, image_url")
            .eq("parent_id", category.parent_id)
            .order("name")
        subcategories = subs || []

        if (subcategories.length > 0) {
            const siblingIds = subcategories.map(s => s.id)
            const { data: pcData } = await supabase
                .from("product_categories")
                .select("category_id, products!inner(thumbnail_url)")
                .in("category_id", siblingIds)
                .not("products.thumbnail_url", "is", null)
                .limit(200)

            const seen = new Set<string>()
            ;(pcData || []).forEach(r => {
                if (!seen.has(r.category_id)) {
                    seen.add(r.category_id)
                    subThumbnails[r.category_id] = (r.products as any)?.thumbnail_url || ""
                }
            })

            // Fallback to category image_url for any still missing
            subcategories.forEach(s => {
                if (!subThumbnails[s.id] && s.image_url) {
                    subThumbnails[s.id] = s.image_url
                }
            })
        }
    }

    let initialProducts: any[] = []

    const { data: junction } = await supabase
        .from("product_categories")
        .select("product_id")
        .eq("category_id", category.id)

    const productIds = junction?.map((j: any) => j.product_id) || []

    if (productIds.length > 0) {
        const { data: products } = await supabase
            .from("products")
            .select("*, product_variants(*), product_concerns(concern_id), product_categories(category_id)")
            .eq("status", "active")
            .in("id", productIds)
            .order("created_at", { ascending: false })

        initialProducts = products || []
    }

    return (
        <CategoryClient
            category={category}
            initialProducts={initialProducts}
            subcategories={subcategories}
            subThumbnails={subThumbnails}
        />
    )
}
