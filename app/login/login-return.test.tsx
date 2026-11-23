import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import AuthPage from './page'
const mocks = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn(), onAuth: vi.fn(), oauth: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }) }))
vi.mock('@/utils/supabase/client', () => ({ createClient: () => ({ auth: { onAuthStateChange: mocks.onAuth, signInWithOAuth: mocks.oauth } }) }))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
let root: Root, host: HTMLDivElement
beforeEach(() => {
  vi.clearAllMocks(); sessionStorage.clear(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  mocks.onAuth.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
  mocks.oauth.mockResolvedValue({ error: null })
  window.history.replaceState(null, '', '/login?next=%2Fcheckout%3Fstep%3Ddelivery')
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
})
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); window.history.replaceState(null, '', '/') })
it('continues a password/native SIGNED_IN event at the saved checkout destination', async () => {
  await act(async () => root.render(<AuthPage />))
  const callback = mocks.onAuth.mock.calls.at(-1)![0]
  await act(async () => callback('SIGNED_IN', { user: { id: 'customer' } }))
  expect(mocks.replace).toHaveBeenCalledWith('/checkout?step=delivery')
})
it('retains the return path without changing the allowlisted OAuth callback URL', async () => {
  await act(async () => root.render(<AuthPage />))
  const button = [...host.querySelectorAll('button')].find(b => b.textContent?.includes('Google'))!
  await act(async () => button.click())
  const call = mocks.oauth.mock.calls[0][0]
  const url = new URL(call.options.redirectTo)
  expect(url.pathname).toBe('/auth/callback'); expect(url.search).toBe('')
  expect(document.cookie).toContain('tms-auth-return-v1=%2Fcheckout%3Fstep%3Ddelivery')
})
