


'use server'

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

/**
 * PLACE ORDER
 */
/**
 * PLACE ORDER - UPDATED TO INCLUDE MRP
 */
// export async function placeOrder(formData: any, cartItems: any[], shippingDetails: any, promoDetails?: { code: string; discount: number }) {
//     const supabase = await createClient()
//     const { data: { user } } = await supabase.auth.getUser()
//     if (!user) throw new Error("User not authenticated")

//     try {
//         // 1. Check stock availability
//         for (const item of cartItems) {
//             const { data: variant, error: stockErr } = await supabase
//                 .from("product_variants")
//                 .select("stock, title")
//                 .eq("id", item.variantId)
//                 .single()

//             if (stockErr || !variant) throw new Error(`Product variant not found`)
//             if (variant.stock < item.quantity) {
//                 throw new Error(`Insufficient stock for ${item.name}. Only ${variant.stock} left.`)
//             }
//         }

//         // 2. Insert the main Order
//         const { data: order, error: orderError } = await supabase
//             .from('orders')
//             .insert([{
//                 user_id: user.id,
//                 status: 'pending',
//                 payment_status: 'unpaid',
//                 payment_method: 'COD',
//                 total: shippingDetails.total,
//                 shipping_price: shippingDetails.price,
//                 shipping_label: shippingDetails.methodName,
//                 shipping_address: formData,
//                 promo_code: promoDetails?.code || null,
//                 promo_discount_amount: promoDetails?.discount || 0,
//             }])
//             .select()
//             .single()

//         if (orderError) throw orderError

//         // 3. Insert Order Items (Updated to include MRP)
//         const itemsToInsert = cartItems.map(item => ({
//             order_id: order.id,
//             product_id: item.productId,
//             product_variant_id: item.variantId,
//             product_name: item.name,
//             variant_title: item.variantTitle,
//             quantity: item.quantity,
//             unit_price: item.price, // This is the discounted price
//             mrp: item.mrp || item.price, // Capture original price, fallback to current price if no discount
//         }))

//         const { error: itemsError } = await supabase
//             .from('order_items')
//             .insert(itemsToInsert)

//         if (itemsError) throw itemsError

//         // 4. Decrease Stock
//         for (const item of cartItems) {
//             await supabase.rpc('decrement_stock', {
//                 row_id: item.variantId,
//                 amount: item.quantity
//             })
//         }

//         revalidatePath("/admin/orders")
//         revalidatePath("/admin/products")
//         revalidatePath("/profile")

//         return { success: true, orderId: order.id }

//     } catch (error: any) {
//         console.error("ORDER_PLACEMENT_ERROR:", error)
//         return { success: false, message: error.message }
//     }
// }

export async function placeOrder(
    formData: any,
    cartItems: any[],
    shippingDetails: { total: number; price: number; methodName: string },
    promoDetails?: { code: string; discount: number }
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("User not authenticated")

    try {
        // 1. Check stock availability before doing anything
        for (const item of cartItems) {
            const { data: variant, error: stockErr } = await supabase
                .from("product_variants")
                .select("stock, title")
                .eq("id", item.variantId)
                .single()

            if (stockErr || !variant) throw new Error(`Product variant not found`)
            if (variant.stock < item.quantity) {
                throw new Error(`Insufficient stock for ${item.name}. Only ${variant.stock} left.`)
            }
        }

        // 2. Insert the main Order
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert([{
                user_id: user.id,
                status: 'pending',
                payment_status: 'unpaid',
                payment_method: 'COD',
                total: shippingDetails.total,
                shipping_price: shippingDetails.price,
                shipping_label: shippingDetails.methodName,
                shipping_address: formData,
                // These columns must exist in your public.orders table
                promo_code: promoDetails?.code || null,
                promo_discount_amount: promoDetails?.discount || 0,
            }])
            .select()
            .single()

        if (orderError) throw orderError

        // 3. Insert Order Items
        const itemsToInsert = cartItems.map(item => ({
            order_id: order.id,
            product_id: item.productId,
            product_variant_id: item.variantId,
            product_name: item.name,
            variant_title: item.variantTitle,
            quantity: item.quantity,
            unit_price: item.price,
            mrp: item.mrp || item.price,
        }))

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(itemsToInsert)

        if (itemsError) throw itemsError

        // 4. Update Promo Code Usage Count (If a code was used)
        if (promoDetails?.code) {
            const { data: promoRecord } = await supabase
                .from('promo_codes')
                .select('used_count')
                .eq('code', promoDetails.code)
                .single()

            await supabase
                .from('promo_codes')
                .update({ used_count: (promoRecord?.used_count || 0) + 1 })
                .eq('code', promoDetails.code)
        }

        // 5. Decrease Stock via RPC
        for (const item of cartItems) {
            const { error: rpcErr } = await supabase.rpc('decrement_stock', {
                row_id: item.variantId,
                amount: item.quantity
            })

            // Fallback if RPC fails: Manual update
            if (rpcErr) {
                const { data: v } = await supabase
                    .from('product_variants')
                    .select('stock')
                    .eq('id', item.variantId)
                    .single()

                if (v) {
                    await supabase
                        .from('product_variants')
                        .update({ stock: v.stock - item.quantity })
                        .eq('id', item.variantId)
                }
            }
        }

        revalidatePath("/admin/orders")
        revalidatePath("/admin/products")
        revalidatePath("/profile")

        return { success: true, orderId: order.id }

    } catch (error: any) {
        console.error("ORDER_PLACEMENT_ERROR:", error)
        return { success: false, message: error.message }
    }
}

export async function cancelOrderAndRestoreStock(orderId: string) {
    const supabase = await createClient()

    try {
        // 1. Get current user for security check
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("Authentication required")

        // 2. Fetch order, items, and user_id
        const { data: order, error: orderFetchErr } = await supabase
            .from('orders')
            .select('status, user_id, order_items(product_variant_id, quantity)')
            .eq('id', orderId)
            .single()

        if (orderFetchErr || !order) throw new Error("Order not found")

        // 3. SECURITY: Verify ownership
        // Only allow the person who placed the order or an admin to cancel it
        // If you have a specific way to identify admins, add that logic here
        if (order.user_id !== user.id) {
            throw new Error("Unauthorized: You do not have permission to cancel this order")
        }

        // 4. STATUS CHECK: Prevent cancelling shipped/delivered items
        const protectedStatuses = ['shipped', 'delivered']
        if (protectedStatuses.includes(order.status.toLowerCase())) {
            throw new Error(`Cannot cancel order once it has been ${order.status}.`)
        }

        if (order.status === 'cancelled') {
            throw new Error("Order is already cancelled")
        }

        // 5. UPDATE: Set status to cancelled
        const { error: updateErr } = await supabase
            .from('orders')
            .update({ status: 'cancelled' })
            .eq('id', orderId)

        if (updateErr) throw updateErr

        // 6. RESTORE STOCK: Loop through items and increment inventory
        const items = order.order_items
        for (const item of items) {
            const { error: rpcErr } = await supabase.rpc('increment_stock', {
                row_id: item.product_variant_id,
                amount: item.quantity
            })

            // Fallback if the RPC function isn't found in your Supabase DB
            if (rpcErr) {
                const { data: v } = await supabase
                    .from('product_variants')
                    .select('stock')
                    .eq('id', item.product_variant_id)
                    .single()

                if (v) {
                    await supabase
                        .from("product_variants")
                        .update({ stock: v.stock + item.quantity })
                        .eq("id", item.product_variant_id)
                }
            }
        }

        // 7. CACHE CLEARING: Refresh all relevant routes
        revalidatePath("/admin/orders")
        revalidatePath("/admin/products")
        revalidatePath("/profile")
        revalidatePath(`/profile/orders/${orderId}`) // Refresh the specific details page

        return { success: true }
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
    const supabase = await createClient()

    try {
        // 1. Create the Master Order
        const { data: order, error: orderErr } = await supabase
            .from('orders')
            .insert({
                user_id: data.userId,
                total: data.total,
                status: 'pending',
                payment_status: 'unpaid',
                payment_method: 'B2B_INVOICE',
                currency: 'INR'
            })
            .select()
            .single()

        if (orderErr) throw new Error(`Order Header Error: ${orderErr.message}`)

        // 2. Prepare Line Items
        // We use the prices calculated by the Category Logic on the frontend
        const itemsToInsert = data.items.map(item => ({
            order_id: order.id,
            product_id: item.product_id, // Passed from the variant join
            product_variant_id: item.variant_id,
            product_name: item.name,
            quantity: item.qty,
            unit_price: item.price,
            currency: 'INR'
        }))

        // 3. Batch Insert Order Items
        const { error: itemErr } = await supabase
            .from('order_items')
            .insert(itemsToInsert)

        if (itemErr) {
            await supabase.from('orders').delete().eq('id', order.id)
            throw new Error(`Order Items Error: ${itemErr.message}`)
        }

        revalidatePath('/admin/orders')
        revalidatePath('/b2b/orders')

        return { success: true, orderId: order.id }

    } catch (error: any) {
        console.error("B2B Order Failure:", error.message)
        return { success: false, error: error.message }
    }
}