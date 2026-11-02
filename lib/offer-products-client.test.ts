// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const fetchMock = vi.fn()
beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); vi.stubGlobal('fetch', fetchMock); fetchMock.mockReset() })
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })
const reply = () => new Response(JSON.stringify({ products: [], expiresAt: Date.now() + 30_000 }), { headers: { 'Content-Type': 'application/json' } })
it('deduplicates prefetch and opening, with separate customer cache entries', async () => {
  fetchMock.mockImplementation(async () => reply())
  const { firstOfferProducts } = await import('./offer-products-client')
  const a = firstOfferProducts('r', null), b = firstOfferProducts('r', null)
  expect(a).toBe(b); await Promise.all([a, b]); expect(fetchMock).toHaveBeenCalledOnce()
  await firstOfferProducts('r', 'user'); expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(fetchMock.mock.calls[0][1]).toMatchObject({ cache: 'no-store', credentials: 'same-origin' })
})
it('refreshes first-page stock after its short cache expires', async () => {
  fetchMock.mockImplementation(async () => reply())
  const { firstOfferProducts } = await import('./offer-products-client')
  await firstOfferProducts('r', null)
  await vi.advanceTimersByTimeAsync(10001)
  await firstOfferProducts('r', null)
  expect(fetchMock).toHaveBeenCalledTimes(2)
})
it('does not cache unavailable offers or failed requests', async () => {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Offer unavailable' }), { status: 410 }))
  const { firstOfferProducts } = await import('./offer-products-client')
  await expect(firstOfferProducts('r', null)).rejects.toThrow('Offer unavailable')
  fetchMock.mockResolvedValueOnce(reply())
  await firstOfferProducts('r', null); expect(fetchMock).toHaveBeenCalledTimes(2)
})
it('aborts stale filtered requests and times out unresponsive endpoints', async () => {
  fetchMock.mockImplementation((_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('aborted')))
  }))
  const { fetchOfferProducts } = await import('./offer-products-client')
  const controller = new AbortController()
  const pending = fetchOfferProducts('r', new URLSearchParams({ search: 'rose' }), controller.signal)
  const rejection = expect(pending).rejects.toThrow('aborted'); controller.abort(); await rejection
  const stalled = fetchOfferProducts('r'), timedOut = expect(stalled).rejects.toThrow('Loading took too long')
  await vi.advanceTimersByTimeAsync(10000); await timedOut
})
