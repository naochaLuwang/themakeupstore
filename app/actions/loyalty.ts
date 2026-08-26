"use server"

import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"
import { requireAdmin } from "@/lib/admin"
import { revalidatePath } from "next/cache"

const TIER_THRESHOLDS = [
  { tier: "gold", minSpend: 25000 },
  { tier: "silver", minSpend: 10000 },
  { tier: "bronze", minSpend: 0 },
] as const

function computeTier(totalSpend: number): string {
  for (const t of TIER_THRESHOLDS) {
    if (totalSpend >= t.minSpend) return t.tier
  }
  return "bronze"
}

function calcPoints(total: number): number {
  return Math.floor(total / 100)
}

async function ensureLoyaltyPoints(userId: string, tier: string) {
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from("loyalty_points")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle()

  if (!existing) {
    await supabase.from("loyalty_points").insert({
      user_id: userId,
      balance: 0,
      lifetime_earned: 0,
      tier,
    })
  }
}

// ─── Get user's loyalty data ───
export async function getLoyaltyData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [pointsRes, transactionsRes, ordersRes] = await Promise.all([
    supabase.from("loyalty_points").select("balance, lifetime_earned, tier").eq("user_id", user.id).maybeSingle(),
    supabase.from("loyalty_transactions")
      .select("id, amount, type, status, created_at, note, reference_type")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("orders")
      .select("total")
      .eq("user_id", user.id)
      .neq("status", "cancelled"),
  ])

  const totalSpend = (ordersRes.data || []).reduce((s: number, o: any) => s + Number(o.total), 0)
  const tier = computeTier(totalSpend)

  if (pointsRes.data && pointsRes.data.tier !== tier) {
    await supabase.from("loyalty_points").update({ tier, updated_at: new Date().toISOString() }).eq("user_id", user.id)
    pointsRes.data.tier = tier
  }

  if (!pointsRes.data) {
    await ensureLoyaltyPoints(user.id, tier)
  }

  return {
    points: pointsRes.data || { balance: 0, lifetime_earned: 0, tier },
    transactions: transactionsRes.data || [],
    totalSpend: Math.round(totalSpend),
    nextTier: (() => {
      const currentIdx = TIER_THRESHOLDS.findIndex(t => t.tier === tier)
      return currentIdx > 0 ? TIER_THRESHOLDS[currentIdx - 1] : null
    })(),
  }
}

// ─── Earn points from an order ───
export async function earnOrderPoints(userId: string, orderId: string, total: number) {
  const supabase = await createClient()

  const { data: points } = await supabase
    .from("loyalty_points")
    .select("tier")
    .eq("user_id", userId)
    .maybeSingle()

  const tier = points?.tier || "bronze"
  const amount = calcPoints(total)

  if (!points) {
    await ensureLoyaltyPoints(userId, tier)
  }

  await supabase.from("loyalty_transactions").insert({
    user_id: userId,
    type: "earn",
    amount,
    reference_type: "order",
    reference_id: orderId,
    status: "pending",
    note: `${amount} M Coins earned from order #${orderId.toString().slice(-6).toUpperCase()}`,
  })
}

// ─── Release pending points after delivery ───
export async function releasePendingPoints(orderId: string) {
  const supabase = await createAdminClient()

  const { data: tx } = await supabase
    .from("loyalty_transactions")
    .select("id, user_id, amount")
    .eq("reference_id", orderId)
    .eq("status", "pending")
    .maybeSingle()

  if (!tx) return

  await supabase.from("loyalty_transactions").update({
    status: "available",
    order_delivered_at: new Date().toISOString(),
  }).eq("id", tx.id)

  const { data: lp } = await supabase
    .from("loyalty_points")
    .select("lifetime_earned")
    .eq("user_id", tx.user_id)
    .maybeSingle()

  await supabase.from("loyalty_points").update({
    lifetime_earned: (lp?.lifetime_earned || 0) + tx.amount,
    updated_at: new Date().toISOString(),
  }).eq("user_id", tx.user_id)
}

// ─── Get available coin balance for checkout ───
export async function getAvailableBalance(userId: string) {
  const supabase = await createAdminClient()

  const { data: points } = await supabase
    .from("loyalty_points")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle()

  return points?.balance || 0
}

// ─── Redeem coins at checkout ───
export async function redeemCoinsAtCheckout(userId: string, orderId: string, amount: number) {
  const supabase = await createClient()

  if (amount <= 0) return { success: false, message: "Invalid amount" }

  const { data: points } = await supabase
    .from("loyalty_points")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle()

  const currentBalance = points?.balance || 0
  if (currentBalance < amount) return { success: false, message: "Insufficient coins" }

  await supabase.from("loyalty_points").update({
    balance: Math.max(0, currentBalance - amount),
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId)

  await supabase.from("loyalty_transactions").insert({
    user_id: userId,
    type: "spend",
    amount,
    reference_type: "order",
    reference_id: orderId,
    status: "available",
    note: `${amount} M Coins redeemed at checkout for order #${orderId.toString().slice(-6).toUpperCase()}`,
  })

  revalidatePath("/rewards")
  revalidatePath("/checkout")
  return { success: true }
}

// ─── Reverse coin redemption on order cancellation ───
export async function reverseCoinRedemption(orderId: string) {
  const supabase = await createClient()

  const { data: tx } = await supabase
    .from("loyalty_transactions")
    .select("id, user_id, amount")
    .eq("reference_id", orderId)
    .eq("type", "spend")
    .eq("reference_type", "order")
    .maybeSingle()

  if (!tx) return

  const { data: points } = await supabase
    .from("loyalty_points")
    .select("balance")
    .eq("user_id", tx.user_id)
    .maybeSingle()

  await supabase.from("loyalty_points").update({
    balance: (points?.balance || 0) + tx.amount,
    updated_at: new Date().toISOString(),
  }).eq("user_id", tx.user_id)

  await supabase.from("loyalty_transactions").update({
    status: "cancelled",
    note: "Order cancelled — coins refunded",
  }).eq("id", tx.id)
}

// ─── Get user's complete transaction history ───
export async function getTransactionHistory() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [pointsRes, transactionsRes] = await Promise.all([
    supabase.from("loyalty_points").select("balance, lifetime_earned, tier").eq("user_id", user.id).maybeSingle(),
    supabase.from("loyalty_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200),
  ])

  const txs = transactionsRes.data || []
  const activeTxs = txs.filter(t => t.status !== "cancelled")
  const earned = activeTxs.filter(t => t.type === "earn" || t.type === "bonus").reduce((s, t) => s + t.amount, 0)
  const spent = activeTxs.filter(t => t.type === "spend").reduce((s, t) => s + t.amount, 0)

  return {
    points: pointsRes.data || { balance: 0, lifetime_earned: 0, tier: "bronze" },
    transactions: txs,
    summary: {
      earned,
      spent,
      pending: activeTxs.filter(t => t.status === "pending").reduce((s, t) => s + t.amount, 0),
    },
  }
}

// ─── Admin: get overall loyalty stats ───
export async function getLoyaltyStats() {
  await requireAdmin()
  const supabase = await createAdminClient()

  const [totalPoints, totalUsers, totalRedeemed, tierCounts] = await Promise.all([
    supabase.from("loyalty_points").select("balance"),
    supabase.from("loyalty_points").select("id", { count: "exact", head: true }),
    supabase.from("loyalty_transactions").select("amount").eq("type", "spend").eq("status", "available"),
    supabase.from("loyalty_points").select("tier"),
  ])

  const balance = (totalPoints.data || []).reduce((s: number, r: any) => s + Number(r.balance), 0)
  const redeemed = (totalRedeemed.data || []).reduce((s: number, r: any) => s + Number(r.amount), 0)
  const tiers: Record<string, number> = { bronze: 0, silver: 0, gold: 0 }
  for (const r of tierCounts.data || []) tiers[r.tier] = (tiers[r.tier] || 0) + 1

  return {
    totalCoins: balance,
    totalUsers: totalUsers.count || 0,
    totalRedeemed: redeemed,
    tiers,
  }
}

// ─── Admin: get all users' points (with filters) ───
export async function adminGetAllUsersPoints(opts?: { search?: string; tier?: string; hideZero?: boolean }) {
  await requireAdmin()
  const supabase = await createAdminClient()

  const { data: allTx } = await supabase
    .from("loyalty_transactions")
    .select("user_id, type, amount, status, created_at")
    .order("created_at", { ascending: false })

  const { data: pointsData } = await supabase
    .from("loyalty_points")
    .select("*")

  const pointsMap = new Map((pointsData || []).map((p: any) => [p.user_id, p]))

  const userTxMap = new Map<string, { earned: number; spent: number; pending: number; lastActivity: string | null }>()
  for (const tx of allTx || []) {
    const existing = userTxMap.get(tx.user_id) || { earned: 0, spent: 0, pending: 0, lastActivity: null }
    if (tx.type === "earn" || tx.type === "bonus") {
      if (tx.status === "available") existing.earned += tx.amount
      if (tx.status === "pending") existing.pending += tx.amount
    }
    if (tx.type === "spend") existing.spent += tx.amount
    if (!existing.lastActivity) existing.lastActivity = tx.created_at
    userTxMap.set(tx.user_id, existing)
  }

  const userIds = [...new Set([
    ...(pointsData || []).map((p: any) => p.user_id),
    ...(allTx || []).map(t => t.user_id),
  ])]

  const { data: profiles } = userIds.length > 0
    ? await supabase.from("profiles").select("id, full_name, phone").in("id", userIds)
    : { data: [] }
  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))

  let result = userIds.map(userId => {
    const p = pointsMap.get(userId)
    const tx = userTxMap.get(userId) || { earned: 0, spent: 0, pending: 0, lastActivity: null }
    const profile = profileMap.get(userId)
    return {
      user_id: userId,
      balance: p?.balance ?? 0,
      lifetime_earned: p?.lifetime_earned ?? tx.earned,
      lifetime_spent: tx.spent,
      pending: tx.pending,
      tier: p?.tier ?? "bronze",
      full_name: profile?.full_name || "—",
      phone: profile?.phone || "—",
      last_activity: tx.lastActivity,
    }
  })

  // Apply filters
  if (opts?.search) {
    const q = opts.search.toLowerCase()
    result = result.filter(u =>
      u.full_name.toLowerCase().includes(q) ||
      u.phone.toLowerCase().includes(q) ||
      u.user_id.toLowerCase().includes(q)
    )
  }
  if (opts?.tier && opts.tier !== "all") {
    result = result.filter(u => u.tier === opts.tier)
  }
  if (opts?.hideZero) {
    result = result.filter(u => u.balance > 0)
  }

  result.sort((a, b) => b.balance - a.balance)
  return result
}

// ─── Admin: get a single user's transactions ───
export async function adminGetUserTransactions(userId: string) {
  await requireAdmin()
  const supabase = await createAdminClient()

  const [pointsRes, txRes, profileRes] = await Promise.all([
    supabase.from("loyalty_points").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("loyalty_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("profiles").select("id, full_name, phone").eq("id", userId).maybeSingle(),
  ])

  return {
    points: pointsRes.data || { balance: 0, lifetime_earned: 0, tier: "bronze" },
    transactions: txRes.data || [],
    profile: profileRes.data || null,
  }
}

// ─── Admin: adjust a user's points ───
export async function adminAdjustPoints(userId: string, amount: number, note: string) {
  await requireAdmin()
  const supabase = await createAdminClient()

  if (amount === 0) return { success: false, message: "Amount must be non-zero" }

  const { data: points } = await supabase
    .from("loyalty_points")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle()

  const currentBalance = points?.balance || 0

  if (amount < 0 && currentBalance + amount < 0) {
    return { success: false, message: `User only has ${currentBalance} coins — cannot deduct ${Math.abs(amount)}` }
  }

  if (!points) {
    await supabase.from("loyalty_points").insert({
      user_id: userId,
      balance: 0,
      lifetime_earned: 0,
      tier: "bronze",
    })
  }

  const { error: txErr } = await supabase.from("loyalty_transactions").insert({
    user_id: userId,
    type: amount > 0 ? "bonus" : "spend",
    amount: Math.abs(amount),
    reference_type: "admin",
    status: "available",
    note: `Admin ${amount > 0 ? "credited" : "deducted"}: ${note}`,
  })

  if (txErr) return { success: false, message: txErr.message }

  // Update lifetime_earned when crediting bonus
  if (amount > 0) {
    const { data: lp } = await supabase
      .from("loyalty_points")
      .select("lifetime_earned")
      .eq("user_id", userId)
      .maybeSingle()
    if (lp) {
      await supabase.from("loyalty_points").update({
        lifetime_earned: (lp.lifetime_earned || 0) + amount,
        updated_at: new Date().toISOString(),
      }).eq("user_id", userId)
    }
  }

  revalidatePath("/admin/rewards/users")
  return { success: true }
}

// ─── Admin: backfill points for delivered orders missing loyalty transactions ───
export async function backfillDeliveredOrderPoints() {
  await requireAdmin()
  const supabase = await createAdminClient()

  const { data: deliveredOrders } = await supabase
    .from("orders")
    .select("id, user_id, total")
    .eq("status", "delivered")
    .not("user_id", "is", null)

  if (!deliveredOrders || deliveredOrders.length === 0) return { backfilled: 0 }

  const orderIds = deliveredOrders.map(o => o.id)

  const { data: existingTxs } = await supabase
    .from("loyalty_transactions")
    .select("reference_id")
    .in("reference_id", orderIds)
    .eq("reference_type", "order")
    .eq("type", "earn")

  const existingOrderIds = new Set((existingTxs || []).map(tx => tx.reference_id))
  const missing = deliveredOrders.filter(o => !existingOrderIds.has(o.id))

  if (missing.length === 0) return { backfilled: 0 }

  let backfilled = 0
  for (const order of missing) {
    const amount = calcPoints(Number(order.total))
    if (amount <= 0) continue

    const { error } = await supabase.from("loyalty_transactions").insert({
      user_id: order.user_id,
      type: "earn",
      amount,
      reference_type: "order",
      reference_id: order.id,
      status: "available",
      order_delivered_at: new Date().toISOString(),
      note: `${amount} M Coins backfilled for delivered order #${order.id.toString().slice(-6).toUpperCase()}`,
    })

    if (!error) {
      const { data: lp } = await supabase
        .from("loyalty_points")
        .select("balance, lifetime_earned")
        .eq("user_id", order.user_id)
        .maybeSingle()

      await supabase.from("loyalty_points").update({
        balance: (lp?.balance || 0) + amount,
        lifetime_earned: (lp?.lifetime_earned || 0) + amount,
        updated_at: new Date().toISOString(),
      }).eq("user_id", order.user_id)

      backfilled++
    }
  }

  revalidatePath("/admin/rewards")
  return { backfilled }
}
