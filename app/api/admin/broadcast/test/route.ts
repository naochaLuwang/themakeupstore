import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!profile?.is_admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  const { title, body, url } = await req.json()
  if (!title || !body) return NextResponse.json({ error: "Title and body required" }, { status: 400 })

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('fcm_token, subscription_json')
    .eq('user_id', user.id)

  if (!subs || subs.length === 0) {
    return NextResponse.json({
      success: false,
      error: "No devices found for your account. Open the app on your Android device first to register for push.",
    })
  }

  const fcmTokens: string[] = []
  for (const s of subs) {
    if (s.fcm_token) fcmTokens.push(s.fcm_token)
  }

  let fcmSent = 0
  if (fcmTokens.length > 0) {
    try {
      const { sendFcmMulticast } = await import('@/lib/fcm-send')
      const result = await sendFcmMulticast(fcmTokens, title, body, url || "/")
      fcmSent = result.sentCount
      if (result.invalidTokens.length > 0) {
        for (const token of result.invalidTokens) {
          await supabase.from('push_subscriptions').delete().eq('fcm_token', token)
        }
      }
    } catch (err: any) {
      return NextResponse.json({ success: false, error: `FCM send failed: ${err.message}` })
    }
  }

  return NextResponse.json({ success: true, sent: fcmSent })
}