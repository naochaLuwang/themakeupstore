// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

const mocks = vi.hoisted(() => ({ quote: vi.fn(), preview: vi.fn(), authClient: vi.fn() }))
vi.mock('@/app/actions/offer-quote', () => ({ getOfferQuote: mocks.quote, getPromotionPreview: mocks.preview }))
vi.mock('@supabase/ssr', () => ({ createServerClient: mocks.authClient }))
beforeEach(() => vi.clearAllMocks())
const request = (body: unknown) => new Request('https://store.example/api/cart/quote', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } })

it('preloads an empty cart without a shared cache or customer identity in the request', async () => {
  mocks.preview.mockResolvedValue({ success: true, previewCatalog: { ownerId: null } })
  const result = await POST(request([]))
  expect(result.status).toBe(200); expect(mocks.preview).toHaveBeenCalledOnce(); expect(mocks.quote).not.toHaveBeenCalled()
  expect(result.headers.get('cache-control')).toBe('private, no-store'); expect(result.headers.get('vary')).toBe('Cookie')
})
it('passes only the basket to the server-owned quote function', async () => {
  const items = [{ variantId: 'v', quantity: 3 }]
  mocks.quote.mockResolvedValue({ success: true, quote: { total: 100 } })
  expect((await POST(request(items))).status).toBe(200)
  expect(mocks.quote).toHaveBeenCalledWith(items); expect(mocks.preview).not.toHaveBeenCalled()
})
it('returns useful failures and rejects malformed JSON', async () => {
  mocks.quote.mockResolvedValue({ success: false, message: 'Invalid cart' })
  expect((await POST(request({ userId: 'forged', items: [] }))).status).toBe(400)
  expect((await POST(new Request('https://store.example/api/cart/quote', { method: 'POST', body: '{' }))).status).toBe(400)
})
it('lets the read-only guest quote route authenticate once inside its own handler', async () => {
  const result = await updateSession(new NextRequest('https://store.example/api/cart/quote'))
  expect(result.headers.get('location')).toBeNull(); expect(mocks.authClient).not.toHaveBeenCalled()
})
