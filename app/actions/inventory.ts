"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function updateStock(
    id: string,
    stock: number
) {
    const supabase = await createClient()
    const { error } = await supabase
        .from("product_variants")
        .update({ stock })
        .eq("id", id)

    if (error) throw new Error(error.message)

    revalidatePath("/admin/inventory")
}
