import { FirebaseMessaging } from '@capacitor-firebase/messaging'
import { LocalNotifications, type ActionPerformed } from '@capacitor/local-notifications'
import { Capacitor } from '@capacitor/core'
import { createClient } from '@/utils/supabase/client'
import { safePushUrl } from '@/lib/push-url'

const CHANNEL_ID = 'push-notifications'

export interface PushRegisterResult {
  ok: boolean
  reason?: string
}

let listenersReady = false
let inFlight: Promise<PushRegisterResult> | null = null
let registeringUser: string | null = null
let unregistering: Promise<void> | null = null
const DISABLED_KEY = 'tms-push-disabled'

export function isPushDisabled() {
  return window.localStorage.getItem(DISABLED_KEY) === 'true'
}

function extractUrl(data: unknown): string | undefined {
  if (data && typeof data === 'object' && 'url' in data) {
    const u = (data as { url?: unknown }).url
    return typeof u === 'string' ? u : undefined
  }
  return undefined
}

async function ensureChannel() {
  if (Capacitor.getPlatform() !== 'android') return
  const channels = await LocalNotifications.listChannels()
  const exists = channels.channels?.some((c) => c.id === CHANNEL_ID)
  if (!exists) {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Notifications',
      description: 'Order updates and announcements',
      importance: 5,
      visibility: 1,
      sound: 'default',
      vibration: true,
      lights: true,
    })
  }
}

async function displayForeground(title: string, body: string, extra?: unknown) {
  await LocalNotifications.schedule({
    notifications: [
      {
        title,
        body,
        // Android requires a signed 32-bit integer, not a millisecond timestamp.
        id: Math.floor(Math.random() * 2147483647),
        channelId: CHANNEL_ID,
        smallIcon: 'ic_stat_icon',
        extra: extra || {},
      },
    ],
  })
}

export async function registerForFCM(options: { enable?: boolean } = {}): Promise<PushRegisterResult> {
  if (!Capacitor.isNativePlatform()) return { ok: false, reason: 'Push requires the mobile app' }
  if (isPushDisabled() && !options.enable) return { ok: false, reason: 'Notifications disabled on this device' }
  if (unregistering) await unregistering
  let supported = false
  try {
    supported = (await FirebaseMessaging.isSupported()).isSupported
  } catch (err) {
    console.error('[FCM] isSupported failed:', err)
    return { ok: false, reason: 'Push check failed (is Firebase configured?)' }
  }
  if (!supported) return { ok: false, reason: 'Push not supported on this device' }

  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { ok: false, reason: 'Not signed in' }

  // Serialize concurrent calls (app start + SIGNED_IN can race)
  if (inFlight) {
    if (registeringUser === session.user.id) {
      const result = await inFlight
      if (result.ok && options.enable) window.localStorage.removeItem(DISABLED_KEY)
      return result
    }
    await inFlight
    return registerForFCM(options)
  }
  registeringUser = session.user.id
  inFlight = completeRegistration(supabase, session.user.id).finally(() => {
    inFlight = null
    registeringUser = null
  })
  const result = await inFlight
  if (result.ok && options.enable) window.localStorage.removeItem(DISABLED_KEY)
  return result
}

async function completeRegistration(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<PushRegisterResult> {
  try { await ensureChannel() } catch (err) { console.warn('[FCM] Channel setup failed:', err) }

  try {
    const permResult = await FirebaseMessaging.checkPermissions()
    if (permResult.receive !== 'granted') {
      console.log('[FCM] Requesting notification permissions...')
      const { receive } = await FirebaseMessaging.requestPermissions()
      if (receive !== 'granted') {
        return {
          ok: false,
          reason:
            'Notification permission denied. Enable it in Android Settings → Apps → THE MAKEUP STORE → Notifications, then tap Enable here.',
        }
      }
    }
  } catch (err) {
    return { ok: false, reason: `Permission request failed: ${errText(err)}` }
  }

  // Belt-and-braces POST_NOTIFICATIONS request on Android 13+
  if (Capacitor.getPlatform() === 'android') {
    try {
      const notifPerm = await LocalNotifications.checkPermissions()
      if (notifPerm.display !== 'granted') {
        await LocalNotifications.requestPermissions()
      }
    } catch (err) {
      console.warn('[FCM] Local notification permission check failed:', err)
    }
  }

  let token: string | undefined
  try {
    const result = await FirebaseMessaging.getToken()
    token = result.token
  } catch (err) {
    return { ok: false, reason: `FCM token request failed: ${errText(err)}` }
  }
  if (!token) return { ok: false, reason: 'FCM returned no token' }

  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user.id !== userId) return { ok: false, reason: 'Account changed during registration; please retry' }

  // The existing schema permits one registered device per account.
  const { error: cleanupError } = await supabase.from('push_subscriptions').delete().eq('user_id', userId)
  if (cleanupError) return { ok: false, reason: `Could not replace device registration: ${cleanupError.message}` }
  // The claim_fcm_token DB trigger handles reclaiming this token from another
  // account; a client-side DELETE cannot cross that account's RLS boundary.

  const { error } = await supabase.from('push_subscriptions').insert({
    user_id: userId,
    fcm_token: token,
    platform: Capacitor.getPlatform(),
  })

  if (error) {
    if (error.code === '23505') {
      return {
        ok: false,
        reason: 'This device token is registered to another account — remove it from Admin → Broadcast → Devices.',
      }
    }
    return { ok: false, reason: `Could not save device: ${error.message}` }
  }
  console.log('[FCM] Registered successfully for user', userId)

  try {
    // Older versions subscribed every customer to "admin". Admin tests now
    // target admin-owned device rows instead of this public, unprotected topic.
    await FirebaseMessaging.unsubscribeFromTopic({ topic: 'admin' })
  } catch (err) {
    console.warn('[FCM] Legacy topic cleanup failed:', errText(err))
  }

  return { ok: true }
}

export async function unregisterFCM(options: { disable?: boolean } = {}) {
  // Keep listeners alive so re-enabling in the same session still works.
  if (options.disable !== false) window.localStorage.setItem(DISABLED_KEY, 'true')
  if (unregistering) return unregistering
  unregistering = (async () => {
    if (inFlight) await inFlight.catch(() => {})
    await FirebaseMessaging.deleteToken()
  })().finally(() => { unregistering = null })
  return unregistering
}

export function setupFCMListeners() {
  if (listenersReady) return
  listenersReady = true

  FirebaseMessaging.addListener('notificationReceived', (event) => {
    console.log('[FCM] Received in foreground:', event.notification?.title)
    if (Capacitor.getPlatform() !== 'android' || isPushDisabled()) return
    const title = event.notification?.title || ''
    const body = event.notification?.body || ''
    if (!title && !body) return
    displayForeground(title, body, event.notification?.data).catch((err) =>
      console.error('[FCM] Foreground display failed:', err)
    )
  }).catch((err) => console.error('[FCM] Foreground listener failed:', errText(err)))

  // Tap on a notification shown by the system (background / killed app)
  FirebaseMessaging.addListener('notificationActionPerformed', (event) => {
    const url = safePushUrl(extractUrl(event.notification?.data))
    if (url) window.location.href = url
  }).catch((err) => console.error('[FCM] Push tap listener failed:', errText(err)))

  // Tap on a notification we scheduled ourselves while app was in foreground
  LocalNotifications.addListener('localNotificationActionPerformed', (action: ActionPerformed) => {
    const url = safePushUrl(extractUrl(action?.notification?.extra))
    if (url) window.location.href = url
  }).catch((err) => console.warn('[FCM] Local tap listener failed:', errText(err)))

  FirebaseMessaging.addListener('tokenReceived', (event) => {
    if (!event.token || isPushDisabled()) return
    registerForFCM().then((result) => {
      if (!result.ok) console.warn('[FCM] Re-register after token refresh failed:', result.reason)
    }).catch((err) => console.warn('[FCM] Token refresh registration failed:', errText(err)))
  }).catch((err) => console.error('[FCM] Token listener failed:', errText(err)))
}

function errText(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  try { return JSON.stringify(err) } catch { return 'unknown error' }
}
