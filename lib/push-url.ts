const APP_ORIGIN = 'https://themakeupstorewangkhei.com'

export function safePushUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value || /[\\\u0000-\u0020]/.test(value)) return
  if (!value.startsWith('/') && !value.startsWith(`${APP_ORIGIN}/`) && value !== APP_ORIGIN) return
  try {
    const url = new URL(value, APP_ORIGIN)
    if (url.origin !== APP_ORIGIN || url.username || url.password) return
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return
  }
}
