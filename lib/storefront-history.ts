export interface ViewedProduct { id: string; name: string; thumbnail_url: string | null }
const SEARCH_KEY = 'tms:searches:v1'
const VIEWED_KEY = 'tms:viewed:v1'
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function read(key: string): unknown[] {
  try { const value: unknown = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : [] } catch { return [] }
}
function write(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true } catch { return false }
}
const terms = (rows: unknown[]) => [...new Set(rows.filter((v): v is string => typeof v === 'string').map(v => v.trim().slice(0, 150)).filter(v => v.length >= 2))].slice(0, 8)
const viewed = (rows: unknown[]): ViewedProduct[] => rows.flatMap(value => {
  if (!value || typeof value !== 'object') return []
  const p = value as Record<string, unknown>
  return typeof p.id === 'string' && uuid.test(p.id) && typeof p.name === 'string' && p.name.trim()
    ? [{ id: p.id, name: p.name.slice(0, 300), thumbnail_url: typeof p.thumbnail_url === 'string' ? p.thumbnail_url : null }] : []
}).filter((p, i, all) => all.findIndex(v => v.id === p.id) === i).slice(0, 5)
export function readDiscoveryHistory() {
  const legacy = read('recent_searches')
  const searches = terms([...read(SEARCH_KEY), ...legacy])
  const products = viewed([...read(VIEWED_KEY), ...legacy])
  if (legacy.length && write(SEARCH_KEY, searches) && write(VIEWED_KEY, products)) {
    try { localStorage.removeItem('recent_searches') } catch { /* Storage may be read-only. */ }
  }
  return { searches, products }
}
function changed() { if (typeof window !== 'undefined') window.dispatchEvent(new Event('storefront:history')) }
export function rememberSearch(value: string) {
  const { searches } = readDiscoveryHistory()
  write(SEARCH_KEY, terms([value, ...searches.filter(s => s.toLowerCase() !== value.trim().toLowerCase())])); changed()
}
export function rememberViewedProduct(product: ViewedProduct) {
  write(VIEWED_KEY, viewed([product, ...readDiscoveryHistory().products])); changed()
}
export function clearDiscoveryHistory(kind: 'searches' | 'products') {
  try { localStorage.removeItem(kind === 'searches' ? SEARCH_KEY : VIEWED_KEY) } catch { /* No storage access. */ }
  changed()
}
