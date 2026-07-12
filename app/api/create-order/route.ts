import { NextRequest, NextResponse } from "next/server"
import Razorpay from "razorpay"
import { createClient } from "@/utils/supabase/server"
import { rateLimit } from "@/lib/rate-limit"

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

        const { amount, cartItems } = await req.json()

        if (!amount || amount < 100) {
            return NextResponse.json({ error: "Minimum amount is 100 paise" }, { status: 400 })
        }

        // Verify item prices from DB for all non-gift items
        if (cartItems?.length) {
            const paidItems = cartItems.filter((i: any) => !i.is_gift && !i.is_bxgy_free)
            const variantIds = [...new Set(paidItems.map((i: any) => i.variantId))]
            const { data: variants } = await supabase
                .from("product_variants")
                .select("id, price, stock")
                .in("id", variantIds)

            if (variants) {
                const priceMap = new Map(variants.map(v => [v.id, v]))
                let recomputedTotal = 0
                for (const item of paidItems) {
                    const db = priceMap.get(item.variantId)
                    if (!db) {
                        return NextResponse.json({ error: `Variant ${item.variantId} not found` }, { status: 400 })
                    }
                    if (db.stock < item.quantity) {
                        return NextResponse.json({ error: `Insufficient stock for ${item.name || item.variantId}` }, { status: 409 })
                    }
                    recomputedTotal += Math.round(Number(db.price) * item.quantity * 100)
                }
                // Allow 1% tolerance for rounding differences
                const minExpected = Math.floor(recomputedTotal * 0.99)
                const maxExpected = Math.ceil(recomputedTotal * 1.01)
                if (amount < minExpected || amount > maxExpected) {
                    return NextResponse.json({ error: "Amount mismatch — please refresh and try again" }, { status: 409 })
                }
            }
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
