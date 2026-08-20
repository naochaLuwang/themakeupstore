"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin"

export async function getFlashSales() {
  const { supabase } = await requireAdmin()
  const { data, error } = await supabase
    .from('flash_sales')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) throw new Error(error.message)
  return data
}

export async function getFlashSale(id: string) {
  const { supabase } = await requireAdmin()
  const { data, error } = await supabase
    .from('flash_sales')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function createFlashSale(formData: FormData) {
  const { supabase } = await requireAdmin()
  const payload = JSON.parse(formData.get("payload") as string)

  // Validation
  const startsAt = new Date(payload.starts_at)
  const endsAt = new Date(payload.ends_at)
  if (endsAt <= startsAt) {
    return { success: false, error: "End time must be after start time" }
  }
  const discountValue = Number(payload.discount_value)
  if (isNaN(discountValue) || discountValue <= 0) {
    return { success: false, error: "Discount value must be positive" }
  }
  if (payload.discount_type === 'percentage' && discountValue > 100) {
    return { success: false, error: "Percentage discount cannot exceed 100%" }
  }

  // Validate scope requirements
  const scope = payload.scope
  if (scope === 'product' && !payload.product_id) {
    return { success: false, error: "Product is required for product scope" }
  }
  if (scope === 'category' && !payload.category_id) {
    return { success: false, error: "Category is required for category scope" }
  }
  if (scope === 'brand' && !payload.brand) {
    return { success: false, error: "Brand name is required for brand scope" }
  }

  try {
    const insert: any = {
      scope,
      discount_type: payload.discount_type,
      discount_value: discountValue,
      starts_at: payload.starts_at,
      ends_at: payload.ends_at,
      label: payload.label || '',
    }
    if (scope === 'product') insert.product_id = payload.product_id
    if (scope === 'category') insert.category_id = payload.category_id
    if (scope === 'brand') insert.brand = payload.brand

    const { error } = await supabase.from('flash_sales').insert(insert)
    if (error) throw error
    revalidatePath('/admin/flash-sales')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateFlashSale(id: string, formData: FormData) {
  const { supabase } = await requireAdmin()
  const payload = JSON.parse(formData.get("payload") as string)

  // Validation
  const startsAt = new Date(payload.starts_at)
  const endsAt = new Date(payload.ends_at)
  if (endsAt <= startsAt) {
    return { success: false, error: "End time must be after start time" }
  }
  const discountValue = Number(payload.discount_value)
  if (isNaN(discountValue) || discountValue <= 0) {
    return { success: false, error: "Discount value must be positive" }
  }
  if (payload.discount_type === 'percentage' && discountValue > 100) {
    return { success: false, error: "Percentage discount cannot exceed 100%" }
  }

  // Validate scope requirements
  const scope = payload.scope
  if (scope === 'product' && !payload.product_id) {
    return { success: false, error: "Product is required for product scope" }
  }
  if (scope === 'category' && !payload.category_id) {
    return { success: false, error: "Category is required for category scope" }
  }
  if (scope === 'brand' && !payload.brand) {
    return { success: false, error: "Brand name is required for brand scope" }
  }

  try {
    const update: any = {
      scope,
      discount_type: payload.discount_type,
      discount_value: discountValue,
      starts_at: payload.starts_at,
      ends_at: payload.ends_at,
      label: payload.label || '',
      is_active: payload.is_active,
      updated_at: new Date().toISOString(),
    }
    if (scope === 'product') { update.product_id = payload.product_id; update.category_id = null; update.brand = null }
    else if (scope === 'category') { update.category_id = payload.category_id; update.product_id = null; update.brand = null }
    else if (scope === 'brand') { update.brand = payload.brand; update.product_id = null; update.category_id = null }
    else { update.product_id = null; update.category_id = null; update.brand = null }

    const { error } = await supabase.from('flash_sales').update(update).eq('id', id)
    if (error) throw error
    revalidatePath('/admin/flash-sales')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteFlashSale(id: string) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('flash_sales').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/flash-sales')
}

export async function toggleFlashSale(id: string, isActive: boolean) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase
    .from('flash_sales')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/flash-sales')
}

export async function startFlashSale(id: string) {
  const { supabase } = await requireAdmin()
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('flash_sales')
    .update({ is_active: true, starts_at: now, updated_at: now })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/flash-sales')
  return { success: true }
}

export async function endFlashSale(id: string) {
  const { supabase } = await requireAdmin()
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('flash_sales')
    .update({ is_active: false, ends_at: now, updated_at: now })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/flash-sales')
  return { success: true }
}

export async function cancelFlashSale(id: string) {
  const { supabase } = await requireAdmin()
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('flash_sales')
    .update({ is_active: false, updated_at: now })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/flash-sales')
  return { success: true }
}