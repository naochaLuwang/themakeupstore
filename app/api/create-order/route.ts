import { NextRequest, NextResponse } from "next/server"
import Razorpay from "razorpay"
import { createClient } from "@/utils/supabase/server"
import { rateLimit } from "@/lib/rate-limit"
import { FREE_SHIPPING_THRESHOLD, FREE_SHIPPING_PINCODES } from "@/lib/cart-constants"
import { checkPromoEligibility } from "@/lib/promo-helper"
import { calculateDiscountedPrice } from "@/lib/price-helper"

const orderLimiter = rateLimit("create-order", { windowMs: 60_000, max: 10 })

const razorpay = new Razorpay({
    key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 })
        }

        const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"
        const { success } = orderLimiter.check(`user:${user.id}:ip:${ip}`)
        if (!success) {
            return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 })
        }

        const {
            amount, cartItems,
            shippingPrice: clientShippingPrice, shippingMethodId, pincode,
            promoDiscount: clientPromoDiscount, promoCode,
            bxgyDiscount: clientBxgyDiscount,
            giftCardCode, giftCardDiscount: clientGiftCardDiscount,
            rewardCouponId, rewardCouponDiscount: clientRewardCouponDiscount,
        } = await req.json()

        if (!amount || amount < 100) {
            return NextResponse.json({ error: "Minimum amount is 100 paise" }, { status: 400 })
        }

        if (!cartItems?.length) {
            return NextResponse.json({ error: "Cart is empty" }, { status: 400 })
        }

        // ── 1. Verify product prices from DB ──
        const paidItems = cartItems.filter((i: any) => !i.is_gift && !i.is_bxgy_free)
        const variantIds = [...new Set(paidItems.map((i: any) => i.variantId))]
        const { data: variants } = await supabase
            .from("product_variants")
            .select("id, price, stock, discount_type, discount_value, product_id, products(name, discount_type, discount_value)")
            .in("id", variantIds)

        if (!variants) {
            return NextResponse.json({ error: "Failed to verify product prices" }, { status: 500 })
        }

        const priceMap = new Map(variants.map(v => [v.id, v]))
        let calculatedSubtotal = 0
        for (const item of paidItems) {
            const db = priceMap.get(item.variantId)
            if (!db) {
                return NextResponse.json({ error: `Variant ${item.variantId} not found` }, { status: 400 })
            }
            if (db.stock < item.quantity) {
                return NextResponse.json({ error: `Insufficient stock for ${item.name || item.variantId}` }, { status: 409 })
            }
            const basePrice = Number(db.price)
            const variantDiscountType: string = (db as any).discount_type || "none"
            const variantDiscountValue: number = Number((db as any).discount_value) || 0
            const prod = (db as any).products as any
            const productDiscountType: string = prod?.discount_type || "none"
            const productDiscountValue: number = Number(prod?.discount_value) || 0
            const effectiveDiscountType = variantDiscountType !== "none" ? variantDiscountType : productDiscountType
            const effectiveDiscountValue = variantDiscountType !== "none" ? variantDiscountValue : productDiscountValue
            const salePrice = calculateDiscountedPrice(basePrice, effectiveDiscountType as 'percentage' | 'amount' | 'none', effectiveDiscountValue)
            calculatedSubtotal += salePrice * item.quantity
        }

        // ── 2. Verify shipping price from DB ──
        let verifiedShippingPrice = 0
        if (shippingMethodId) {
            const { data: method } = await supabase
                .from("shipping_methods")
                .select("price")
                .eq("id", shippingMethodId)
                .single()
            if (method) {
                const pincodeOk = pincode ? FREE_SHIPPING_PINCODES.includes(pincode) : false
                verifiedShippingPrice = calculatedSubtotal >= FREE_SHIPPING_THRESHOLD && pincodeOk ? 0 : Number(method.price)
            }
        }

        // ── 3. Verify promo discount from DB ──
        let verifiedPromoDiscount = 0
        if (promoCode && clientPromoDiscount > 0) {
            const { data: promo } = await supabase
                .from("promo_codes")
                .select("*, promo_code_products(product_id), promo_code_categories(category_id)")
                .eq("code", promoCode.toUpperCase())
                .eq("is_active", true)
                .single()
            if (promo) {
                const { isEligible, eligibleSubtotal } = checkPromoEligibility(promo, paidItems)
                if (isEligible) {
                    if (promo.discount_type === "percentage") {
                        verifiedPromoDiscount = Math.round((eligibleSubtotal * Number(promo.discount_value)) / 100)
                        if (promo.max_discount_amount) {
                            verifiedPromoDiscount = Math.min(verifiedPromoDiscount, Number(promo.max_discount_amount))
                        }
                    } else {
                        verifiedPromoDiscount = Math.min(Number(promo.discount_value), eligibleSubtotal)
                    }
                }
            }
        }

        // ── 4. Accept BXGY discount from client (fully re-validated in placeOrder) ──
        const verifiedBxgyDiscount = Math.max(0, Number(clientBxgyDiscount) || 0)

        // ── 5. Verify gift card from DB ──
        let verifiedGiftCardAmount = 0
        if (giftCardCode && clientGiftCardDiscount > 0) {
            const { data: gc } = await supabase
                .from("gift_cards")
                .select("remaining_balance, status, expires_at")
                .eq("code", giftCardCode)
                .single()
            if (gc && gc.status === "active" && (!gc.expires_at || new Date(gc.expires_at) > new Date()) && Number(gc.remaining_balance) > 0) {
                const maxApplicable = Math.max(0, calculatedSubtotal - verifiedPromoDiscount - verifiedBxgyDiscount + verifiedShippingPrice)
                verifiedGiftCardAmount = Math.min(Number(gc.remaining_balance), maxApplicable)
            }
        }

        // ── 6. Verify reward coupon from DB ──
        let verifiedRewardCouponDiscount = 0
        if (rewardCouponId && clientRewardCouponDiscount > 0) {
            const { data: rc } = await supabase
                .from("reward_coupons")
                .select("discount_amount, min_order_value, used")
                .eq("id", rewardCouponId)
                .eq("user_id", user.id)
                .single()
            if (rc && !rc.used) {
                const subtotalAfterDiscounts = Math.max(0, calculatedSubtotal - verifiedPromoDiscount - verifiedBxgyDiscount - verifiedGiftCardAmount + verifiedShippingPrice)
                if (!rc.min_order_value || subtotalAfterDiscounts >= Number(rc.min_order_value)) {
                    verifiedRewardCouponDiscount = Math.min(Number(rc.discount_amount), subtotalAfterDiscounts)
                }
            }
        }

        // ── 7. Compute expected total in paise and compare ──
        // All values above are in rupees; convert to paise for comparison with client amount
        const expectedTotalPaise = Math.max(0, Math.round(
            (calculatedSubtotal - verifiedPromoDiscount - verifiedBxgyDiscount - verifiedGiftCardAmount - verifiedRewardCouponDiscount + verifiedShippingPrice) * 100
        ))

        // Allow 1% tolerance for rounding differences
        const minExpected = Math.floor(expectedTotalPaise * 0.99)
        const maxExpected = Math.ceil(expectedTotalPaise * 1.01)
        if (amount < minExpected || amount > maxExpected) {
            console.error("AMOUNT_MISMATCH:", { amount, expectedTotalPaise, calculatedSubtotal, verifiedPromoDiscount, verifiedBxgyDiscount, verifiedGiftCardAmount, verifiedRewardCouponDiscount, verifiedShippingPrice })
            return NextResponse.json({ error: "Amount mismatch — please refresh and try again" }, { status: 409 })
        }

        const order = await razorpay.orders.create({
            amount: Math.round(amount),
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
        })

        return NextResponse.json({
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
        })
    } catch (err: any) {
        console.error("Razorpay create order error:", err)
        return NextResponse.json({ error: err.message || "Failed to create order" }, { status: 500 })
    }
}
