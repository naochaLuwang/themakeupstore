"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin"
import { PromoSchema } from "@/lib/schemas"

export async function createPromoCode(formData: FormData) {
    await requireAdmin()
    const supabase = await createClient()

    const rawData = {
        code: (formData.get('code') as string).toUpperCase(),
        description: formData.get('description') as string,
        discount_type: formData.get('discount_type') as string,
        discount_value: parseFloat(formData.get('discount_value') as string),
        apply_to: formData.get('apply_to') as string,
        min_order_amount: parseFloat(formData.get('min_order_amount') as string) || 0,
        max_discount_amount: formData.get('max_discount_amount') ? parseFloat(formData.get('max_discount_amount') as string) : null,
        usage_limit: formData.get('usage_limit') ? parseInt(formData.get('usage_limit') as string) : null,
        once_per_user: formData.get('once_per_user') === 'on',
        expires_at: formData.get('expires_at') ? new Date(formData.get('expires_at') as string).toISOString() : null,
        starts_at: formData.get('starts_at') ? new Date(formData.get('starts_at') as string).toISOString() : new Date().toISOString(),
    }

    const { success, data, error: validationError } = PromoSchema.safeParse(rawData)
    if (!success) return { success: false, message: validationError.message }

    const selected_ids = formData.get('selected_ids') as string

    // 1. Insert Main Promo
    const { data: promo, error: promoError } = await supabase
        .from('promo_codes')
        .insert([data])
        .select()
        .single()

    if (promoError) {
        console.error("Insert Error:", promoError.message)
        return { success: false, message: promoError.message }
    }

    // 2. Insert Junction Table Data (Products or Categories)
    if (selected_ids && promo) {
        const ids = selected_ids.split(',').filter(id => id.length > 0)

        if (data.apply_to === 'specific_products') {
            const inserts = ids.map(id => ({ promo_id: promo.id, product_id: id }))
            await supabase.from('promo_code_products').insert(inserts)
        }
        else if (data.apply_to === 'specific_categories') {
            const inserts = ids.map(id => ({ promo_id: promo.id, category_id: id }))
            await supabase.from('promo_code_categories').insert(inserts)
        }
    }

    revalidatePath('/admin/promos')
    return { success: true }
}

// app/actions/promo.ts


// @/app/actions/promo.ts

// @/app/actions/promo.ts

export async function validatePromoCode(code: string, cartItems: any[]) {
    try {
        const supabase = await createClient()

        // 1. Fetch promo and its relationships
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

        if (error || !promo) return { success: false, message: "Invalid promo code" }

        // 2. Check Expiry and Starts At
        const now = new Date()
        if (promo.starts_at && new Date(promo.starts_at) > now) {
            return { success: false, message: "This promo code is not active yet" }
        }
        if (promo.expires_at && new Date(promo.expires_at) < now) {
            return { success: false, message: "This promo code has expired" }
        }

        // 3. Check Usage Limit
        if (promo.usage_limit && promo.used_count >= promo.usage_limit) {
            return { success: false, message: "This promo code has reached its usage limit" }
        }

        // 4. Once Per User Restriction
        const { data: { user } } = await supabase.auth.getUser()
        if (promo.once_per_user && user) {
            const { data: previousRedemption } = await supabase
                .from('promo_redemptions')
                .select('id')
                .eq('promo_id', promo.id)
                .eq('user_id', user.id)
                .single()

            if (previousRedemption) {
                return { success: false, message: "This coupon can only be used once per customer" }
            }
        }

        // 5. Map the IDs from junction tables (UUID strings)
        const allowedProductIds = promo.promo_code_products?.map((p: any) => String(p.product_id)) || []
        const allowedCategoryIds = promo.promo_code_categories?.map((c: any) => String(c.category_id)) || []

        // 6. Filter items in the bag that are eligible for this specific promo
        const eligibleItems: any[] = [];
        for (const item of cartItems) {
            const itemProdId = String(item.productId);

            if (promo.apply_to === 'all') {
                eligibleItems.push(item);
                continue;
            }

            if (promo.apply_to === 'specific_products') {
                if (allowedProductIds.includes(itemProdId)) {
                    eligibleItems.push(item);
                }
                continue;
            }

            if (promo.apply_to === 'specific_categories') {
                let itemCatId = item.categoryId ? String(item.categoryId) : null;
                // If categoryId not available on item (products.category_id is often NULL),
                // look up actual categories from the junction table
                if (!itemCatId) {
                    const { data: cats } = await supabase
                        .from('product_categories')
                        .select('category_id')
                        .eq('product_id', itemProdId)
                    if (cats && cats.length > 0) {
                        // Check if ANY of the product's categories match
                        const productCatIds = cats.map(c => String(c.category_id));
                        if (productCatIds.some(cid => allowedCategoryIds.includes(cid))) {
                            eligibleItems.push(item);
                        }
                    }
                } else if (allowedCategoryIds.includes(itemCatId)) {
                    eligibleItems.push(item);
                }
                continue;
            }
        }

        // 7. Validation: Are there any eligible items?
        if (eligibleItems.length === 0) {
            return { success: false, message: "This code is not applicable to the items in your bag" }
        }

        // 8. Minimum Order Amount
        const eligibleSubtotal = eligibleItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

        if (eligibleSubtotal < (promo.min_order_amount || 0)) {
            return {
                success: false,
                message: `Add ₹${((promo.min_order_amount || 0) - eligibleSubtotal).toLocaleString()} more of eligible items to use this code`
            }
        }

        // 9. Return success with all data needed for the frontend to calculate discount
        return {
            success: true,
            id: promo.id,
            code: promo.code,
            discount_type: promo.discount_type,
            discount_value: Number(promo.discount_value),
            max_discount_amount: promo.max_discount_amount,
            apply_to: promo.apply_to,
            min_order_amount: promo.min_order_amount,
            allowedProductIds,
            allowedCategoryIds,
            eligibleVariantIds: eligibleItems.map((i: any) => i.variantId)
        }
    } catch (err: any) {
        console.error("validatePromoCode error:", err)
        return { success: false, message: "Something went wrong. Please try again." }
    }
}

export async function deletePromoCode(id: string) {
    await requireAdmin()
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
    await requireAdmin()
    const supabase = await createClient()
    const { error } = await supabase.from('promo_codes').update({ is_active: !currentStatus }).eq('id', id)
    if (error) return { success: false, message: error.message }
    revalidatePath('/admin/promos')
    return { success: true }
}

export async function getActivePromos() {
    const supabase = await createClient()
    const now = new Date().toISOString()

    const { data, error } = await supabase
        .from('promo_codes')
        .select(`
            *,
            promo_code_products(product_id),
            promo_code_categories(category_id)
        `)
        .eq('is_active', true)
        // .or(`expires_at.gt.${now},expires_at.is.null`)
        // .lte('starts_at', now)
        .order('created_at', { ascending: false })

    if (error) {
        console.error("Supabase Error:", error.message)
        return []
    }

    // NEW: Filter out "Once Per User" promos that the user has already used
    const { data: { user } } = await supabase.auth.getUser()
    if (user && data) {
        const { data: redemptions } = await supabase
            .from('promo_redemptions')
            .select('promo_id')
            .eq('user_id', user.id)

        if (redemptions) {
            const usedPromoIds = new Set(redemptions.map(r => r.promo_id))
            return data.filter(promo => !promo.once_per_user || !usedPromoIds.has(promo.id))
        }
    }

    return data || []
}


export async function updatePromoCode(id: string, formData: FormData) {
    await requireAdmin()
    const supabase = await createClient()

    const rawData = {
        code: (formData.get('code') as string).toUpperCase(),
        description: formData.get('description') as string,
        discount_type: formData.get('discount_type') as string,
        discount_value: parseFloat(formData.get('discount_value') as string),
        apply_to: formData.get('apply_to') as string,
        min_order_amount: parseFloat(formData.get('min_order_amount') as string) || 0,
        max_discount_amount: formData.get('max_discount_amount') ? parseFloat(formData.get('max_discount_amount') as string) : null,
        usage_limit: formData.get('usage_limit') ? parseInt(formData.get('usage_limit') as string) : null,
        expires_at: formData.get('expires_at') ? new Date(formData.get('expires_at') as string).toISOString() : null,
        starts_at: formData.get('starts_at') ? new Date(formData.get('starts_at') as string).toISOString() : null,
        once_per_user: formData.get('once_per_user') === 'on'
    }

    const { success, data: updates, error: validationError } = PromoSchema.safeParse(rawData)
    if (!success) return { success: false, message: validationError.message }

    const { error } = await supabase.from('promo_codes').update(updates).eq('id', id)
    if (error) return { success: false, message: error.message }

    // Update targeting relations
    const selected_ids = (formData.get('selected_ids') as string).split(',').filter(Boolean)

    // 1. Clear existing relations
    await supabase.from('promo_code_products').delete().eq('promo_id', id)
    await supabase.from('promo_code_categories').delete().eq('promo_id', id)

    // 2. Insert new relations
    if (updates.apply_to === 'specific_products') {
        const inserts = selected_ids.map(pid => ({ promo_id: id, product_id: pid }))
        await supabase.from('promo_code_products').insert(inserts)
    } else if (updates.apply_to === 'specific_categories') {
        const inserts = selected_ids.map(cid => ({ promo_id: id, category_id: cid }))
        await supabase.from('promo_code_categories').insert(inserts)
    }

    revalidatePath('/admin/promos')
    return { success: true }
}

export async function getPromoUsageHistory(promoId: string) {
    await requireAdmin()
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('promo_usage_details')
        .select('*')
        .eq('promo_id', promoId)
        .order('redeemed_at', { ascending: false })

    if (error) return []
    return data
}

import { checkProductPromoEligibility } from "@/lib/promo-helper"

export async function getPromosForProduct(productId: string, categoryIds: string[]) {
    const supabase = await createClient()
    const now = new Date().toISOString()

    // Fetch all active promos with their targeting
    const { data: promos, error } = await supabase
        .from('promo_codes')
        .select(`
            *,
            promo_code_products(product_id),
            promo_code_categories(category_id)
        `)
        .eq('is_active', true)
        // .or(`expires_at.gt.${now},expires_at.is.null`)
        // .lte('starts_at', now)

    if (error || !promos) return []

    // NEW: Get user redemptions for usage check
    const { data: { user } } = await supabase.auth.getUser()
    const usedPromoIds = new Set()
    if (user) {
        const { data: redemptions } = await supabase
            .from('promo_redemptions')
            .select('promo_id')
            .eq('user_id', user.id)
        if (redemptions) redemptions.forEach(r => usedPromoIds.add(r.promo_id))
    }

    // Map through promos to add 'is_eligible' flag and reasons
    return promos.map(promo => {
        const { isEligible, reasons } = checkProductPromoEligibility(promo, { id: productId, categoryIds })
        
        let finalEligible = isEligible
        const finalReasons = [...reasons]

        if (promo.once_per_user && user && usedPromoIds.has(promo.id)) {
            finalEligible = false
            finalReasons.push("Already redeemed by you")
        }

        return {
            id: promo.id,
            code: promo.code,
            description: promo.description,
            discount_type: promo.discount_type,
            discount_value: promo.discount_value,
            min_order_amount: promo.min_order_amount,
            is_eligible: finalEligible,
            reasons: finalReasons,
            // Include these for re-validation on client side
            apply_to: promo.apply_to,
            promo_code_products: promo.promo_code_products,
            promo_code_categories: promo.promo_code_categories
        }
    })
}