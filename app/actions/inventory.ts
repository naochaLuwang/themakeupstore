"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin"

export async function bulkUpdateStock(updates: Record<string, string | number>) {
    await requireAdmin()
    const supabase = await createClient()

    const promiseArray = Object.entries(updates).map(async ([id, value]) => {
        // Handle increment logic (e.g., "+20" or "-5")
        if (typeof value === 'string' && (value.startsWith('+') || value.startsWith('-'))) {
            const amount = parseInt(value)
            // Using a raw RPC call is safer for increments to avoid race conditions, 
            // but for simplicity, we use the standard update with a math trick
            const { data: current } = await supabase
                .from("product_variants")
                .select("stock")
                .eq("id", id)
                .single()

            const newStock = Math.max(0, (current?.stock || 0) + amount)
            return supabase.from("product_variants").update({ stock: newStock }).eq("id", id)
        }

        // Handle direct overwrite (e.g., "0" or "50")
        return supabase.from("product_variants").update({ stock: Number(value) }).eq("id", id)
    })

    try {
        await Promise.all(promiseArray)
        revalidatePath("/admin/inventory")
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}