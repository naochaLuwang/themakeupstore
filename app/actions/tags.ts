"use server"

import { createClient } from "@/utils/supabase/server"

export async function bulkUpdateTags(updates: { id: string; tag: string }[]) {
    const supabase = await createClient()

    const results = await Promise.all(
        updates.map(({ id, tag }) =>
            supabase
                .from("products")
                .update({ tag: tag || null })
                .eq("id", id)
        )
    )

    const errors = results.filter((r) => r.error)
    if (errors.length > 0) {
        return { success: false, error: errors[0].error?.message || "Unknown error" }
    }

    return { success: true }
}
