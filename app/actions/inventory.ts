"use server"

import { requireAdmin } from "@/lib/admin"
import { revalidatePath } from "next/cache"
import { notifyBackInStock } from "./back-in-stock-notify"

export async function updateStock(
    id: string,
    stock: number
) {
    try {
        const { supabase } = await requireAdmin()
        const stockVal = Number(stock)
        if (isNaN(stockVal) || stockVal < 0 || !Number.isInteger(stockVal)) throw new Error("Invalid stock value")

        // Capture stock before update to detect 0 → positive transition
        const { data: before } = await supabase
            .from("product_variants")
            .select("stock")
            .eq("id", id)
            .single()
        const stockBefore = before?.stock ?? 0

        const { error } = await supabase
            .from("product_variants")
            .update({ stock: stockVal })
            .eq("id", id)

        if (error) throw new Error(error.message)

        // If stock went from 0 to positive, notify subscribers
        if (stockBefore <= 0 && stockVal > 0) {
            notifyBackInStock(id).catch(err =>
                console.error("[BackInStock] Auto-notify failed:", err)
            )
        }

        revalidatePath("/admin/inventory")
        return { success: true }
    } catch (error: any) {
        console.error("updateStock error:", error)
        return { success: false, message: error.message }
    }
}
