"use server"

import { createClient } from "@/utils/supabase/server"
import { sendBackInStockEmail } from "@/lib/resend"
import { sendFcmNotification } from "@/lib/fcm-send"

export async function notifyBackInStock(variantId: string) {
    const supabase = await createClient()

    // 1. Fetch pending notifications for this variant
    const { data: pending, error: fetchErr } = await supabase
        .from("back_in_stock_notifications")
        .select("id, email, user_name, product_id, product_variant_id")
        .eq("product_variant_id", variantId)
        .eq("is_notified", false)

    if (fetchErr) {
        console.error("[BackInStock] Fetch error:", fetchErr.message)
        return { notified: 0, pushSent: 0, emailSent: 0 }
    }
    if (!pending?.length) return { notified: 0, pushSent: 0, emailSent: 0 }

    // 2. Get product info for messages
    const { data: variant } = await supabase
        .from("product_variants")
        .select("title, image_url, products(id, name, slug, thumbnail_url)")
        .eq("id", variantId)
        .single()

    const productName = (variant?.products as any)?.name || "a product"
    const variantName = variant?.title || ""
    const productId = (variant?.products as any)?.id || pending[0].product_id || ""
    const productUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://themakeupstorewangkhei.com"}/products/${productId}`
    const imageUrl = variant?.image_url || (variant?.products as any)?.thumbnail_url || null

    // 3. Match emails to profiles to find logged-in users
    const emails = Array.from(new Set(pending.map(n => n.email).filter(Boolean)))
    const { data: profiles } = emails.length > 0
        ? await supabase.from("profiles").select("id, email").in("email", emails)
        : { data: [] }

    const profileByEmail = new Map((profiles || []).map((p: any) => [p.email, p]))

    // 4. Fetch push subscriptions for matched users
    const userIds = (profiles || []).map((p: any) => p.id)
    const { data: subscriptions } = userIds.length > 0
        ? await supabase.from("push_subscriptions").select("user_id, fcm_token").in("user_id", userIds)
        : { data: [] }

    const tokensByUser = new Map<string, string[]>()
    for (const sub of subscriptions || []) {
        if (sub.fcm_token) {
            if (!tokensByUser.has(sub.user_id)) tokensByUser.set(sub.user_id, [])
            tokensByUser.get(sub.user_id)!.push(sub.fcm_token)
        }
    }

    // 5. Send notifications to each signup
    let pushSent = 0
    let emailSent = 0

    for (const n of pending) {
        const profile = n.email ? (profileByEmail.get(n.email) as any) : null
        const userId = profile?.id

        // Push notification (only for logged-in users with push subscriptions)
        if (userId) {
            const tokens = tokensByUser.get(userId) || []
            for (const token of tokens) {
                try {
                    await sendFcmNotification(
                        token,
                        "Back in Stock!",
                        `${productName}${variantName ? ` — ${variantName}` : ""} is available again`,
                        productUrl
                    )
                    pushSent++
                } catch (err) {
                    console.error("[BackInStock] Push failed for token:", err)
                }
            }
        }

        // Email notification
        try {
            await sendBackInStockEmail({
                email: n.email,
                userName: n.user_name || "there",
                productName,
                variantName,
                productUrl,
                imageUrl,
            })
            emailSent++
        } catch (err) {
            console.error("[BackInStock] Email failed:", err)
        }
    }

    // 6. Mark all as notified
    const ids = pending.map(n => n.id)
    await supabase
        .from("back_in_stock_notifications")
        .update({ is_notified: true, notified_at: new Date().toISOString() })
        .in("id", ids)

    console.log(`[BackInStock] variant=${variantId} notified=${pending.length} push=${pushSent} email=${emailSent}`)

    return { notified: pending.length, pushSent, emailSent }
}
