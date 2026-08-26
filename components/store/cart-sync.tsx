"use client"

import { useEffect, useRef, useState } from "react"
import { useCart } from "./use-cart"
import { createClient } from "@/utils/supabase/client"
import { CART_SYNC_DEBOUNCE_MS } from "@/lib/cart-constants"
import { applyFlashSaleToPrice } from "@/lib/flash-sale-helper"

export function CartSync({ userId }: { userId: string | null }) {
    const { items, setItems, clearCart } = useCart()
    const supabase = createClient()

    // Track if we have successfully merged the DB state into our Local State
    const [isSynced, setIsSynced] = useState(false)
    const initialPullDone = useRef(false)
    // Live flush function reference (set by the push effect) so logout can call it
    const flushRef = useRef<(() => Promise<void>) | null>(null)

    // 1. FLUSH THEN CLEAR ON LOGOUT
    // When transitioning from logged-in to logged-out, flush any pending changes before clearing.
    const prevUserId = useRef(userId)
    useEffect(() => {
        if (prevUserId.current && !userId) {
            // Fire and forget — best effort flush before clear
            if (flushRef.current) {
                flushRef.current().catch(() => {})
            }
            clearCart()
            initialPullDone.current = false
            setIsSynced(false)
        }
        prevUserId.current = userId
    }, [userId, clearCart])

    // 2. PULL & MERGE ON LOGIN (with live price/stock refresh)
    useEffect(() => {
        if (!userId || initialPullDone.current) return

        async function pullAndMergeCart() {
            initialPullDone.current = true
            // Get user's cart
            const { data: cart } = await supabase
                .from('carts')
                .select('id')
                .eq('user_id', userId)
                .single()

            if (!cart) {
                setIsSynced(true)
                return
            }

            // Fetch items with joined product and LIVE variant data
            const { data: dbItems, error } = await supabase
                .from('cart_items')
                .select(`
                    quantity, 
                    unit_price, 
                    product_id, 
                    product_variant_id, 
                    products!inner(name, thumbnail_url, category_id, base_price), 
                    product_variants!inner(title, stock, price, discount_type, discount_value, image_url)
                `)
                .eq('cart_id', cart.id)

            if (dbItems && dbItems.length > 0) {
                // Fetch active flash sales (scope-based)
                const now = new Date().toISOString()
                const productIds = [...new Set(dbItems.map((ci: any) => ci.product_id))]
                const { data: flashRows } = await supabase
                    .from('flash_sales')
                    .select('scope, product_id, category_id, brand, discount_type, discount_value')
                    .eq('is_active', true)
                    .lte('starts_at', now)
                    .gte('ends_at', now)

                // Product -> category links via junction table (flat products.category_id is often null)
                const prodCats = new Map<string, string[]>()
                if (productIds.length > 0) {
                    const { data: junctionRows } = await supabase
                        .from('product_categories')
                        .select('product_id, category_id')
                        .in('product_id', productIds)
                    for (const row of junctionRows || []) {
                        const list = prodCats.get((row as any).product_id) || []
                        list.push((row as any).category_id)
                        prodCats.set((row as any).product_id, list)
                    }
                }

                const prodMeta = new Map<string, { categoryId?: string; brand?: string | null }>()
                for (const ci of dbItems as any[]) {
                    if (!prodMeta.has(ci.product_id)) prodMeta.set(ci.product_id, { categoryId: ci.products?.category_id, brand: ci.products?.brand })
                }
                function getFlashForProduct(pid: string, catId?: string, br?: string | null) {
                    let best: any = null; let bestVal = 0
                    for (const f of flashRows || []) {
                        let match = false
                        if (f.scope === 'all') match = true
                        else if (f.scope === 'product') match = f.product_id === pid
                        else if (f.scope === 'category') match = f.category_id ? (f.category_id === catId || (prodCats.get(pid) || []).includes(f.category_id)) : false
                        else if (f.scope === 'brand') match = f.brand === br
                        if (!match) continue
                        const val = f.discount_type === 'percentage' ? f.discount_value : f.discount_value * 100
                        if (!best || val > bestVal) { best = f; bestVal = val }
                    }
                    return best
                }

                // Build formatted items using LIVE variant price/stock (not stale unit_price/stock)
                const formatted = dbItems.map((ci: any) => {
                    const variant = ci.product_variants
                    const basePrice = Number(variant.price)
                    const meta = prodMeta.get(ci.product_id)
                    const flash = getFlashForProduct(ci.product_id, meta?.categoryId, meta?.brand)
                    const { salePrice } = applyFlashSaleToPrice(
                        basePrice,
                        flash ? { discount_type: flash.discount_type, discount_value: flash.discount_value, label: '', ends_at: '' } : null,
                        variant.discount_type || 'none',
                        Number(variant.discount_value || 0)
                    )
                    return {
                        id: ci.product_variant_id,
                        productId: ci.product_id,
                        variantId: ci.product_variant_id,
                        categoryId: ci.products.category_id,
                        name: ci.products.name,
                        variantTitle: variant.title,
                        price: Math.round(salePrice),
                        mrp: basePrice,
                        originalPrice: basePrice,
                        image: variant.image_url || ci.products.thumbnail_url,
                        quantity: ci.quantity,
                        stock: variant.stock
                    }
                })

                // --- IDEMPOTENT RECONCILE ---
                // Combine local bag with DB bag, avoid doubling up
                const localItems = items;
                const merged = [...formatted]; // Start with DB items

                localItems.forEach(localItem => {
                    const existingIndex = merged.findIndex(i => i.variantId === localItem.variantId);
                    if (existingIndex > -1) {
                        // RECONCILE: Use max to avoid duplication but respect updates
                        merged[existingIndex].quantity = Math.max(localItem.quantity, merged[existingIndex].quantity);
                        // Use live stock from DB if available, otherwise keep local
                        merged[existingIndex].stock = merged[existingIndex].stock || localItem.stock;
                    } else {
                        // ADD: New items added while guest (includes gift/BXGY items)
                        merged.push(localItem);
                    }
                });

                // Filter out DB-originated gift/BXGY items (they shouldn't persist to DB)
                // and deduplicate items that exist in both DB and local as gifts
                const localGiftIds = new Set(localItems.filter(i => i.is_gift || i.is_bxgy_free).map(i => i.variantId))
                const seenVariantIds = new Set<string>()
                const finalMerged = merged.filter(item => {
                    // If it's a local gift/BXGY item, keep it
                    if (localGiftIds.has(item.variantId)) return true
                    // If it came from DB but is also a local gift, skip (local copy wins)
                    if (localItems.find(l => l.variantId === item.variantId && (l.is_gift || l.is_bxgy_free))) return false
                    // Deduplicate by variantId
                    if (seenVariantIds.has(item.variantId)) return false
                    seenVariantIds.add(item.variantId)
                    return true
                })

                // Restore gift/BXGY flags and price from local items
                const finalWithGiftFlags = finalMerged.map(item => {
                    const localMatch = localItems.find(l => l.variantId === item.variantId)
                    if (localMatch?.is_gift || localMatch?.is_bxgy_free) {
                        return {
                            ...item,
                            is_gift: localMatch.is_gift,
                            is_bxgy_free: localMatch.is_bxgy_free,
                            gift_rule_id: localMatch.gift_rule_id,
                            bxgy_rule_id: localMatch.bxgy_rule_id,
                            price: 0, // Always 0 for gifts/BXGY free items
                        }
                    }
                    return item
                })

                setItems(finalWithGiftFlags)
            }

            setIsSynced(true)
        }

        pullAndMergeCart()
    }, [userId, supabase, items, setItems])

    // 3. PUSH CHANGES TO DB (Debounced) — diff-based upsert to avoid race with cart page writes
    useEffect(() => {
        // Only push if: 1. User is logged in, 2. We've finished the initial pull
        if (!userId || !isSynced) return

        const syncToDb = async () => {
            try {
                // Use your RPC to ensure cart exists
                const { data: cartId, error: rpcError } = await supabase.rpc('get_or_create_cart', {
                    p_user_id: userId
                })

                if (!cartId || rpcError) return

                // Fetch existing DB items to compute a diff (avoids delete-all-reinsert race)
                const { data: existingRows } = await supabase
                    .from('cart_items')
                    .select('id, product_variant_id, quantity')
                    .eq('cart_id', cartId)

                const existingMap = new Map<string, { id: string; quantity: number }>()
                    ;(existingRows || []).forEach((r: any) => {
                        existingMap.set(r.product_variant_id, { id: r.id, quantity: r.quantity })
                    })

                const localVariantIds = new Set(items.map(i => i.variantId))

                // Deletes: rows in DB not in local cart
                const toDelete: string[] = []
                existingMap.forEach((val, variantId) => {
                    if (!localVariantIds.has(variantId)) toDelete.push(val.id)
                })

                // Upserts: rows in local cart (insert new, or update quantity if changed)
                // Skip gift/BXGY items — they are ephemeral and shouldn't persist to DB
                const toInsert: any[] = []
                const toUpdate: { id: string; quantity: number }[] = []
                items.forEach(i => {
                    if (i.is_gift || i.is_bxgy_free) return
                    const existing = existingMap.get(i.variantId)
                    if (!existing) {
                        toInsert.push({
                            cart_id: cartId,
                            product_id: i.productId,
                            product_variant_id: i.variantId,
                            quantity: i.quantity,
                            unit_price: i.price,
                            currency: 'INR'
                        })
                    } else if (existing.quantity !== i.quantity) {
                        toUpdate.push({ id: existing.id, quantity: i.quantity })
                    }
                })

                // Execute deletes
                if (toDelete.length > 0) {
                    await supabase.from('cart_items').delete().in('id', toDelete)
                }
                // Execute inserts
                if (toInsert.length > 0) {
                    await supabase.from('cart_items').insert(toInsert)
                }
                // Execute updates
                for (const u of toUpdate) {
                    await supabase.from('cart_items').update({ quantity: u.quantity }).eq('id', u.id)
                }
            } catch (err) {
                console.error("Cart Sync Error:", err)
            }
        }

        // Expose flush function for logout to call
        flushRef.current = syncToDb

        const debounce = setTimeout(syncToDb, CART_SYNC_DEBOUNCE_MS)
        return () => clearTimeout(debounce)
    }, [items, userId, isSynced, supabase])

    return null
}
