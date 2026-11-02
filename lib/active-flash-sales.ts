import { createClient } from '@/utils/supabase/server'
export type { FlashSaleRow as ActiveFlashSale } from '@/lib/flash-sale-helper'
export { flashSaleMatchesProduct, pickBestFlashSale } from '@/lib/flash-sale-helper'
export async function getActiveFlashSales() {
  const db = await createClient()
  const { data, error } = await db.from('flash_sales').select('*').eq('is_active', true).gt('ends_at', new Date().toISOString())
  if (error) throw new Error(error.message)
  return data || []
}
