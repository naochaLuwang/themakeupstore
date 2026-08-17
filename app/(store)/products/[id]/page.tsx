import type { Metadata } from "next"
import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"
import ProductClient from "./product-client"
import { pickBestFlashSale, type FlashSaleRow } from "@/lib/flash-sale-helper"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params
    return { title: `Product ${id.slice(0, 8)}`, description: "View product details" }
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    let data: any, error: any
    try {
        const res = await supabase
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
        data = res.data
        error = res.error
    } catch {
        notFound()
    }
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

    const [bxgyRes, giftRes, bxgyBuyProducts, bxgyBuyCategories, bxgyBuyBrands, giftQualProducts, giftQualCategories, giftQualBrands] = await Promise.all([
        supabase
            .from('buy_x_get_y')
            .select(`
                id, name, description, buy_quantity, get_type, get_discount_type, get_discount_value, is_active, starts_at, expires_at,
                get_product:products!buy_x_get_y_get_product_id_fkey(name, thumbnail_url)
            `)
            .eq('is_active', true)
            .or(`expires_at.is.null,expires_at.gt.${now}`),
        supabase
            .from('free_gifts')
            .select(`
                id, name, description, gift_quantity, trigger_type, trigger_threshold, min_cart_amount, is_active, starts_at, expires_at,
                gift_product_id, gift_product_ref_id,
                gift_product:products!free_gifts_gift_product_id_fkey(name, thumbnail_url),
                gift_product_ref:gift_products!free_gifts_gift_product_ref_id_fkey(name, images, price, stock)
            `)
            .eq('is_active', true)
            .lte('starts_at', now)
            .or(`expires_at.is.null,expires_at.gt.${now}`),
        supabase.from('bxgy_buy_products').select('bxgy_id, product_id'),
        supabase.from('bxgy_buy_categories').select('bxgy_id, category_id'),
        supabase.from('bxgy_buy_brands').select('bxgy_id, brand'),
        supabase.from('free_gift_products').select('free_gift_id, product_id'),
        supabase.from('free_gift_categories').select('free_gift_id, category_id'),
        supabase.from('free_gift_brands').select('free_gift_id, brand'),
    ])

    if (bxgyRes.error) console.error('BXGY query error:', bxgyRes.error)
    if (giftRes.error) console.error('Gift query error:', giftRes.error)

    // Build junction maps for BXGY
    const bxgyBuyProductMap = new Map<string, string[]>()
    const bxgyBuyCategoryMap = new Map<string, string[]>()
    const bxgyBuyBrandMap = new Map<string, string[]>()
    for (const r of bxgyBuyProducts.data ?? []) {
        if (!bxgyBuyProductMap.has(r.bxgy_id)) bxgyBuyProductMap.set(r.bxgy_id, [])
        bxgyBuyProductMap.get(r.bxgy_id)!.push(r.product_id)
    }
    for (const r of bxgyBuyCategories.data ?? []) {
        if (!bxgyBuyCategoryMap.has(r.bxgy_id)) bxgyBuyCategoryMap.set(r.bxgy_id, [])
        bxgyBuyCategoryMap.get(r.bxgy_id)!.push(r.category_id)
    }
    for (const r of bxgyBuyBrands.data ?? []) {
        if (!bxgyBuyBrandMap.has(r.bxgy_id)) bxgyBuyBrandMap.set(r.bxgy_id, [])
        bxgyBuyBrandMap.get(r.bxgy_id)!.push(r.brand)
    }

    // Build junction maps for free gifts
    const giftProductMap = new Map<string, string[]>()
    const giftCategoryMap = new Map<string, string[]>()
    const giftBrandMap = new Map<string, string[]>()
    for (const r of giftQualProducts.data ?? []) {
        if (!giftProductMap.has(r.free_gift_id)) giftProductMap.set(r.free_gift_id, [])
        giftProductMap.get(r.free_gift_id)!.push(r.product_id)
    }
    for (const r of giftQualCategories.data ?? []) {
        if (!giftCategoryMap.has(r.free_gift_id)) giftCategoryMap.set(r.free_gift_id, [])
        giftCategoryMap.get(r.free_gift_id)!.push(r.category_id)
    }
    for (const r of giftQualBrands.data ?? []) {
        if (!giftBrandMap.has(r.free_gift_id)) giftBrandMap.set(r.free_gift_id, [])
        giftBrandMap.get(r.free_gift_id)!.push(r.brand)
    }

    // Attach junction data to rules
    const bxgyRules = (bxgyRes.data || []).map((rule: any) => ({
        ...rule,
        buy_products: (bxgyBuyProductMap.get(rule.id) || []).map((product_id: string) => ({ product_id })),
        buy_categories: (bxgyBuyCategoryMap.get(rule.id) || []).map((category_id: string) => ({ category_id })),
        buy_brands: (bxgyBuyBrandMap.get(rule.id) || []).map((brand: string) => ({ brand })),
    }))

    const giftRules = (giftRes.data || []).map((rule: any) => ({
        ...rule,
        qualifying_products: (giftProductMap.get(rule.id) || []).map((product_id: string) => ({ product_id })),
        qualifying_categories: (giftCategoryMap.get(rule.id) || []).map((category_id: string) => ({ category_id })),
        qualifying_brands: (giftBrandMap.get(rule.id) || []).map((brand: string) => ({ brand })),
    }))

    // Find BXGY rule that matches this product
    let activeBXGY: any = null
    for (const rule of bxgyRules) {
        const matchByProduct = rule.buy_products?.some((p: any) => p.product_id === productId)
        const matchByCategory = productCategoryIds.length > 0 && rule.buy_categories?.some((c: any) => productCategoryIds.includes(c.category_id))
        const matchByBrand = productBrand && rule.buy_brands?.some((b: any) => b.brand === productBrand)
        if (matchByProduct || matchByCategory || matchByBrand) {
            activeBXGY = rule
            break
        }
    }

    // Find Free Gift rule that matches this product
    let activeGift: any = null
    for (const rule of giftRules) {
        if (rule.trigger_type === 'cart_total') {
            activeGift = rule
            break
        }
        const matchByProduct = rule.qualifying_products?.some((p: any) => p.product_id === productId)
        const matchByCategory = productCategoryIds.length > 0 && rule.qualifying_categories?.some((c: any) => productCategoryIds.includes(c.category_id))
        const matchByBrand = productBrand && rule.qualifying_brands?.some((b: any) => b.brand === productBrand)
        if (matchByProduct || matchByCategory || matchByBrand) {
            activeGift = rule
            break
        }
    }

    // Fetch active flash sales (scope-based matching)
    const { data: allFlashSales } = await supabase
        .from('flash_sales')
        .select('scope, product_id, category_id, brand, discount_type, discount_value, label, ends_at, starts_at')
        .eq('is_active', true)
        .lte('starts_at', now)
        .gte('ends_at', now)

    const activeFlashSale = pickBestFlashSale(
        (allFlashSales || []) as FlashSaleRow[],
        id,
        productCategoryIds,
        productBrand || null
    )

    return <ProductClient key={id} initialProduct={initialProduct} activeBXGY={activeBXGY} activeGift={activeGift} activeFlashSale={activeFlashSale} />
}
