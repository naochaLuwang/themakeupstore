// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
import { GET } from './route'
import { NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

const mocks = vi.hoisted(() => ({ definitions: vi.fn(), catalog: vi.fn(), sales: vi.fn(), identity: vi.fn(), from: vi.fn(), authClient: vi.fn() }))
vi.mock('@/lib/promotion-cache', () => ({ cachedPromotionDefinitions: mocks.definitions }))
vi.mock('@/lib/eligible-offer-cache', () => ({ cachedEligibleCatalog: mocks.catalog }))
vi.mock('@/lib/flash-sale-cache', () => ({ cachedFlashSales: mocks.sales }))
vi.mock('@/utils/supabase/server', () => ({ createClient: async () => ({ auth: { getUser: mocks.identity } }) }))
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: async () => ({ from: mocks.from }) }))
vi.mock('@supabase/ssr', () => ({ createServerClient: mocks.authClient }))
const id = '00000000-0000-4000-8000-000000000001'
const rule = { id, is_active: true, buy_type: 'specific_brands', buy_quantity: 2, get_type: 'cheapest_free', get_discount_type: 'free', get_discount_value: 100, brands: ['Milani'], products: [], categories: [] }
const get = (params = '', offerId = id) => GET(new Request(`https://store.example/api/offers/${offerId}/products?${params}`), { params: Promise.resolve({ id: offerId }) })
beforeEach(() => {
  vi.clearAllMocks()
  mocks.identity.mockResolvedValue({ data: { user: null } })
  mocks.definitions.mockResolvedValue({ bxgyRules: [{ ...rule }] })
  mocks.catalog.mockResolvedValue({ products: [], categories: [] }); mocks.sales.mockResolvedValue([])
})
it('serves guests a private non-cacheable, paginated eligible catalog', async () => {
  const response = await get()
  expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toBe('private, no-store')
  expect(response.headers.get('vary')).toBe('Cookie'); expect(await response.json()).toMatchObject({ products: [], total: 0, page: 1 })
})
it('rejects invalid identifiers and unbounded searches before database access', async () => {
  expect((await get('', 'bad')).status).toBe(400)
  expect((await get('page=-1')).status).toBe(400)
  expect((await get('search=' + 'x'.repeat(201))).status).toBe(400)
  expect(mocks.identity).not.toHaveBeenCalled()
})
it.each([{ is_active: false }, { expires_at: '2000-01-01' }, { starts_at: '2099-01-01' }, { usage_limit: 1, used_count: 1 }, { buy_quantity: 5 }])('does not expose unavailable campaigns: %o', async patch => {
  mocks.definitions.mockResolvedValue({ bxgyRules: [{ ...rule, ...patch }] })
  expect((await get()).status).toBe(410); expect(mocks.catalog).not.toHaveBeenCalled()
})
it('uses session-owned once-per-user eligibility and ignores a forged owner parameter', async () => {
  mocks.identity.mockResolvedValue({ data: { user: { id: 'real-user' } } })
  mocks.definitions.mockResolvedValue({ bxgyRules: [{ ...rule, once_per_user: true }] })
  const eq = vi.fn().mockReturnThis(), select = vi.fn().mockReturnThis(), limit = vi.fn().mockResolvedValue({ data: [{ promotion_id: id }], error: null })
  mocks.from.mockReturnValue({ eq, select, limit })
  expect((await get('ownerId=forged')).status).toBe(410)
  expect(eq).toHaveBeenCalledWith('user_id', 'real-user'); expect(mocks.catalog).not.toHaveBeenCalled()
})
it('returns a retryable sanitized error on catalog failure', async () => {
  mocks.catalog.mockRejectedValue(new Error('private database details'))
  const response = await get()
  expect(response.status).toBe(503); expect(JSON.stringify(await response.json())).not.toContain('private database')
})
it('lets the public read-only route own authentication without a duplicate middleware round trip', async () => {
  const result = await updateSession(new NextRequest(`https://store.example/api/offers/${id}/products`))
  expect(result.headers.get('location')).toBeNull(); expect(mocks.authClient).not.toHaveBeenCalled()
})
