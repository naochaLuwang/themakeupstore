import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"
import { rateLimit } from "@/lib/rate-limit"
import { checkoutQuote } from "@/lib/checkout-pricing"
import { paymentClient, quoteFingerprint } from "@/lib/verified-payment"
import { CartStockError } from "@/lib/cart-stock"

const orderLimiter = rateLimit("create-order", { windowMs: 60_000, max: 10 })

export async function POST(req: NextRequest) {
    try {
        const auth = await createClient()
        const { data: { user } } = await auth.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        if (!orderLimiter.check(user.id).success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
        const raw = await req.json()
        const input = {
            shippingMethodId: raw.shippingMethodId, pincode: String(raw.pincode || ''),
            promoCode: raw.promoCode || undefined, giftCardCode: raw.giftCardCode || undefined,
            coinAmount: raw.coinDiscount || 0,
        }
        const db = await createAdminClient()
        const quote = await checkoutQuote(db, user.id, raw.cartItems, input)
        const fingerprint=quoteFingerprint(quote,input)
        if (raw.quoteFingerprint !== fingerprint) return NextResponse.json({error:'Your prices or offers changed. Please review checkout before paying.'},{status:409})
        if (quote.total < 1) return NextResponse.json({ error: 'No online payment is needed for a fully covered order. Place it without Razorpay.' }, { status: 400 })
        const order = await paymentClient().orders.create({
            amount: Math.round(quote.total * 100), currency: 'INR', receipt: `checkout_${Date.now()}`,
            notes: { user_id: user.id, purpose: 'checkout', fingerprint },
        })
        return NextResponse.json({ order_id: order.id, amount: order.amount, currency: order.currency })
    } catch (error) {
        if (error instanceof CartStockError) return NextResponse.json({ error: error.message, stock: error.stock }, { status: 409 })
        console.error('Payment order creation failed:', error)
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to create payment order' }, { status: 400 })
    }
}
