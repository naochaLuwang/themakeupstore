import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"
import CategoryClient from "./category-client"
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
        .from('categories')
        .select('*, parent:parent_id(id, name, slug)')
        .eq('slug', slug)
        .single()

    if (!category) notFound()

    return <CategoryClient initialCategory={category} slug={slug} />
}
