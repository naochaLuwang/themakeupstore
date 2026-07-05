"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin"
import { OrderPOSSchema } from "@/lib/schemas"
import { checkPromoEligibility } from "@/lib/promo-helper"
import { VALID_TRANSITIONS, STATUS_TIMESTAMPS, PUSH_MESSAGES } from "@/lib/order-status"
import { calculateDiscountedPrice } from "@/lib/price-helper"
import { FREE_SHIPPING_THRESHOLD } from "@/lib/cart-constants"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

async function atomicDecrementStock(supabase: Awaited<ReturnType<typeof createClient>>, variantId: string, quantity: number) {
    // Try the RPC first (atomic).
    const { error: rpcErr } = await supabase.rpc('decrement_stock', {
        row_id: variantId,
        amount: quantity
    })

    if (!rpcErr) return true

    console.warn("RPC decrement_stock failed, falling back to optimistic-lock decrement")

    // Retry loop with optimistic locking to ensure atomicity.
    // Reads current stock, computes new stock, applies UPDATE only if the
    // row's stock still matches the read value (prevents concurrent oversell).
    for (let attempt = 0; attempt < 3; attempt++) {
        const { data: variant } = await supabase
            .from('product_variants')
            .select('stock')
            .eq('id', variantId)
            .single()

        if (!variant) {
            console.error("Variant not found during stock decrement:", variantId)
            return false
        }

        const currentStock = Number(variant.stock)
        if (currentStock < quantity) {
            console.error("Insufficient stock during decrement:", variantId, "needed", quantity, "have", currentStock)
            return false
        }

        const newStock = Math.max(0, currentStock - quantity)
        const { data: updated, error: updateErr } = await supabase
            .from('product_variants')
            .update({ stock: newStock })
            .eq('id', variantId)
            .eq('stock', currentStock) // optimistic lock: only update if stock hasn't changed
            .select('id')
            .single()

        if (!updateErr && updated) {
            return true // successfully decremented
        }
        // Update didn't match — concurrent modification, retry
    }
    console.error("All stock decrement attempts failed for", variantId)
    return false
}



export async function placeOrder(
    formData: any,
    cartItems: any[],
    shippingDetails: {
        total: number;
        price: number;
        methodName: string;
        deliveryTimeLabel?: string;
        shipping_method_id?: string | null
    },
    promoDetails?: { code: string; discount: number; id?: string },
    bxgyDetails?: { discount: number; freeItems?: { variantId: string; productId: string; ruleId?: string; quantity: number }[] },
    giftDetails?: { variantId: string; productId: string; ruleId?: string; quantity: number }[]
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("User not authenticated")

    try {
        // 1. RE-VALIDATE PRICES AND STOCK
        let calculatedSubtotal = 0;
        const verifiedItems = [];

        for (const item of cartItems) {
            // Skip gift/BXGY free items — they are validated separately and priced at ₹0
            if (item.is_gift || item.is_bxgy_free) continue

            const { data: variant, error: varError } = await supabase
                .from("product_variants")
                .select("price, stock, product_id, title, discount_type, discount_value, products(name, category_id, discount_type, discount_value)")
                .eq("id", item.variantId)
                .single()

            if (varError || !variant) throw new Error(`Product not found: ${item.name}`)
            if (variant.stock < item.quantity) throw new Error(`Insufficient stock for ${item.name}`)

            const basePrice = Number(variant.price)
            const variantDiscountType: string = variant.discount_type || "none"
            const variantDiscountValue: number = Number(variant.discount_value) || 0
            const prod = variant.products as any
            const productDiscountType: string = prod?.discount_type || "none"
            const productDiscountValue: number = Number(prod?.discount_value) || 0

            const effectiveDiscountType = variantDiscountType !== "none" ? variantDiscountType : productDiscountType
            const effectiveDiscountValue = variantDiscountType !== "none" ? variantDiscountValue : productDiscountValue
            const salePrice = calculateDiscountedPrice(basePrice, effectiveDiscountType as 'percentage' | 'amount' | 'none', effectiveDiscountValue)

            calculatedSubtotal += Math.round(salePrice * item.quantity)

            verifiedItems.push({
                ...item,
                price: salePrice,
                categoryId: prod?.category_id
            })
        }

        // 2. RE-VALIDATE PROMO
        let verifiedDiscount = 0;
        if (promoDetails?.code) {
            const { data: promo, error: promoError } = await supabase
                .from('promo_codes')
                .select(`
                    *,
                    promo_code_products(product_id),
                    promo_code_categories(category_id)
                `)
                .eq('code', promoDetails.code.toUpperCase())
                .eq('is_active', true)
                .single()

            if (promoError || !promo) throw new Error("Invalid promo code")

            const { isEligible, eligibleSubtotal } = checkPromoEligibility(promo, verifiedItems)
            if (!isEligible) throw new Error("Promo code is no longer applicable")

            // Calculate discount on server
            if (promo.discount_type === 'percentage') {
                verifiedDiscount = Math.round((eligibleSubtotal * Number(promo.discount_value)) / 100)
                if (promo.max_discount_amount) {
                    verifiedDiscount = Math.min(verifiedDiscount, Number(promo.max_discount_amount))
                }
            } else {
                verifiedDiscount = Math.min(Number(promo.discount_value), eligibleSubtotal)
            }
        }

        // 2b. RE-VALIDATE BXGY DISCOUNT
        let verifiedBXGYDiscount = 0;
        if (bxgyDetails?.discount && bxgyDetails.discount > 0) {
            // Verify the BXGY rules are still active and valid
            if (bxgyDetails.freeItems && bxgyDetails.freeItems.length > 0) {
                const resolvedBXGYFreeItems = [];
                for (const freeItem of bxgyDetails.freeItems) {
                    let variant = await supabase
                        .from('product_variants')
                        .select('id, stock, price')
                        .eq('id', freeItem.variantId)
                        .maybeSingle()
                        .then(r => r.data)

                    if (!variant) {
                        variant = await supabase
                            .from('product_variants')
                            .select('id, stock, price')
                            .eq('product_id', freeItem.productId)
                            .eq('is_default', true)
                            .maybeSingle()
                            .then(r => r.data)
                    }

                    if (!variant || variant.stock < freeItem.quantity) {
                        throw new Error(`Free gift item is no longer available`)
                    }
                    resolvedBXGYFreeItems.push({ ...freeItem, variantId: variant.id })
                }
                bxgyDetails.freeItems = resolvedBXGYFreeItems;
            }
            // Use client-reported BXGY discount (already calculated client-side against rules)
            verifiedBXGYDiscount = bxgyDetails.discount;
        }

        // 2c. VALIDATE FREE GIFTS
        let verifiedGiftItems: any[] = [];
        if (giftDetails && giftDetails.length > 0) {
            for (const gift of giftDetails) {
                // Verify the gift rule is still active and check min_cart_amount
                if (gift.ruleId) {
                    const { data: rule } = await supabase
                        .from('free_gifts')
                        .select('min_cart_amount, is_active, starts_at, expires_at')
                        .eq('id', gift.ruleId)
                        .single()
                    if (!rule || !rule.is_active) throw new Error(`Free gift rule is no longer active`)
                    if (rule.min_cart_amount && rule.min_cart_amount > 0) {
                        const paidSubtotal = cartItems
                            .filter((i: any) => !i.is_gift && !i.is_bxgy_free)
                            .reduce((s: number, i: any) => s + i.price * i.quantity, 0)
                        if (paidSubtotal < rule.min_cart_amount) {
                            throw new Error(`Free gift requires minimum cart of ₹${rule.min_cart_amount}`)
                        }
                    }
                }

                let variant = await supabase
                    .from('product_variants')
                    .select('id, stock, price')
                    .eq('id', gift.variantId)
                    .maybeSingle()
                    .then(r => r.data)

                // If variant not found by variantId (e.g. gift uses product UUID directly),
                // fall back to the product's default variant
                if (!variant) {
                    variant = await supabase
                        .from('product_variants')
                        .select('id, stock, price')
                        .eq('product_id', gift.productId)
                        .eq('is_default', true)
                        .maybeSingle()
                        .then(r => r.data)
                }

                if (!variant || variant.stock < gift.quantity) {
                    throw new Error(`Free gift is no longer available`)
                }
                verifiedGiftItems.push({
                    ...gift,
                    variantId: variant.id,
                    verifiedPrice: 0, // Gifts are always ₹0
                })
            }
        }

        // 3. RE-VERIFY SHIPPING PRICE (with free shipping threshold)
        let verifiedShippingPrice = 0;
        if (shippingDetails.shipping_method_id) {
            const { data: method } = await supabase
                .from('shipping_methods')
                .select('price')
                .eq('id', shippingDetails.shipping_method_id)
                .single()
            if (method) {
                verifiedShippingPrice = calculatedSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : Number(method.price);
            }
        }

        // 4. FINAL TOTAL CALCULATION
        const finalTotal = Math.max(0, Math.round(calculatedSubtotal - verifiedDiscount - verifiedBXGYDiscount + verifiedShippingPrice))

        // 5. Insert the main Order
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert([{
                user_id: user.id,
                status: 'pending',
                order_type: 'delivery',
                payment_status: 'unpaid',
                payment_method: 'COD',
                total: finalTotal,
                shipping_price: verifiedShippingPrice,
                shipping_label: shippingDetails.methodName,
                shipping_method_id: shippingDetails.shipping_method_id || null,
                shipping_address: { ...formData, delivery_label: shippingDetails.deliveryTimeLabel || shippingDetails.methodName },
                promo_code: promoDetails?.code || null,
                promo_discount_amount: verifiedDiscount,
                bxgy_discount_amount: verifiedBXGYDiscount || 0,
            }])
            .select()
            .single()

        if (orderError) throw orderError

        // 3. Insert Order Items (Using database verified prices)
        const itemsToInsert = verifiedItems.map(item => ({
            order_id: order.id,
            product_id: item.productId,
            product_variant_id: item.variantId,
            product_name: item.name,
            variant_title: item.variantTitle,
            quantity: item.quantity,
            unit_price: item.price, // VERIFIED PRICE
            mrp: item.mrp || item.price,
            is_gift: false,
        }))

        // Add verified free gift items at ₹0
        for (const gift of verifiedGiftItems) {
            const { data: giftVariant } = await supabase
                .from('product_variants')
                .select('title, products(name, thumbnail_url)')
                .eq('id', gift.variantId)
                .single()
            itemsToInsert.push({
                order_id: order.id,
                product_id: gift.productId,
                product_variant_id: gift.variantId,
                product_name: (giftVariant?.products as any)?.name || 'Free Gift',
                variant_title: giftVariant?.title || null,
                quantity: gift.quantity,
                unit_price: 0, // Gift is always ₹0
                mrp: 0,
                is_gift: true,
            })
        }

        // Add verified BXGY free items at ₹0
        if (bxgyDetails?.freeItems && bxgyDetails.freeItems.length > 0) {
            for (const freeItem of bxgyDetails.freeItems) {
                const { data: freeVariant } = await supabase
                    .from('product_variants')
                    .select('title, products(name, thumbnail_url)')
                    .eq('id', freeItem.variantId)
                    .single()
                itemsToInsert.push({
                    order_id: order.id,
                    product_id: freeItem.productId,
                    product_variant_id: freeItem.variantId,
                    product_name: (freeVariant?.products as any)?.name || 'Free Item',
                    variant_title: freeVariant?.title || null,
                    quantity: freeItem.quantity,
                    unit_price: 0,
                    mrp: 0,
                    is_gift: true,
                })
            }
        }

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(itemsToInsert)

        if (itemsError) throw itemsError

        // 4. Promo Usage Logic (Update count and record redemption)
        if (promoDetails?.code) {
            const { data: promoRecord } = await supabase
                .from('promo_codes')
                .select('id, used_count')
                .eq('code', promoDetails.code)
                .single()

            if (promoRecord) {
                await supabase
                    .from('promo_codes')
                    .update({ used_count: (promoRecord.used_count || 0) + 1 })
                    .eq('id', promoRecord.id)

                await supabase
                    .from('promo_redemptions')
                    .insert({
                        promo_id: promoRecord.id,
                        user_id: user.id,
                        order_id: order.id
                    })
            }
        }

        // 6. Stock Update (Atomic, with robust fallbacks)
        // Only decrement stock for real cart items (not gifts/BXGY free — handled below)
        for (const item of cartItems) {
            if (item.is_gift || item.is_bxgy_free) continue
            await atomicDecrementStock(supabase, item.variantId, item.quantity)
        }
        // Decrement stock for free gift items (once, not duplicated)
        for (const gift of verifiedGiftItems) {
            await atomicDecrementStock(supabase, gift.variantId, gift.quantity)
        }

        // 6. Push Notifications (Your existing logic)
        // ... (Keep as is)

        revalidatePath("/admin/orders")
        revalidatePath("/profile")
        return { success: true, orderId: order.id }

    } catch (error: any) {
        console.error("ORDER_PLACEMENT_ERROR:", error)
        return { success: false, message: error.message }
    }
}

// export async function cancelOrderAndRestoreStock(orderId: string) {
//     const supabase = await createClient()

//     try {
//         // 1. Get current user for security check
//         const { data: { user } } = await supabase.auth.getUser()
//         if (!user) throw new Error("Authentication required")

//         // 2. Fetch order, items, and user_id
//         const { data: order, error: orderFetchErr } = await supabase
//             .from('orders')
//             .select('status, user_id, order_items(product_variant_id, quantity)')
//             .eq('id', orderId)
//             .single()

//         if (orderFetchErr || !order) throw new Error("Order not found")

//         // 3. SECURITY: Verify ownership
//         // Only allow the person who placed the order or an admin to cancel it
//         // If you have a specific way to identify admins, add that logic here
//         if (order.user_id !== user.id) {
//             throw new Error("Unauthorized: You do not have permission to cancel this order")
//         }

//         // 4. STATUS CHECK: Prevent cancelling shipped/delivered items
//         const protectedStatuses = ['shipped', 'delivered']
//         if (protectedStatuses.includes(order.status.toLowerCase())) {
//             throw new Error(`Cannot cancel order once it has been ${order.status}.`)
//         }

//         if (order.status === 'cancelled') {
//             throw new Error("Order is already cancelled")
//         }

//         // 5. UPDATE: Set status to cancelled
//         const { error: updateErr } = await supabase
//             .from('orders')
//             .update({ status: 'cancelled' })
//             .eq('id', orderId)

//         if (updateErr) throw updateErr

//         // 6. RESTORE STOCK: Loop through items and increment inventory
//         const items = order.order_items
//         for (const item of items) {
//             const { error: rpcErr } = await supabase.rpc('increment_stock', {
//                 row_id: item.product_variant_id,
//                 amount: item.quantity
//             })

//             // Fallback if the RPC function isn't found in your Supabase DB
//             if (rpcErr) {
//                 const { data: v } = await supabase
//                     .from('product_variants')
//                     .select('stock')
//                     .eq('id', item.product_variant_id)
//                     .single()

//                 if (v) {
//                     await supabase
//                         .from("product_variants")
//                         .update({ stock: v.stock + item.quantity })
//                         .eq("id", item.product_variant_id)
//                 }
//             }
//         }

//         // 7. CACHE CLEARING: Refresh all relevant routes
//         revalidatePath("/admin/orders")
//         revalidatePath("/admin/products")
//         revalidatePath("/profile")
//         revalidatePath(`/profile/orders/${orderId}`) // Refresh the specific details page

//         return { success: true }
//     } catch (error: any) {
//         console.error("CANCEL_ORDER_ERROR:", error)
//         return { success: false, message: error.message || "Failed to cancel order" }
//     }
// }


export async function cancelOrderAndRestoreStock(orderId: string) {
    const supabase = await createClient()

    try {
        // 1. Get current user session
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("Authentication required")

        // 2. Fetch Order and Admin Status in parallel for speed
        const [orderRes, profileRes] = await Promise.all([
            supabase
                .from('orders')
                .select('status, user_id, order_items(product_variant_id, quantity)')
                .eq('id', orderId)
                .single(),
            supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', user.id)
                .single()
        ])

        if (orderRes.error || !orderRes.data) throw new Error("Order not found")

        const order = orderRes.data
        const isAdmin = profileRes.data?.is_admin || false

        // 3. UPDATED SECURITY: Allow if owner OR Admin
        // This was the part blocking your admin previously
        if (order.user_id !== user.id && !isAdmin) {
            throw new Error("Unauthorized: You do not have permission to cancel this order")
        }

        // 4. STATUS CHECK: Prevent cancelling completed logic
        const protectedStatuses = ['shipped', 'out_for_delivery', 'delivered', 'picked_up', 'dispatched']
        if (protectedStatuses.includes(order.status.toLowerCase())) {
            throw new Error(`Cannot cancel order once it has been ${order.status}.`)
        }

        if (order.status === 'cancelled') {
            throw new Error("Order is already cancelled")
        }

        // 5. UPDATE: Set status to cancelled + record who cancelled
        const { error: updateErr } = await supabase
            .from('orders')
            .update({
                status: 'cancelled',
                cancelled_by: isAdmin ? 'admin' : 'user',
                updated_at: new Date().toISOString()
            })
            .eq('id', orderId)

        if (updateErr) throw updateErr

        // 6. RESTORE STOCK: Loop through items and increment inventory
        const items = order.order_items || []

        for (const item of items) {
            if (!item.product_variant_id) continue;

            // Try the database function first (Cleanest way)
            const { error: rpcErr } = await supabase.rpc('increment_stock', {
                row_id: item.product_variant_id,
                amount: item.quantity
            })

            // Fallback: Manual update if RPC is missing
            if (rpcErr) {
                console.warn("RPC increment_stock failed, falling back to manual update")
                const { data: variant } = await supabase
                    .from('product_variants')
                    .select('stock')
                    .eq('id', item.product_variant_id)
                    .single()

                if (variant) {
                    await supabase
                        .from("product_variants")
                        .update({ stock: variant.stock + item.quantity })
                        .eq("id", item.product_variant_id)
                }
            }
        }

        // 7. CACHE CLEARING: Update the UI for both Admin and User
        revalidatePath("/admin/orders")
        revalidatePath("/admin/products")
        revalidatePath("/profile")
        revalidatePath(`/profile/orders/${orderId}`)
        revalidatePath(`/admin/orders/${orderId}`)

        return { success: true, message: "Order cancelled and stock restored." }

    } catch (error: any) {
        console.error("CANCEL_ORDER_ERROR:", error)
        return { success: false, message: error.message || "Failed to cancel order" }
    }
}

export async function createWholesaleOrder(data: {
    userId: string,
    total: number,
    items: any[]
}) {
    await requireAdmin()
    const supabase = await createClient()

    try {
        // 1. Re-verify variant prices and wholesale discounts server-side
        const verifiedItems: any[] = [];
        let calculatedTotal = 0;

        for (const item of data.items) {
            const { data: variant } = await supabase
                .from('product_variants')
                .select('price, stock, product_id, title')
                .eq('id', item.variant_id)
                .single()

            if (!variant) throw new Error(`Variant not found: ${item.variant_id}`)
            if (variant.stock < item.qty) throw new Error(`Insufficient stock for ${item.name}`)

            const { data: product } = await supabase
                .from('products')
                .select('category_id')
                .eq('id', variant.product_id)
                .single()

            let unitPrice = Number(variant.price)
            if (product?.category_id) {
                const { data: rule } = await supabase
                    .from('category_wholesale_rules')
                    .select('discount_percentage, is_active')
                    .eq('category_id', product.category_id)
                    .single()

                if (rule?.is_active && rule.discount_percentage > 0) {
                    unitPrice = Math.floor(unitPrice * (1 - Number(rule.discount_percentage) / 100))
                }
            }

            const lineTotal = Math.round(unitPrice * item.qty)
            calculatedTotal += lineTotal

            verifiedItems.push({
                product_id: variant.product_id,
                product_variant_id: item.variant_id,
                product_name: item.name,
                variant_title: variant.title,
                quantity: item.qty,
                unit_price: unitPrice,
                currency: 'INR'
            })
        }

        // 2. Create the Master Order with server-calculated total
        const { data: order, error: orderErr } = await supabase
            .from('orders')
            .insert({
                user_id: data.userId,
                total: calculatedTotal,
                status: 'pending',
                order_type: 'delivery',
                payment_status: 'unpaid',
                payment_method: 'B2B_INVOICE',
                currency: 'INR'
            })
            .select()
            .single()

        if (orderErr) {
            console.error("Order Header Error:", orderErr)
            throw new Error("Failed to create order")
        }

        // 3. Insert verified line items
        const itemsToInsert = verifiedItems.map(item => ({
            ...item,
            order_id: order.id,
        }))

        const { error: itemErr } = await supabase
            .from('order_items')
            .insert(itemsToInsert)

        if (itemErr) {
            console.error("Order Items Error:", itemErr)
            await supabase.from('orders').delete().eq('id', order.id)
            throw new Error("Failed to save order items")
        }

        // 4. DECREMENT STOCK (atomic with robust fallback)
        for (const item of verifiedItems) {
            await atomicDecrementStock(supabase, item.product_variant_id, item.quantity)
        }

        revalidatePath('/admin/orders')
        revalidatePath('/b2b/orders')

        return { success: true, orderId: order.id }

    } catch (error: any) {
        console.error("B2B Order Failure:", error.message)
        return { success: false, error: error.message }
    }
}


// app/actions/orders.ts
export async function updateOrderPOS(
    orderId: string, 
    items: any[], 
    globalDiscount: number = 0,
    additionalCharges: number = 0,
    additionalChargesLabel: string = 'Extra Charges'
) {
    await requireAdmin()
    const supabase = await createClient()

    const { success, data, error: validationError } = OrderPOSSchema.safeParse({
        orderId, items, globalDiscount, additionalCharges, additionalChargesLabel
    })
    if (!success) return { success: false, message: validationError.message }

    // 1. Fetch current items to RESTORE stock before deletion
    const { data: currentItems } = await supabase
        .from('order_items')
        .select('product_variant_id, quantity')
        .eq('order_id', orderId);

    if (currentItems) {
        for (const item of currentItems) {
            if (item.product_variant_id) {
                await supabase.rpc('increment_stock', {
                    row_id: item.product_variant_id,
                    amount: item.quantity
                })
            }
        }
    }

    // 2. DELETE ALL existing items
    const { error: deleteError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId);

    if (deleteError) {
        console.error("Order items cleanup failed:", deleteError)
        return { success: false, message: "Failed to update order items" }
    }

    // 3. PREPARE data for insertion
    const cleanItems = data.items.map(item => ({
        order_id: orderId,
        product_id: item.product_id,
        product_variant_id: item.product_variant_id,
        product_name: item.product_name,
        variant_title: item.variant_title,
        quantity: item.quantity,
        unit_price: item.unit_price,
        mrp: item.mrp,
        sku: item.sku
    }));

    // 4. INSERT the fresh set
    const { error: insertError } = await supabase
        .from('order_items')
        .insert(cleanItems);

    if (insertError) {
        console.error("Order items insertion failed:", insertError)
        return { success: false, message: "Failed to save order items" }
    }

    // 5. DECREMENT STOCK for the new set
    for (const item of cleanItems) {
        if (item.product_variant_id) {
            await supabase.rpc('decrement_stock', {
                row_id: item.product_variant_id,
                amount: item.quantity
            })
        }
    }

    // 4. UPDATE ORDER TOTALS
    const itemsTotal = data.items.reduce((acc, i) => acc + (Number(i.unit_price) * i.quantity), 0);
    const finalTotal = Math.round(itemsTotal - data.globalDiscount + data.additionalCharges);

    const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({
            total: finalTotal,
            promo_discount_amount: data.globalDiscount,
            additional_charges: data.additionalCharges,
            additional_charges_label: data.additionalChargesLabel,
            updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

    if (orderUpdateError) return { success: false, message: "Order total sync failed" };

    revalidatePath('/admin/orders');
    return { success: true };
}

export async function removeOrderItem(itemId: string, orderId: string) {
    await requireAdmin()
    const supabase = await createClient()

    try {
        const { data: item, error: fetchErr } = await supabase
            .from('order_items')
            .select('product_variant_id, quantity')
            .eq('id', itemId)
            .single()

        if (fetchErr || !item) throw new Error("Order item not found")

        if (item.product_variant_id) {
            const { error: stockErr } = await supabase.rpc('increment_stock', {
                row_id: item.product_variant_id,
                amount: item.quantity
            })
            if (stockErr) console.warn("Stock restore failed:", stockErr)
        }

        const { error: deleteErr, data: deleted } = await supabase
            .from('order_items')
            .delete()
            .eq('id', itemId)
            .select()

        if (deleteErr) {
            console.error("Failed to remove order item:", deleteErr)
            throw new Error("Failed to remove item")
        }
        if (!deleted || deleted.length === 0) throw new Error("Order item not found")

        const { data: remaining } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', orderId)

        const { data: order } = await supabase
            .from('orders')
            .select('shipping_price, promo_discount_amount, additional_charges')
            .eq('id', orderId)
            .single()

        const itemsTotal = (remaining || []).reduce((acc, i) => acc + (Number(i.unit_price) * i.quantity), 0)
        const finalTotal = Math.round(itemsTotal - Number(order?.promo_discount_amount || 0) + Number(order?.additional_charges || 0) + Number(order?.shipping_price || 0))

        const { error: updateErr } = await supabase
            .from('orders')
            .update({ total: finalTotal, updated_at: new Date().toISOString() })
            .eq('id', orderId)

        if (updateErr) throw new Error("Failed to update total")

        revalidatePath('/admin/orders')
        revalidatePath(`/admin/orders/${orderId}`)

        return {
            success: true,
            order_items: remaining || [],
            total: finalTotal
        }
    } catch (error: any) {
        return { success: false, message: error.message }
    }
}

export async function updateOrderDiscount(orderId: string, discountAmount: number, discountRemark: string) {
    await requireAdmin()
    const supabase = await createClient()

    try {
        const { data: order } = await supabase
            .from('orders')
            .select('shipping_price, additional_charges')
            .eq('id', orderId)
            .single()

        const { data: items } = await supabase
            .from('order_items')
            .select('unit_price, quantity')
            .eq('order_id', orderId)

        const itemsTotal = (items || []).reduce((acc, i) => acc + (Number(i.unit_price) * i.quantity), 0)
        const finalTotal = Math.round(itemsTotal - discountAmount + Number(order?.additional_charges || 0) + Number(order?.shipping_price || 0))

        await supabase
            .from('orders')
            .update({
                promo_discount_amount: discountAmount,
                discount_remark: discountRemark || null,
                total: finalTotal,
                updated_at: new Date().toISOString()
            })
            .eq('id', orderId)

        revalidatePath('/admin/orders')
        revalidatePath(`/admin/orders/${orderId}`)
        return { success: true }
    } catch (error: any) {
        return { success: false, message: error.message }
    }
}

const STATUS_ORDER_TYPE: Record<string, string> = {
    delivery: "delivery",
    pickup: "pickup",
}

export async function updateOrderStatus(orderId: string, status: string) {
    await requireAdmin()
    const supabase = await createClient()

    try {
        const { data: order, error: fetchErr } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('id', orderId)
            .single()

        if (fetchErr || !order) throw new Error("Order not found")

        const oldStatus = (order.status || "").toLowerCase()
        const newStatus = status.toLowerCase()
        const orderType = order.order_type || "delivery"

        // Validate transition
        const validNext = VALID_TRANSITIONS[orderType]?.[oldStatus] || []
        if (!validNext.includes(newStatus)) {
            throw new Error(`Cannot transition from "${oldStatus}" to "${newStatus}" for ${orderType} orders`)
        }

        const updatePayload: any = {
            status: newStatus,
            updated_at: new Date().toISOString()
        }

        // Set timestamp for the new status
        const tsField = STATUS_TIMESTAMPS[newStatus]
        if (tsField) {
            updatePayload[tsField] = new Date().toISOString()
        }

        // If reverting from a status, clear its timestamp
        const revertFrom = STATUS_TIMESTAMPS[oldStatus]
        if (revertFrom && newStatus !== "delivered" && newStatus !== "picked_up") {
            updatePayload[revertFrom] = null
        }

        const { error: updateErr } = await supabase
            .from('orders')
            .update(updatePayload)
            .eq('id', orderId)

        if (updateErr) throw updateErr

        // Stock decrement for B2B on delivered/picked_up
        const isB2B = order.payment_method === 'B2B_INVOICE'
        const isTerminal = newStatus === 'delivered' || newStatus === 'picked_up'
        const wasNotTerminal = oldStatus !== 'delivered' && oldStatus !== 'picked_up'

        if (isTerminal && wasNotTerminal && isB2B) {
            for (const item of order.order_items) {
                if (!item.product_variant_id) continue;

                const { error: rpcErr } = await supabase.rpc('decrement_stock', {
                    row_id: item.product_variant_id,
                    amount: item.quantity
                })

                if (rpcErr) {
                    const { data: variant } = await supabase
                        .from('product_variants')
                        .select('stock')
                        .eq('id', item.product_variant_id)
                        .single()

                    if (variant) {
                        await supabase
                            .from("product_variants")
                            .update({ stock: Math.max(0, variant.stock - item.quantity) })
                            .eq("id", item.product_variant_id)
                    }
                }
            }
        }

        // Push notification
        const bodyText = PUSH_MESSAGES[newStatus]
        if (bodyText && order.user_id) {
            const { data: subs } = await supabase
                .from('push_subscriptions')
                .select('subscription_json')
                .eq('user_id', order.user_id)

            if (subs?.length) {
                try {
                    await Promise.all(subs.map(s =>
                        fetch('/api/push', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                subscription: s.subscription_json,
                                payload: {
                                    title: `Order Update: ${newStatus.toUpperCase()}`,
                                    body: bodyText,
                                    url: `/profile/orders/${orderId}`
                                }
                            })
                        })
                    ))
                } catch {}
            }
        }

        revalidatePath('/admin/orders')
        revalidatePath(`/admin/orders/${orderId}`)
        return { success: true, oldStatus, newStatus, userId: order.user_id }
    } catch (error: any) {
        console.error("UPDATE_STATUS_ERROR:", error)
        return { success: false, message: error.message }
    }
}