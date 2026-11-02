import type { EligibleProductsPage } from '@/lib/eligible-offer-products'

const firstPages = new Map<string, { expires: number; promise: Promise<EligibleProductsPage> }>()
export async function fetchOfferProducts(ruleId: string, params = new URLSearchParams(), signal?: AbortSignal): Promise<EligibleProductsPage> {
  const controller = new AbortController()
  const abort = () => controller.abort()
  const timeout = setTimeout(abort, 10_000)
  if (signal?.aborted) abort()
  signal?.addEventListener('abort', abort, { once: true })
  try {
    const response = await fetch(`/api/offers/${encodeURIComponent(ruleId)}/products?${params}`, {
      credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Could not load eligible products')
    return data
  } catch (error) {
    if (controller.signal.aborted && !signal?.aborted) throw new Error('Loading took too long. Please try again.')
    throw error
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
  }
}
// One short-lived first-page request shared by hover, keyboard focus, and opening the panel.
export function firstOfferProducts(ruleId: string, ownerId: string | null) {
  const key = `${ownerId || 'guest'}:${ruleId}`
  const cached = firstPages.get(key)
  if (cached && cached.expires > Date.now()) return cached.promise
  const entry = { expires: Date.now() + 10_000, promise: fetchOfferProducts(ruleId) }
  firstPages.set(key, entry)
  if (firstPages.size > 12) firstPages.delete(firstPages.keys().next().value!)
  entry.promise.then(data => { entry.expires = Math.min(data.expiresAt, Date.now() + 10_000) }, () => {
    if (firstPages.get(key) === entry) firstPages.delete(key)
  })
  return entry.promise
}
