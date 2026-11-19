import { describe, it, expect, vi, afterEach } from 'vitest'
import { createAndroidLinkHandler, handleAndroidBack, parseAndroidAppLink } from './android-app-links'

const origin = 'https://themakeupstorewangkhei.com'
afterEach(() => { document.body.innerHTML = '' })

describe('Android links', () => {
  it('preserves an exact store product or order path, shade query and fragment', () => {
    expect(parseAndroidAppLink(`${origin}/products/123?shade=red#reviews`)).toEqual({ type: 'route', path: '/products/123?shade=red#reviews' })
    expect(parseAndroidAppLink(`${origin}/profile/orders/123`)).toEqual({ type: 'route', path: '/profile/orders/123' })
  })
  it.each(['https://themakeupstorewangkhei.com.evil.test/products/1', 'http://themakeupstorewangkhei.com/products/1', `${origin}:444/products/1`, 'https://name:secret@themakeupstorewangkhei.com/', 'javascript:alert(1)', '/products/1', `${origin}/\\evil`, `${origin}/api/create-order`, `${origin}/_next/static/a.js`, 'themakeupstore://evil/callback?code=secret', 'themakeupstore://auth/wrong?code=secret'])('rejects an untrusted or non-page URL: %s', value => {
    expect(parseAndroidAppLink(value)).toBeUndefined()
  })
  it('accepts only the registered authentication endpoint', () => {
    expect(parseAndroidAppLink('themakeupstore://auth/callback?code=private')).toEqual({ type: 'auth', code: 'private', failed: false })
    expect(parseAndroidAppLink(`${origin}/auth/callback?error=denied`)).toEqual({ type: 'auth', code: undefined, failed: true })
  })
  it('exchanges a duplicate callback once and routes only after success', async () => {
    const actions = { navigate: vi.fn(), exchangeCode: vi.fn().mockResolvedValue({ error: null }), signedIn: vi.fn(), authFailed: vi.fn() }
    const handle = createAndroidLinkHandler(actions)
    await Promise.all([handle('themakeupstore://auth/callback?code=private'), handle(`${origin}/auth/callback?code=private`)])
    await handle('themakeupstore://auth/callback?code=private')
    expect(actions.exchangeCode).toHaveBeenCalledTimes(1)
    expect(actions.signedIn).toHaveBeenCalledTimes(1)
    expect(actions.navigate).not.toHaveBeenCalled()
  })
  it('retains a failed callback for an explicit retry and never navigates on failure', async () => {
    const actions = { navigate: vi.fn(), exchangeCode: vi.fn().mockRejectedValueOnce(new Error('private provider data')).mockResolvedValue({ error: null }), signedIn: vi.fn(), authFailed: vi.fn() }
    const handle = createAndroidLinkHandler(actions)
    await handle('themakeupstore://auth/callback?code=private')
    expect(actions.signedIn).not.toHaveBeenCalled()
    expect(actions.authFailed).toHaveBeenCalledWith()
    await handle('themakeupstore://auth/callback?code=private')
    expect(actions.signedIn).toHaveBeenCalledOnce()
  })
})

describe('Android Back', () => {
  it('dismisses a sheet before touching browser history', () => {
    document.body.innerHTML = '<div role="dialog" data-state="open"></div>'
    const close = vi.fn(), back = vi.fn(), exit = vi.fn()
    document.addEventListener('keydown', close, { once: true })
    handleAndroidBack(true, back, exit)
    expect(close.mock.calls[0][0].key).toBe('Escape')
    expect(back).not.toHaveBeenCalled()
    expect(exit).not.toHaveBeenCalled()
  })
  it('keeps a visible payment open and allows history after dismissal', () => {
    document.body.innerHTML = '<div class="razorpay-container"></div>'
    const back = vi.fn(), exit = vi.fn()
    handleAndroidBack(true, back, exit)
    expect(back).not.toHaveBeenCalled()
    document.querySelector<HTMLElement>('.razorpay-container')!.style.display = 'none'
    handleAndroidBack(true, back, exit)
    expect(back).toHaveBeenCalledOnce()
    handleAndroidBack(false, back, exit)
    expect(exit).toHaveBeenCalledOnce()
  })
})
