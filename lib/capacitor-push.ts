import { FirebaseMessaging } from '@capacitor-firebase/messaging'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Capacitor } from '@capacitor/core'
import { createClient } from '@/utils/supabase/client'

const CHANNEL_ID = 'push-notifications'

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
        smallIcon: 'ic_stat_icon_config_sample',
        extra: extra || {},
      },
    ],
  })
}

export async function registerForFCM() {
  try {
    const supported = await FirebaseMessaging.isSupported()
    if (!supported) { console.log('[FCM] Not supported on this platform'); return }
  } catch (err) {
    console.error('[FCM] isSupported failed:', err)
    return
  }

  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) { console.log('[FCM] No session, skipping'); return }

  try { await ensureChannel() } catch (err) { console.warn('[FCM] Channel setup failed:', err) }

  console.log('[FCM] Checking permissions...')
  const permResult = await FirebaseMessaging.checkPermissions()
  if (permResult.receive !== 'granted') {
    console.log('[FCM] Requesting permissions...')
    const { receive } = await FirebaseMessaging.requestPermissions()
    if (receive !== 'granted') { console.log('[FCM] Permission denied'); return }
  }

  console.log('[FCM] Getting token...')
  const { token } = await FirebaseMessaging.getToken()
  if (!token) { console.log('[FCM] No token returned'); return }
  console.log('[FCM] Got token:', token.substring(0, 30) + '...')

  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', session.user.id)

  const { error } = await supabase
    .from('push_subscriptions')
    .insert({
      user_id: session.user.id,
      fcm_token: token,
      platform: 'android',
    })

  if (error) console.error('[FCM] DB insert failed:', error.message)
  else console.log('[FCM] Registered successfully')
}

export async function unregisterFCM() {
  try {
    await FirebaseMessaging.deleteToken()
    await FirebaseMessaging.removeAllListeners()
  } catch {}
}

export function setupFCMListeners() {
  FirebaseMessaging.addListener('notificationReceived', (event) => {
    console.log('Push received:', event)
    const title = event.notification?.title || ''
    const body = event.notification?.body || ''
    displayForeground(title, body, event.notification?.data).catch((err) =>
      console.error('[FCM] Foreground display failed:', err)
    )
  })

  FirebaseMessaging.addListener('notificationActionPerformed', (event: any) => {
    const url = event.notification?.data?.url as string | undefined
    if (url) window.location.href = url
  })

  FirebaseMessaging.addListener('tokenReceived', (event) => {
    console.log('[FCM] Token refreshed:', event.token?.substring(0, 30) + '...')
    registerForFCM().catch((err) => console.error('[FCM] Re-register failed:', err))
  })
}
