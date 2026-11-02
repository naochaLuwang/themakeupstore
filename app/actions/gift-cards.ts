"use server"

import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"
import { requireAdmin } from "@/lib/admin"
import { revalidatePath } from "next/cache"
import { rateLimit } from "@/lib/rate-limit"
import { randomBytes, randomUUID } from "node:crypto"
import { paymentClient, verifyCapturedPayment } from "@/lib/verified-payment"
import { uuidPattern } from "@/lib/checkout-pricing"

const giftCardLimiter = rateLimit("gift-card", { windowMs: 60_000, max: 10 })

function generateCode(): string {
  return `GC-${randomBytes(12).toString('hex').toUpperCase()}`
}

// Creates a provider payment order and a private pending purchase. No gift card
// or spendable balance exists until completeGiftCardPurchase verifies payment.
export async function purchaseGiftCard(formData: FormData) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return { success: false as const, message: 'Please sign in' }
  if (!giftCardLimiter.check(`purchase:${user.id}`).success) return { success: false as const, message: 'Too many attempts. Please try again later.' }
  const amount = Number(formData.get('amount'))
  if (!Number.isSafeInteger(amount) || amount < 100 || amount > 25000) return { success: false as const, message: 'Gift cards must be a whole amount between ₹100 and ₹25,000' }
  const text = (key: string, max: number) => String(formData.get(key) || '').trim().slice(0, max)
  const recipientEmail = text('recipient_email', 254)
  if (recipientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) return { success: false as const, message: 'Enter a valid recipient email' }
  try {
    const purchaseId = randomUUID()
    const order = await paymentClient().orders.create({ amount: amount * 100, currency: 'INR', receipt: `gift_${purchaseId.slice(0, 30)}`,
      notes: { purpose: 'gift_card', user_id: user.id, fingerprint: purchaseId } })
    const db = await createAdminClient()
    const { error } = await db.from('gift_card_purchases').insert({ id: purchaseId, user_id: user.id, amount, currency: 'INR',
      provider_order_id: order.id, recipient_email: recipientEmail || null, recipient_name: text('recipient_name', 120) || null, message: text('message', 1000) || null })
    if (error) throw error
    return { success: true as const, userId: user.id, purchaseId, orderId: order.id, amountPaise: amount * 100 }
  } catch (error) {
    console.error('Gift card purchase preparation failed:', error)
    return { success: false as const, message: 'Could not prepare the gift card payment. Please try again.' }
  }
}

export async function completeGiftCardPurchase(input: { purchaseId: string; paymentId: string; signature: string }) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return { success: false as const, message: 'Please sign in' }
  if (!input || !uuidPattern.test(input.purchaseId)) return { success: false as const, message: 'Invalid purchase' }
  if (!giftCardLimiter.check(`confirm:${user.id}`).success) return { success: false as const, message: 'Too many attempts. Please try again later.' }
  try {
    const db = await createAdminClient()
    const { data: purchase, error } = await db.from('gift_card_purchases').select('*').eq('id', input.purchaseId).eq('user_id', user.id).single()
    if (error || !purchase) throw new Error('Gift card purchase not found')
    if (purchase.gift_card_id && purchase.provider_payment_id === input.paymentId) {
      const { data: card, error: cardError } = await db.from('gift_cards').select('id,code').eq('id', purchase.gift_card_id).single()
      if (cardError || !card) throw new Error('Gift card not found')
      return { success: true as const, giftCard: card as { id: string; code: string } }
    }
    await verifyCapturedPayment({ orderId: purchase.provider_order_id, paymentId: input.paymentId, signature: input.signature,
      userId: user.id, amountPaise: Number(purchase.amount) * 100, purpose: 'gift_card', fingerprint: purchase.id })
    const { data, error: activateError } = await db.rpc('activate_paid_gift_card', {
      p_purchase_id: purchase.id, p_user_id: user.id, p_payment_id: input.paymentId, p_code: generateCode(),
    })
    if (activateError || !data?.code) throw new Error(activateError?.message || 'Gift card activation failed')
    revalidatePath('/profile')
    return { success: true as const, giftCard: data as { id: string; code: string } }
  } catch (error) {
    console.error('Gift card payment confirmation failed:', error)
    return { success: false as const, message: error instanceof Error ? error.message : 'Could not confirm payment. Please retry confirmation; do not pay again.' }
  }
}

// ─── User-facing: Validate a gift card code ───
export async function validateGiftCard(code: string) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return { success: false, message: 'Please sign in' }
  if (typeof code !== 'string' || code.length > 80) return { success: false, message: 'Invalid gift card code' }
  const { success } = giftCardLimiter.check(`validate:${user.id}`)
  if (!success) return { success: false, message: "Too many attempts. Please try again later." }

  const supabase = await createAdminClient()

  const { data: gc } = await supabase
    .from("gift_cards")
    .select("id, code, remaining_balance, currency, status, expires_at")
    .eq("code", code.toUpperCase())
    .single()

  if (!gc) return { success: false, message: "Gift card not found" }
  if (gc.status !== "active") return { success: false, message: "Gift card is no longer active" }
  if (gc.expires_at && new Date(gc.expires_at) < new Date())
    return { success: false, message: "Gift card has expired" }
  if (gc.remaining_balance <= 0) return { success: false, message: "Gift card has no remaining balance" }

  return { success: true, giftCard: gc }
}

// ─── User-facing: Get my purchased gift cards ───
export async function getMyGiftCards() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: giftCards } = await supabase
    .from("gift_cards")
    .select("id, code, original_balance, remaining_balance, status, expires_at, created_at, recipient_name, recipient_email, message")
    .eq("purchased_by", user.id)
    .order("created_at", { ascending: false })

  if (!giftCards?.length) return []

  // fetch redemptions
  const gcIds = giftCards.map((g: any) => g.id)
  const { data: redemptions } = await supabase
    .from("gift_card_redemptions")
    .select("gift_card_id, amount, redeemed_at, order_id")
    .in("gift_card_id", gcIds)
    .order("redeemed_at", { ascending: false })

  // fetch orders with user info for redemptions
  const orderIds = [...new Set((redemptions || []).map((r: any) => r.order_id).filter(Boolean))]
  const { data: orders } = orderIds.length
    ? await supabase.from("orders").select("id, total, status, created_at, user_id").in("id", orderIds)
    : { data: [] }
  const orderMap: Record<string, any> = {}
  for (const o of orders || []) orderMap[o.id] = o

  // fetch order user profiles
  const userIds = [...new Set(orders?.map((o: any) => o.user_id).filter(Boolean) || [])]
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
    : { data: [] }
  const profileMap: Record<string, any> = {}
  for (const p of profiles || []) profileMap[p.id] = p

  const redemptionsByCard: Record<string, any[]> = {}
  for (const r of redemptions || []) {
    if (!redemptionsByCard[r.gift_card_id]) redemptionsByCard[r.gift_card_id] = []
    const order = orderMap[r.order_id]
    redemptionsByCard[r.gift_card_id].push({
      ...r,
      orders: order ? { ...order, user: profileMap[order.user_id] || null } : null,
    })
  }

  return giftCards.map((gc: any) => ({
    ...gc,
    gift_card_redemptions: redemptionsByCard[gc.id] || [],
  }))
}

// ─── Admin: List all gift cards ───
export async function listGiftCards() {
  await requireAdmin()
  const supabase = await createAdminClient()

  try {
    const { data: giftCards, error: gcErr } = await supabase
      .from("gift_cards")
      .select("*")
      .order("created_at", { ascending: false })

    if (gcErr) throw gcErr
    if (!giftCards?.length) return []

  // fetch purchaser profiles
  const purchaserIds = [...new Set(giftCards.map((g: any) => g.purchased_by).filter(Boolean))]
  const { data: profiles } = purchaserIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", purchaserIds)
    : { data: [] }
  const profileMap: Record<string, any> = {}
  for (const p of profiles || []) profileMap[p.id] = p

  // fetch emails from auth.users
  let emailMap: Record<string, string> = {}
  try {
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    if (authUsers?.users) {
      for (const u of authUsers.users) {
        emailMap[u.id] = u.email || ""
      }
    }
  } catch {
    // auth admin may not be available in all setups
  }

    // fetch redemptions
    const gcIds = giftCards.map((g: any) => g.id)
    const { data: redemptions } = await supabase
      .from("gift_card_redemptions")
      .select("*")
      .in("gift_card_id", gcIds)
      .order("redeemed_at", { ascending: false })

    // fetch orders for redemptions
    const orderIds = [...new Set((redemptions || []).map((r: any) => r.order_id).filter(Boolean))]
    const { data: orders } = orderIds.length
      ? await supabase.from("orders").select("id, user_id, total, status, created_at").in("id", orderIds)
      : { data: [] }
    const orderMap: Record<string, any> = {}
    for (const o of orders || []) orderMap[o.id] = o

    // fetch profiles for order users
    const orderUserIds = [...new Set(orders?.map((o: any) => o.user_id).filter(Boolean) || [])]
    const { data: orderProfiles } = orderUserIds.length
      ? await supabase.from("profiles").select("id, full_name").in("id", orderUserIds)
      : { data: [] }
    const orderProfileMap: Record<string, any> = {}
    for (const p of orderProfiles || []) orderProfileMap[p.id] = { ...p, email: emailMap[p.id] || "" }

    const redemptionsByCard: Record<string, any[]> = {}
    for (const r of redemptions || []) {
      if (!redemptionsByCard[r.gift_card_id]) redemptionsByCard[r.gift_card_id] = []
      const order = orderMap[r.order_id]
      redemptionsByCard[r.gift_card_id].push({
        ...r,
        orders: order ? { ...order, user: orderProfileMap[order.user_id] || null } : null,
      })
    }

    return giftCards.map((gc: any) => {
      const profile = profileMap[gc.purchased_by] || null
      return {
        ...gc,
        profiles: profile ? { ...profile, email: emailMap[gc.purchased_by] || "" } : null,
        gift_card_redemptions: redemptionsByCard[gc.id] || [],
      }
    })
  } catch (e) {
    console.error("listGiftCards error:", e)
    return []
  }
}

// ─── Admin: Create gift card manually ───
export async function createGiftCard(formData: FormData) {
  await requireAdmin()
  const supabase = await createAdminClient()

  const amount = Number(formData.get("amount"))
  const recipientEmail = formData.get("recipient_email") as string
  const recipientName = formData.get("recipient_name") as string

  if (!amount || amount < 100) return { success: false, message: "Minimum ₹100" }

  const { error } = await supabase.from("gift_cards").insert({
    code: generateCode(),
    original_balance: amount,
    remaining_balance: amount,
    recipient_email: recipientEmail || null,
    recipient_name: recipientName || null,
    expires_at: formData.get("expires_at")
      ? new Date(formData.get("expires_at") as string).toISOString()
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  })

  if (error) return { success: false, message: error.message }
  revalidatePath("/admin/gift-cards")
  return { success: true }
}

// ─── Admin: Toggle gift card status ───
export async function toggleGiftCardStatus(id: string, status: string) {
  await requireAdmin()
  const supabase = await createAdminClient()

  const { error } = await supabase
    .from("gift_cards")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) return { success: false, message: error.message }
  revalidatePath("/admin/gift-cards")
  return { success: true }
}
