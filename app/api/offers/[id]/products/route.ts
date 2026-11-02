import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { cachedPromotionDefinitions } from '@/lib/promotion-cache'
import { cachedEligibleCatalog } from '@/lib/eligible-offer-cache'
import { cachedFlashSales } from '@/lib/flash-sale-cache'
import { activeOffer, supportsBXGY } from '@/lib/promotion-engine'
import { eligibleProductsPage } from '@/lib/eligible-offer-products'

const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' }
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const params = new URL(request.url).searchParams
  const page = Number(params.get('page') || 1)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ||
    !Number.isSafeInteger(page) || page < 1 || page > 10000 || [...params.values()].some(v => v.length > 200)) {
    return NextResponse.json({ message: 'Invalid product search' }, { status: 400, headers })
  }
  try {
    const auth = await createClient()
    const [identity, definitions] = await Promise.all([auth.auth.getUser(), cachedPromotionDefinitions()])
    const rule = definitions.bxgyRules.find(r => r.id === id)
    const unavailable = () => NextResponse.json({ message: 'This offer is no longer available. Please check your cart.' }, { status: 410, headers })
    if (!rule || !activeOffer(rule) || !supportsBXGY(rule)) return unavailable()
    if (rule.once_per_user && identity.data.user) {
      const db = await createAdminClient()
      const used = await db.from('checkout_promotion_uses').select('promotion_id').eq('user_id', identity.data.user.id).eq('promotion_id', id).eq('kind', 'bxgy').limit(1)
      if (used.error) throw new Error('Could not check eligibility')
      if (used.data?.length) return unavailable()
    }
    const [catalog, sales] = await Promise.all([cachedEligibleCatalog(rule), cachedFlashSales()])
    if (!catalog || !activeOffer(rule)) return unavailable()
    return NextResponse.json(eligibleProductsPage(catalog, rule, sales, { page, search: params.get('search') || '',
      brand: params.get('brand') || '', category: params.get('category') || '' }), { headers })
  } catch {
    return NextResponse.json({ message: 'Could not load eligible products. Please try again.' }, { status: 503, headers })
  }
}
