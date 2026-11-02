"use client"

import { createContext, useContext, useMemo, useCallback, useEffect } from "react"
import { useCart } from "@/components/store/use-cart"
import { startPromotionSync } from "@/lib/promotion-client"
import { activeOffer, supportsBXGY } from "@/lib/promotion-engine"

interface ProductPromo {
    type: 'gift' | 'bogo'
    pricingMode?: 'replace_discounts' | 'combine_discounts'
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
    useEffect(startPromotionSync, [])
    const catalog = useCart(s => s.offerCatalog)
    const loading = !catalog
    const { promoMap, cartTotalGift } = useMemo(() => {
        const promoMap = new Map<string, ProductPromo>()
        let cartTotalGift: ProductPromo | null = null
        const put = (key: string, promo: ProductPromo) => { if (!promoMap.has(key)) promoMap.set(key, promo) }
        for (const rule of catalog?.bxgyRules || []) {
            if (!activeOffer(rule, new Set(catalog?.usedBXGY)) || !supportsBXGY(rule)) continue
            const promo: ProductPromo = { type: 'bogo', ruleName: rule.name, pricingMode: rule.pricing_mode }
            for (const id of rule.products) if (rule.buy_type === 'specific_products') put(id, promo)
            for (const id of rule.categories) if (rule.buy_type === 'specific_categories') put(`cat:${id}`, promo)
            for (const brand of rule.brands) if (rule.buy_type === 'specific_brands') put(`brand:${brand}`, promo)
        }
        for (const rule of catalog?.giftRules || []) {
            if (!activeOffer(rule, new Set(catalog?.usedGifts))) continue
            const gift = catalog?.giftOptions.find(g => g.ruleId === rule.id && g.stock > 0)
            if (!gift) continue
            const promo: ProductPromo = { type: 'gift', ruleName: rule.name, giftQuantity: 1,
                minCartAmount: rule.trigger_type === 'cart_total' ? Math.max(rule.trigger_threshold, rule.min_cart_amount || 0) : rule.min_cart_amount || undefined,
                giftProduct: { name: gift.name, thumbnail_url: gift.image } }
            if (rule.trigger_type === 'cart_total') { if (!cartTotalGift) cartTotalGift = promo; continue }
            for (const id of rule.products) if (rule.trigger_type === 'specific_products') put(id, promo)
            for (const id of rule.categories) if (rule.trigger_type === 'specific_categories') put(`cat:${id}`, promo)
            for (const brand of rule.brands) if (rule.trigger_type === 'specific_brands') put(`brand:${brand}`, promo)
        }
        return { promoMap, cartTotalGift }
    }, [catalog])

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

    const value = useMemo(() => ({ getPromo, loading }), [getPromo, loading])
    return (
        <PromotionBadgeContext.Provider value={value}>
            {children}
        </PromotionBadgeContext.Provider>
    )
}
