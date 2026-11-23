// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { updateSession } from './middleware'
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), client: vi.fn() }))
vi.mock('@supabase/ssr', () => ({ createServerClient: mocks.client }))
beforeEach(() => { vi.clearAllMocks(); mocks.getUser.mockResolvedValue({ data: { user: null } }); mocks.client.mockReturnValue({ auth: { getUser: mocks.getUser } }) })
it.each(['/new-arrivals', '/contact', '/cart', '/search?q=lipstick', '/categories', '/concern/dry-skin', '/legal/privacy_policy', '/legal/return_policy'])('keeps public discovery accessible to guests: %s', async path => {
  const response = await updateSession(new NextRequest('https://store.test' + path))
  expect(response.headers.get('location')).toBeNull()
})
it('preserves the exact destination while retaining checkout authorization', async () => {
  const response = await updateSession(new NextRequest('https://store.test/checkout?step=delivery'))
  const target = new URL(response.headers.get('location')!)
  expect(target.pathname).toBe('/login'); expect(target.searchParams.get('next')).toBe('/checkout?step=delivery')
})
it('does not perform an extra auth request for public catalog search', async () => {
  const response = await updateSession(new NextRequest('https://store.test/api/products/search?q=lipstick'))
  expect(response.headers.get('location')).toBeNull(); expect(mocks.getUser).not.toHaveBeenCalled()
})
it('keeps guest browsing available after a session failure without clearing return or preference cookies', async () => {
  mocks.getUser.mockRejectedValue(new Error('Expired session'))
  const response = await updateSession(new NextRequest('https://store.test/shop', { headers: { cookie: 'sb-project-auth-token=expired; tms-auth-return-v1=%2Fcheckout; preference=keep' } }))
  expect(response.headers.get('location')).toBeNull()
  expect(response.cookies.get('sb-project-auth-token')?.value).toBe('')
  expect(response.cookies.get('tms-auth-return-v1')).toBeUndefined()
  expect(response.cookies.get('preference')).toBeUndefined()
})
it('retains authorization and destination when a protected session fails', async () => {
  mocks.getUser.mockRejectedValue(new Error('Expired session'))
  const response = await updateSession(new NextRequest('https://store.test/checkout?step=delivery'))
  expect(new URL(response.headers.get('location')!).searchParams.get('next')).toBe('/checkout?step=delivery')
})
