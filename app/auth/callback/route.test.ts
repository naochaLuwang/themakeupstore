// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
import { GET } from './route'
const mocks = vi.hoisted(() => ({ exchange: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ createClient: async () => ({ auth: { exchangeCodeForSession: mocks.exchange } }) }))
beforeEach(() => { vi.clearAllMocks(); mocks.exchange.mockResolvedValue({ error: null }); vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://store.test') })
it('returns a successful OAuth login to its original internal destination', async () => {
  const response = await GET(new Request('https://store.test/auth/callback?code=private&next=%2Fcheckout%3Fstep%3Ddelivery'))
  expect(response.headers.get('location')).toBe('https://store.test/checkout?step=delivery')
  expect(mocks.exchange).toHaveBeenCalledWith('private')
})
it('rejects external destinations and ignores an untrusted forwarded host', async () => {
  const response = await GET(new Request('https://store.test/auth/callback?code=private&next=https%3A%2F%2Fevil.test', { headers: { 'x-forwarded-host': 'evil.test' } }))
  expect(response.headers.get('location')).toBe('https://store.test/')
})
it('consumes the destination cookie on the unchanged allowlisted callback URL', async () => {
  const response = await GET(new Request('https://store.test/auth/callback?code=private', { headers: { cookie: 'tms-auth-return-v1=%2Fcheckout%3Fstep%3Ddelivery' } }))
  expect(response.headers.get('location')).toBe('https://store.test/checkout?step=delivery')
  expect(response.headers.get('set-cookie')).toContain('tms-auth-return-v1=;')
})
it('preserves a safe destination for retry after failed authentication', async () => {
  mocks.exchange.mockResolvedValue({ error: { message: 'Could not exchange' } })
  const response = await GET(new Request('https://store.test/auth/callback?code=private&next=%2Fcheckout'))
  const target = new URL(response.headers.get('location')!)
  expect(target.pathname).toBe('/login'); expect(target.searchParams.get('next')).toBe('/checkout')
})
