"use server"

import { requireAdmin } from "@/lib/admin"
import { revalidatePath } from "next/cache"

export async function updateStock(
    id: string,
    stock: number
) {
    try {
        const { supabase } = await requireAdmin()
        const stockVal = Number(stock)
        if (isNaN(stockVal) || stockVal < 0 || !Number.isInteger(stockVal)) throw new Error("Invalid stock value")
        const { error } = await supabase
            .from("product_variants")
            .update({ stock: stockVal })
            .eq("id", id)

        if (error) throw new Error(error.message)

        revalidatePath("/admin/inventory")
        return { success: true }
    } catch (error: any) {
        console.error("updateStock error:", error)
        return { success: false, message: error.message }
    }
}
