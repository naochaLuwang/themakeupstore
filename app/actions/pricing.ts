// app/actions/pricing.ts
"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function updatePricing(updates: {
    id: string;
    type: 'product' | 'variant';
    price: number;
    discount_type: 'none' | 'percentage' | 'amount';
    discount_value: number;
}) {
    const supabase = await createClient() // Await the client

    const table = updates.type === 'product' ? 'products' : 'product_variants'
    const priceColumn = updates.type === 'product' ? 'base_price' : 'price'

    const { error } = await supabase
        .from(table)
        .update({
            [priceColumn]: updates.price,
            discount_type: updates.discount_type,
            discount_value: updates.discount_value,
            updated_at: new Date().toISOString()
        })
        .eq('id', updates.id)

    if (error) throw new Error(error.message)

    revalidatePath('/admin/pricing')
    return { success: true }
}