"use client"

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/utils/supabase/client"

interface ProductPromo {
    type: 'gift' | 'bogo'
    ruleName?: string
    minCartAmount?: number
    giftProduct?: { name: string; thumbnail_url: string }
    giftQuantity?: number
}

interface PromotionBadgeContextType {
    getPromo: (productId: string, categoryId?: string, brand?: string, categoryIds?: string[]) => ProductPromo | null
    loading: boolean
}

const PromotionBadgeContext = createContext<PromotionBadgeContextType>({
    getPromo: () => null,
    loading: true,
})

export function useProductPromo(productId: string, categoryId?: string, brand?: string, categoryIds?: string[]) {
    const { getPromo, loading } = useContext(PromotionBadgeContext)
    return { activePromo: loading ? null : getPromo(productId, categoryId, brand, categoryIds) }
}

export function PromotionBadgeProvider({ children }: { children: React.ReactNode }) {
    const [promoMap, setPromoMap] = useState<Map<string, ProductPromo>>(new Map())
    const [cartTotalGift, setCartTotalGift] = useState<ProductPromo | null>(null)
    const [loading, setLoading] = useState(true)
    const fetchedRef = useRef(false)

    useEffect(() => {
        if (fetchedRef.current) return
        fetchedRef.current = true

        const fetchAll = async () => {
            const supabase = createClient()
            const map = new Map<string, ProductPromo>()
            let foundCartTotalGift: ProductPromo | null = null

            try {
                const now = new Date().toISOString()
                const nowDate = new Date()

                const [bxgyRes, giftRes, bxgyBuyProducts, bxgyBuyCategories, bxgyBuyBrands, giftQualProducts, giftQualCategories, giftQualBrands] = await Promise.all([
                    supabase
                        .from('buy_x_get_y')
                        .select(`
                            id, name, is_active, starts_at, expires_at
                        `)
                        .eq('is_active', true)
                        .lte('starts_at', now)
                        .or(`expires_at.is.null,expires_at.gt.${now}`),
                    supabase
                        .from('free_gifts')
                        .select(`
                            id, name, is_active, starts_at, expires_at, trigger_type, trigger_threshold, min_cart_amount,
                            gift_product:products!free_gifts_gift_product_id_fkey(name, thumbnail_url),
                            gift_product_ref:gift_products!free_gifts_gift_product_ref_id_fkey(name, image_url, price, stock),
                            gift_quantity
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

                // Build junction maps for BXGY
                const bxgyBuyProductMap = new Map<string, { product_id: string }[]>()
                const bxgyBuyCategoryMap = new Map<string, { category_id: string }[]>()
                const bxgyBuyBrandMap = new Map<string, { brand: string }[]>()
                for (const r of bxgyBuyProducts.data ?? []) {
                    if (!bxgyBuyProductMap.has(r.bxgy_id)) bxgyBuyProductMap.set(r.bxgy_id, [])
                    bxgyBuyProductMap.get(r.bxgy_id)!.push({ product_id: r.product_id })
                }
                for (const r of bxgyBuyCategories.data ?? []) {
                    if (!bxgyBuyCategoryMap.has(r.bxgy_id)) bxgyBuyCategoryMap.set(r.bxgy_id, [])
                    bxgyBuyCategoryMap.get(r.bxgy_id)!.push({ category_id: r.category_id })
                }
                for (const r of bxgyBuyBrands.data ?? []) {
                    if (!bxgyBuyBrandMap.has(r.bxgy_id)) bxgyBuyBrandMap.set(r.bxgy_id, [])
                    bxgyBuyBrandMap.get(r.bxgy_id)!.push({ brand: r.brand })
                }

                // Build junction maps for free gifts
                const giftProductMap = new Map<string, { product_id: string }[]>()
                const giftCategoryMap = new Map<string, { category_id: string }[]>()
                const giftBrandMap = new Map<string, { brand: string }[]>()
                for (const r of giftQualProducts.data ?? []) {
                    if (!giftProductMap.has(r.free_gift_id)) giftProductMap.set(r.free_gift_id, [])
                    giftProductMap.get(r.free_gift_id)!.push({ product_id: r.product_id })
                }
                for (const r of giftQualCategories.data ?? []) {
                    if (!giftCategoryMap.has(r.free_gift_id)) giftCategoryMap.set(r.free_gift_id, [])
                    giftCategoryMap.get(r.free_gift_id)!.push({ category_id: r.category_id })
                }
                for (const r of giftQualBrands.data ?? []) {
                    if (!giftBrandMap.has(r.free_gift_id)) giftBrandMap.set(r.free_gift_id, [])
                    giftBrandMap.get(r.free_gift_id)!.push({ brand: r.brand })
                }

                // Attach junction arrays to rules
                const bxgyRules = (bxgyRes.data || []).map((r: any) => ({
                    ...r,
                    buy_products: bxgyBuyProductMap.get(r.id) || [],
                    buy_categories: bxgyBuyCategoryMap.get(r.id) || [],
                    buy_brands: bxgyBuyBrandMap.get(r.id) || [],
                }))
                const giftRules = (giftRes.data || []).map((r: any) => ({
                    ...r,
                    qualifying_products: giftProductMap.get(r.id) || [],
                    qualifying_categories: giftCategoryMap.get(r.id) || [],
                    qualifying_brands: giftBrandMap.get(r.id) || [],
                }))

                // Post-fetch filter (match cart's isRuleActive logic exactly)
                const isActive = (r: any) =>
                    r.is_active &&
                    new Date(r.starts_at) <= nowDate &&
                    (!r.expires_at || new Date(r.expires_at) > nowDate)

                const setIfNew = (key: string, promo: ProductPromo) => {
                    if (!map.has(key)) map.set(key, promo)
                }

                // Process BXGY rules
                for (const rule of bxgyRules) {
                    if (!isActive(rule)) continue
                    for (const link of (rule.buy_products || []) as any[]) {
                        setIfNew(link.product_id, { type: 'bogo', ruleName: rule.name })
                    }
                    for (const link of (rule.buy_categories || []) as any[]) {
                        setIfNew(`cat:${link.category_id}`, { type: 'bogo', ruleName: rule.name })
                    }
                    for (const link of (rule.buy_brands || []) as any[]) {
                        setIfNew(`brand:${link.brand}`, { type: 'bogo', ruleName: rule.name })
                    }
                }

                // Process Free Gift rules
                const makeGiftPromo = (rule: any): ProductPromo => ({
                    type: 'gift',
                    ruleName: rule.name,
                    minCartAmount: rule.min_cart_amount || undefined,
                    giftProduct: rule.gift_product_ref
                        ? { name: rule.gift_product_ref.name, thumbnail_url: rule.gift_product_ref.image_url }
                        : rule.gift_product || undefined,
                    giftQuantity: rule.gift_quantity || 1,
                })
                for (const rule of giftRules) {
                    if (!isActive(rule)) continue
                    const promo = makeGiftPromo(rule)
                    // cart_total rules apply to ALL products — store separately
                    if (rule.trigger_type === 'cart_total') {
                        if (!foundCartTotalGift) {
                            foundCartTotalGift = promo
                        }
                        continue
                    }
                    for (const link of (rule.qualifying_products || []) as any[]) {
                        setIfNew(link.product_id, promo)
                    }
                    for (const link of (rule.qualifying_categories || []) as any[]) {
                        setIfNew(`cat:${link.category_id}`, promo)
                    }
                    for (const link of (rule.qualifying_brands || []) as any[]) {
                        setIfNew(`brand:${link.brand}`, promo)
                    }
                }
            } catch (err) {
                console.error('Promotion badge fetch error:', err)
            }

            setPromoMap(map)
            setCartTotalGift(foundCartTotalGift)
            setLoading(false)
        }

        fetchAll()
    }, [])

    const getPromo = useCallback((productId: string, categoryId?: string, brand?: string, categoryIds?: string[]): ProductPromo | null => {
        const byProduct = promoMap.get(productId)
        if (byProduct) return byProduct
        if (categoryId) {
            const byCat = promoMap.get(`cat:${categoryId}`)
            if (byCat) return byCat
        }
        if (categoryIds && categoryIds.length > 0) {
            for (const cid of categoryIds) {
                const byCat = promoMap.get(`cat:${cid}`)
                if (byCat) return byCat
            }
        }
        if (brand) {
            const byBrand = promoMap.get(`brand:${brand}`)
            if (byBrand) return byBrand
        }
        if (cartTotalGift) return cartTotalGift
        return null
    }, [promoMap, cartTotalGift])

    return (
        <PromotionBadgeContext.Provider value={{ getPromo, loading }}>
            {children}
        </PromotionBadgeContext.Provider>
    )
}
