import { createClient } from "@/utils/supabase/server"
import { CollectionListing } from "@/components/store/collection-listing"
import type { CatalogSearchParams } from "@/components/store/catalog-listing"
import type { Metadata, ResolvingMetadata } from "next"

export async function generateMetadata(
    { params }: { params: Promise<{ slug: string }> },
    parent: ResolvingMetadata
): Promise<Metadata> {
    const { slug } = await params
    const supabase = await createClient()
    let category: any
    try {
        const { data: cat } = await supabase.from("categories").select("name, description, image_url").eq("is_active", true).eq("slug", slug).single()
        category = cat
    } catch {
        return {}
    }
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

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<CatalogSearchParams> }) {
    const { slug } = await params
    return <CollectionListing slug={slug} section="categories" searchParams={await searchParams} />
}
