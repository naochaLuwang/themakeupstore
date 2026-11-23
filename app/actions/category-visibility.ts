'use server'

import { requireAdmin } from '@/lib/admin'
import { uuidPattern } from '@/lib/cart-quote'
import { revalidatePath, revalidateTag } from 'next/cache'
import { PROMOTION_CACHE_TAG } from '@/lib/promotion-data'

export async function setCategoryVisibility(id: string, active: boolean, expectedActive: boolean) {
    const { supabase } = await requireAdmin()
    if (!uuidPattern.test(id) || typeof active !== 'boolean' || typeof expectedActive !== 'boolean') {
        return { error: 'Invalid category status.' }
    }
    try {
        const { data, error } = await supabase.rpc('set_category_visibility', {
            p_category: id, p_active: active, p_expected_active: expectedActive,
        })
        if (error) {
            if (error.message === 'Category changed. Refresh before trying again.' ||
                error.message === 'Activate the parent category first.' || error.message === 'Category not found.') {
                return { error: error.message }
            }
            return { error: 'Unable to update category status. Refresh and try again.' }
        }
        revalidatePath('/', 'layout')
        revalidateTag('storefront-discovery-catalog', { expire: 0 })
        revalidateTag(PROMOTION_CACHE_TAG, { expire: 0 })
        return { success: true, products: Number(data?.products ?? 0), categories: Number(data?.categories ?? 0) }
    } catch {
        return { error: 'Unable to confirm the update. Refresh before trying again.' }
    }
}
