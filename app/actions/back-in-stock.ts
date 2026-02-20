"use server"

import { createClient } from "@/utils/supabase/server"

export async function submitStockNotification(formData: {
    userName: string;
    email: string;
    phone: string;
    productId: string;
    variantId: string;
}) {
    const supabase = await createClient()

    const { error } = await supabase
        .from("back_in_stock_notifications")
        .insert([{
            user_name: formData.userName,
            email: formData.email,
            phone: formData.phone,
            product_id: formData.productId,
            product_variant_id: formData.variantId,
        }])

    if (error) {
        console.error("Database Insert Error:", error)
        return { success: false, error: "Submission failed. Please check your details." }
    }

    return { success: true }
}