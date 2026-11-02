'use client'

import { useCart } from '@/components/store/use-cart'
import { paidCartKey } from '@/lib/cart-key'
import { FLASH_CHANGE_EVENT, FLASH_CHANGE_KEY } from '@/lib/flash-sale-client'
import { createClient } from '@/utils/supabase/client'
import type { merchandiseQuote } from '@/lib/cart-quote'
import type { PromotionSnapshot } from '@/lib/promotion-preview'

type QuoteResponse = { success: true; quote?: Awaited<ReturnType<typeof merchandiseQuote>>; previewCatalog?: PromotionSnapshot }
  | { success: false; message: string }
let consumers = 0
let dispose: (() => void) | undefined
let refreshCurrent: (() => void) | undefined

export function refreshPromotions() { refreshCurrent?.() }

// One lifecycle for the entire store, shared by badges, cart and checkout.
export function startPromotionSync() {
  consumers++
  if (!dispose) dispose = mountSync()
  return () => {
    consumers--
    if (!consumers) { dispose?.(); dispose = undefined; refreshCurrent = undefined }
  }
}

function mountSync() {
  let alive = true
  let revision = 0
  let owner: string | null | undefined
  let controller: AbortController | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let debounce: ReturnType<typeof setTimeout> | undefined
  let requestTimeout: ReturnType<typeof setTimeout> | undefined
  let lastKey = paidCartKey(useCart.getState().items)
  const currentPreview = () => ['ready', 'preview'].includes(useCart.getState().offerStatus)
  const scheduleRefresh = (expiresAt: number) => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      const store = useCart.getState()
      const freshUntil = Math.min(store.offerVerifiedUntil, store.offerCatalog?.expiresAt || 0)
      if (freshUntil > Date.now()) { scheduleRefresh(freshUntil); return }
      if (store.offerCatalog) store.setOfferCatalog(store.offerCatalog)
      void verify()
    }, Math.max(500, Math.min(30_000, expiresAt - Date.now())))
  }
  const verify = async () => {
    clearTimeout(debounce)
    const store = useCart.getState()
    const paid = store.items.filter(i => !i.is_gift && !i.is_bxgy_free)
    const key = paidCartKey(paid)
    const quoteRevision = store.offerQuoteRevision
    const id = ++revision
    controller?.abort()
    clearTimeout(requestTimeout)
    controller = new AbortController()
    const activeController = controller
    if (paid.length && !currentPreview()) store.setOfferState('loading')
    const timeout = setTimeout(() => activeController.abort(), 10_000)
    requestTimeout = timeout
    try {
      const response = await fetch('/api/cart/quote', { method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }, signal: activeController.signal,
        body: JSON.stringify(paid.map(i => ({ variantId: i.variantId, quantity: i.quantity }))),
      })
      const result: QuoteResponse = await response.json()
      if (!alive || id !== revision || paidCartKey(useCart.getState().items) !== key) return
      // A checkout quote may have completed while this older background request was in flight.
      if (useCart.getState().offerQuoteRevision !== quoteRevision) {
        scheduleRefresh(useCart.getState().offerVerifiedUntil || Date.now() + 30_000)
        return
      }
      if (!result.success) throw new Error(result.message)
      const catalog = result.quote?.previewCatalog || result.previewCatalog
      if (catalog && owner !== undefined && catalog.ownerId !== owner) throw new Error('Your account changed. Please refresh your offers.')
      if (catalog) owner = catalog.ownerId
      if (result.quote) useCart.getState().applyOfferQuote(result.quote)
      else if (catalog) useCart.getState().setOfferCatalog(catalog)
      scheduleRefresh(result.quote?.expiresAt || catalog?.expiresAt || Date.now() + 30_000)
    } catch (error) {
      if (!alive || id !== revision) return
      if (useCart.getState().offerQuoteRevision !== quoteRevision) {
        scheduleRefresh(useCart.getState().offerVerifiedUntil || Date.now() + 30_000)
        return
      }
      const message = error instanceof Error && error.name !== 'AbortError' ? error.message : 'Offer verification timed out. Please try again.'
      useCart.getState().setOfferState(currentPreview() ? useCart.getState().offerStatus : 'error', message)
      scheduleRefresh(Date.now() + 15_000)
    } finally { clearTimeout(timeout) }
  }
  const schedule = (delay = 0) => {
    clearTimeout(debounce)
    // Cancel stale work immediately; only the background request is coalesced.
    revision++
    controller?.abort()
    debounce = setTimeout(() => { void verify() }, delay)
  }
  const onFocus = () => {
    const store = useCart.getState()
    if ((store.offerVerifiedUntil || store.offerCatalog?.expiresAt || 0) <= Date.now()) schedule()
  }
  const unsubscribe = useCart.subscribe(state => {
    const key = paidCartKey(state.items)
    if (key === lastKey) return
    lastKey = key
    if (state.offerStatus === 'ready' && state.offerInputKey === key && state.offerVerifiedUntil > Date.now()) return
    schedule(120)
  })
  const { data: { subscription } } = createClient().auth.onAuthStateChange((_event: string, session: { user: { id: string } } | null) => {
    const nextOwner = session?.user.id || null
    const previousOwner = owner ?? useCart.getState().offerCatalog?.ownerId
    owner = nextOwner
    if (previousOwner !== undefined && previousOwner !== nextOwner) {
      useCart.getState().setOfferCatalog(null)
      useCart.setState({ appliedPromo: null })
      schedule()
    }
  })
  const onFlashChange = () => schedule()
  const onStorage = (event:StorageEvent) => {if(event.key===FLASH_CHANGE_KEY)schedule()}
  window.addEventListener('focus', onFocus)
  window.addEventListener(FLASH_CHANGE_EVENT,onFlashChange)
  window.addEventListener('storage',onStorage)
  refreshCurrent = () => schedule()
  const initial = useCart.getState()
  if (initial.offerCatalog && initial.offerCatalog.expiresAt > Date.now()
      && initial.offerStatus === 'ready' && initial.offerVerifiedUntil > Date.now()) {
    scheduleRefresh(Math.min(initial.offerVerifiedUntil, initial.offerCatalog.expiresAt))
  } else { void verify() }
  return () => {
    alive = false; revision++; controller?.abort(); clearTimeout(timer); clearTimeout(debounce); clearTimeout(requestTimeout)
    unsubscribe(); subscription.unsubscribe(); window.removeEventListener('focus', onFocus); window.removeEventListener(FLASH_CHANGE_EVENT,onFlashChange); window.removeEventListener('storage',onStorage)
  }
}
