"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin"

export async function updateReturnStatus(formData: FormData) {
    const { supabase } = await requireAdmin()
    const id = formData.get("id") as string
    const status = formData.get("status") as string
    const adminNote = formData.get("admin_note") as string

    const { error } = await supabase
        .from("return_requests")
        .update({
            status,
            admin_note: adminNote || null,
        })
        .eq("id", id)

    if (error) {
        console.error("Update error:", error.message)
        return
    }

    revalidatePath("/admin/return-requests")
}

export async function markRefunded(formData: FormData) {
    const { supabase } = await requireAdmin()
    const id = formData.get("id") as string

    // Fetch return request with order payment info
    const { data: req } = await supabase
        .from("return_requests")
        .select(`
            order_id,
            orders!inner(payment_method, razorpay_payment_id)
        `)
        .eq("id", id)
        .single()

    const orderData = Array.isArray(req?.orders) ? req.orders[0] : req?.orders
    let transactionId: string | null = null

    // Auto-process Razorpay refund if applicable
    if (orderData?.payment_method === "razorpay" && orderData?.razorpay_payment_id) {
        try {
            const { default: Razorpay } = await import("razorpay")
            const razorpay = new Razorpay({
                key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
                key_secret: process.env.RAZORPAY_KEY_SECRET!,
            })
            const refund = await razorpay.payments.refund(orderData.razorpay_payment_id, {})
            transactionId = refund.id || null
        } catch (err) {
            console.error("Razorpay auto-refund failed:", err)
        }
    }

    // Fallback to manually entered transaction ID if no auto-refund
    if (!transactionId) {
        transactionId = formData.get("transaction_id") as string
    }

    const { error } = await supabase
        .from("return_requests")
        .update({
            status: "refunded",
            transaction_id: transactionId || null,
        })
        .eq("id", id)

    if (error) {
        console.error("Refund error:", error.message)
        return
    }

    revalidatePath("/admin/return-requests")
}
