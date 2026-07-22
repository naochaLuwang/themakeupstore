"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin"

export async function getFlashSales() {
  await requireAdmin()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('flash_sales')
    .select('*, products(name, thumbnail_url), categories(name)')
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) throw new Error(error.message)
  return data
}

export async function getFlashSale(id: string) {
  await requireAdmin()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('flash_sales')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function createFlashSale(formData: FormData) {
  await requireAdmin()
  const supabase = await createClient()
  const payload = JSON.parse(formData.get("payload") as string)

  try {
    const insert: any = {
      scope: payload.scope,
      discount_type: payload.discount_type,
      discount_value: Number(payload.discount_value),
      starts_at: payload.starts_at,
      ends_at: payload.ends_at,
      label: payload.label || '',
    }
    if (payload.scope === 'product') insert.product_id = payload.product_id
    if (payload.scope === 'category') insert.category_id = payload.category_id
    if (payload.scope === 'brand') insert.brand = payload.brand

    const { error } = await supabase.from('flash_sales').insert(insert)
    if (error) throw error
    revalidatePath('/admin/flash-sales')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateFlashSale(id: string, formData: FormData) {
  await requireAdmin()
  const supabase = await createClient()
  const payload = JSON.parse(formData.get("payload") as string)

  try {
    const update: any = {
      scope: payload.scope,
      discount_type: payload.discount_type,
      discount_value: Number(payload.discount_value),
      starts_at: payload.starts_at,
      ends_at: payload.ends_at,
      label: payload.label || '',
      is_active: payload.is_active,
      updated_at: new Date().toISOString(),
    }
    if (payload.scope === 'product') { update.product_id = payload.product_id; update.category_id = null; update.brand = null }
    else if (payload.scope === 'category') { update.category_id = payload.category_id; update.product_id = null; update.brand = null }
    else if (payload.scope === 'brand') { update.brand = payload.brand; update.product_id = null; update.category_id = null }
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
  await requireAdmin()
  const supabase = await createClient()
  const { error } = await supabase.from('flash_sales').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/flash-sales')
}

export async function toggleFlashSale(id: string, isActive: boolean) {
  await requireAdmin()
  const supabase = await createClient()
  const { error } = await supabase
    .from('flash_sales')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/flash-sales')
}
