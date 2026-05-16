"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin"
import { variantOptionSchema, type VariantFormValues } from "@/lib/validations/variants"

export async function createVariantWithValues(data: VariantFormValues) {
    await requireAdmin()
    const supabase = await createClient()

    // 1. Insert the Parent Option
    const { data: option, error: optionError } = await supabase
        .from("variant_options")
        .insert([{
            name: data.name,
            slug: data.slug,
            position: data.position
        }])
        .select()
        .single()

    if (optionError) return { error: optionError.message }

    // 2. Prepare and Insert the Values
    const valuesToInsert = data.values.map(v => ({
        variant_option_id: option.id,
        value: v.value,
        slug: v.slug,
        hex_code: v.hex_code || null
    }))

    const { error: valuesError } = await supabase
        .from("variant_option_values")
        .insert(valuesToInsert)

    if (valuesError) return { error: valuesError.message }

    revalidatePath("/admin/variants")
    return { success: true }
}