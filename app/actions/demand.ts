"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { sendBackInStockEmail } from "@/lib/resend"
import { requireAdmin } from "@/lib/admin"

export async function markNotified(variantId: string) {
    const { supabase } = await requireAdmin()

    const { data: notifications, error: fetchError } = await supabase
        .from("back_in_stock_notifications")
        .select(`
            id, email, user_name,
            products!inner(id, slug, name, thumbnail_url),
            product_variants!inner(title, image_url)
        `)
        .eq("product_variant_id", variantId)
        .eq("is_notified", false)

    if (fetchError) throw new Error(fetchError.message)
    if (!notifications?.length) return

    // Send emails
    const emailResults = await Promise.allSettled(
        notifications.map((n) =>
            sendBackInStockEmail({
                email: n.email,
                userName: n.user_name,
                productName: (n.products as any).name,
                variantName: (n.product_variants as any).title,
                productUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "https://themakeupstorewangkhei.com"}/products/${(n.products as any).id}`,
                imageUrl: (n.product_variants as any).image_url || (n.products as any).thumbnail_url,
            })
        )
    )

    const delivered = emailResults.filter((r) => r.status === "fulfilled" && r.value.success).length
    const failed = emailResults.filter(
        (r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.success)
    ).length

    // Mark as notified
    const { error: updateError } = await supabase
        .from("back_in_stock_notifications")
        .update({ is_notified: true, notified_at: new Date().toISOString() })
        .eq("product_variant_id", variantId)
        .eq("is_notified", false)

    if (updateError) throw new Error(updateError.message)
    revalidatePath("/admin/inventory/demand")

    return { total: notifications.length, delivered, failed }
}

export async function batchMarkNotified(variantIds: string[]) {
    await requireAdmin()
    const results = []
    for (const id of variantIds) {
        const r = await markNotified(id)
        results.push(r)
    }
    const total = results.reduce((s, r) => s + (r?.total || 0), 0)
    const delivered = results.reduce((s, r) => s + (r?.delivered || 0), 0)
    const failed = results.reduce((s, r) => s + (r?.failed || 0), 0)
    return { total, delivered, failed }
}
