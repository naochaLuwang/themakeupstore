import { Capacitor } from '@capacitor/core'
import { createClient } from '@/utils/supabase/client'
import { parseNativeAppLink } from '@/lib/native-app-links'

const flights = new Map<string, Promise<void>>()
const completed = new Set<string>()
interface AuthActions { success: () => void; failure: () => void }

async function fingerprint(code: string): Promise<string | undefined> {
  if (!globalThis.crypto?.subtle) return
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code))
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('')
}
function readConsumed(): string[] {
  try {
    const values: unknown = JSON.parse(sessionStorage.getItem('tms-ios-consumed-auth') || '[]')
    return Array.isArray(values) ? values.filter((x): x is string => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x)).slice(-20) : []
  } catch { return [] }
}

// Shared by system-auth completion and cold/warm App events. Codes never enter logs/storage.
export function completeIOSAuth(url: string, actions: AuthActions): Promise<void> {
  const link = parseNativeAppLink(url)
  if (!link || link.type !== 'auth') return Promise.resolve()
  if (link.failed || !link.code) { actions.failure(); return Promise.resolve() }
  const code = link.code
  const existing = flights.get(code)
  if (existing) return existing
  if (completed.has(code)) return Promise.resolve()
  const work = Promise.resolve().then(async () => {
    try {
      const hash = await fingerprint(code)
      if (hash && readConsumed().includes(hash)) { completed.add(code); return }
      const { error } = await createClient().auth.exchangeCodeForSession(code)
      if (error) { actions.failure(); return }
      completed.add(code)
      if (hash) {
        try { sessionStorage.setItem('tms-ios-consumed-auth', JSON.stringify([...readConsumed(), hash].slice(-20))) } catch { /* private browsing/storage limits */ }
      }
      actions.success()
    } catch { actions.failure() }
  }).finally(() => { flights.delete(code) })
  flights.set(code, work)
  return work
}

export async function signInIOSGoogle(actions: AuthActions) {
  try {
    const supabase = createClient()
    // Older installed iOS binaries keep their existing redirect route until updated.
    const nativeSession = Capacitor.isPluginAvailable('StoreShell')
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'themakeupstore://auth/callback', ...(nativeSession ? { skipBrowserRedirect: true } : {}) },
    })
    if (error) { actions.failure(); return }
    if (!nativeSession) return
    if (!data.url) { actions.failure(); return }
    const { StoreShell } = await import('@/lib/ios-native')
    const result = await StoreShell.authenticate({ url: data.url })
    if (result.cancelled) return
    if (!result.url || parseNativeAppLink(result.url)?.type !== 'auth') { actions.failure(); return }
    await completeIOSAuth(result.url, actions)
  } catch { actions.failure() }
}

export function isAppleSignInCancelled(error: unknown): boolean {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : ''
  const message = error instanceof Error ? error.message : String(error ?? '')
  // ASAuthorizationError.canceled is 1001; 1000 is an actual unknown error.
  return code === '1001' || /(?:^|\D)1001(?:\D|$)|\bcancel(?:led|ed)?\b/i.test(message)
}
