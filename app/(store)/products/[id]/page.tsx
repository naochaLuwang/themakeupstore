import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"
import ProductClient from "./product-client"

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("products")
        .select(`
            *,
            product_categories(category_id, category:category_id(slug, name)),
            product_images(*),
            product_variants(*, variant_images(*)),
            product_reviews(id, rating, title, comment, created_at, user_name, is_approved)
        `)
        .eq("id", id)
        .eq("product_reviews.is_approved", true)
        .order("created_at", { foreignTable: "product_reviews", ascending: false })
        .single()

    if (error || !data) notFound()

    let allImages: string[] = []
    const pi = data.product_images as any[] | undefined
    if (Array.isArray(pi) && pi.length > 0) {
        allImages = [...pi]
            .sort((a, b) => (a.position || 0) - (b.position || 0))
            .map((img) => img.url || img.image_url || img.secure_url)
            .filter(Boolean)
    }
    if (allImages.length === 0 && Array.isArray(data.image_urls)) {
        allImages = data.image_urls.filter(Boolean)
    }
    if (allImages.length === 0 && data.thumbnail_url) {
        allImages = [data.thumbnail_url]
    }

    const initialProduct = { ...data, image_urls: allImages }

    return <ProductClient key={id} initialProduct={initialProduct} />
}
