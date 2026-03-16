// app/actions/pricing.ts
"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

// export async function updatePricing(updates: {
//     id: string;
//     type: 'product' | 'variant';
//     price: number;
//     discount_type: 'none' | 'percentage' | 'amount';
//     discount_value: number;
// }) {
//     const supabase = await createClient() // Await the client

//     const table = updates.type === 'product' ? 'products' : 'product_variants'
//     const priceColumn = updates.type === 'product' ? 'base_price' : 'price'

//     const { error } = await supabase
//         .from(table)
//         .update({
//             [priceColumn]: updates.price,
//             discount_type: updates.discount_type,
//             discount_value: updates.discount_value,
//             updated_at: new Date().toISOString()
//         })
//         .eq('id', updates.id)

//     if (error) throw new Error(error.message)

//     revalidatePath('/admin/pricing')
//     return { success: true }
// }


export async function updatePricing(updates: {
    id: string;
    type: 'product' | 'variant';
    price: number;
    discount_type: 'none' | 'percentage' | 'amount';
    discount_value: number;
}) {
    const supabase = await createClient()

    if (updates.type === 'product') {
        // 1. Update the Product itself
        const { error: prodError } = await supabase
            .from('products')
            .update({
                base_price: updates.price,
                discount_type: updates.discount_type,
                discount_value: updates.discount_value,
                updated_at: new Date().toISOString()
            })
            .eq('id', updates.id)

        if (prodError) throw new Error(prodError.message)

        // 2. CASCADE: Update all variants belonging to this product
        // This ensures variants inherit the new discount settings
        const { error: varError } = await supabase
            .from('product_variants')
            .update({
                discount_type: updates.discount_type,
                discount_value: updates.discount_value,
                updated_at: new Date().toISOString()
            })
            .eq('product_id', updates.id)

        if (varError) console.error("Variant sync warning:", varError.message)

    } else {
        // 3. Update only the specific Variant
        const { error } = await supabase
            .from('product_variants')
            .update({
                price: updates.price,
                discount_type: updates.discount_type,
                discount_value: updates.discount_value,
                updated_at: new Date().toISOString()
            })
            .eq('id', updates.id)

        if (error) throw new Error(error.message)
    }

    revalidatePath('/admin/pricing')
    return { success: true }
}