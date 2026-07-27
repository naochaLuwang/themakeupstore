"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin"

export async function updateSku(variantId: string, sku: string) {
    const { supabase } = await requireAdmin()

    const sanitized = sku.trim().toUpperCase() || null

    const { error } = await supabase
        .from("product_variants")
        .update({ sku: sanitized, updated_at: new Date().toISOString() })
        .eq("id", variantId)

    if (error) throw new Error(error.message)

    revalidatePath("/admin/sku")
    return { success: true }
}
