import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/utils/supabase/admin'
import type { FlashSaleRow } from '@/lib/flash-sale-helper'
export const FLASH_CACHE_TAG = 'store-flash-sales'
export const cachedFlashSales = unstable_cache(async () => {
  const db = await createAdminClient()
  const { data, error } = await db.from('flash_sales').select('*').eq('is_active', true).gt('ends_at', new Date().toISOString())
  if (error) throw new Error('Could not load flash sales')
  return (data || []) as FlashSaleRow[]
}, ['store-flash-sales-v2', process.env.NEXT_PUBLIC_SUPABASE_URL || ''], { tags: [FLASH_CACHE_TAG], revalidate: 30 })
