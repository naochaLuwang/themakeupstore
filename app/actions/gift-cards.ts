"use server"

import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"
import { requireAdmin } from "@/lib/admin"
import { revalidatePath } from "next/cache"
import { rateLimit } from "@/lib/rate-limit"

const giftCardLimiter = rateLimit("gift-card", { windowMs: 60_000, max: 10 })

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = "GC-"
  for (let i = 0; i < 10; i++) {
    if (i === 4) code += "-"
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// ─── User-facing: Purchase a gift card (creates an order) ───
export async function purchaseGiftCard(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, message: "Please sign in" }

  const amount = Number(formData.get("amount"))
  const recipientEmail = formData.get("recipient_email") as string
  const recipientName = formData.get("recipient_name") as string
  const message = formData.get("message") as string

  if (!amount || amount < 100) return { success: false, message: "Minimum gift card amount is ₹100" }
  if (amount > 25000) return { success: false, message: "Maximum gift card amount is ₹25,000" }

  const code = generateCode()

  const { data: gc, error } = await supabase.from("gift_cards").insert({
    code,
    original_balance: amount,
    remaining_balance: amount,
    purchased_by: user.id,
    recipient_email: recipientEmail || null,
    recipient_name: recipientName || null,
    message: message || null,
    expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  }).select().single()

  if (error) return { success: false, message: "Failed to create gift card" }

  return { success: true, giftCard: gc }
}

// ─── User-facing: Validate a gift card code ───
export async function validateGiftCard(code: string) {
  const { success } = giftCardLimiter.check(`validate:${code}`)
  if (!success) return { success: false, message: "Too many attempts. Please try again later." }

  const supabase = await createClient()

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

// ─── User-facing: Redeem gift card against an order ───
export async function redeemGiftCard(code: string, orderId: string, amount: number) {
  const { success } = giftCardLimiter.check(`redeem:${code}`)
  if (!success) return { success: false, message: "Too many attempts. Please try again later." }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, message: "Please sign in" }

  const validation = await validateGiftCard(code)
  if (!validation.success || !validation.giftCard) return validation

  const gc = validation.giftCard
  const redeemAmount = Math.min(amount, gc.remaining_balance)

  const { error } = await supabase.from("gift_card_redemptions").insert({
    gift_card_id: gc.id,
    order_id: orderId,
    amount: redeemAmount,
  })

  if (error) return { success: false, message: "Failed to redeem gift card" }

  return { success: true, amount: redeemAmount }
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
