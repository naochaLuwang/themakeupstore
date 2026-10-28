import type { SupabaseClient } from '@supabase/supabase-js'
import { PUSH_MESSAGES, STATUS_LABELS } from '@/lib/order-status'
import { sendFcmMulticast } from '@/lib/fcm-send'

export type OrderPushResult = {
  state: 'accepted' | 'skipped' | 'failed'
  sentCount: number
  reason?: string
}

export async function sendOrderPush(
  supabase: SupabaseClient,
  orderId: string,
  userId: string | null,
  status: string,
): Promise<OrderPushResult> {
  const body = PUSH_MESSAGES[status]
  if (!body) return { state: 'skipped', sentCount: 0, reason: 'No push notification is configured for this status.' }
  if (!userId) return { state: 'skipped', sentCount: 0, reason: 'This order has no linked customer account.' }

  try {
    const { data, error } = await supabase.from('push_subscriptions')
      .select('fcm_token').eq('user_id', userId).not('fcm_token', 'is', null)
    if (error) throw new Error(`Device lookup failed: ${error.message}`)
    const tokens = (data || []).map((row: { fcm_token: string | null }) => row.fcm_token)
      .filter((token): token is string => !!token)
    if (!tokens.length) {
      console.warn('[Order push] No registered customer device', { orderId, status })
      return { state: 'skipped', sentCount: 0, reason: 'The customer has no registered app device. Ask them to enable notifications in the app.' }
    }
    const result = await sendFcmMulticast(tokens, `Order Update: ${STATUS_LABELS[status] || status}`, body, `/profile/orders/${orderId}`)
    if (result.invalidTokens.length) {
      const { error: cleanupError } = await supabase.from('push_subscriptions').delete().in('fcm_token', result.invalidTokens)
      if (cleanupError) console.warn('[Order push] Expired device cleanup failed', { orderId, status, error: cleanupError.message })
    }
    console.info('[Order push] Firebase result', { orderId, status, accepted: result.sentCount, failed: result.failedCount })
    if (!result.sentCount) {
      return { state: 'failed', sentCount: 0, reason: 'The customer’s saved device token has expired. Ask them to enable notifications again in the app.' }
    }
    return {
      state: 'accepted', sentCount: result.sentCount,
      ...(result.failedCount ? { reason: `Firebase accepted ${result.sentCount} device(s); ${result.failedCount} device(s) failed.` } : {}),
    }
  } catch (error) {
    console.error('[Order push] Failed', { orderId, status, error: error instanceof Error ? error.message : 'Unknown error' })
    return { state: 'failed', sentCount: 0, reason: 'The push notification failed. Check the server log for this order’s FCM error.' }
  }
}
