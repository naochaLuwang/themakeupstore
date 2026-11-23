import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { safeReturnPath, rememberReturnPath, pendingReturnPath, consumeReturnPath, rememberBrowseOrigin, readBrowseOrigin, restoreBrowseScroll } from './storefront-navigation'
beforeEach(() => { sessionStorage.clear(); vi.useFakeTimers(); vi.setSystemTime(100000) })
afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ''; window.history.replaceState(null, '', '/') })
it('accepts internal destinations and rejects external, auth-loop and malformed destinations', () => {
  expect(safeReturnPath('/checkout?step=delivery')).toBe('/checkout?step=delivery')
  for (const path of ['//evil.test', 'https://evil.test', '/\\evil.test', '/%2f%2fevil.test', '/%5cevil.test', '/%61uth/callback', '/login?next=/login', '/auth/callback', '/api/payments', '/shop\n']) expect(safeReturnPath(path)).toBe('/')
})
it('preserves a login destination and tolerates duplicate native/auth completion callbacks', () => {
  rememberReturnPath('/checkout')
  expect(pendingReturnPath()).toBe('/checkout')
  expect(consumeReturnPath()).toBe('/checkout')
  expect(consumeReturnPath()).toBe('/checkout')
  vi.advanceTimersByTime(10001)
  expect(pendingReturnPath()).toBe('/')
  expect(pendingReturnPath('//evil.test')).toBe('/')
})
it('restores real listing scroll and validates or expires saved browsing origins', () => {
  window.history.replaceState(null, '', '/search?q=lipstick&page=2')
  const scroller = document.createElement('div'); scroller.id = 'app-scroller'; document.body.append(scroller)
  scroller.scrollTop = 720; rememberBrowseOrigin('search results'); scroller.scrollTop = 0
  expect(readBrowseOrigin()).toEqual({ href: '/search?q=lipstick&page=2', title: 'search results' })
  restoreBrowseScroll('/search?q=lipstick&page=2'); expect(scroller.scrollTop).toBe(720)
  vi.advanceTimersByTime(3600001); expect(readBrowseOrigin()).toBeNull()
})
