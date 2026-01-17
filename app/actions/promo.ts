"use server"
import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function createPromoCode(formData: FormData) {
    const supabase = await createClient()

    const code = (formData.get('code') as string).toUpperCase()
    const description = formData.get('description') as string
    const discount_type = formData.get('discount_type') as string
    const discount_value = parseFloat(formData.get('discount_value') as string)
    const apply_to = formData.get('apply_to') as string
    const min_order_amount = parseFloat(formData.get('min_order_amount') as string) || 0
    const max_discount_amount = formData.get('max_discount_amount') ? parseFloat(formData.get('max_discount_amount') as string) : null
    const usage_limit = formData.get('usage_limit') ? parseInt(formData.get('usage_limit') as string) : null

    const expiresInput = formData.get('expires_at') as string
    const expires_at = expiresInput ? new Date(expiresInput).toISOString() : null
    const selected_ids = formData.get('selected_ids') as string

    // 1. Insert Main Promo
    const { data: promo, error: promoError } = await supabase
        .from('promo_codes')
        .insert([{
            code, description, discount_type, discount_value,
            apply_to, min_order_amount, max_discount_amount,
            usage_limit, expires_at, is_active: true
        }])
        .select()
        .single()

    if (promoError) {
        console.error("Insert Error:", promoError.message)
        return { success: false, message: promoError.message }
    }

    // 2. Insert Junction Table Data (Products or Categories)
    if (selected_ids && promo) {
        const ids = selected_ids.split(',').filter(id => id.length > 0)

        if (apply_to === 'specific_products') {
            const inserts = ids.map(id => ({ promo_id: promo.id, product_id: id }))
            const { error: pErr } = await supabase.from('promo_code_products').insert(inserts)
            if (pErr) console.error("Link Error (Products):", pErr.message)
        }
        else if (apply_to === 'specific_categories') {
            const inserts = ids.map(id => ({ promo_id: promo.id, category_id: id }))
            const { error: cErr } = await supabase.from('promo_code_categories').insert(inserts)
            if (cErr) console.error("Link Error (Categories):", cErr.message)
        }
    }

    revalidatePath('/admin/promos')
    return { success: true }
}

export async function validatePromoCode(code: string, cartItems: any[]) {
    const supabase = await createClient()

    const { data: promo, error } = await supabase
        .from('promo_codes')
        .select(`
            *,
            promo_code_products(product_id),
            promo_code_categories(category_id)
        `)
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .single()

    if (error || !promo) return { success: false, message: "Code not found" }

    const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0)

    if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
        return { success: false, message: "Code expired" }
    }

    if (subtotal < promo.min_order_amount) {
        return { success: false, message: `Min. order ₹${promo.min_order_amount} required` }
    }

    const eligibleItems = cartItems.filter(item => {
        if (promo.apply_to === 'all') return true;
        const pId = item.productId || item.id;
        const cId = item.categoryId;

        if (promo.apply_to === 'specific_products') {
            return promo.promo_code_products.some((p: any) => p.product_id === pId);
        }
        if (promo.apply_to === 'specific_categories') {
            return promo.promo_code_categories.some((c: any) => c.category_id === cId);
        }
        return false;
    });

    if (eligibleItems.length === 0) {
        return { success: false, message: "Not applicable to items in bag" }
    }

    const eligibleSubtotal = eligibleItems.reduce((acc, item) => acc + (item.price * item.quantity), 0)
    let discount = 0

    if (promo.discount_type === 'percentage') {
        discount = (eligibleSubtotal * promo.discount_value) / 100
        if (promo.max_discount_amount) discount = Math.min(discount, promo.max_discount_amount)
    } else {
        discount = Math.min(promo.discount_value, eligibleSubtotal)
    }

    return { success: true, discount: Math.round(discount), promoCode: promo.code }
}

export async function deletePromoCode(id: string) {
    const supabase = await createClient();

    // We try to select to confirm actual deletion (RLS might prevent it otherwise)
    const { data, error } = await supabase
        .from('promo_codes')
        .delete()
        .eq('id', id)
        .select();

    if (error) return { success: false, message: error.message };
    if (!data || data.length === 0) return { success: false, message: "Delete failed (check permissions)" };

    revalidatePath('/admin/promos');
    return { success: true };
}

export async function togglePromoStatus(id: string, currentStatus: boolean) {
    const supabase = await createClient()
    const { error } = await supabase.from('promo_codes').update({ is_active: !currentStatus }).eq('id', id)
    if (error) return { success: false, message: error.message }
    revalidatePath('/admin/promos')
    return { success: true }
}

export async function getActivePromos() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('promo_codes')
        .select('code, description, discount_type, discount_value')
        .eq('is_active', true)
        .or(`expires_at.gt.${new Date().toISOString()},expires_at.is.null`)
        .order('created_at', { ascending: false })

    if (error) {
        console.error("Supabase Error:", error.message)
        return []
    }
    return data || []
}