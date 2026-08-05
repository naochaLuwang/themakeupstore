import { FirebaseMessaging } from '@capacitor-firebase/messaging'
import { createClient } from '@/utils/supabase/client'

export async function registerForFCM() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return

  const permResult = await FirebaseMessaging.checkPermissions()
  if (permResult.receive !== 'granted') {
    const { receive } = await FirebaseMessaging.requestPermissions()
    if (receive !== 'granted') return
  }

  const { token } = await FirebaseMessaging.getToken()
  if (!token) return

  // Delete any existing subscription for this user first, then insert new one
  // This avoids needing a unique constraint on user_id for upsert
  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', session.user.id)

  await supabase
    .from('push_subscriptions')
    .insert({
      user_id: session.user.id,
      fcm_token: token,
      platform: 'android',
    })
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
