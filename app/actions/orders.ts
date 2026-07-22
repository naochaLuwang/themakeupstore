"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin"
import { OrderPOSSchema } from "@/lib/schemas"
import { checkPromoEligibility } from "@/lib/promo-helper"
import { VALID_TRANSITIONS, STATUS_TIMESTAMPS, PUSH_MESSAGES } from "@/lib/order-status"
import { calculateDiscountedPrice } from "@/lib/price-helper"
import { FREE_SHIPPING_THRESHOLD, FREE_SHIPPING_PINCODES } from "@/lib/cart-constants"

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
    giftDetails?: { variantId: string; productId: string; ruleId?: string; quantity: number }[],
    giftCardDetails?: { code: string; amount: number },
    rewardCoupon?: { id: string; discount: number },
    paymentDetails?: { method: string; payment_id?: string; status: string }
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("User not authenticated")

    // Hoisted for catch rollback access
    const stockDecremented: { variantId: string; quantity: number }[] = []
    let createdOrderId: string | null = null

    try {
        // ── HELPER: batch fetch variants ──
        async function batchVariants(ids: string[]) {
            const unique = [...new Set(ids)]
            if (unique.length === 0) return []
            const { data } = await supabase
                .from("product_variants")
                .select("id, price, stock, product_id, title, discount_type, discount_value, products(name, category_id, discount_type, discount_value)")
                .in("id", unique)
            return data || []
        }

        async function batchSimpleVariants(ids: string[]) {
            const unique = [...new Set(ids)]
            if (unique.length === 0) return []
            const { data } = await supabase
                .from("product_variants")
                .select("id, stock, price")
                .in("id", unique)
            return data || []
        }

        // ── 1. RE-VALIDATE PRICES AND STOCK (batched) ──
        let calculatedSubtotal = 0;
        const verifiedItems = [];
        const paidItems = cartItems.filter((i: any) => !i.is_gift && !i.is_bxgy_free)
        const paidVariantIds = paidItems.map((i: any) => i.variantId)
        const paidVariants = await batchVariants(paidVariantIds)
        const paidVariantMap = new Map(paidVariants.map((v: any) => [v.id, v]))

        // Batch category lookups for items missing category_id
        const itemsMissingCat = paidItems.filter((i: any) => {
            const v = paidVariantMap.get(i.variantId)
            return !v?.products?.category_id
        })
        const missingCatProductIds = [...new Set(itemsMissingCat.map((i: any) => i.productId || paidVariantMap.get(i.variantId)?.product_id))]
        let catMap = new Map<string, string>()
        if (missingCatProductIds.length > 0) {
            const { data: catData } = await supabase
                .from("product_categories")
                .select("product_id, category_id")
                .in("product_id", missingCatProductIds)
            if (catData) {
                for (const c of catData) {
                    if (!catMap.has(c.product_id)) catMap.set(c.product_id, c.category_id)
                }
            }
        }

        for (const item of paidItems) {
            const variant = paidVariantMap.get(item.variantId)
            if (!variant) throw new Error(`Product not found: ${item.name}`)
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

            let itemCatId = prod?.category_id
            if (!itemCatId) itemCatId = catMap.get(variant.product_id)
            verifiedItems.push({ ...item, price: salePrice, categoryId: itemCatId })
        }

        // ── 2. RE-VALIDATE PROMO ──
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

            if (promo.discount_type === 'percentage') {
                verifiedDiscount = Math.round((eligibleSubtotal * Number(promo.discount_value)) / 100)
                if (promo.max_discount_amount) {
                    verifiedDiscount = Math.min(verifiedDiscount, Number(promo.max_discount_amount))
                }
            } else {
                verifiedDiscount = Math.min(Number(promo.discount_value), eligibleSubtotal)
            }
        }

        // ── 2b. RE-VALIDATE BXGY DISCOUNT (batched) ──
        let verifiedBXGYDiscount = 0;
        if (bxgyDetails?.discount && bxgyDetails.discount > 0 && bxgyDetails.freeItems?.length) {
            const bxgyVariantIds = bxgyDetails.freeItems.map((f: any) => f.variantId)
            const bxgyVariants = await batchSimpleVariants(bxgyVariantIds)
            const bxgyVariantMap = new Map(bxgyVariants.map((v: any) => [v.id, v]))

            // Fallback: for items not found by variantId, look up by productId default variant
            const productIds = bxgyDetails.freeItems
                .filter((f: any) => !bxgyVariantMap.has(f.variantId))
                .map((f: any) => f.productId)
            let defaultFallbackMap = new Map<string, any>()
            if (productIds.length > 0) {
                const { data: defaults } = await supabase
                    .from("product_variants")
                    .select("id, stock, price, product_id")
                    .in("product_id", productIds)
                    .eq("is_default", true)
                if (defaults) {
                    for (const d of defaults) defaultFallbackMap.set(d.product_id, d)
                }
            }

            const resolvedBXGYFreeItems = [];
            for (const freeItem of bxgyDetails.freeItems) {
                let variant = bxgyVariantMap.get(freeItem.variantId)
                if (!variant) variant = defaultFallbackMap.get(freeItem.productId)
                if (!variant || variant.stock < freeItem.quantity) {
                    throw new Error(`Free gift item is no longer available`)
                }
                resolvedBXGYFreeItems.push({ ...freeItem, variantId: variant.id })
            }
            bxgyDetails.freeItems = resolvedBXGYFreeItems
            verifiedBXGYDiscount = bxgyDetails.discount
        }

        // ── 2c. VALIDATE FREE GIFTS (batched) ──
        let verifiedGiftItems: any[] = [];
        if (giftDetails && giftDetails.length > 0) {
            // Verify gift rules (batched)
            const ruleIds = giftDetails.map((g: any) => g.ruleId).filter(Boolean)
            let ruleMap = new Map<string, any>()
            if (ruleIds.length > 0) {
                const { data: rules } = await supabase
                    .from("free_gifts")
                    .select("id, min_cart_amount, is_active, starts_at, expires_at")
                    .in("id", ruleIds)
                if (rules) for (const r of rules) ruleMap.set(r.id, r)
            }

            const giftVariantIds = giftDetails.map((g: any) => g.variantId)
            const giftVariants = await batchSimpleVariants(giftVariantIds)
            const giftVariantMap = new Map(giftVariants.map((v: any) => [v.id, v]))

            const giftProductIds = giftDetails
                .filter((g: any) => !giftVariantMap.has(g.variantId))
                .map((g: any) => g.productId)
            let giftDefaultMap = new Map<string, any>()
            if (giftProductIds.length > 0) {
                const { data: defaults } = await supabase
                    .from("product_variants")
                    .select("id, stock, price, product_id")
                    .in("product_id", giftProductIds)
                    .eq("is_default", true)
                if (defaults) {
                    for (const d of defaults) giftDefaultMap.set(d.product_id, d)
                }
            }

            for (const gift of giftDetails) {
                if (gift.ruleId) {
                    const rule = ruleMap.get(gift.ruleId)
                    if (!rule || !rule.is_active) throw new Error("Free gift rule is no longer active")
                    if (rule.min_cart_amount && rule.min_cart_amount > 0) {
                        const paidSubtotal = cartItems
                            .filter((i: any) => !i.is_gift && !i.is_bxgy_free)
                            .reduce((s: number, i: any) => s + i.price * i.quantity, 0)
                        if (paidSubtotal < rule.min_cart_amount) {
                            throw new Error(`Free gift requires minimum cart of ₹${rule.min_cart_amount}`)
                        }
                    }
                }

                let variant = giftVariantMap.get(gift.variantId)
                if (!variant) variant = giftDefaultMap.get(gift.productId)
                if (!variant || variant.stock < gift.quantity) {
                    throw new Error("Free gift is no longer available")
                }
                verifiedGiftItems.push({ ...gift, variantId: variant.id, verifiedPrice: 0 })
            }
        }

        // ── 3. RE-VERIFY SHIPPING PRICE ──
        let verifiedShippingPrice = 0;
        if (shippingDetails.shipping_method_id) {
            const { data: method } = await supabase
                .from('shipping_methods')
                .select('price')
                .eq('id', shippingDetails.shipping_method_id)
                .single()
            if (method) {
                const pincodeOk = FREE_SHIPPING_PINCODES.includes(formData.pincode)
                verifiedShippingPrice = calculatedSubtotal >= FREE_SHIPPING_THRESHOLD && pincodeOk ? 0 : Number(method.price);
            }
        }

        // ── 4. FINAL TOTAL CALCULATION ──
        const giftCardAmount = giftCardDetails?.amount || 0
        const rewardCouponDiscount = rewardCoupon?.discount || 0
        const finalTotal = Math.max(0, Math.round(calculatedSubtotal - verifiedDiscount - verifiedBXGYDiscount - giftCardAmount - rewardCouponDiscount + verifiedShippingPrice))

        // ── 5. Build order items array ──
        const orderItems: any[] = verifiedItems.map(item => ({
            product_id: item.productId,
            product_variant_id: item.variantId,
            product_name: item.name,
            variant_title: item.variantTitle,
            quantity: item.quantity,
            unit_price: item.price,
            mrp: item.mrp || item.price,
            is_gift: false,
        }))

        for (const gift of verifiedGiftItems) {
            orderItems.push({
                product_id: gift.productId,
                product_variant_id: gift.variantId,
                product_name: gift.product_name || 'Free Gift',
                variant_title: null,
                quantity: gift.quantity,
                unit_price: 0,
                mrp: 0,
                is_gift: true,
            })
        }

        if (bxgyDetails?.freeItems) {
            for (const freeItem of bxgyDetails.freeItems) {
                orderItems.push({
                    product_id: freeItem.productId,
                    product_variant_id: freeItem.variantId,
                    product_name: 'Free Item',
                    variant_title: null,
                    quantity: freeItem.quantity,
                    unit_price: 0,
                    mrp: 0,
                    is_gift: true,
                })
            }
        }

        // ── VERIFY RAZORPAY PAYMENT AMOUNT ──
        if (paymentDetails?.method === 'razorpay' && paymentDetails?.payment_id) {
            try {
                const { default: Razorpay } = await import("razorpay")
                const razorpay = new Razorpay({
                    key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
                    key_secret: process.env.RAZORPAY_KEY_SECRET!,
                })
                const payment = await razorpay.payments.fetch(paymentDetails.payment_id)
                const paidAmount = Math.round(Number(payment.amount) / 100)
                if (paidAmount !== finalTotal) {
                    throw new Error(`Payment amount mismatch: paid ₹${paidAmount}, expected ₹${finalTotal}`)
                }
            } catch (err: any) {
                if (err.message?.includes('Payment amount mismatch')) throw err
                console.error("Razorpay payment verification error:", err)
                throw new Error("Could not verify payment — order not placed")
            }
        }

        // ── Insert the main Order FIRST (before stock decrement) ──
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert([{
                user_id: user.id,
                status: 'pending',
                order_type: 'delivery',
                payment_status: paymentDetails?.status || 'unpaid',
                payment_method: paymentDetails?.method || 'COD',
                razorpay_payment_id: paymentDetails?.payment_id || null,
                total: finalTotal,
                shipping_price: verifiedShippingPrice,
                shipping_label: shippingDetails.methodName,
                shipping_method_id: shippingDetails.shipping_method_id || null,
                shipping_address: { ...formData, delivery_label: shippingDetails.deliveryTimeLabel || shippingDetails.methodName },
                promo_code: promoDetails?.code || null,
                promo_discount_amount: verifiedDiscount,
                bxgy_discount_amount: verifiedBXGYDiscount || 0,
                gift_card_discount: giftCardAmount,
            }])
            .select()
            .single()

        if (orderError) throw orderError
        createdOrderId = order.id

        // Insert Order Items
        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems.map(item => ({ ...item, order_id: order.id })))

        if (itemsError) throw itemsError

        // STOCK DECREMENT AFTER ORDER COMMIT (crash leaves orphaned order, not lost stock)
        for (const item of cartItems) {
            if (item.is_gift || item.is_bxgy_free) continue
            const ok = await atomicDecrementStock(supabase, item.variantId, item.quantity)
            if (!ok) throw new Error(`Insufficient stock for ${item.name}`)
            stockDecremented.push({ variantId: item.variantId, quantity: item.quantity })
        }
        for (const gift of verifiedGiftItems) {
            const ok = await atomicDecrementStock(supabase, gift.variantId, gift.quantity)
            if (!ok) throw new Error(`Free gift is no longer available`)
            stockDecremented.push({ variantId: gift.variantId, quantity: gift.quantity })
        }

        // Non-critical follow-up (fire-and-forget, won't fail order)
        if (promoDetails?.code) {
            try {
                const { data: promoRecord } = await supabase
                    .from('promo_codes')
                    .select('id, used_count')
                    .eq('code', promoDetails.code)
                    .single()
                if (promoRecord) {
                    await supabase.from('promo_codes').update({ used_count: (promoRecord.used_count || 0) + 1 }).eq('id', promoRecord.id)
                    await supabase.from('promo_redemptions').insert({ promo_id: promoRecord.id, user_id: user.id, order_id: order.id })
                }
            } catch {}
        }

        if (giftCardDetails) {
            try {
                const { data: gc } = await supabase.from('gift_cards').select('id').eq('code', giftCardDetails.code).single()
                if (gc) await supabase.from('gift_card_redemptions').insert({ gift_card_id: gc.id, order_id: order.id, amount: giftCardDetails.amount })
            } catch {}
        }

        if (rewardCoupon) {
            try { const { markCouponUsed } = await import("./loyalty"); await markCouponUsed(rewardCoupon.id) } catch {}
        }

        try { const { earnOrderPoints } = await import("./loyalty"); await earnOrderPoints(user.id, order.id, finalTotal) } catch {}

        revalidatePath("/admin/orders")
        revalidatePath("/profile")
        return { success: true, orderId: order.id }

    } catch (error: any) {
        console.error("ORDER_PLACEMENT_ERROR:", error)
        // Rollback stock that was decremented (will be partial if crash occurred mid-decrement)
        for (const { variantId, quantity } of stockDecremented) {
            try { await supabase.rpc('increment_stock', { row_id: variantId, amount: quantity }) } catch {}
        }
        // Delete order if it was created (stock was decremented after order, so this prevents partial orders)
        if (createdOrderId) {
            try { await supabase.from('orders').delete().eq('id', createdOrderId) } catch {}
        }
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


export async function cancelOrderAndRestoreStock(orderId: string, reason?: string) {
    const supabase = await createClient()

    try {
        // 1. Get current user session
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("Authentication required")

        // 2. Fetch Order and Admin Status in parallel for speed
        const [orderRes, profileRes] = await Promise.all([
            supabase
                .from('orders')
                .select('status, user_id, payment_method, payment_status, razorpay_payment_id, order_items(product_variant_id, quantity)')
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

        // 4b. Process Razorpay refund if paid via Razorpay
        if (order.payment_method === 'razorpay' && order.payment_status === 'paid' && order.razorpay_payment_id) {
            try {
                const { default: Razorpay } = await import("razorpay")
                const razorpay = new Razorpay({
                    key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
                    key_secret: process.env.RAZORPAY_KEY_SECRET!,
                })
                await razorpay.payments.refund(order.razorpay_payment_id, {})
            } catch (refundErr) {
                console.error("Razorpay refund error:", refundErr)
                throw new Error("Failed to process Razorpay refund")
            }
        }

        // 5. UPDATE: Set status to cancelled + record who cancelled + update payment status
        const updatePayload: any = {
            status: 'cancelled',
            cancelled_by: isAdmin ? 'admin' : 'user',
            cancellation_reason: reason || null,
            updated_at: new Date().toISOString(),
        }
        if (order.payment_method === 'razorpay') {
            updatePayload.payment_status = 'refunded'
        }
        const { error: updateErr } = await supabase
            .from('orders')
            .update(updatePayload)
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

        // 7. Void pending loyalty points for this order
        try {
            const { data: pendingTx } = await supabase
                .from("loyalty_transactions")
                .select("id")
                .eq("reference_id", orderId)
                .eq("status", "pending")
                .maybeSingle()
            if (pendingTx) {
                await supabase
                    .from("loyalty_transactions")
                    .update({ status: "cancelled", note: "Order cancelled — points voided" })
                    .eq("id", pendingTx.id)
            }
        } catch {}

        // 8. CACHE CLEARING: Update the UI for both Admin and User
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

export async function processPartialRefund(
    orderId: string,
    items: { itemId: string; quantity: number }[],
    reason: string,
    refundMethod: "razorpay" | "gpay",
    transactionId?: string
) {
    await requireAdmin()
    const supabase = await createClient()

    try {
        const { data: order, error: orderErr } = await supabase
            .from("orders")
            .select("*, order_items(*)")
            .eq("id", orderId)
            .single()

        if (orderErr || !order) throw new Error("Order not found")
        if (order.payment_status !== "paid") throw new Error("Order must be paid to process refund")

        let totalRefundAmount = 0
        const refundedItems: any[] = []

        for (const selected of items) {
            const orderItem = order.order_items.find((oi: any) => oi.id === selected.itemId)
            if (!orderItem) throw new Error(`Order item ${selected.itemId} not found`)

            const alreadyRefunded = Number(orderItem.refunded_quantity || 0)
            const available = orderItem.quantity - alreadyRefunded

            if (selected.quantity <= 0) throw new Error(`Invalid quantity for item ${orderItem.product_name}`)
            if (selected.quantity > available) throw new Error(`Only ${available} units available for refund on ${orderItem.product_name}`)

            const refundAmount = Number(orderItem.unit_price) * selected.quantity
            totalRefundAmount += refundAmount

            refundedItems.push({
                ...orderItem,
                refundQuantity: selected.quantity,
                refundAmount,
            })
        }

        if (totalRefundAmount <= 0) throw new Error("Refund amount must be greater than 0")

        let razorpayRefundId: string | null = null

        if (refundMethod === "razorpay") {
            if (!order.razorpay_payment_id) throw new Error("No Razorpay payment ID found for this order")
            try {
                const { default: Razorpay } = await import("razorpay")
                const razorpay = new Razorpay({
                    key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
                    key_secret: process.env.RAZORPAY_KEY_SECRET!,
                })
                const refund = await razorpay.payments.refund(order.razorpay_payment_id, {
                    amount: Math.round(totalRefundAmount * 100),
                })
                razorpayRefundId = refund.id || null
            } catch (refundErr) {
                console.error("Razorpay refund error:", refundErr)
                throw new Error("Failed to process Razorpay refund")
            }
        }

        const { data: { user } } = await supabase.auth.getUser()

        const allFullyRefunded = order.order_items.every((oi: any) => {
            const alreadyRefunded = Number(oi.refunded_quantity || 0)
            const selectedItem = items.find((s: any) => s.itemId === oi.id)
            const thisRefund = selectedItem ? selectedItem.quantity : 0
            return (alreadyRefunded + thisRefund) >= oi.quantity
        })

        await supabase.from("orders").update({
            payment_status: allFullyRefunded ? "refunded" : "partially_refunded",
            updated_at: new Date().toISOString(),
        }).eq("id", orderId)

        for (const ri of refundedItems) {
            const alreadyRefunded = Number(ri.refunded_quantity || 0)
            const alreadyAmount = Number(ri.refunded_amount || 0)

            await supabase.from("order_items").update({
                refunded_quantity: alreadyRefunded + ri.refundQuantity,
                refunded_amount: alreadyAmount + ri.refundAmount,
            }).eq("id", ri.id)

            if (ri.product_variant_id) {
                const { error: rpcErr } = await supabase.rpc("increment_stock", {
                    row_id: ri.product_variant_id,
                    amount: ri.refundQuantity,
                })
                if (rpcErr) {
                    const { data: variant } = await supabase
                        .from("product_variants")
                        .select("stock")
                        .eq("id", ri.product_variant_id)
                        .single()
                    if (variant) {
                        await supabase
                            .from("product_variants")
                            .update({ stock: variant.stock + ri.refundQuantity })
                            .eq("id", ri.product_variant_id)
                    }
                }
            }
        }

        await supabase.from("order_refunds").insert({
            order_id: orderId,
            amount: totalRefundAmount,
            reason: reason || null,
            refund_method: refundMethod,
            transaction_id: refundMethod === "razorpay" ? razorpayRefundId : (transactionId || null),
            processed_by: user?.id,
        })

        revalidatePath("/admin/orders")
        revalidatePath(`/admin/orders/${orderId}`)

        return {
            success: true,
            amount: totalRefundAmount,
            refundMethod,
            transactionId: refundMethod === "razorpay" ? razorpayRefundId : transactionId,
            paymentStatus: allFullyRefunded ? "refunded" : "partially_refunded",
        }
    } catch (error: any) {
        console.error("PARTIAL_REFUND_ERROR:", error)
        return { success: false, message: error.message || "Failed to process refund" }
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

export async function updateOrderStatus(orderId: string, status: string, deliveryPartnerId?: string, trackingNumber?: string) {
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

        // Set delivery partner and tracking when shipping
        if (newStatus === 'shipped') {
            if (deliveryPartnerId) updatePayload.delivery_partner_id = deliveryPartnerId
            if (trackingNumber) updatePayload.tracking_number = trackingNumber
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

        // Release loyalty points on delivery
        if (newStatus === "delivered" && oldStatus !== "delivered") {
            try {
                const { releasePendingPoints } = await import("./loyalty")
                await releasePendingPoints(orderId)
            } catch {}
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

export async function updateOrderDeliveryPartner(orderId: string, deliveryPartnerId: string | null) {
    await requireAdmin()
    const supabase = await createClient()

    try {
        const { error } = await supabase
            .from('orders')
            .update({ delivery_partner_id: deliveryPartnerId, updated_at: new Date().toISOString() })
            .eq('id', orderId)

        if (error) throw error

        revalidatePath('/admin/orders')
        revalidatePath(`/admin/orders/${orderId}`)
        return { success: true }
    } catch (error: any) {
        console.error("UPDATE_DELIVERY_PARTNER_ERROR:", error)
        return { success: false, message: error.message }
    }
}