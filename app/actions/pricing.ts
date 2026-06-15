"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin"

export async function updatePricing(updates: {
    id: string;
    type: 'product' | 'variant';
    price: number;
    discount_type: 'none' | 'percentage' | 'amount';
    discount_value: number;
}) {
    await requireAdmin()
    const supabase = await createClient()

    if (updates.price < 0) throw new Error("Price cannot be negative")
    if (updates.discount_value < 0) throw new Error("Discount value cannot be negative")

    if (updates.type === 'product') {
        const { error: prodError } = await supabase
            .from('products')
            .update({
                base_price: updates.price,
                discount_type: updates.discount_type,
                discount_value: updates.discount_value,
                updated_at: new Date().toISOString()
            })
            .eq('id', updates.id)
        if (prodError) throw prodError

        const { error: varError } = await supabase
            .from('product_variants')
            .update({
                price: updates.price,
                discount_type: updates.discount_type,
                discount_value: updates.discount_value,
                updated_at: new Date().toISOString()
            })
            .eq('product_id', updates.id)
        if (varError) throw varError
    } else {
        const { error: varError } = await supabase
            .from('product_variants')
            .update({
                price: updates.price,
                discount_type: updates.discount_type,
                discount_value: updates.discount_value,
                updated_at: new Date().toISOString()
            })
            .eq('id', updates.id)
        if (varError) throw varError

        // Sync variant price to parent product only if product has exactly 1 variant
        const { data: variant } = await supabase
            .from('product_variants')
            .select('product_id')
            .eq('id', updates.id)
            .single()

        if (variant?.product_id) {
            const { count } = await supabase
                .from('product_variants')
                .select('id', { count: 'exact', head: true })
                .eq('product_id', variant.product_id)

            if (count === 1) {
                const { error: prodError } = await supabase
                    .from('products')
                    .update({
                        base_price: updates.price,
                        discount_type: updates.discount_type,
                        discount_value: updates.discount_value,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', variant.product_id)
                if (prodError) throw prodError
            }
        }
    }

    revalidatePath('/admin/pricing')
    revalidatePath('/', 'layout')
    return { success: true }
}
