"use client"

import { useEffect, useRef } from "react" // Added useRef
import { useCart } from "./use-cart"
import { createClient } from "@/utils/supabase/client"

export function CartSync({ userId }: { userId: string | null }) {
    const { items, setItems, clearCart } = useCart() // Added clearCart
    const supabase = createClient()

    // Prevent the "Push" logic from running on the very first load
    // so we don't overwrite the DB with an empty local cart
    const initialLoadDone = useRef(false)

    // 1. LOGOUT WATCHER: Clear local store if userId vanishes
    useEffect(() => {
        if (!userId) {
            clearCart();
            initialLoadDone.current = false;
        }
    }, [userId, clearCart]);

    // 2. PULL FROM DB ON LOGIN
    useEffect(() => {
        if (!userId) return;

        async function pullCart() {
            const { data: cart } = await supabase.from('carts').select('id').eq('user_id', userId).single();
            if (!cart) {
                initialLoadDone.current = true; // No cart exists yet, but load is "done"
                return;
            }

            const { data: dbItems } = await supabase
                .from('cart_items')
                .select(`quantity, unit_price, product_id, product_variant_id, products(name, thumbnail_url), product_variants(title, stock)`)
                .eq('cart_id', cart.id);

            if (dbItems) {
                const formatted = dbItems.map((ci: any) => ({
                    id: ci.product_id,
                    variantId: ci.product_variant_id,
                    productId: ci.product_id, // Add this
                    categoryId: ci.products.category_id,
                    name: ci.products.name,
                    variantTitle: ci.product_variants.title,
                    price: Number(ci.unit_price),
                    mrp: Number(ci.product_variants.price),
                    image: ci.products.thumbnail_url,
                    quantity: ci.quantity,
                    stock: ci.product_variants.stock
                }));
                setItems(formatted);
                // Mark initial load as done so we can start pushing changes to DB
                initialLoadDone.current = true;
            }
        }
        pullCart();
    }, [userId, setItems, supabase]);

    // 3. PUSH TO DB ON CHANGE
    useEffect(() => {
        // IMPORTANT: Only push if we have a user AND we've finished pulling the initial data
        if (!userId || !initialLoadDone.current) return;

        const syncToDb = async () => {
            const { data: cartId } = await supabase.rpc('get_or_create_cart', { p_user_id: userId });
            if (!cartId) return;

            await supabase.from('cart_items').delete().eq('cart_id', cartId);

            if (items.length > 0) {
                await supabase.from('cart_items').insert(
                    items.map(i => ({
                        cart_id: cartId,
                        product_id: i.id,
                        product_variant_id: i.variantId,
                        quantity: i.quantity,
                        unit_price: i.price
                    }))
                );
            }
        };

        const debounce = setTimeout(syncToDb, 1500);
        return () => clearTimeout(debounce);
    }, [items, userId]);

    return null;
}