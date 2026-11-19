import { safePushUrl } from '@/lib/push-url'

export type NativeAppLink =
  | { type: 'route'; path: string }
  | { type: 'auth'; code?: string; failed: boolean }

export function parseNativeAppLink(value: string): NativeAppLink | undefined {
  if (!value || /[\\\u0000-\u0020]/.test(value)) return
  try {
    const url = new URL(value)
    if (url.username || url.password) return
    const customAuth = url.protocol === 'themakeupstore:' && url.host === 'auth' && url.pathname === '/callback'
    const path = url.protocol === 'https:' ? safePushUrl(value) : undefined
    if (!customAuth && !path) return
    if (customAuth || url.pathname === '/auth/callback') {
      return { type: 'auth', code: url.searchParams.get('code') || undefined, failed: url.searchParams.has('error') || url.searchParams.has('error_description') }
    }
    if (/^\/(?:api|_next|\.well-known)(?:\/|$)/.test(url.pathname)) return
    return { type: 'route', path: path! }
  } catch {
    return
  }
}

interface LinkActions {
  navigate: (path: string) => void
  exchangeCode: (code: string) => Promise<{ error: unknown }>
  signedIn: () => void
  authFailed: () => void
}

// The same launch can arrive through the retained event and getLaunchUrl().
// Share in-flight work and remember successful one-use authorization codes.
export function createNativeLinkHandler(actions: LinkActions) {
  const pending = new Map<string, Promise<void>>()
  const exchanged = new Set<string>()
  return (value: string): Promise<void> => {
    const link = parseNativeAppLink(value)
    if (!link) return Promise.resolve()
    const key = link.type === 'auth' ? `auth:${link.code || ''}` : `route:${link.path}`
    const existing = pending.get(key)
    if (existing) return existing
    const run = Promise.resolve().then(async () => {
      if (link.type === 'route') { actions.navigate(link.path); return }
      if (link.failed || !link.code) { actions.authFailed(); return }
      if (exchanged.has(link.code)) return
      try {
        const { error } = await actions.exchangeCode(link.code)
        if (error) { actions.authFailed(); return }
        exchanged.add(link.code)
        actions.signedIn()
      } catch { actions.authFailed() }
    }).finally(() => { pending.delete(key) })
    pending.set(key, run)
    return run
  }
}

