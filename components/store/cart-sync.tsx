"use client"

import { useEffect, useRef, useState } from "react"
import { useCart } from "./use-cart"
import { createClient } from "@/utils/supabase/client"

export function CartSync({ userId }: { userId: string | null }) {
    const { items, setItems, clearCart } = useCart()
    const supabase = createClient()

    // Track if we have successfully merged the DB state into our Local state
    const [isSynced, setIsSynced] = useState(false)
    const initialPullDone = useRef(false)

    // 1. CLEAR ON LOGOUT (only when transitioning from logged-in to logged-out)
    const prevUserId = useRef(userId)
    useEffect(() => {
        if (prevUserId.current && !userId) {
            clearCart()
            initialPullDone.current = false
            setIsSynced(false)
        }
        prevUserId.current = userId
    }, [userId, clearCart])

    // 2. PULL & MERGE ON LOGIN
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
                initialPullDone.current = true
                setIsSynced(true)
                return
            }

            // Fetch items with joined product and variant data
            const { data: dbItems, error } = await supabase
                .from('cart_items')
                .select(`
                    quantity, 
                    unit_price, 
                    product_id, 
                    product_variant_id, 
                    products!inner(name, thumbnail_url, category_id, base_price), 
                    product_variants!inner(title, stock, price)
                `)
                .eq('cart_id', cart.id)

            if (dbItems && dbItems.length > 0) {
                const formatted = dbItems.map((ci: any) => ({
                    id: ci.product_variant_id, // Variant ID is the unique identifier in cart
                    productId: ci.product_id,
                    variantId: ci.product_variant_id,
                    categoryId: ci.products.category_id,
                    name: ci.products.name,
                    variantTitle: ci.product_variants.title,
                    price: Number(ci.unit_price),
                    mrp: Number(ci.product_variants.price || ci.products.base_price),
                    image: ci.products.thumbnail_url,
                    quantity: ci.quantity,
                    stock: ci.product_variants.stock
                }))

                // --- IDEMPOTENT RECONCILE ---
                // We combine local bag with DB bag, but avoid doubling up
                const localItems = items;
                const merged = [...formatted]; // Start with DB items

                localItems.forEach(localItem => {
                    const existingIndex = merged.findIndex(i => i.variantId === localItem.variantId);
                    if (existingIndex > -1) {
                        // RECONCILE: Use max to avoid duplication but respect updates
                        merged[existingIndex].quantity = Math.max(localItem.quantity, merged[existingIndex].quantity);
                    } else {
                        // ADD: New items added while guest
                        merged.push(localItem);
                    }
                });

                setItems(merged)
            }

            setIsSynced(true)
        }

        pullAndMergeCart()
    }, [userId, supabase, items, setItems])

    // 3. PUSH CHANGES TO DB (Debounced)
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

                // Clean and replace
                await supabase.from('cart_items').delete().eq('cart_id', cartId)

                if (items.length > 0) {
                    const insertData = items.map(i => ({
                        cart_id: cartId,
                        product_id: i.productId,
                        product_variant_id: i.variantId,
                        quantity: i.quantity,
                        unit_price: i.price,
                        currency: 'INR'
                    }))

                    await supabase.from('cart_items').insert(insertData)
                }
            } catch (err) {
                console.error("Cart Sync Error:", err)
            }
        }

        const debounce = setTimeout(syncToDb, 2000) // 2 second debounce to save API calls
        return () => clearTimeout(debounce)
    }, [items, userId, isSynced, supabase])

    return null
}