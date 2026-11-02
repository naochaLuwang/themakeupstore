import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/utils/supabase/admin'
import { loadEligibleCatalog } from '@/lib/eligible-offer-products'
import type { BXGYRule } from '@/lib/promotion-engine'
import { PROMOTION_CACHE_TAG } from '@/lib/promotion-data'
import { FLASH_CACHE_TAG } from '@/lib/flash-sale-cache'

// Include the exact selection in the key so an edit cannot mix old rule labels with new targets.
export const cachedEligibleCatalog = unstable_cache(async (rule: BXGYRule) => {
  return loadEligibleCatalog(await createAdminClient(), rule)
}, ['eligible-offer-products-v1', process.env.NEXT_PUBLIC_SUPABASE_URL || ''],
{ tags: [PROMOTION_CACHE_TAG, FLASH_CACHE_TAG], revalidate: 30 })
