"use server"

import { v2 as cloudinary } from "cloudinary"
import { createClient } from "@/utils/supabase/server"
import { rateLimit } from "@/lib/rate-limit"

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

const returnLimiter = rateLimit("return-request", { windowMs: 60_000, max: 3 })

export async function submitReturnRequest(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("You must be logged in")

    const { success } = returnLimiter.check(`user:${user.id}`)
    if (!success) throw new Error("Too many requests. Please try again later.")

    const orderId = formData.get("order_id") as string
    const orderItemId = formData.get("order_item_id") as string
    const reason = formData.get("reason") as string
    const imageFiles = formData.getAll("images") as File[]

    if (!orderId || !orderItemId || !reason) {
        throw new Error("Missing required fields")
    }

    if (imageFiles.length === 0 || imageFiles.every(f => f.size === 0)) {
        throw new Error("Please upload at least one proof image")
    }

    const { data: orderItem } = await supabase
        .from("order_items")
        .select("product_id, product_variant_id, order_id")
        .eq("id", orderItemId)
        .single()

    if (!orderItem) throw new Error("Order item not found")

    const imageUrls: string[] = []
    for (const file of imageFiles) {
        if (file.size === 0) continue
        const buffer = Buffer.from(await file.arrayBuffer())
        try {
            const upload: any = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream({
                    folder: "returns/proof-images",
                }, (err, res) => err ? reject(err) : resolve(res)).end(buffer)
            })
            imageUrls.push(upload.secure_url)
        } catch (error) {
            console.error("Image upload failed:", error)
        }
    }

    const { data: returnReq, error } = await supabase
        .from("return_requests")
        .insert({
            user_id: user.id,
            order_id: orderId,
            product_id: orderItem.product_id,
            product_variant_id: orderItem.product_variant_id,
            reason,
            images: imageUrls.length > 0 ? imageUrls : null,
            status: "pending",
        })
        .select()
        .single()

    if (error) {
        console.error("Return request error:", error)
        throw new Error("Failed to submit return request")
    }

    await supabase.from("return_status_logs").insert({
        return_request_id: returnReq.id,
        status: "pending",
        note: null,
    })

    return { id: returnReq.id }
}
