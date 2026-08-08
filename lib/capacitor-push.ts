import { FirebaseMessaging } from '@capacitor-firebase/messaging'
import { createClient } from '@/utils/supabase/client'

export async function registerForFCM() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) { console.log('[FCM] No session, skipping'); return }

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
  })

  FirebaseMessaging.addListener('notificationActionPerformed', (event: any) => {
    const url = event.notification?.data?.url as string | undefined
    if (url) window.location.href = url
  })
}
