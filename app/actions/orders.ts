"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin"
import { createAdminClient } from "@/utils/supabase/admin"
import { checkoutQuote, uuidPattern } from "@/lib/checkout-pricing"
import { quoteFingerprint, requestFingerprint, verifyCapturedPayment } from "@/lib/verified-payment"
import { randomUUID } from "node:crypto"
import { refundPaymentOnce } from "@/lib/verified-payment"
import { checkoutOrderItems } from "@/lib/checkout-order-items"
import { VALID_TRANSITIONS, STATUS_TIMESTAMPS } from "@/lib/order-status"
import { sendOrderPush } from "@/lib/order-push"
import { notifyBackInStock } from "./back-in-stock-notify"

async function atomicDecrementStock(supabase: Awaited<ReturnType<typeof createClient>>, variantId: string, quantity: number) {
    const { error: rpcErr } = await supabase.rpc('decrement_stock', {
        row_id: variantId,
        amount: quantity
    })

    if (!rpcErr) return true

    console.warn("RPC decrement_stock failed, falling back to optimistic-lock decrement")

    for (let attempt = 0; attempt < 5; attempt++) {
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
            .eq('stock', currentStock)
            .select('id')
            .single()

        if (!updateErr && updated) return true

        if (attempt < 4) {
            await new Promise(r => setTimeout(r, Math.min(50 * Math.pow(2, attempt) + Math.random() * 50, 1000)))
        }
    }
    console.error("All stock decrement attempts failed for", variantId)
    return false
}

async function withRestockNotifications<T extends {error:{message:string}|null}>(
    db:Awaited<ReturnType<typeof createAdminClient>>,orderId:string,operation:()=>PromiseLike<T>
):Promise<T> {
    let before:{id:string;stock:number}[]=[]
    try{
        const {data:lines}=await db.from('order_items').select('product_variant_id').eq('order_id',orderId)
        const ids=[...new Set((lines || []).map(i=>i.product_variant_id).filter(Boolean))]
        if(ids.length){const {data}=await db.from('product_variants').select('id,stock').in('id',ids);before=(data || []).filter(v=>v.stock<=0)}
    }catch{ /* Notification preparation must not block financial reconciliation. */ }
    const result=await operation()
    if(!result.error&&before.length){
        try{
            const {data}=await db.from('product_variants').select('id,stock').in('id',before.map(v=>v.id))
            await Promise.all((data || []).filter(v=>v.stock>0).map(v=>notifyBackInStock(v.id).catch(error=>console.warn('Restock notification failed:',error))))
        }catch(error){console.warn('Restock notification check failed:',error)}
    }
    return result
}

export async function placeOrder(
    formData: any,
    cartItems: any[],
    shippingDetails: {
        total: number;
        price: number;
        methodName: string;
        deliveryTimeLabel?: string;
        shipping_method_id?: string | null;
        quoteFingerprint?: string
    },
    promoDetails?: { code: string; discount: number; id?: string },
    bxgyDetails?: { discount: number; appliedRuleIds?: string[]; freeItems?: { variantId: string; productId: string; ruleId?: string; quantity: number }[] },
    giftDetails?: { variantId: string; productId: string; ruleId?: string; quantity: number }[],
    giftCardDetails?: { code: string; amount: number },
    coinRedemption?: { amount: number },
    paymentDetails?: { method: string; payment_id?: string; status: string; order_id?: string; signature?: string },
    checkoutKey?: string
) {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) throw new Error("User not authenticated")
    if (!checkoutKey || !uuidPattern.test(checkoutKey)) return { success: false, message: "Please refresh checkout before placing your order" }
    const supabase = await createAdminClient()
    if (!Array.isArray(cartItems) || !cartItems.length || cartItems.length > 100 || cartItems.some(i => !i || typeof i !== 'object') ||
        !formData || typeof formData !== 'object' || !shippingDetails || typeof shippingDetails !== 'object' ||
        (giftDetails && (!Array.isArray(giftDetails) || giftDetails.length > 100))) return { success: false, message: "Invalid checkout details" }
    // The legacy argument is retained for existing callers; its amounts and rewards are untrusted.
    void bxgyDetails
    void giftDetails
    const requestHash = requestFingerprint({
        address: formData, items: cartItems.map(i => ({ variantId: i.variantId, quantity: i.quantity, gift: !!i.is_gift, bxgy: !!i.is_bxgy_free })),
        shipping: shippingDetails.shipping_method_id, promo: promoDetails?.code || null,
        giftCard: giftCardDetails?.code || null, coins: coinRedemption?.amount || 0,
        payment: paymentDetails?.payment_id || null, quote: shippingDetails.quoteFingerprint || null,
    })
    try {
        const { data: prior, error: priorError } = await supabase.from('orders').select('id,checkout_request_hash').eq('user_id', user.id).eq('checkout_key', checkoutKey).maybeSingle()
        if (priorError) throw priorError
        if (prior) {
            if (prior.checkout_request_hash !== requestHash) throw new Error("This checkout attempt was already used for different details. Refresh checkout.")
            return { success: true, orderId: prior.id }
        }
        const pricingInput = { shippingMethodId: shippingDetails.shipping_method_id || '', pincode: String(formData.pincode || ''), promoCode: promoDetails?.code, giftCardCode: giftCardDetails?.code, coinAmount: coinRedemption?.amount }
        const quote = await checkoutQuote(supabase, user.id, cartItems, pricingInput)
        const fingerprint = quoteFingerprint(quote,pricingInput)
        if (!shippingDetails.quoteFingerprint || shippingDetails.quoteFingerprint !== fingerprint) throw new Error('Your basket or offers changed. Please review the updated checkout before paying.')
        const orderItems = checkoutOrderItems(quote)
        const stock = quote.items.map(item => ({ id: item.variantId, quantity: item.quantity, source: 'variant' }))
        for (const gift of quote.freeItems) {
            orderItems.push({ product_id: gift.productId, product_variant_id: gift.variantId,gift_product_id:gift.giftProductId,
                product_name: gift.name, variant_title: 'Gift', quantity: 1, unit_price: 0, mrp: gift.mrp, is_gift: true,
                line_discount_amount:0,promotion_allocations:[{rule_id:gift.ruleId,quantity:1,amount:0}] })
            stock.push({ id: gift.variantId || gift.giftProductId!, quantity: 1, source: gift.giftProductId ? 'gift_products' : 'variant' })
        }
        let paymentMethod = 'COD'
        let paymentStatus = 'unpaid'
        if (paymentDetails) {
            if (paymentDetails.method !== 'razorpay' || !paymentDetails.payment_id || !paymentDetails.order_id || !paymentDetails.signature) throw new Error('Verified payment details are required')
            await verifyCapturedPayment({ orderId: paymentDetails.order_id, paymentId: paymentDetails.payment_id,
                signature: paymentDetails.signature, userId: user.id, amountPaise: Math.round(quote.total * 100),
                purpose: 'checkout', fingerprint: quoteFingerprint(quote, pricingInput) })
            paymentMethod = 'razorpay'
            paymentStatus = 'paid'
        }
        const { data: committed, error: commitError } = await supabase.rpc('commit_secure_checkout', {
            p_user_id: user.id, p_key: checkoutKey, p_hash: requestHash,
            p_order: { payment_method: paymentMethod, payment_status: paymentStatus,
                razorpay_payment_id: paymentDetails?.payment_id || null, total: quote.total,
                shipping_price: quote.shippingPrice, shipping_label: quote.shippingLabel,
                shipping_method_id: pricingInput.shippingMethodId,
                shipping_address: { ...formData, delivery_label: quote.deliveryTimeLabel || quote.shippingLabel },
                promo_code: pricingInput.promoCode || null, promo_discount_amount: quote.promoDiscount,
                bxgy_discount_amount: quote.bxgyDiscount, gift_card_discount: quote.giftCardDiscount, coin_discount_amount: quote.coinDiscount,
                offer_snapshot:{version:2,qualifying_subtotal:quote.qualifyingSubtotal,discounts:quote.discounts,gifts:quote.freeItems,bxgy_allocations:quote.bxgyAllocations,
                    coupon_discount:quote.promoDiscount,merchandise_subtotal:quote.subtotal,fingerprint,
                    pricing_context: quote.previewCatalog ? {
                        snapshot: {...quote.previewCatalog,flashSales:undefined,
                            bxgyRules:quote.previewCatalog.bxgyRules.filter(r=>quote.promotions.some(p=>p.kind==='bxgy'&&p.id===r.id)),
                            giftRules:quote.previewCatalog.giftRules.filter(r=>quote.promotions.some(p=>p.kind==='gift'&&p.id===r.id)),
                            giftOptions:quote.previewCatalog.giftOptions.map(g=>({...g,stock:0})),expiresAt:0},
                        coupon:quote.couponDefinition,
                        bases:Object.fromEntries(quote.items.map(i=>[`variant:${i.variantId}`,{price:i.price,mrp:i.mrp,categoryIds:i.categoryIds,brand:i.brand}]))
                    } : undefined} },
            p_items: orderItems, p_stock: stock,
            p_promotions: quote.promotions,
            p_gift_code: pricingInput.giftCardCode || null,
        })
        if (commitError || !committed?.order_id) throw new Error(commitError?.message || 'Checkout could not be committed')
        const orderId = committed.order_id as string
        if (!committed.replayed) {
            // These follow-ups cannot roll back a successfully committed financial transaction.
            try {
                const { data: cart } = await supabase.from('carts').select('id').eq('user_id', user.id).maybeSingle()
                if (cart) { await supabase.from('cart_items').delete().eq('cart_id', cart.id); await supabase.from('carts').delete().eq('id', cart.id) }
            } catch (error) { console.warn('Checkout cart cleanup failed:', error) }
            try { await sendOrderPush(supabase, orderId, user.id, 'confirmed') } catch (error) { console.warn('Order push failed:', error) }
            try {
                const phone = formData.phone
                if (phone) { const { sendOrderNotification } = await import('./whatsapp'); await sendOrderNotification(orderId, phone, 'confirmed', formData.full_name || 'Valued Customer') }
            } catch (error) { console.warn('Order WhatsApp failed:', error) }
        }
        revalidatePath('/admin/orders')
        revalidatePath('/profile')
        return { success: true, orderId }
    } catch (error) {
        console.error('ORDER_PLACEMENT_ERROR:', error)
        return { success: false, message: error instanceof Error ? error.message : 'Order could not be placed' }
    }
}

export async function cancelOrderAndRestoreStock(orderId: string, reason?: string) {
    const authClient = await createClient()
    const supabase = await createAdminClient()

    try {
        // 1. Get current user session
        const { data: { user } } = await authClient.auth.getUser()
        if (!user) throw new Error("Authentication required")

        // 2. Fetch Order and Admin Status in parallel for speed
        const [orderRes, profileRes] = await Promise.all([
            supabase
                .from('orders')
                .select('status, user_id, payment_method, payment_status, razorpay_payment_id, edit_version, order_items(product_variant_id, quantity)')
                .eq('id', orderId)
                .single(),
            supabase
                .from('profiles')
                .select('is_admin,user_type')
                .eq('id', user.id)
                .single()
        ])

        if (orderRes.error || !orderRes.data) throw new Error("Order not found")

        const order = orderRes.data
        const isAdmin = profileRes.data?.is_admin || profileRes.data?.user_type==='admin'

        // 3. UPDATED SECURITY: Allow if owner OR Admin
        // This was the part blocking your admin previously
        if (order.user_id !== user.id && !isAdmin) {
            throw new Error("Unauthorized: You do not have permission to cancel this order")
        }

        if (Number(order.edit_version) > 0) {
            const {cancelAmendedOrder}=await import('@/lib/order-edit-server')
            const result=await withRestockNotifications(supabase,orderId,async()=>{
                const cancellation=await cancelAmendedOrder(supabase,orderId,user.id,reason || 'Order cancelled')
                return {...cancellation,error:null}
            })
            for(const path of ['/admin/orders',`/admin/orders/${orderId}`,`/admin/orders/${orderId}/edit`,`/profile/orders/${orderId}`])revalidatePath(path)
            return {success:true,message:result.message}
        }

        // 4. STATUS CHECK: Prevent cancelling completed logic
        const protectedStatuses = ['shipped', 'out_for_delivery', 'delivered', 'picked_up', 'dispatched']
        if (protectedStatuses.includes(order.status.toLowerCase())) {
            throw new Error(`Cannot cancel order once it has been ${order.status}.`)
        }

        if(order.status==='cancelled'){
            const {error}=await withRestockNotifications(supabase,orderId,()=>supabase.rpc('reconcile_cancelled_order',{p_order_id:orderId}))
            if(error)throw new Error(error.message)
            return {success:true,message:'Order cancellation reconciled.'}
        }

        const {error:cancelError}=await supabase.rpc('prepare_order_cancellation',{p_order_id:orderId})
        if(cancelError)throw new Error(cancelError.message)

        // 4b. Process Razorpay refund if paid via Razorpay
        if (order.payment_method === 'razorpay' && ['paid','partially_refunded'].includes(order.payment_status) && order.razorpay_payment_id) {
            try {
                const { default: Razorpay } = await import("razorpay")
                const razorpay = new Razorpay({
                    key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
                    key_secret: process.env.RAZORPAY_KEY_SECRET!,
                })
                const payment=await razorpay.payments.fetch(order.razorpay_payment_id)
                const remaining=Number(payment.amount)-Number(payment.amount_refunded || 0)
                if(remaining>0)await refundPaymentOnce(order.razorpay_payment_id,remaining/100,`cancel-${orderId}-${remaining}`)
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

        const {error:reconcileError}=await withRestockNotifications(supabase,orderId,()=>supabase.rpc('reconcile_cancelled_order',{p_order_id:orderId}))
        if(reconcileError)throw new Error(`Cancellation needs reconciliation: ${reconcileError.message}. Retry cancellation to finish it.`)

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

export async function getPendingOrderRefund(orderId:string) {
    const {supabase}=await requireAdmin()
    const {data,error}=await supabase.from('promotion_refund_requests').select('request_key,items,method,reason').eq('order_id',orderId).eq('status','reserved').maybeSingle()
    if(error)throw new Error(error.message)
    return data
}

export async function processPartialRefund(
    orderId:string,items:{itemId:string;quantity:number}[],reason:string,refundMethod:'razorpay'|'gpay',transactionId?:string,requestKey?:string
) {
    const {supabase,user}=await requireAdmin()
    try {
        const key=requestKey || randomUUID()
        if(!uuidPattern.test(key)||!Array.isArray(items)||!items.length||items.length>200||items.some(i=>!uuidPattern.test(i.itemId)||!Number.isSafeInteger(i.quantity)||i.quantity<1))throw new Error('Invalid refund selection')
        const selection=[...items].sort((a,b)=>a.itemId.localeCompare(b.itemId))
        const {data:reserved,error:reserveError}=await supabase.rpc('reserve_promotion_refund',{
            p_order_id:orderId,p_key:key,p_items:selection,p_method:refundMethod,p_actor:user.id,p_reason:String(reason || '').slice(0,1000)})
        if(reserveError||!reserved)throw new Error(reserveError?.message || 'Could not prepare refund')
        if(reserved.status==='complete')return {success:true,amount:Number(reserved.amount)}
        const amount=Number(reserved.amount)
        let confirmation=transactionId?.trim() || null
        if(amount>0){
            if(refundMethod==='razorpay'){
                if(!reserved.payment_id)throw new Error('No Razorpay payment is attached to this order')
                confirmation=await refundPaymentOnce(reserved.payment_id,amount,reserved.id)
            }else if(!confirmation)throw new Error('Enter the GPay transaction ID')
        }
        const {error}=await withRestockNotifications(supabase,orderId,()=>supabase.rpc('finish_promotion_refund',{p_request_id:reserved.id,p_transaction_id:confirmation}))
        if(error)throw new Error(error.message)
        revalidatePath('/admin/orders');revalidatePath(`/admin/orders/${orderId}`);revalidatePath(`/profile/orders/${orderId}`)
        return {success:true,amount}
    }catch(error){
        console.error('ORDER_REFUND_ERROR:',error)
        return {success:false,message:error instanceof Error ? error.message : 'Could not finish refund. Retry the same request.'}
    }
}

export async function createWholesaleOrder(data: {
    userId: string,
    total: number,
    items: any[]
}) {
    const { supabase } = await requireAdmin()

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


// Compatibility entry points: all item/price changes now use the reviewed,
// transactional amendment actions. Old tabs must not bypass that path.
export async function updateOrderPOS(
    orderId: string, items: unknown[], globalDiscount = 0, shippingPrice = 0,
    additionalCharges = 0, additionalChargesLabel = 'Extra Charges'
) {
    await requireAdmin()
    void [orderId, items, globalDiscount, shippingPrice, additionalCharges, additionalChargesLabel]
    return {success:false,message:'Open Edit order and review the updated items and total before saving.'}
}

export async function removeOrderItem(itemId:string,orderId:string) {
    await requireAdmin()
    void [itemId,orderId]
    return {success:false,message:'Open Edit order to remove items in a reviewed draft.'}
}

export async function updateOrderDiscount(orderId:string,discountAmount:number,discountRemark:string) {
    await requireAdmin()
    void [orderId,discountAmount,discountRemark]
    return {success:false,message:'Open Edit order to review the revised pricing.'}
}

export async function updateOrderStatus(orderId: string, status: string, deliveryPartnerId?: string, trackingNumber?: string) {
    const { supabase } = await requireAdmin()

    try {
        const { data: order, error: fetchErr } = await supabase
            .from('orders')
            .select('*, order_items(*), profiles!orders_user_id_fkey(phone, full_name)')
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

        if(newStatus==='cancelled'){
            const cancellation=await cancelOrderAndRestoreStock(orderId,'Cancelled by administrator')
            if(!cancellation.success)throw new Error(cancellation.message)
            return {success:true,oldStatus,newStatus,userId:order.user_id,pushNotification:undefined}
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

        // Release loyalty points on delivery or pickup
        if ((newStatus === "delivered" || newStatus === "picked_up") && oldStatus !== "delivered" && oldStatus !== "picked_up") {
            try {
                const { releasePendingPoints } = await import("./loyalty")
                await releasePendingPoints(orderId)
            } catch {}
        }

        // Push notification (FCM only)
        const pushNotification = await sendOrderPush(supabase, orderId, order.user_id, newStatus)

        // WhatsApp notification
        if (newStatus !== oldStatus) {
            try {
                const customerPhone = order.customer_phone || order.profiles?.phone
                if (customerPhone) {
                    const { sendOrderNotification } = await import('./whatsapp')
                    const result = await sendOrderNotification(
                        orderId,
                        customerPhone,
                        newStatus,
                        order.profiles?.full_name || 'Valued Customer'
                    )
                    if (!result.sent) {
                        console.warn('WhatsApp notification not sent:', result.reason || result.error)
                    }
                }
            } catch {}
        }

        revalidatePath('/admin/orders')
        revalidatePath(`/admin/orders/${orderId}`)
        return { success: true, oldStatus, newStatus, userId: order.user_id, pushNotification }
    } catch (error: any) {
        console.error("UPDATE_STATUS_ERROR:", error)
        return { success: false, message: error.message }
    }
}

export async function updateOrderDeliveryPartner(orderId: string, deliveryPartnerId: string | null) {
    const { supabase } = await requireAdmin()

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

export async function deleteOrder(orderId: string) {
    const authClient = await createClient()
    const supabase = await createAdminClient()

    try {
        const { data: { user } } = await authClient.auth.getUser()
        if (!user) throw new Error("Authentication required")

        const [orderRes, profileRes] = await Promise.all([
            supabase
                .from('orders')
                .select('user_id,status,checkout_key, edit_version, payment_method, payment_status, razorpay_payment_id, coin_discount_amount, order_items(id,product_variant_id, quantity)')
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

        if (!isAdmin) throw new Error("Admin access required")
        if(order.status!=='cancelled')throw new Error('Cancel this order before deleting it so its stock and credits are returned correctly.')
        if(Number(order.edit_version)>0)throw new Error('Amended orders keep their item and payment audit history and cannot be deleted.')
        const history=await supabase.from('order_amendments').select('id').eq('order_id',orderId).limit(1)
        if(history.error)throw new Error('Could not verify this order’s edit history')
        if(history.data?.length)throw new Error('Orders with an edit or packing history must be retained for review.')
        if(order.checkout_key){
            if(order.status!=='cancelled')throw new Error('Cancel this checkout order before deleting it so its stock and credits are returned correctly.')
            const {error}=await withRestockNotifications(supabase,orderId,()=>supabase.rpc('reconcile_cancelled_order',{p_order_id:orderId}))
            if(error)throw new Error(error.message)
        }



        // 1. Process Razorpay refund if paid via Razorpay
        if (order.payment_method === 'razorpay' && order.payment_status === 'paid' && order.razorpay_payment_id) {
            try {
                const { default: Razorpay } = await import("razorpay")
                const razorpay = new Razorpay({
                    key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
                    key_secret: process.env.RAZORPAY_KEY_SECRET!,
                })
                await razorpay.payments.refund(order.razorpay_payment_id, {})
            } catch (refundErr) {
                console.error("Razorpay refund error during delete:", refundErr)
                throw new Error("Failed to process Razorpay refund — order was not deleted")
            }
        }

        // 2. Void loyalty points for this order (pending + available earn transactions)
        try {
            const { data: earnTxs } = await supabase
                .from("loyalty_transactions")
                .select("id, user_id, amount, status")
                .eq("reference_id", orderId)
                .eq("reference_type", "order")
                .in("type", ["earn", "bonus"])
                .in("status", ["pending", "available"])

            if (earnTxs && earnTxs.length > 0) {
                const totalToDeduct = earnTxs.reduce((sum, tx) => sum + tx.amount, 0)

                await supabase
                    .from("loyalty_transactions")
                    .update({ status: "cancelled", note: "Order deleted — points voided" })
                    .in("id", earnTxs.map(tx => tx.id))

                const userId = earnTxs[0].user_id
                const { data: lp } = await supabase
                    .from("loyalty_points")
                    .select("balance, lifetime_earned")
                    .eq("user_id", userId)
                    .maybeSingle()
                if (lp) {
                    await supabase.from("loyalty_points").update({
                        balance: Math.max(0, lp.balance - totalToDeduct),
                        lifetime_earned: Math.max(0, (lp.lifetime_earned || 0) - totalToDeduct),
                        updated_at: new Date().toISOString(),
                    }).eq("user_id", userId)
                }
            }
        } catch (err) {
            console.error("Loyalty reversal error during delete:", err)
            throw new Error("Failed to reverse loyalty points — order was not deleted")
        }

        // 3. Reverse coin redemption if coins were used at checkout
        try {
            const { reverseCoinRedemption } = await import("./loyalty")
            await reverseCoinRedemption(orderId)
        } catch (err) {
            console.error("Coin reversal error during delete:", err)
            throw new Error("Failed to reverse coin redemption — order was not deleted")
        }

        for(const item of (order.order_items || [])){
            const {error}=await supabase.rpc('restore_order_item_inventory',{p_item_id:item.id,p_target_quantity:item.quantity})
            if(error)throw new Error(`Failed to restore inventory: ${error.message}`)
        }

        // 5. Delete order items then the order itself
        const { error: itemsErr } = await supabase
            .from('order_items')
            .delete()
            .eq('order_id', orderId)

        if (itemsErr) throw itemsErr

        const { error: orderErr } = await supabase
            .from('orders')
            .delete()
            .eq('id', orderId)

        if (orderErr) throw orderErr

        revalidatePath('/admin/orders')
        revalidatePath('/admin/products')
        revalidatePath('/profile')
        revalidatePath(`/profile/orders/${orderId}`)
        return { success: true }
    } catch (error: any) {
        console.error("DELETE_ORDER_ERROR:", error)
        return { success: false, error: error.message }
    }
}

export async function updateOrderPaymentStatus(orderId: string, status: string) {
    const { supabase } = await requireAdmin()
    if (!['unpaid', 'paid', 'failed', 'refunded', 'partially_refunded', 'pending'].includes(status)) return { success: false, message: 'Invalid payment status' }
    const lookup = await supabase.from('orders').select('edit_version').eq('id',orderId).single()
    if(lookup.error)return {success:false,message:'Order could not be verified'}
    if(Number(lookup.data?.edit_version)>0)return {success:false,message:'Use Edit order to record the actual payment or refund receipt.'}
    const { error, data } = await supabase.from('orders').update({ payment_status: status }).eq('id', orderId).eq('edit_version',0).select('id')
    if (error) return { success: false, message: error.message }
    if(!data?.length)return {success:false,message:'The order changed. Reload it and use Edit order to record the receipt.'}
    revalidatePath('/admin/orders')
    return { success: true }
}

export async function updateOrderTypeSecure(orderId: string, type: string, resetStatus = false) {
    const { supabase } = await requireAdmin()
    if (!['delivery', 'pickup'].includes(type)) return { success: false, message: 'Invalid order type' }
    const { data: order, error: lookupError } = await supabase.from('orders').select('status').eq('id', orderId).single()
    if (lookupError || !order) return { success: false, message: 'Order not found' }
    if(!['pending','confirmed'].includes(order.status))return {success:false,message:order.status==='packed'?'Open Edit order and reopen packing before changing delivery type.':'Delivery type can only change before packing.'}
    const reset = resetStatus || !Object.keys(VALID_TRANSITIONS[type]).includes(order.status)
    const { error, data } = await supabase.from('orders').update({ order_type: type, ...(reset ? { status: 'pending' } : {}) }).eq('id', orderId).eq('status',order.status).select('id')
    if (error) return { success: false, message: error.message }
    if(!data?.length)return {success:false,message:'The order changed. Reload it before changing delivery type.'}
    revalidatePath('/admin/orders')
    return { success: true, reset }
}
