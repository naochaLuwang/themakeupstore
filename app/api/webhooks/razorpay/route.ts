import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { createClient } from "@/utils/supabase/server"

export async function POST(req: NextRequest) {
    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
        if (!webhookSecret) {
            console.error("RAZORPAY_WEBHOOK_SECRET not configured")
            return NextResponse.json({ error: "Webhook not configured" }, { status: 500 })
        }

        const body = await req.text()
        const signature = req.headers.get("x-razorpay-signature")

        if (!signature) {
            return NextResponse.json({ error: "Missing signature" }, { status: 400 })
        }

        const expected = crypto
            .createHmac("sha256", webhookSecret)
            .update(body)
            .digest("hex")

        if (signature !== expected) {
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
        }

        const event = JSON.parse(body)
        const supabase = await createClient()

        switch (event.event) {
            case "payment.captured": {
                const payment = event.payload.payment.entity
                const paymentId = payment.id

                // Update order payment status to captured/paid
                const { error } = await supabase
                    .from("orders")
                    .update({ payment_status: "paid" })
                    .eq("razorpay_payment_id", paymentId)

                if (error) {
                    console.error("Webhook: failed to update order:", error.message)
                }
                break
            }

            case "payment.failed": {
                const payment = event.payload.payment.entity
                const paymentId = payment.id

                const { error } = await supabase
                    .from("orders")
                    .update({ payment_status: "failed" })
                    .eq("razorpay_payment_id", paymentId)

                if (error) {
                    console.error("Webhook: failed to mark payment failed:", error.message)
                }
                break
            }

            default:
                // Acknowledge unknown events to prevent Razorpay retries
                break
        }

        return NextResponse.json({ status: "ok" })
    } catch (err: any) {
        console.error("Razorpay webhook error:", err)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
