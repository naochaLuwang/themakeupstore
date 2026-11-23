export function discoveryEvent(action: 'search' | 'results' | 'product' | 'filter' | 'login_continue', detail: Record<string, string | number | boolean> = {}) {
  if (typeof window === 'undefined') return
  const event = { event: 'storefront_' + action, ...detail }
  try {
    window.dispatchEvent(new CustomEvent('storefront:discovery', { detail: event }))
    const analytics = window as unknown as { dataLayer?: { push: (event: unknown) => void } }
    if (typeof analytics.dataLayer?.push === 'function') analytics.dataLayer.push(event)
  } catch { /* Analytics must never interrupt shopping. */ }
}
