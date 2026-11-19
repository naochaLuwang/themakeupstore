import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { webcrypto } from 'node:crypto'
const mocks = vi.hoisted(() => ({ available: true, oauth: vi.fn(), exchange: vi.fn(), authenticate: vi.fn() }))
vi.mock('@capacitor/core', () => ({ Capacitor: { isPluginAvailable: () => mocks.available } }))
vi.mock('@/utils/supabase/client', () => ({ createClient: () => ({ auth: { signInWithOAuth: mocks.oauth, exchangeCodeForSession: mocks.exchange } }) }))
vi.mock('@/lib/ios-native', () => ({ StoreShell: { authenticate: mocks.authenticate } }))
beforeEach(() => {
  vi.resetModules(); vi.resetAllMocks(); sessionStorage.clear(); mocks.available = true
  vi.stubGlobal('crypto', webcrypto)
  mocks.oauth.mockResolvedValue({ data: { url: 'https://project.supabase.co/auth/v1/authorize?pkce=bound' }, error: null })
  mocks.exchange.mockResolvedValue({ error: null })
  mocks.authenticate.mockResolvedValue({ url: 'themakeupstore://auth/callback?code=private' })
})
afterEach(() => vi.unstubAllGlobals())
const actions = () => ({ success: vi.fn(), failure: vi.fn() })
describe('iOS system authentication', () => {
  it('keeps the PKCE client in the WebView and opens the native auth session', async () => {
    const api = await import('./ios-auth'), a = actions()
    await api.signInIOSGoogle(a)
    expect(mocks.oauth).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: 'themakeupstore://auth/callback', skipBrowserRedirect: true } })
    expect(mocks.authenticate).toHaveBeenCalledWith({ url: 'https://project.supabase.co/auth/v1/authorize?pkce=bound' })
    expect(mocks.exchange).toHaveBeenCalledWith('private')
    expect(a.success).toHaveBeenCalledOnce()
  })
  it('handles an OAuth transport failure without exposing provider details', async () => {
    const api = await import('./ios-auth'), a = actions()
    mocks.oauth.mockRejectedValueOnce(new Error('private provider payload'))
    await expect(api.signInIOSGoogle(a)).resolves.toBeUndefined()
    expect(a.failure).toHaveBeenCalledWith(); expect(mocks.authenticate).not.toHaveBeenCalled()
  })
  it('treats cancelling the system sheet as cancellation without exchanging a code', async () => {
    const api = await import('./ios-auth'), a = actions()
    mocks.authenticate.mockResolvedValue({ cancelled: true })
    await api.signInIOSGoogle(a)
    expect(mocks.exchange).not.toHaveBeenCalled(); expect(a.failure).not.toHaveBeenCalled()
  })
  it('rejects an unexpected native callback destination', async () => {
    const api = await import('./ios-auth'), a = actions()
    mocks.authenticate.mockResolvedValue({ url: 'https://evil.test/auth/callback?code=private' })
    await api.signInIOSGoogle(a)
    expect(mocks.exchange).not.toHaveBeenCalled(); expect(a.failure).toHaveBeenCalledOnce()
  })
  it('exchanges duplicate system-session and App-event callbacks once', async () => {
    const api = await import('./ios-auth'), a = actions(), other = actions()
    await Promise.all([api.completeIOSAuth('themakeupstore://auth/callback?code=private', a), api.completeIOSAuth('https://themakeupstorewangkhei.com/auth/callback?code=private', other)])
    expect(mocks.exchange).toHaveBeenCalledOnce()
    expect(a.success.mock.calls.length + other.success.mock.calls.length).toBe(1)
  })
  it('remembers only a hash across document reloads, without storing authorization codes', async () => {
    let api = await import('./ios-auth')
    await api.completeIOSAuth('themakeupstore://auth/callback?code=private', actions())
    expect(sessionStorage.getItem('tms-ios-consumed-auth')).not.toContain('private')
    vi.resetModules(); api = await import('./ios-auth')
    const a = actions(); await api.completeIOSAuth('themakeupstore://auth/callback?code=private', a)
    expect(mocks.exchange).toHaveBeenCalledOnce(); expect(a.success).not.toHaveBeenCalled()
  })
  it('allows an explicit retry after an exchange failure and exposes no provider details', async () => {
    const api = await import('./ios-auth'), a = actions()
    mocks.exchange.mockRejectedValueOnce(new Error('private token payload'))
    await api.completeIOSAuth('themakeupstore://auth/callback?code=private', a)
    expect(a.failure).toHaveBeenCalledWith(); expect(a.success).not.toHaveBeenCalled()
    await api.completeIOSAuth('themakeupstore://auth/callback?code=private', a)
    expect(a.success).toHaveBeenCalledOnce()
  })
  it('preserves the older-binary redirect fallback without calling an absent native plugin', async () => {
    mocks.available = false
    const api = await import('./ios-auth'); await api.signInIOSGoogle(actions())
    expect(mocks.oauth.mock.calls[0][0].options).toEqual({ redirectTo: 'themakeupstore://auth/callback' })
    expect(mocks.authenticate).not.toHaveBeenCalled()
  })
  it('does not mistake Apple unknown error 1000 for cancellation 1001', async () => {
    const { isAppleSignInCancelled } = await import('./ios-auth')
    expect(isAppleSignInCancelled(new Error('ASAuthorization error 1001'))).toBe(true)
    expect(isAppleSignInCancelled({ code: '1001' })).toBe(true)
    expect(isAppleSignInCancelled(new Error('ASAuthorization error 1000'))).toBe(false)
  })
})
