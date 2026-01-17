"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function updateWholesaleRule(data: {
    categoryId: string,
    discount: number,
    moq: number,
    active: boolean
}) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('category_wholesale_rules')
        .upsert({
            category_id: data.categoryId,
            discount_percentage: data.discount,
            min_order_quantity: data.moq,
            is_active: data.active,
            created_at: new Date().toISOString()
        }, { onConflict: 'category_id' }) // This uses the UNIQUE constraint on category_id

    if (error) return { success: false, error: error.message }

    revalidatePath('/admin/wholesale/categories')
    revalidatePath('/wholesale/portal') // Update the portal prices too
    return { success: true }
}