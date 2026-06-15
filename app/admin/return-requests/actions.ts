"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function updateReturnStatus(formData: FormData) {
    const id = formData.get("id") as string
    const status = formData.get("status") as string
    const adminNote = formData.get("admin_note") as string
    const supabase = await createClient()

    const { error } = await supabase
        .from("return_requests")
        .update({
            status,
            admin_note: adminNote || null,
        })
        .eq("id", id)

    if (error) {
        console.error("Update error:", error.message)
        return
    }

    revalidatePath("/admin/return-requests")
}

export async function markRefunded(formData: FormData) {
    const id = formData.get("id") as string
    const transactionId = formData.get("transaction_id") as string
    const supabase = await createClient()

    const { error } = await supabase
        .from("return_requests")
        .update({
            status: "refunded",
            transaction_id: transactionId || null,
        })
        .eq("id", id)

    if (error) {
        console.error("Refund error:", error.message)
        return
    }

    revalidatePath("/admin/return-requests")
}
