import { FirebaseMessaging } from '@capacitor-firebase/messaging'
import { LocalNotifications, type ActionPerformed } from '@capacitor/local-notifications'
import { Capacitor } from '@capacitor/core'
import { createClient } from '@/utils/supabase/client'

const CHANNEL_ID = 'push-notifications'

export interface PushRegisterResult {
  ok: boolean
  reason?: string
}

let listenersReady = false
let inFlight: Promise<PushRegisterResult> | null = null

function isAppUrl(url: unknown): url is string {
  return (
    typeof url === 'string' &&
    (url.startsWith('/') || url.startsWith('https://themakeupstorewangkhei.com'))
  )
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
        id: Date.now(),
        channelId: CHANNEL_ID,
        smallIcon: 'ic_stat_icon',
        extra: extra || {},
      },
    ],
  })
}

export async function registerForFCM(): Promise<PushRegisterResult> {
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
  if (inFlight) return inFlight
  inFlight = completeRegistration(supabase, session.user.id).finally(() => {
    inFlight = null
  })
  return inFlight
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

  // Remove this user's previous rows AND any row already holding this token
  // (same phone signed into a different account previously — otherwise the
  // insert hits the fcm_token unique index and registration silently fails)
  try {
    await supabase.from('push_subscriptions').delete().eq('user_id', userId)
    await supabase.from('push_subscriptions').delete().eq('fcm_token', token)
  } catch (err) {
    console.warn('[FCM] Old subscription cleanup failed:', errText(err))
  }

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
    await FirebaseMessaging.subscribeToTopic({ topic: 'admin' })
  } catch (err) {
    console.warn('[FCM] Topic subscription failed:', errText(err))
  }

  return { ok: true }
}

export async function unregisterFCM() {
  try {
    await FirebaseMessaging.deleteToken()
  } catch {}
  // NOTE: listeners are intentionally NOT removed — they stay alive so that
  // re-enabling notifications in the same session keeps working.
}

export function setupFCMListeners() {
  if (listenersReady) return
  listenersReady = true

  FirebaseMessaging.addListener('notificationReceived', (event) => {
    console.log('[FCM] Received in foreground:', event.notification?.title)
    const title = event.notification?.title || ''
    const body = event.notification?.body || ''
    if (!title && !body) return
    displayForeground(title, body, event.notification?.data).catch((err) =>
      console.error('[FCM] Foreground display failed:', err)
    )
  })

  // Tap on a notification shown by the system (background / killed app)
  FirebaseMessaging.addListener('notificationActionPerformed', (event) => {
    const url = extractUrl(event.notification?.data)
    if (isAppUrl(url)) window.location.href = url
  })

  // Tap on a notification we scheduled ourselves while app was in foreground
  LocalNotifications.addListener('localNotificationActionPerformed', (action: ActionPerformed) => {
    const url = extractUrl(action?.notification?.extra)
    if (isAppUrl(url)) window.location.href = url
  }).catch((err) => console.warn('[FCM] Local tap listener failed:', errText(err)))

  FirebaseMessaging.addListener('tokenReceived', (event) => {
    console.log('[FCM] Token refreshed:', event.token?.substring(0, 30) + '...')
    if (!event.token) return
    registerForFCM().then((result) => {
      if (!result.ok) console.warn('[FCM] Re-register after token refresh failed:', result.reason)
    })
  })
}

function errText(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  try { return JSON.stringify(err) } catch { return 'unknown error' }
}
