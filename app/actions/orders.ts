"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin"
import { OrderPOSSchema } from "@/lib/schemas"
import { checkPromoEligibility } from "@/lib/promo-helper"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';



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
    promoDetails?: { code: string; discount: number; id?: string }
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("User not authenticated")

    try {
        // 1. RE-VALIDATE PRICES AND STOCK
        let calculatedSubtotal = 0;
        const verifiedItems = [];

        for (const item of cartItems) {
            const { data: variant, error: varError } = await supabase
                .from("product_variants")
                .select("price, stock, product_id, title, products(name, category_id)")
                .eq("id", item.variantId)
                .single()

            if (varError || !variant) throw new Error(`Product not found: ${item.name}`)
            if (variant.stock < item.quantity) throw new Error(`Insufficient stock for ${item.name}`)

            const price = Number(variant.price)
            calculatedSubtotal += price * item.quantity
            
            verifiedItems.push({
                ...item,
                price: price, // Use DB price
                categoryId: (variant.products as any)?.category_id
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
                verifiedDiscount = (eligibleSubtotal * Number(promo.discount_value)) / 100
                if (promo.max_discount_amount) {
                    verifiedDiscount = Math.min(verifiedDiscount, Number(promo.max_discount_amount))
                }
            } else {
                verifiedDiscount = Math.min(Number(promo.discount_value), eligibleSubtotal)
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
                const FREE_SHIPPING_THRESHOLD = 3000;
                verifiedShippingPrice = calculatedSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : Number(method.price);
            }
        }

        // 4. FINAL TOTAL CALCULATION
        const finalTotal = calculatedSubtotal - verifiedDiscount + verifiedShippingPrice

        // 5. Insert the main Order
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert([{
                user_id: user.id,
                status: 'pending',
                payment_status: 'unpaid',
                payment_method: 'COD',
                total: finalTotal,
                shipping_price: verifiedShippingPrice,
                shipping_label: shippingDetails.methodName,
                shipping_method_id: shippingDetails.shipping_method_id || null,
                shipping_address: { ...formData, delivery_label: shippingDetails.deliveryTimeLabel || shippingDetails.methodName },
                promo_code: promoDetails?.code || null,
                promo_discount_amount: verifiedDiscount,
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
        }))

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

        // 6. Stock Update (With Robust Fallback)
        for (const item of cartItems) {
            const { error: rpcErr } = await supabase.rpc('decrement_stock', {
                row_id: item.variantId,
                amount: item.quantity
            })

            if (rpcErr) {
                console.warn("RPC decrement_stock failed, falling back to manual update")
                const { data: variant } = await supabase
                    .from('product_variants')
                    .select('stock')
                    .eq('id', item.variantId)
                    .single()

                if (variant) {
                    await supabase
                        .from("product_variants")
                        .update({ stock: Math.max(0, variant.stock - item.quantity) })
                        .eq("id", item.variantId)
                }
            }
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
        const protectedStatuses = ['shipped', 'delivered', 'dispatched']
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

            const lineTotal = unitPrice * item.qty
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
                payment_status: 'unpaid',
                payment_method: 'B2B_INVOICE',
                currency: 'INR'
            })
            .select()
            .single()

        if (orderErr) throw new Error(`Order Header Error: ${orderErr.message}`)

        // 3. Insert verified line items
        const itemsToInsert = verifiedItems.map(item => ({
            ...item,
            order_id: order.id,
        }))

        const { error: itemErr } = await supabase
            .from('order_items')
            .insert(itemsToInsert)

        if (itemErr) {
            await supabase.from('orders').delete().eq('id', order.id)
            throw new Error(`Order Items Error: ${itemErr.message}`)
        }

        // 4. DECREMENT STOCK
        for (const item of verifiedItems) {
            const { error: rpcErr } = await supabase.rpc('decrement_stock', {
                row_id: item.product_variant_id,
                amount: item.quantity
            })

            if (rpcErr) {
                console.warn(`RPC decrement_stock failed for ${item.product_variant_id}, falling back to manual update`)
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

    if (deleteError) return { success: false, message: "Clean up failed: " + deleteError.message };

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

    if (insertError) return { success: false, message: "Insertion failed: " + insertError.message };

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
    const finalTotal = itemsTotal - data.globalDiscount + data.additionalCharges;

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

        if (deleteErr) throw new Error("Failed to remove item: " + deleteErr.message)
        if (!deleted || deleted.length === 0) throw new Error("Item not deleted — RLS policy may be blocking the operation")

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
        const finalTotal = itemsTotal - Number(order?.promo_discount_amount || 0) + Number(order?.additional_charges || 0) + Number(order?.shipping_price || 0)

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
        const finalTotal = itemsTotal - discountAmount + Number(order?.additional_charges || 0) + Number(order?.shipping_price || 0)

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

        const updatePayload: any = {
            status: newStatus,
            updated_at: new Date().toISOString()
        }

        if (newStatus === 'delivered' && oldStatus !== 'delivered') {
            updatePayload.delivered_at = new Date().toISOString()
        }

        const { error: updateErr } = await supabase
            .from('orders')
            .update(updatePayload)
            .eq('id', orderId)

        if (updateErr) throw updateErr

        // Check if transition to delivered should trigger stock decrement
        // Only do this if it's NOT a website order (which decrements on placement)
        // We identify wholesale/POS by payment methods or other fields.
        const isB2B = order.payment_method === 'B2B_INVOICE'
        const isDeliveredFirstTime = newStatus === 'delivered' && oldStatus !== 'delivered'
        
        if (isDeliveredFirstTime && isB2B) {
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

        revalidatePath('/admin/orders')
        revalidatePath(`/admin/orders/${orderId}`)
        return { success: true, oldStatus, newStatus, userId: order.user_id }
    } catch (error: any) {
        console.error("UPDATE_STATUS_ERROR:", error)
        return { success: false, message: error.message }
    }
}