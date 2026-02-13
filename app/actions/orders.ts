"use server"
import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

// export async function placeOrder(
//     formData: any,
//     cartItems: any[],
//     shippingDetails: { total: number; price: number; methodName: string },
//     promoDetails?: { code: string; discount: number; id?: string } // Added id here
// ) {
//     const supabase = await createClient()
//     const { data: { user } } = await supabase.auth.getUser()
//     if (!user) throw new Error("User not authenticated")

//     try {
//         // 1. Check stock availability
//         for (const item of cartItems) {
//             const { data: variant, error: stockErr } = await supabase
//                 .from("product_variants")
//                 .select("stock")
//                 .eq("id", item.variantId)
//                 .single()

//             if (stockErr || !variant) throw new Error(`Product variant not found`)
//             if (variant.stock < item.quantity) {
//                 throw new Error(`Insufficient stock for ${item.name}`)
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

//         // 3. Insert Order Items
//         const itemsToInsert = cartItems.map(item => ({
//             order_id: order.id,
//             product_id: item.productId,
//             product_variant_id: item.variantId,
//             product_name: item.name,
//             variant_title: item.variantTitle,
//             quantity: item.quantity,
//             unit_price: item.price,
//             mrp: item.mrp || item.price,
//         }))

//         const { error: itemsError } = await supabase
//             .from('order_items')
//             .insert(itemsToInsert)

//         if (itemsError) throw itemsError

//         // 4. PROMO LOGIC: Update Usage Count AND Record Redemption
//         if (promoDetails?.code) {
//             // Update global usage count
//             const { data: promoRecord } = await supabase
//                 .from('promo_codes')
//                 .select('id, used_count')
//                 .eq('code', promoDetails.code)
//                 .single()

//             if (promoRecord) {
//                 await supabase
//                     .from('promo_codes')
//                     .update({ used_count: (promoRecord.used_count || 0) + 1 })
//                     .eq('id', promoRecord.id)

//                 // NEW: Record specific user redemption for "Once Per User" enforcement
//                 await supabase
//                     .from('promo_redemptions')
//                     .insert({
//                         promo_id: promoRecord.id,
//                         user_id: user.id,
//                         order_id: order.id
//                     })
//             }
//         }

//         // 5. Decrease Stock via RPC
//         for (const item of cartItems) {
//             await supabase.rpc('decrement_stock', {
//                 row_id: item.variantId,
//                 amount: item.quantity
//             })
//         }

//         // 6. Push Notification Logic
//         try {
//             const { data: subs } = await supabase
//                 .from('push_subscriptions')
//                 .select('subscription_json')
//                 .eq('user_id', user.id);

//             if (subs && subs.length > 0) {
//                 const payload = {
//                     title: "Order Confirmed! 🎉",
//                     body: `Your order #${order.id.slice(0, 8)} has been placed.`,
//                     url: `/profile/orders/${order.id}`
//                 };

//                 await Promise.all(subs.map(s =>
//                     fetch(`${SITE_URL}/api/push`, {
//                         method: 'POST',
//                         headers: { 'Content-Type': 'application/json' },
//                         body: JSON.stringify({ subscription: s.subscription_json, payload }),
//                         cache: 'no-store'
//                     })
//                 ));
//             }
//         } catch (e) { console.error("Push Error:", e); }

//         revalidatePath("/admin/orders")
//         revalidatePath("/profile")
//         return { success: true, orderId: order.id }

//     } catch (error: any) {
//         console.error("ORDER_PLACEMENT_ERROR:", error)
//         return { success: false, message: error.message }
//     }
// }

// ... cancelOrderAndRestoreStock and createWholesaleOrder functions follow


export async function placeOrder(
    formData: any, // Now includes area_name from our updated AddressForm
    cartItems: any[],
    shippingDetails: {
        total: number;
        price: number;
        methodName: string;
        shipping_method_id?: string | null // Added to link to your shipping_methods table
    },
    promoDetails?: { code: string; discount: number; id?: string }
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("User not authenticated")

    try {
        // 1. Check stock availability (Keep your existing loop)
        for (const item of cartItems) {
            const { data: variant } = await supabase
                .from("product_variants")
                .select("stock")
                .eq("id", item.variantId)
                .single()

            if (!variant || variant.stock < item.quantity) {
                throw new Error(`Insufficient stock for ${item.name}`)
            }
        }

        // 2. Insert the main Order
        // Note: We added shipping_method_id to link back to your schema
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
                shipping_method_id: shippingDetails.shipping_method_id || null, // Link to schema
                shipping_address: formData, // Contains full_name, street, area_name, pincode, etc.
                promo_code: promoDetails?.code || null,
                promo_discount_amount: promoDetails?.discount || 0,
            }])
            .select()
            .single()

        if (orderError) throw orderError

        // 3. Insert Order Items (Your existing logic is perfect)
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

        // 4. Promo Usage Logic (Keep your existing redemption logic)
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

        // 5. Stock Update (Using your existing RPC)
        for (const item of cartItems) {
            await supabase.rpc('decrement_stock', {
                row_id: item.variantId,
                amount: item.quantity
            })
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