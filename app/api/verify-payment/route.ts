import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

export async function POST(req: NextRequest) {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json()

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return NextResponse.json({ error: "Missing payment fields" }, { status: 400 })
        }

        const secret = process.env.RAZORPAY_KEY_SECRET!
        const generated = crypto
            .createHmac("sha256", secret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex")

        if (generated !== razorpay_signature) {
            return NextResponse.json({ error: "Signature mismatch" }, { status: 400 })
        }

        return NextResponse.json({ success: true, payment_id: razorpay_payment_id })
    } catch (err: any) {
        console.error("Razorpay verify error:", err)
        return NextResponse.json({ error: err.message || "Verification failed" }, { status: 500 })
    }
}
