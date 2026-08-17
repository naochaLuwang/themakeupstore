"use server"

import { createClient } from "@/utils/supabase/server"
import { requireAdmin } from "@/lib/admin"

// ============================================================
// TYPES
// ============================================================

export interface FreeGiftRule {
    id: string
    name: string
    description: string | null
    gift_product_id: string
    gift_variant_id: string | null
    gift_product_ref_id: string | null
    gift_quantity: number
    trigger_type: string
    trigger_threshold: number
    min_cart_amount: number | null
    apply_to: string
    usage_limit: number | null
    used_count: number
    once_per_user: boolean
    max_per_order: number
    starts_at: string
    expires_at: string | null
    is_active: boolean
    gift_product?: { name: string; thumbnail_url: string | null; base_price: number }
    gift_product_ref?: { name: string; images: string[] | null; price: number; stock: number }
    gift_variant?: { title: string; price: number; stock: number; image_url: string | null }
    qualifying_products?: { product_id: string }[]
    qualifying_categories?: { category_id: string }[]
    qualifying_brands?: { brand: string }[]
}

export interface BXGYRule {
    id: string
    name: string
    description: string | null
    buy_type: string
    buy_quantity: number
    get_type: string
    get_product_id: string | null
    get_variant_id: string | null
    get_discount_type: string
    get_discount_value: number
    apply_to: string
    usage_limit: number | null
    used_count: number
    once_per_user: boolean
    max_per_order: number | null
    starts_at: string
    expires_at: string | null
    is_active: boolean
    buy_products?: { product_id: string }[]
    buy_categories?: { category_id: string }[]
    buy_brands?: { brand: string }[]
    get_products?: { product_id: string }[]
    get_product?: { name: string; thumbnail_url: string | null; base_price: number }
    get_variant?: { title: string; price: number; stock: number }
}

export interface CartItem {
    id: string
    productId: string
    categoryId: string
    variantId: string
    name: string
    variantTitle: string
    price: number
    mrp: number
    originalPrice: number
    image: string
    quantity: number
    stock: number
    is_gift?: boolean
    is_bxgy_free?: boolean
    applied_bxgy_rule_id?: string
}

export interface EvaluatedGift {
    rule_id: string
    name: string
    product_id: string
    variant_id: string | null
    quantity: number
    product_name: string
    product_image: string | null
    product_price: number
}

export interface EvaluatedBXGYDiscount {
    rule_id: string
    rule_name: string
    variant_id: string
    product_id: string
    product_name: string
    discount_amount: number
    original_price: number
    free_quantity: number
}

// ============================================================
// HELPER: Check if a rule is currently active
// ============================================================

function isRuleActive(starts_at: string, expires_at: string | null): boolean {
    const now = new Date()
    if (new Date(starts_at) > now) return false
    if (expires_at && new Date(expires_at) < now) return false
    return true
}

// ============================================================
// FREE GIFTS: Fetch all active rules
// ============================================================

export async function getActiveFreeGiftRules(): Promise<FreeGiftRule[]> {
    const supabase = await createClient()
    const now = new Date().toISOString()

    const { data: rules, error } = await supabase
        .from("free_gifts")
        .select(`
            *,
            gift_product:products!free_gifts_gift_product_id_fkey(name, thumbnail_url, base_price),
            gift_variant:product_variants!free_gifts_gift_variant_id_fkey(title, price, stock, image_url),
            gift_product_ref:gift_products!free_gifts_gift_product_ref_id_fkey(name, images, price, stock)
        `)
        .eq("is_active", true)
        .lte("starts_at", now)
        .or(`expires_at.is.null,expires_at.gt.${now}`)

    if (error || !rules) return []

    const ids = rules.map(r => r.id)
    const [[qualifyingProducts, qualifyingCategories, qualifyingBrands]] = await Promise.all([
        Promise.all([
            ids.length ? supabase.from('free_gift_products').select('free_gift_id, product_id').in('free_gift_id', ids).then(r => r.data ?? []) : [],
            ids.length ? supabase.from('free_gift_categories').select('free_gift_id, category_id').in('free_gift_id', ids).then(r => r.data ?? []) : [],
            ids.length ? supabase.from('free_gift_brands').select('free_gift_id, brand').in('free_gift_id', ids).then(r => r.data ?? []) : [],
        ])
    ])

    const productMap = new Map<string, { product_id: string }[]>()
    const categoryMap = new Map<string, { category_id: string }[]>()
    const brandMap = new Map<string, { brand: string }[]>()
    for (const r of qualifyingProducts) {
        if (!productMap.has(r.free_gift_id)) productMap.set(r.free_gift_id, [])
        productMap.get(r.free_gift_id)!.push({ product_id: r.product_id })
    }
    for (const r of qualifyingCategories) {
        if (!categoryMap.has(r.free_gift_id)) categoryMap.set(r.free_gift_id, [])
        categoryMap.get(r.free_gift_id)!.push({ category_id: r.category_id })
    }
    for (const r of qualifyingBrands) {
        if (!brandMap.has(r.free_gift_id)) brandMap.set(r.free_gift_id, [])
        brandMap.get(r.free_gift_id)!.push({ brand: r.brand })
    }

    return rules.map(r => ({
        ...r,
        qualifying_products: productMap.get(r.id) || [],
        qualifying_categories: categoryMap.get(r.id) || [],
        qualifying_brands: brandMap.get(r.id) || [],
    })) as FreeGiftRule[]
}

// ============================================================
// FREE GIFTS: Evaluate which gifts to add to cart
// ============================================================

export async function evaluateFreeGifts(
    cartItems: CartItem[],
    userId?: string
): Promise<EvaluatedGift[]> {
    const rules = await getActiveFreeGiftRules()
    const supabase = await createClient()
    const gifts: EvaluatedGift[] = []

    for (const rule of rules) {
        // Check usage limit
        if (rule.usage_limit && rule.used_count >= rule.usage_limit) continue

        // Check once_per_user via order_items (own table, not promo_redemptions)
        if (rule.once_per_user && userId) {
            const { data: userOrders } = await supabase
                .from("orders")
                .select("id")
                .eq("user_id", userId)
            const orderIds = (userOrders || []).map(o => o.id)
            if (orderIds.length > 0) {
                const { data: existing } = await supabase
                    .from("order_items")
                    .select("id")
                    .in("order_id", orderIds)
                    .eq("product_id", rule.gift_product_ref_id || rule.gift_product_id)
                    .eq("is_gift", true)
                    .limit(1)
                if (existing && existing.length > 0) continue
            }
        }

        // Check gift product/variant stock
        if (rule.gift_product_ref_id) {
            if (!rule.gift_product_ref || rule.gift_product_ref.stock < rule.gift_quantity) continue
        } else {
            const giftVariant = rule.gift_variant
            if (giftVariant && giftVariant.stock < rule.gift_quantity) continue
            if (!giftVariant) {
                const { data: defaultVariant } = await supabase
                    .from('product_variants')
                    .select('stock')
                    .eq('product_id', rule.gift_product_id)
                    .eq('is_default', true)
                    .maybeSingle()
                if (!defaultVariant || defaultVariant.stock < rule.gift_quantity) continue
            }
        }

        // Evaluate trigger condition
        let qualifies = false

        if (rule.trigger_type === "cart_total") {
            const subtotal = cartItems
                .filter(item => !item.is_gift && !item.is_bxgy_free)
                .reduce((sum, item) => sum + item.price * item.quantity, 0)
            qualifies = subtotal >= rule.trigger_threshold
            if (qualifies && rule.min_cart_amount && rule.min_cart_amount > 0 && subtotal < rule.min_cart_amount) qualifies = false
        } else if (rule.trigger_type === "specific_products") {
            const qualifyingProductIds = new Set(rule.qualifying_products?.map(p => p.product_id) || [])
            const matching = cartItems.filter(item => !item.is_gift && !item.is_bxgy_free && qualifyingProductIds.has(item.productId))
            const matchingQty = matching.reduce((sum, item) => sum + item.quantity, 0)
            qualifies = matchingQty >= rule.gift_quantity
            if (qualifies && rule.min_cart_amount && rule.min_cart_amount > 0) {
                const sub = matching.reduce((sum, item) => sum + item.price * item.quantity, 0)
                if (sub < rule.min_cart_amount) qualifies = false
            }
        } else if (rule.trigger_type === "specific_categories") {
            const qualifyingCatIds = new Set(rule.qualifying_categories?.map(c => c.category_id) || [])
            const cartProductIds = [...new Set(cartItems.filter(i => !i.is_gift && !i.is_bxgy_free).map(i => i.productId))]
            const { data: prodCats } = await supabase
                .from("product_categories")
                .select("product_id, category_id")
                .in("product_id", cartProductIds)
            const catMap = new Map<string, Set<string>>()
            for (const row of (prodCats || [])) {
                const s = catMap.get(row.product_id) || new Set()
                s.add(row.category_id)
                catMap.set(row.product_id, s)
            }
            for (const item of cartItems) {
                if (item.categoryId) {
                    const s = catMap.get(item.productId) || new Set()
                    s.add(item.categoryId)
                    catMap.set(item.productId, s)
                }
            }
            const matching = cartItems.filter(item => {
                if (item.is_gift || item.is_bxgy_free) return false
                const itemCats = catMap.get(item.productId)
                return itemCats && [...itemCats].some(cid => qualifyingCatIds.has(cid))
            })
            const matchingQty = matching.reduce((sum, item) => sum + item.quantity, 0)
            qualifies = matchingQty >= rule.gift_quantity
            if (qualifies && rule.min_cart_amount && rule.min_cart_amount > 0) {
                const sub = matching.reduce((sum, item) => sum + item.price * item.quantity, 0)
                if (sub < rule.min_cart_amount) qualifies = false
            }
        } else if (rule.trigger_type === "specific_brands") {
            const cartProductIds = [...new Set(cartItems
                .filter(item => !item.is_gift && !item.is_bxgy_free)
                .map(item => item.productId)
            )]
            if (cartProductIds.length > 0) {
                const { data: products } = await supabase
                    .from("products")
                    .select("id, brand")
                    .in("id", cartProductIds)
                const qualifyingBrands = new Set(rule.qualifying_brands?.map(b => b.brand) || [])
                const matching = cartItems.filter(item => {
                    if (item.is_gift || item.is_bxgy_free) return false
                    const product = products?.find(p => p.id === item.productId)
                    return product && qualifyingBrands.has(product.brand)
                })
                const matchingQty = matching.reduce((sum, item) => sum + item.quantity, 0)
                qualifies = matchingQty >= rule.gift_quantity
                if (qualifies && rule.min_cart_amount && rule.min_cart_amount > 0) {
                    const sub = matching.reduce((sum, item) => sum + item.price * item.quantity, 0)
                    if (sub < rule.min_cart_amount) qualifies = false
                }
            }
        }

        if (!qualifies) continue

        // Check if gift is already in cart
        const alreadyInCart = cartItems.some(
            item => item.is_gift && item.productId === (rule.gift_product_ref_id || rule.gift_product_id)
        )
        if (alreadyInCart) continue

        const giftRefId = rule.gift_product_ref_id || rule.gift_product_id
        const giftName = rule.gift_product_ref?.name || rule.gift_product?.name || "Free Gift"
        const giftImage = rule.gift_product_ref?.images?.[0] || rule.gift_variant?.image_url || rule.gift_product?.thumbnail_url || null
        const giftPrice = rule.gift_product_ref?.price || rule.gift_variant?.price || rule.gift_product?.base_price || 0
        gifts.push({
            rule_id: rule.id,
            name: rule.name,
            product_id: giftRefId,
            variant_id: rule.gift_variant_id,
            quantity: rule.gift_quantity,
            product_name: giftName,
            product_image: giftImage,
            product_price: giftPrice,
        })
    }

    return gifts
}

// ============================================================
// BXGY: Fetch all active rules
// ============================================================

export async function getActiveBXGYRules(): Promise<BXGYRule[]> {
    const supabase = await createClient()
    const now = new Date().toISOString()

    const { data: rules, error } = await supabase
        .from("buy_x_get_y")
        .select(`
            *,
            get_product:products!buy_x_get_y_get_product_id_fkey(name, thumbnail_url, base_price),
            get_variant:product_variants!buy_x_get_y_get_variant_id_fkey(title, price, stock)
        `)
        .eq("is_active", true)
        .lte("starts_at", now)
        .or(`expires_at.is.null,expires_at.gt.${now}`)

    if (error || !rules) return []

    const ids = rules.map(r => r.id)
    const [[buyProducts, buyCategories, buyBrands, getProducts]] = await Promise.all([
        Promise.all([
            ids.length ? supabase.from('bxgy_buy_products').select('bxgy_id, product_id').in('bxgy_id', ids).then(r => r.data ?? []) : [],
            ids.length ? supabase.from('bxgy_buy_categories').select('bxgy_id, category_id').in('bxgy_id', ids).then(r => r.data ?? []) : [],
            ids.length ? supabase.from('bxgy_buy_brands').select('bxgy_id, brand').in('bxgy_id', ids).then(r => r.data ?? []) : [],
            ids.length ? supabase.from('bxgy_get_products').select('bxgy_id, product_id').in('bxgy_id', ids).then(r => r.data ?? []) : [],
        ])
    ])

    const buyProductMap = new Map<string, { product_id: string }[]>()
    const buyCategoryMap = new Map<string, { category_id: string }[]>()
    const buyBrandMap = new Map<string, { brand: string }[]>()
    const getProductMap = new Map<string, { product_id: string }[]>()
    for (const r of buyProducts) {
        if (!buyProductMap.has(r.bxgy_id)) buyProductMap.set(r.bxgy_id, [])
        buyProductMap.get(r.bxgy_id)!.push({ product_id: r.product_id })
    }
    for (const r of buyCategories) {
        if (!buyCategoryMap.has(r.bxgy_id)) buyCategoryMap.set(r.bxgy_id, [])
        buyCategoryMap.get(r.bxgy_id)!.push({ category_id: r.category_id })
    }
    for (const r of buyBrands) {
        if (!buyBrandMap.has(r.bxgy_id)) buyBrandMap.set(r.bxgy_id, [])
        buyBrandMap.get(r.bxgy_id)!.push({ brand: r.brand })
    }
    for (const r of getProducts) {
        if (!getProductMap.has(r.bxgy_id)) getProductMap.set(r.bxgy_id, [])
        getProductMap.get(r.bxgy_id)!.push({ product_id: r.product_id })
    }

    return rules.map(r => ({
        ...r,
        buy_products: buyProductMap.get(r.id) || [],
        buy_categories: buyCategoryMap.get(r.id) || [],
        buy_brands: buyBrandMap.get(r.id) || [],
        get_products: getProductMap.get(r.id) || [],
    })) as BXGYRule[]
}

// ============================================================
// BXGY: Evaluate discounts for cart items
// ============================================================

export async function evaluateBXGY(
    cartItems: CartItem[],
    userId?: string
): Promise<{ discounts: EvaluatedBXGYDiscount[]; freeItems: EvaluatedGift[] }> {
    const rules = await getActiveBXGYRules()
    const supabase = await createClient()
    const discounts: EvaluatedBXGYDiscount[] = []
    const freeItems: EvaluatedGift[] = []

    for (const rule of rules) {
        // Check usage limit
        if (rule.usage_limit && rule.used_count >= rule.usage_limit) continue

        // Check once_per_user
        if (rule.once_per_user && userId) {
            const { data: redemption } = await supabase
                .from("promo_redemptions")
                .select("id")
                .eq("promo_id", rule.id)
                .eq("user_id", userId)
                .limit(1)
            if (redemption && redemption.length > 0) continue
        }

        // Find qualifying "buy" items in cart
        let qualifyingItems: CartItem[] = []

        if (rule.buy_type === "specific_products") {
            const qualifyingIds = new Set(rule.buy_products?.map(p => p.product_id) || [])
            qualifyingItems = cartItems.filter(
                item => !item.is_gift && !item.is_bxgy_free && qualifyingIds.has(item.productId)
            )
        } else if (rule.buy_type === "specific_categories") {
            const qualifyingCats = new Set(rule.buy_categories?.map(c => c.category_id) || [])
            const cartProductIds = [...new Set(cartItems.filter(i => !i.is_gift && !i.is_bxgy_free).map(i => i.productId))]
            const { data: prodCats } = await supabase
                .from("product_categories")
                .select("product_id, category_id")
                .in("product_id", cartProductIds)
            const catMap = new Map<string, Set<string>>()
            for (const row of (prodCats || [])) {
                const s = catMap.get(row.product_id) || new Set()
                s.add(row.category_id)
                catMap.set(row.product_id, s)
            }
            for (const item of cartItems) {
                if (item.categoryId) {
                    const s = catMap.get(item.productId) || new Set()
                    s.add(item.categoryId)
                    catMap.set(item.productId, s)
                }
            }
            qualifyingItems = cartItems.filter(item => {
                if (item.is_gift || item.is_bxgy_free) return false
                const itemCats = catMap.get(item.productId)
                return itemCats && [...itemCats].some(cid => qualifyingCats.has(cid))
            })
        } else if (rule.buy_type === "specific_brands") {
            const cartProductIds = [...new Set(cartItems
                .filter(item => !item.is_gift && !item.is_bxgy_free)
                .map(item => item.productId)
            )]
            if (cartProductIds.length > 0) {
                const { data: products } = await supabase
                    .from("products")
                    .select("id, brand")
                    .in("id", cartProductIds)

                const qualifyingBrands = new Set(rule.buy_brands?.map(b => b.brand) || [])
                qualifyingItems = cartItems.filter(item => {
                    if (item.is_gift || item.is_bxgy_free) return false
                    const product = products?.find(p => p.id === item.productId)
                    return product && qualifyingBrands.has(product.brand)
                })
            }
        }

        // Count total qualifying units
        const totalQualifying = qualifyingItems.reduce((sum, item) => sum + item.quantity, 0)
        // BOGO: "Buy X Get 1 Free" means you need X+1 items, 1 is free
        const minForFree = rule.buy_quantity + 1
        if (totalQualifying < minForFree) continue

        // How many times can this BXGY apply?
        const calculatedApplicable = Math.floor(totalQualifying / minForFree)
        const timesApplicable = rule.max_per_order ? Math.min(calculatedApplicable, rule.max_per_order) : calculatedApplicable

        if (rule.get_type === "cheapest_free") {
            // Find cheapest qualifying item, apply discount
            const sorted = [...qualifyingItems].sort((a, b) => a.price - b.price)
            let remaining = timesApplicable

            for (const item of sorted) {
                if (remaining <= 0) break

                const freeUnits = Math.min(item.quantity, remaining)
                const discountAmount = rule.get_discount_type === "free"
                    ? item.price * freeUnits
                    : rule.get_discount_type === "percentage"
                        ? Math.round(item.price * (rule.get_discount_value / 100)) * freeUnits
                        : Math.min(rule.get_discount_value, item.price) * freeUnits

                if (discountAmount > 0) {
                    discounts.push({
                        rule_id: rule.id,
                        rule_name: rule.name,
                        variant_id: item.variantId,
                        product_id: item.productId,
                        product_name: item.name,
                        discount_amount: discountAmount,
                        original_price: item.price,
                        free_quantity: freeUnits,
                    })
                }
                remaining -= freeUnits
            }
        } else if (rule.get_type === "specific_product" && rule.get_product_id) {
            // Add specific product as free item
            const alreadyInCart = cartItems.some(
                item => item.is_bxgy_free && item.productId === rule.get_product_id
            )
            if (alreadyInCart) continue

            // Check stock
            const getVariant = rule.get_variant
            if (getVariant && getVariant.stock < timesApplicable) continue

            freeItems.push({
                rule_id: rule.id,
                name: rule.name,
                product_id: rule.get_product_id,
                variant_id: rule.get_variant_id,
                quantity: timesApplicable,
                product_name: rule.get_product?.name || "Free Item",
                product_image: rule.get_product?.thumbnail_url || null,
                product_price: getVariant?.price || rule.get_product?.base_price || 0,
            })
        }
    }

    return { discounts, freeItems }
}

// ============================================================
// Get BXGY offers for a specific product (for product page badges)
// ============================================================

export async function getBXGYOffersForProduct(productId: string): Promise<BXGYRule[]> {
    const rules = await getActiveBXGYRules()
    return rules.filter(rule => {
        if (rule.buy_type === "specific_products") {
            return rule.buy_products?.some(p => p.product_id === productId)
        }
        return false
    })
}

// ============================================================
// Get free gift offers applicable to a product
// ============================================================

export async function getFreeGiftsForProduct(productId: string): Promise<FreeGiftRule[]> {
    const rules = await getActiveFreeGiftRules()
    return rules.filter(rule => {
        if (rule.trigger_type === "specific_products") {
            return rule.qualifying_products?.some(p => p.product_id === productId)
        }
        return false
    })
}

// ============================================================
// ADMIN CRUD: FREE GIFTS
// ============================================================

export async function createFreeGift(formData: {
    name: string
    description?: string
    gift_product_id: string
    gift_variant_id?: string
    gift_product_ref_id?: string
    gift_quantity: number
    trigger_type: string
    trigger_threshold?: number
    min_cart_amount?: number | null
    apply_to: string
    qualifying_product_ids?: string[]
    qualifying_category_ids?: string[]
    qualifying_brands?: string[]
    usage_limit?: number
    once_per_user?: boolean
    max_per_order?: number
    starts_at: string
    expires_at?: string
    is_active?: boolean
}) {
    const { supabase } = await requireAdmin()
    const { qualifying_product_ids, qualifying_category_ids, qualifying_brands, ...ruleData } = formData

    const { data: rule, error } = await supabase
        .from('free_gifts')
        .insert({
            ...ruleData,
            gift_product_id: ruleData.gift_product_id || null,
            description: ruleData.description || null,
            gift_variant_id: ruleData.gift_variant_id || null,
            gift_product_ref_id: ruleData.gift_product_ref_id || null,
            trigger_threshold: ruleData.trigger_threshold || 0,
            min_cart_amount: ruleData.min_cart_amount || null,
            usage_limit: ruleData.usage_limit || null,
            once_per_user: ruleData.once_per_user || false,
            max_per_order: ruleData.max_per_order || 1,
            expires_at: ruleData.expires_at || null,
            is_active: ruleData.is_active ?? true,
        })
        .select()
        .single()

    if (error) throw error

    // Insert junction tables
    if (qualifying_product_ids && qualifying_product_ids.length > 0) {
        const { error: jErr } = await supabase.from('free_gift_products').insert(
            qualifying_product_ids.map(id => ({ free_gift_id: rule.id, product_id: id }))
        )
        if (jErr) {
            console.error('free_gift_products insert error:', jErr)
            throw new Error("Failed to link products")
        }
    }
    if (qualifying_category_ids && qualifying_category_ids.length > 0) {
        const { error: jErr } = await supabase.from('free_gift_categories').insert(
            qualifying_category_ids.map(id => ({ free_gift_id: rule.id, category_id: id }))
        )
        if (jErr) {
            console.error('free_gift_categories insert error:', jErr)
            throw new Error("Failed to link categories")
        }
    }
    if (qualifying_brands && qualifying_brands.length > 0) {
        const { error: jErr } = await supabase.from('free_gift_brands').insert(
            qualifying_brands.map(brand => ({ free_gift_id: rule.id, brand }))
        )
        if (jErr) throw new Error(`Failed to link brands: ${jErr.message}`)
    }

    return rule
}

export async function updateFreeGift(id: string, formData: {
    name: string
    description?: string
    gift_product_id: string
    gift_variant_id?: string
    gift_product_ref_id?: string
    gift_quantity: number
    trigger_type: string
    trigger_threshold?: number
    min_cart_amount?: number | null
    apply_to: string
    qualifying_product_ids?: string[]
    qualifying_category_ids?: string[]
    qualifying_brands?: string[]
    usage_limit?: number
    once_per_user?: boolean
    max_per_order?: number
    starts_at: string
    expires_at?: string
    is_active?: boolean
}) {
    const { supabase } = await requireAdmin()
    const { qualifying_product_ids, qualifying_category_ids, qualifying_brands, ...ruleData } = formData

    const { error } = await supabase
        .from('free_gifts')
        .update({
            ...ruleData,
            gift_product_id: ruleData.gift_product_id || null,
            description: ruleData.description || null,
            gift_variant_id: ruleData.gift_variant_id || null,
            gift_product_ref_id: ruleData.gift_product_ref_id || null,
            trigger_threshold: ruleData.trigger_threshold || 0,
            min_cart_amount: ruleData.min_cart_amount || null,
            usage_limit: ruleData.usage_limit || null,
            once_per_user: ruleData.once_per_user || false,
            max_per_order: ruleData.max_per_order || 1,
            expires_at: ruleData.expires_at || null,
            is_active: ruleData.is_active ?? true,
        })
        .eq('id', id)

    if (error) throw error

    // Replace junction tables
    if (qualifying_product_ids !== undefined) {
        await supabase.from('free_gift_products').delete().eq('free_gift_id', id)
        if (qualifying_product_ids.length > 0) {
            const { error: jErr } = await supabase.from('free_gift_products').insert(
                qualifying_product_ids.map(pid => ({ free_gift_id: id, product_id: pid }))
            )
            if (jErr) {
                console.error('free_gift_products update insert error:', jErr)
                throw new Error("Failed to link products")
            }
        }
    }
    if (qualifying_category_ids !== undefined) {
        await supabase.from('free_gift_categories').delete().eq('free_gift_id', id)
        if (qualifying_category_ids.length > 0) {
            const { error: jErr } = await supabase.from('free_gift_categories').insert(
                qualifying_category_ids.map(cid => ({ free_gift_id: id, category_id: cid }))
            )
            if (jErr) {
                console.error('free_gift_categories update insert error:', jErr)
                throw new Error("Failed to link categories")
            }
        }
    }
    if (qualifying_brands !== undefined) {
        await supabase.from('free_gift_brands').delete().eq('free_gift_id', id)
        if (qualifying_brands.length > 0) {
            const { error: jErr } = await supabase.from('free_gift_brands').insert(
                qualifying_brands.map(brand => ({ free_gift_id: id, brand }))
            )
            if (jErr) {
                console.error('free_gift_brands update insert error:', jErr)
                throw new Error("Failed to link brands")
            }
        }
    }
}

export async function deleteFreeGift(id: string) {
    const { supabase } = await requireAdmin()
    const { error } = await supabase.from('free_gifts').delete().eq('id', id)
    if (error) throw error
}

export async function toggleFreeGiftStatus(id: string, currentStatus: boolean) {
    const { supabase } = await requireAdmin()
    const { error } = await supabase
        .from('free_gifts')
        .update({ is_active: !currentStatus })
        .eq('id', id)
    if (error) throw error
}

// ============================================================
// ADMIN CRUD: BUY X GET Y
// ============================================================

export async function createBXGY(formData: {
    name: string
    description?: string
    buy_type: string
    buy_quantity: number
    get_type: string
    get_product_id?: string
    get_variant_id?: string
    get_discount_type: string
    get_discount_value: number
    apply_to: string
    buy_product_ids?: string[]
    buy_category_ids?: string[]
    buy_brands?: string[]
    get_product_ids?: string[]
    usage_limit?: number
    once_per_user?: boolean
    max_per_order?: number
    starts_at: string
    expires_at?: string
    is_active?: boolean
}) {
    const { supabase } = await requireAdmin()
    const { buy_product_ids, buy_category_ids, buy_brands, get_product_ids, ...ruleData } = formData

    const { data: rule, error } = await supabase
        .from('buy_x_get_y')
        .insert({
            ...ruleData,
            description: ruleData.description || null,
            get_product_id: ruleData.get_product_id || null,
            get_variant_id: ruleData.get_variant_id || null,
            usage_limit: ruleData.usage_limit || null,
            once_per_user: ruleData.once_per_user || false,
            max_per_order: ruleData.max_per_order || null,
            expires_at: ruleData.expires_at || null,
            is_active: ruleData.is_active ?? true,
        })
        .select()
        .single()

    if (error) throw error

    // Insert junction tables
    if (buy_product_ids && buy_product_ids.length > 0) {
        await supabase.from('bxgy_buy_products').insert(
            buy_product_ids.map(id => ({ bxgy_id: rule.id, product_id: id }))
        )
    }
    if (buy_category_ids && buy_category_ids.length > 0) {
        await supabase.from('bxgy_buy_categories').insert(
            buy_category_ids.map(id => ({ bxgy_id: rule.id, category_id: id }))
        )
    }
    if (buy_brands && buy_brands.length > 0) {
        await supabase.from('bxgy_buy_brands').insert(
            buy_brands.map(brand => ({ bxgy_id: rule.id, brand }))
        )
    }
    if (get_product_ids && get_product_ids.length > 0) {
        await supabase.from('bxgy_get_products').insert(
            get_product_ids.map(id => ({ bxgy_id: rule.id, product_id: id }))
        )
    }

    return rule
}

export async function updateBXGY(id: string, formData: {
    name: string
    description?: string
    buy_type: string
    buy_quantity: number
    get_type: string
    get_product_id?: string
    get_variant_id?: string
    get_discount_type: string
    get_discount_value: number
    apply_to: string
    buy_product_ids?: string[]
    buy_category_ids?: string[]
    buy_brands?: string[]
    get_product_ids?: string[]
    usage_limit?: number
    once_per_user?: boolean
    max_per_order?: number
    starts_at: string
    expires_at?: string
    is_active?: boolean
}) {
    const { supabase } = await requireAdmin()
    const { buy_product_ids, buy_category_ids, buy_brands, get_product_ids, ...ruleData } = formData

    const { error } = await supabase
        .from('buy_x_get_y')
        .update({
            ...ruleData,
            description: ruleData.description || null,
            get_product_id: ruleData.get_product_id || null,
            get_variant_id: ruleData.get_variant_id || null,
            usage_limit: ruleData.usage_limit || null,
            once_per_user: ruleData.once_per_user || false,
            max_per_order: ruleData.max_per_order || null,
            expires_at: ruleData.expires_at || null,
            is_active: ruleData.is_active ?? true,
        })
        .eq('id', id)

    if (error) throw error

    // Replace junction tables
    if (buy_product_ids !== undefined) {
        await supabase.from('bxgy_buy_products').delete().eq('bxgy_id', id)
        if (buy_product_ids.length > 0) {
            await supabase.from('bxgy_buy_products').insert(
                buy_product_ids.map(pid => ({ bxgy_id: id, product_id: pid }))
            )
        }
    }
    if (buy_category_ids !== undefined) {
        await supabase.from('bxgy_buy_categories').delete().eq('bxgy_id', id)
        if (buy_category_ids.length > 0) {
            await supabase.from('bxgy_buy_categories').insert(
                buy_category_ids.map(cid => ({ bxgy_id: id, category_id: cid }))
            )
        }
    }
    if (buy_brands !== undefined) {
        await supabase.from('bxgy_buy_brands').delete().eq('bxgy_id', id)
        if (buy_brands.length > 0) {
            await supabase.from('bxgy_buy_brands').insert(
                buy_brands.map(brand => ({ bxgy_id: id, brand }))
            )
        }
    }
    if (get_product_ids !== undefined) {
        await supabase.from('bxgy_get_products').delete().eq('bxgy_id', id)
        if (get_product_ids.length > 0) {
            await supabase.from('bxgy_get_products').insert(
                get_product_ids.map(pid => ({ bxgy_id: id, product_id: pid }))
            )
        }
    }
}

export async function deleteBXGY(id: string) {
    const { supabase } = await requireAdmin()
    const { error } = await supabase.from('buy_x_get_y').delete().eq('id', id)
    if (error) throw error
}

export async function toggleBXGYStatus(id: string, currentStatus: boolean) {
    const { supabase } = await requireAdmin()
    const { error } = await supabase
        .from('buy_x_get_y')
        .update({ is_active: !currentStatus })
        .eq('id', id)
    if (error) throw error
}
