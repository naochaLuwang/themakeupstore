// Redirects are restricted to internal application paths, including after OAuth.
export function safeReturnPath(value: unknown, fallback = '/') {
  if (typeof value !== 'string' || value.length > 2000 || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value)) return fallback
  try {
    const url = new URL(value, 'https://store.invalid')
    const path = decodeURIComponent(url.pathname)
    if (url.origin !== 'https://store.invalid' || path.startsWith('//') || /[\\\u0000-\u0020]/.test(path) || /^\/(login|signup|auth|api)(\/|$)/.test(path)) return fallback
    return url.pathname + url.search + url.hash
  } catch { return fallback }
}
export const AUTH_RETURN_KEY = 'tms:auth-return:v1'
export const AUTH_RETURN_COOKIE = 'tms-auth-return-v1'
export function returnPathFromCookie(header: string | null) {
  try {
    const value = header?.split(';').map(part => part.trim()).find(part => part.startsWith(AUTH_RETURN_COOKIE + '='))?.slice(AUTH_RETURN_COOKIE.length + 1)
    return value ? safeReturnPath(decodeURIComponent(value)) : '/'
  } catch { return '/' }
}
export function rememberReturnPath(path: string) {
  const target = safeReturnPath(path)
  try { sessionStorage.setItem(AUTH_RETURN_KEY, JSON.stringify({ target, expires: Date.now() + 30 * 60_000 })) } catch { /* URL return remains available. */ }
  try { document.cookie = `${AUTH_RETURN_COOKIE}=${encodeURIComponent(target)}; Path=/; Max-Age=1800; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}` } catch { /* Native login retains its session-storage fallback. */ }
  return target
}
export function pendingReturnPath(explicit?: string | null) {
  if (explicit && safeReturnPath(explicit, '') !== '') return safeReturnPath(explicit)
  try {
    const saved = JSON.parse(sessionStorage.getItem(AUTH_RETURN_KEY) || 'null')
    if (saved?.expires > Date.now()) return safeReturnPath(saved.target)
  } catch { /* Ignore unavailable/corrupt storage. */ }
  return '/'
}
export function consumeReturnPath(explicit?: string | null) {
  const path = pendingReturnPath(explicit)
  // Auth listeners and native callback completion may both fire for one login.
  // Keep the same destination briefly so the second callback cannot send it home.
  try { sessionStorage.setItem(AUTH_RETURN_KEY, JSON.stringify({ target: path, expires: Date.now() + 10_000, used: true })) } catch { /* Optional storage. */ }
  try { document.cookie = `${AUTH_RETURN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax` } catch { /* Optional cookie cleanup. */ }
  return path
}
export function rememberBrowseOrigin(title: string) {
  const href = location.pathname + location.search
  if (location.pathname.startsWith('/products/')) return
  try {
    sessionStorage.setItem('tms:browse-origin:v1', JSON.stringify({ href, title: title.slice(0, 150), expires: Date.now() + 60 * 60_000 }))
    const scroller = document.getElementById('app-scroller')
    sessionStorage.setItem('tms:scroll:' + href, String(scroller?.scrollTop || 0))
  } catch { /* Browsing remains functional without storage. */ }
}
export function readBrowseOrigin() {
  try {
    const value = JSON.parse(sessionStorage.getItem('tms:browse-origin:v1') || 'null')
    if (value?.expires > Date.now() && typeof value.title === 'string' &&
      (value.href === '/' || /^\/(search|shop|categories|category|exclusive|essentials|new-arrivals|fun-size|skincare-accessories|concern)(\/|\?|$)/.test(value.href)))
      return { href: safeReturnPath(value.href, '/shop'), title: value.title as string }
  } catch { /* Ignore malformed origins. */ }
  return null
}
export function restoreBrowseScroll(href: string) {
  try {
    const top = Number(sessionStorage.getItem('tms:scroll:' + href) || 0)
    const scroller = document.getElementById('app-scroller')
    if (scroller && Number.isFinite(top) && top >= 0) scroller.scrollTop = top
  } catch { /* Optional restoration. */ }
}
