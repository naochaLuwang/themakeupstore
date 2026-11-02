import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/utils/supabase/admin'
import { loadPromotionDefinitions, PROMOTION_CACHE_TAG } from '@/lib/promotion-data'

export const cachedPromotionDefinitions = unstable_cache(
  async () => loadPromotionDefinitions(await createAdminClient()),
  ['store-promotion-definitions-v1', process.env.NEXT_PUBLIC_SUPABASE_URL || ''],
  { tags: [PROMOTION_CACHE_TAG], revalidate: 30 },
)
