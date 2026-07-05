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

    // Fetch active promotions — query parent tables with nested junction data
    const now = new Date().toISOString()
    const productId = id
    const productCategoryIds = [
        ...(data.category_id ? [data.category_id] : []),
        ...(data.product_categories || []).map((pc: any) => pc.category_id).filter(Boolean)
    ]
    const productBrand = data.brand

    const [bxgyRes, giftRes] = await Promise.all([
        supabase
            .from('buy_x_get_y')
            .select(`
                id, name, description, buy_quantity, get_type, get_discount_type, get_discount_value, is_active, starts_at, expires_at,
                get_product:products!buy_x_get_y_get_product_id_fkey(name, thumbnail_url),
                buy_products:bxgy_buy_products(product_id),
                buy_categories:bxgy_buy_categories(category_id),
                buy_brands:bxgy_buy_brands(brand)
            `)
            .eq('is_active', true)
            .or(`expires_at.is.null,expires_at.gt.${now}`),
        supabase
            .from('free_gifts')
            .select(`
                id, name, description, gift_quantity, trigger_type, trigger_threshold, min_cart_amount, is_active, starts_at, expires_at,
                gift_product_id,
                gift_product:products!free_gifts_gift_product_id_fkey(name, thumbnail_url),
                qualifying_products:free_gift_products(product_id),
                qualifying_categories:free_gift_categories(category_id),
                qualifying_brands:free_gift_brands(brand)
            `)
            .eq('is_active', true)
            .or(`expires_at.is.null,expires_at.gt.${now}`),
    ])

    if (bxgyRes.error) console.error('BXGY query error:', bxgyRes.error)
    if (giftRes.error) console.error('Gift query error:', giftRes.error)

    // Find BXGY rule that matches this product
    let activeBXGY: any = null
    for (const rule of (bxgyRes.data || []) as any[]) {
        const matchByProduct = (rule.buy_products || []).some((p: any) => p.product_id === productId)
        const matchByCategory = productCategoryIds.length > 0 && (rule.buy_categories || []).some((c: any) => productCategoryIds.includes(c.category_id))
        const matchByBrand = productBrand && (rule.buy_brands || []).some((b: any) => b.brand === productBrand)
        if (matchByProduct || matchByCategory || matchByBrand) {
            activeBXGY = rule
            break
        }
    }

    // Find Free Gift rule that matches this product
    let activeGift: any = null
    for (const rule of (giftRes.data || []) as any[]) {
        // cart_total rules apply to ALL products
        if (rule.trigger_type === 'cart_total') {
            activeGift = rule
            break
        }
        const matchByProduct = (rule.qualifying_products || []).some((p: any) => p.product_id === productId)
        const matchByCategory = productCategoryIds.length > 0 && (rule.qualifying_categories || []).some((c: any) => productCategoryIds.includes(c.category_id))
        const matchByBrand = productBrand && (rule.qualifying_brands || []).some((b: any) => b.brand === productBrand)
        if (matchByProduct || matchByCategory || matchByBrand) {
            activeGift = rule
            break
        }
    }

    return <ProductClient key={id} initialProduct={initialProduct} activeBXGY={activeBXGY} activeGift={activeGift} />
}
