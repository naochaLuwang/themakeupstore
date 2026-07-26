"use client"

import { useEffect, useRef, useCallback } from "react"
import { useCart, CartItem } from "@/components/store/use-cart"
import { createClient } from "@/utils/supabase/client"

interface FreeGiftRule {
    id: string
    name: string
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
    gift_product?: { name: string; thumbnail_url: string | null; base_price: number }
    gift_product_ref?: { name: string; image_url: string | null; price: number; stock: number }
    gift_variant?: { title: string; price: number; stock: number; image_url: string | null }
    qualifying_products?: { product_id: string }[]
    qualifying_categories?: { category_id: string }[]
    qualifying_brands?: { brand: string }[]
}

interface BXGYRule {
    id: string
    name: string
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
    buy_products?: { product_id: string }[]
    buy_categories?: { category_id: string }[]
    buy_brands?: { brand: string }[]
    get_product?: { name: string; thumbnail_url: string | null; base_price: number }
    get_variant?: { title: string; price: number; stock: number }
}

function isRuleActive(starts_at: string, expires_at: string | null): boolean {
    const now = new Date()
    if (new Date(starts_at) > now) return false
    if (expires_at && new Date(expires_at) < now) return false
    return true
}

export function usePromotions() {
    const items = useCart(s => s.items)
    const addItem = useCart(s => s.addItem)
    const removeGift = useCart(s => s.removeGift)
    const setBXGYDiscounts = useCart(s => s.setBXGYDiscounts)
    const setGiftProgress = useCart(s => s.setGiftProgress)
    const setBXGYProgress = useCart(s => s.setBXGYProgress)
    const supabase = createClient()
    const prevItemsRef = useRef<string>("")
    const evalPendingRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const claimedGiftProductIdsRef = useRef<Set<string> | null>(null)

    const fetchAndEvaluate = useCallback(async () => {
        // Get non-gift items for evaluation
        const realItems = items.filter(i => !i.is_gift && !i.is_bxgy_free)
        if (realItems.length === 0) {
            const giftItems = items.filter(i => i.is_gift)
            giftItems.forEach(g => removeGift(g.variantId))
            setBXGYDiscounts([])
            setBXGYProgress([])
            return
        }

        try {
            // Fetch active free gift rules
            const now = new Date().toISOString()
            const { data: giftRules, error: giftErr } = await supabase
                .from("free_gifts")
                .select(`
                    *,
                    gift_product:products!free_gifts_gift_product_id_fkey(name, thumbnail_url, base_price),
                    gift_variant:product_variants!free_gifts_gift_variant_id_fkey(title, price, stock, image_url),
                    gift_product_ref:gift_products!free_gifts_gift_product_ref_id_fkey(name, image_url, price, stock),
                    qualifying_products:free_gift_products(product_id),
                    qualifying_categories:free_gift_categories(category_id),
                    qualifying_brands:free_gift_brands(brand)
                `)
                .eq("is_active", true)
                .lte("starts_at", now)
                .or(`expires_at.is.null,expires_at.gt.${now}`)

            if (giftErr) console.error('Free gift fetch error:', giftErr)

            // Fetch active BXGY rules
            const { data: bxgyRules, error: bxgyErr } = await supabase
                .from("buy_x_get_y")
                .select(`
                    *,
                    buy_products:bxgy_buy_products(product_id),
                    buy_categories:bxgy_buy_categories(category_id),
                    buy_brands:bxgy_buy_brands(brand),
                    get_product:products!buy_x_get_y_get_product_id_fkey(name, thumbnail_url, base_price),
                    get_variant:product_variants!buy_x_get_y_get_variant_id_fkey(title, price, stock)
                `)
                .eq("is_active", true)
                .lte("starts_at", now)
                .or(`expires_at.is.null,expires_at.gt.${now}`)

            if (bxgyErr) console.error('BXGY fetch error:', bxgyErr)

            // --- EVALUATE FREE GIFTS ---
            // Build product → category map from junction table (direct category_id is often NULL)
            const cartProductIds = [...new Set(realItems.map(i => i.productId))]
            const { data: productCats } = await supabase
                .from("product_categories")
                .select("product_id, category_id")
                .in("product_id", cartProductIds)
            const productCategoryMap = new Map<string, Set<string>>()
            for (const row of (productCats || [])) {
                const set = productCategoryMap.get(row.product_id) || new Set()
                set.add(row.category_id)
                productCategoryMap.set(row.product_id, set)
            }
            // Also include direct category_id for each product
            for (const item of realItems) {
                if (item.categoryId) {
                    const set = productCategoryMap.get(item.productId) || new Set()
                    set.add(item.categoryId)
                    productCategoryMap.set(item.productId, set)
                }
            }

            const activeGiftRules: FreeGiftRule[] = (giftRules || []).filter((r: any) => isRuleActive(r.starts_at, r.expires_at))
            const giftsToAdd: CartItem[] = []
            const qualifyingGiftRuleIds = new Set<string>()

            for (const rule of activeGiftRules) {
                let qualifies = false
                let qualifyingSubtotal = 0

                if (rule.trigger_type === "cart_total") {
                    const subtotal = realItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
                    qualifyingSubtotal = subtotal
                    qualifies = subtotal >= rule.trigger_threshold
                } else if (rule.trigger_type === "specific_products") {
                    const ids = new Set(rule.qualifying_products?.map(p => p.product_id) || [])
                    const qualifying = realItems.filter(i => ids.has(i.productId))
                    qualifyingSubtotal = qualifying.reduce((s, i) => s + i.price * i.quantity, 0)
                    const qty = qualifying.reduce((s, i) => s + i.quantity, 0)
                    qualifies = qty >= rule.trigger_threshold
                } else if (rule.trigger_type === "specific_categories") {
                    const ids = new Set(rule.qualifying_categories?.map(c => c.category_id) || [])
                    const qualifying = realItems.filter(i => {
                        const itemCats = productCategoryMap.get(i.productId)
                        return itemCats && [...itemCats].some(cid => ids.has(cid))
                    })
                    qualifyingSubtotal = qualifying.reduce((s, i) => s + i.price * i.quantity, 0)
                    const qty = qualifying.reduce((s, i) => s + i.quantity, 0)
                    qualifies = qty >= rule.trigger_threshold
                } else if (rule.trigger_type === "specific_brands") {
                    const productIds = [...new Set(realItems.map(i => i.productId))]
                    const { data: prods } = await supabase.from("products").select("id, brand").in("id", productIds)
                    const brands = new Set(rule.qualifying_brands?.map(b => b.brand) || [])
                    const qualifying = realItems.filter(i => {
                        const p = prods?.find(pr => pr.id === i.productId)
                        return p && brands.has(p.brand)
                    })
                    qualifyingSubtotal = qualifying.reduce((s, i) => s + i.price * i.quantity, 0)
                    const qty = qualifying.reduce((s, i) => s + i.quantity, 0)
                    qualifies = qty >= rule.trigger_threshold
                }

                if (!qualifies) continue

                // Check usage limit
                if (rule.usage_limit && rule.used_count >= rule.usage_limit) continue

                // Check once_per_user (query user orders — cached per session)
                if (rule.once_per_user) {
                    if (claimedGiftProductIdsRef.current === null) {
                        const { data: { user } } = await supabase.auth.getUser()
                        if (user) {
                            const { data: userOrders } = await supabase.from("orders").select("id").eq("user_id", user.id)
                            const orderIds = (userOrders || []).map(o => o.id)
                            const claimed = new Set<string>()
                            if (orderIds.length > 0) {
                                const { data: existingGifts } = await supabase
                                    .from("order_items")
                                    .select("product_id")
                                    .in("order_id", orderIds)
                                    .eq("is_gift", true)
                                for (const g of (existingGifts || [])) claimed.add(g.product_id)
                            }
                            claimedGiftProductIdsRef.current = claimed
                        } else {
                            claimedGiftProductIdsRef.current = new Set()
                        }
                    }
                    // Match on store product ID — ref items store gift_product_id in product_id
                    if (claimedGiftProductIdsRef.current.has(rule.gift_product_id)) continue
                }

                // Also check optional minimum cart amount (uses qualifying items subtotal for targeted triggers, full cart for cart_total)
                if (rule.min_cart_amount && rule.min_cart_amount > 0) {
                    if (qualifyingSubtotal < rule.min_cart_amount) continue
                }

                qualifyingGiftRuleIds.add(rule.id)

                // Use ref product id when gift_product_ref_id is set
                const giftId = rule.gift_product_ref_id || rule.gift_product_id

                // Check if already in cart
                const alreadyInCart = items.some(i => i.is_gift && i.productId === giftId)
                if (alreadyInCart) continue

                // Check stock
                if (rule.gift_product_ref_id) {
                    if (!rule.gift_product_ref || rule.gift_product_ref.stock < rule.gift_quantity) continue
                } else if (rule.gift_variant && rule.gift_variant.stock < rule.gift_quantity) continue

                const giftName = rule.gift_product_ref?.name || rule.gift_product?.name || "Free Gift"
                const giftMRP = rule.gift_product_ref?.price || rule.gift_variant?.price || rule.gift_product?.base_price || 0
                const giftImage = rule.gift_product_ref?.image_url || rule.gift_variant?.image_url || rule.gift_product?.thumbnail_url || ""

                giftsToAdd.push({
                    id: rule.gift_variant_id || giftId,
                    productId: giftId,
                    categoryId: "",
                    variantId: rule.gift_variant_id || giftId,
                    name: giftName,
                    variantTitle: rule.gift_variant?.title || (rule.gift_product_ref_id ? "Gift" : "Gift"),
                    price: 0,
                    mrp: giftMRP,
                    originalPrice: giftMRP,
                    image: giftImage,
                    quantity: rule.gift_quantity,
                    stock: 999,
                    is_gift: true,
                    gift_rule_id: rule.id,
                })
            }

            // Add gifts to cart
            for (const gift of giftsToAdd) {
                addItem(gift)
            }

            // Remove gifts whose rules no longer qualify (re-checks all conditions)
            const currentGifts = items.filter(i => i.is_gift)
            for (const gift of currentGifts) {
                if (!gift.gift_rule_id || !qualifyingGiftRuleIds.has(gift.gift_rule_id)) {
                    removeGift(gift.variantId)
                }
            }

            // --- COMPUTE GIFT PROGRESS FOR CART ---
            const cartTotalSubtotal = realItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
            // Fetch category names for category-based rules
            const allCatIds = [...new Set(activeGiftRules
                .filter(r => r.trigger_type === "specific_categories")
                .flatMap(r => r.qualifying_categories?.map(c => c.category_id) || [])
            )]
            const { data: catNames } = allCatIds.length > 0
                ? await supabase.from("categories").select("id, name").in("id", allCatIds)
                : { data: [] }
            const catNameMap = new Map((catNames || []).map((c: any) => [c.id, c.name]))

            const newGiftProgress: import("@/components/store/use-cart").GiftProgress[] = []
            for (const rule of activeGiftRules) {
                if (rule.trigger_type === "cart_total") {
                    const qualifies = qualifyingGiftRuleIds.has(rule.id)
                    const neededTotal = Math.max(
                        0,
                        rule.trigger_threshold - cartTotalSubtotal,
                        rule.min_cart_amount ? rule.min_cart_amount - cartTotalSubtotal : 0
                    )
                    newGiftProgress.push({
                        ruleId: rule.id,
                        ruleName: rule.name,
                        giftProductName: rule.gift_product_ref?.name || rule.gift_product?.name || "Free Gift",
                        giftProductImage: rule.gift_product_ref?.image_url || rule.gift_product?.thumbnail_url || "",
                        qualifies,
                        qualifyingVariantIds: realItems.map(i => i.variantId),
                        qualifyingLabel: "your cart",
                        currentQty: 0,
                        neededQty: 0,
                        currentSubtotal: cartTotalSubtotal,
                        neededAmount: neededTotal,
                        triggerType: rule.trigger_type,
                    })
                } else if (rule.trigger_type === "specific_products") {
                    const ids = new Set(rule.qualifying_products?.map(p => p.product_id) || [])
                    const qualifying = realItems.filter(i => ids.has(i.productId))
                    const qty = qualifying.reduce((s, i) => s + i.quantity, 0)
                    const qualifyingSubtotal = qualifying.reduce((s, i) => s + i.price * i.quantity, 0)
                    const qualifies = qualifyingGiftRuleIds.has(rule.id)
                    const neededAmount = rule.min_cart_amount ? Math.max(0, rule.min_cart_amount - qualifyingSubtotal) : 0
                    newGiftProgress.push({
                        ruleId: rule.id,
                        ruleName: rule.name,
                        giftProductName: rule.gift_product_ref?.name || rule.gift_product?.name || "Free Gift",
                        giftProductImage: rule.gift_product_ref?.image_url || rule.gift_product?.thumbnail_url || "",
                        qualifies,
                        qualifyingVariantIds: qualifying.map(i => i.variantId),
                        qualifyingLabel: [...new Set(qualifying.map(i => i.name))].join(", "),
                        currentQty: qty,
                        neededQty: Math.max(0, rule.trigger_threshold - qty),
                        currentSubtotal: qualifyingSubtotal,
                        neededAmount,
                        triggerType: rule.trigger_type,
                    })
                } else if (rule.trigger_type === "specific_categories") {
                    const ids = new Set(rule.qualifying_categories?.map(c => c.category_id) || [])
                    const qualifying = realItems.filter(i => {
                        const itemCats = productCategoryMap.get(i.productId)
                        return itemCats && [...itemCats].some(cid => ids.has(cid))
                    })
                    const qty = qualifying.reduce((s, i) => s + i.quantity, 0)
                    const qualifyingSubtotal = qualifying.reduce((s, i) => s + i.price * i.quantity, 0)
                    const qualifies = qualifyingGiftRuleIds.has(rule.id)
                    const neededAmount = rule.min_cart_amount ? Math.max(0, rule.min_cart_amount - qualifyingSubtotal) : 0
                    const catLabel = [...ids].map(id => catNameMap.get(id)).filter(Boolean).join(", ")
                    newGiftProgress.push({
                        ruleId: rule.id,
                        ruleName: rule.name,
                        giftProductName: rule.gift_product_ref?.name || rule.gift_product?.name || "Free Gift",
                        giftProductImage: rule.gift_product_ref?.image_url || rule.gift_product?.thumbnail_url || "",
                        qualifies,
                        qualifyingVariantIds: qualifying.map(i => i.variantId),
                        qualifyingLabel: catLabel,
                        currentQty: qty,
                        neededQty: Math.max(0, rule.trigger_threshold - qty),
                        currentSubtotal: qualifyingSubtotal,
                        neededAmount,
                        triggerType: rule.trigger_type,
                    })
                } else if (rule.trigger_type === "specific_brands") {
                    const productIds = [...new Set(realItems.map(i => i.productId))]
                    const { data: prods } = await supabase.from("products").select("id, brand").in("id", productIds)
                    const brands = new Set(rule.qualifying_brands?.map(b => b.brand) || [])
                    const qualifying = realItems.filter(i => {
                        const p = prods?.find(pr => pr.id === i.productId)
                        return p && brands.has(p.brand)
                    })
                    const qty = qualifying.reduce((s, i) => s + i.quantity, 0)
                    const qualifyingSubtotal = qualifying.reduce((s, i) => s + i.price * i.quantity, 0)
                    const qualifies = qualifyingGiftRuleIds.has(rule.id)
                    const neededAmount = rule.min_cart_amount ? Math.max(0, rule.min_cart_amount - qualifyingSubtotal) : 0
                    newGiftProgress.push({
                        ruleId: rule.id,
                        ruleName: rule.name,
                        giftProductName: rule.gift_product_ref?.name || rule.gift_product?.name || "Free Gift",
                        giftProductImage: rule.gift_product_ref?.image_url || rule.gift_product?.thumbnail_url || "",
                        qualifies,
                        qualifyingVariantIds: qualifying.map(i => i.variantId),
                        qualifyingLabel: [...brands].join(", "),
                        currentQty: qty,
                        neededQty: Math.max(0, rule.trigger_threshold - qty),
                        currentSubtotal: qualifyingSubtotal,
                        neededAmount,
                        triggerType: rule.trigger_type,
                    })
                }
            }
            setGiftProgress(newGiftProgress)

            // --- EVALUATE BXGY ---
            const activeBXGYRules: BXGYRule[] = (bxgyRules || []).filter((r: any) => isRuleActive(r.starts_at, r.expires_at))

            // Batch fetch category names for BXGY progress labels
            const bxgyCatIds = [...new Set(activeBXGYRules
                .filter(r => r.buy_type === "specific_categories")
                .flatMap(r => r.buy_categories?.map(c => c.category_id) || [])
            )]
            const { data: bxgyCatNames } = bxgyCatIds.length > 0
                ? await supabase.from("categories").select("id, name").in("id", bxgyCatIds)
                : { data: [] }
            const bxgyCatNameMap = new Map((bxgyCatNames || []).map((c: any) => [c.id, c.name]))
            const newBXGYDiscounts: { rule_id: string; rule_name: string; variant_id: string; product_id: string; product_name: string; discount_amount: number; original_price: number; free_quantity: number }[] = []
            const newBXGYProgress: import("@/components/store/use-cart").BXGYProgress[] = []

            for (const rule of activeBXGYRules) {
                let qualifyingItems: CartItem[] = []

                if (rule.buy_type === "specific_products") {
                    const ids = new Set(rule.buy_products?.map(p => p.product_id) || [])
                    qualifyingItems = realItems.filter(i => ids.has(i.productId))
                } else if (rule.buy_type === "specific_categories") {
                    const ids = new Set(rule.buy_categories?.map(c => c.category_id) || [])
                    qualifyingItems = realItems.filter(i => {
                        const itemCats = productCategoryMap.get(i.productId)
                        return itemCats && [...itemCats].some(cid => ids.has(cid))
                    })
                } else if (rule.buy_type === "specific_brands") {
                    const productIds = [...new Set(realItems.map(i => i.productId))]
                    const { data: prods } = await supabase.from("products").select("id, brand").in("id", productIds)
                    const brands = new Set(rule.buy_brands?.map(b => b.brand) || [])
                    qualifyingItems = realItems.filter(i => {
                        const p = prods?.find(pr => pr.id === i.productId)
                        return p && brands.has(p.brand)
                    })
                }

                const totalQualifying = qualifyingItems.reduce((sum, i) => sum + i.quantity, 0)

                // Build BXGY progress for cart banners
                const getLabel = rule.get_type === "cheapest_free"
                    ? "Cheapest item FREE"
                    : rule.get_product?.name || "Free item"
                const getImage = rule.get_type === "cheapest_free"
                    ? ""
                    : rule.get_product?.thumbnail_url || ""
                const qualifyingLabel = rule.buy_type === "specific_products"
                    ? ([...new Set(qualifyingItems.map(i => i.name))].join(", ") || "")
                    : rule.buy_type === "specific_categories"
                        ? ([...new Set(rule.buy_categories?.map(c => bxgyCatNameMap.get(c.category_id)).filter(Boolean) || [])].join(", ") || "")
                        : rule.buy_type === "specific_brands"
                            ? (rule.buy_brands?.map(b => b.brand).join(", ") || "")
                            : ""
                const minForProgress = rule.buy_quantity + 1
                newBXGYProgress.push({
                    ruleId: rule.id,
                    ruleName: rule.name,
                    qualifies: totalQualifying >= minForProgress,
                    qualifyingVariantIds: qualifyingItems.map(i => i.variantId),
                    qualifyingLabel,
                    getLabel,
                    getImage,
                    currentQty: totalQualifying,
                    neededQty: Math.max(0, minForProgress - totalQualifying),
                    buyQuantity: rule.buy_quantity,
                    getType: rule.get_type,
                })

                if (totalQualifying < rule.buy_quantity) continue

                // BOGO: "Buy X Get 1 Free" means you need X+1 items, 1 is free
                const minForFree = rule.buy_quantity + 1
                if (totalQualifying < minForFree) continue

                const timesApplicable = rule.max_per_order || 1

                if (rule.get_type === "cheapest_free") {
                    const sorted = [...qualifyingItems].sort((a, b) => a.price - b.price)
                    let remaining = timesApplicable

                    for (const item of sorted) {
                        if (remaining <= 0) break

                        // How many units of this item get discounted?
                        const freeUnits = Math.min(item.quantity, remaining)
                        const discountAmount = rule.get_discount_type === "free"
                            ? item.price * freeUnits
                            : rule.get_discount_type === "percentage"
                                ? Math.round(item.price * (rule.get_discount_value / 100)) * freeUnits
                                : Math.min(rule.get_discount_value, item.price) * freeUnits

                        if (discountAmount > 0) {
                            newBXGYDiscounts.push({
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
                    const alreadyInCart = items.some(i => i.is_bxgy_free && i.productId === rule.get_product_id)
                    if (!alreadyInCart && rule.get_variant && rule.get_variant.stock >= timesApplicable) {
                        addItem({
                            id: rule.get_variant_id || rule.get_product_id,
                            productId: rule.get_product_id,
                            categoryId: "",
                            variantId: rule.get_variant_id || rule.get_product_id,
                            name: rule.get_product?.name || "Free Item",
                            variantTitle: rule.get_variant?.title || "Free",
                            price: 0,
                            mrp: rule.get_variant?.price || rule.get_product?.base_price || 0,
                            originalPrice: rule.get_variant?.price || rule.get_product?.base_price || 0,
                            image: rule.get_product?.thumbnail_url || "",
                            quantity: timesApplicable,
                            stock: rule.get_variant?.stock || 999,
                            is_bxgy_free: true,
                            bxgy_rule_id: rule.id,
                        })
                    }
                }
            }

            setBXGYDiscounts(newBXGYDiscounts)
            setBXGYProgress(newBXGYProgress)

            // Remove BXGY free items whose rules no longer qualify
            const currentBXGYFree = items.filter(i => i.is_bxgy_free)
            for (const item of currentBXGYFree) {
                const ruleStillQualifies = activeBXGYRules.some(r => r.get_product_id === item.productId)
                if (!ruleStillQualifies) {
                    removeGift(item.variantId)
                }
            }

        } catch (err) {
            console.error("Promotion evaluation error:", err)
        }
    }, [items, addItem, removeGift, setBXGYDiscounts, setBXGYProgress, supabase])

    // Debounce evaluation when items change
    useEffect(() => {
        const itemsKey = JSON.stringify(items.map(i => `${i.variantId}:${i.quantity}:${i.is_gift}:${i.is_bxgy_free}`))
        if (itemsKey === prevItemsRef.current) return
        prevItemsRef.current = itemsKey

        if (evalPendingRef.current) clearTimeout(evalPendingRef.current)
        evalPendingRef.current = setTimeout(() => {
            fetchAndEvaluate()
        }, 500)

        return () => {
            if (evalPendingRef.current) clearTimeout(evalPendingRef.current)
        }
    }, [items, fetchAndEvaluate])
}
