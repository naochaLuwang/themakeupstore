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
  const supabase = await createAdminClient()
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
    await (await createAdminClient()).from("loyalty_points").update({ tier, updated_at: new Date().toISOString() }).eq("user_id", user.id)
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

// ─── Release pending points after delivery ───
export async function releasePendingPoints(orderId: string) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.rpc('release_fulfilled_order_points', { p_order_id: orderId })
  if (error) throw new Error(error.message)
}

// ─── Get available coin balance for checkout ───
export async function getAvailableBalance(userId?: string) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) throw new Error('Authentication required')
  if (userId && userId !== user.id) throw new Error('You can only access your own M Coin balance')
  const db = await createAdminClient()
  const { data: points, error } = await db.from('loyalty_points').select('balance').eq('user_id', user.id).maybeSingle()
  if (error) throw new Error(error.message)
  return points?.balance || 0
}

// ─── Reverse coin redemption on order cancellation ───
export async function reverseCoinRedemption(orderId: string) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) throw new Error('Authentication required')
  const supabase = await createAdminClient()
  const { data: order } = await supabase.from('orders').select('user_id,status').eq('id', orderId).single()
  if (!order) throw new Error('Order not found')
  const allowActive = order.status !== 'cancelled'
  if (allowActive || order.user_id !== user.id) await requireAdmin()
  const { error } = await supabase.rpc('reverse_order_coin_redemption', { p_order_id: orderId, p_allow_active: allowActive })
  if (error) throw new Error(error.message)
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
    supabase.from("profiles").select("id", { count: "exact", head: true }).is("deleted_at", null),
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

  const [allTxRes, pointsRes, profilesRes, ordersRes] = await Promise.all([
    supabase.from("loyalty_transactions")
      .select("user_id, type, amount, status, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("loyalty_points").select("*"),
    supabase.from("profiles").select("id, full_name, phone, created_at").is("deleted_at", null),
    supabase.from("orders").select("user_id, shipping_address, created_at").not("user_id", "is", null),
  ])

  const allTx = allTxRes.data || []
  const pointsData = pointsRes.data || []
  const profiles = profilesRes.data || []
  const orders = ordersRes.data || []

  const pointsMap = new Map(pointsData.map((p: any) => [p.user_id, p]))

  // Fallback map from orders if profile is missing
  const orderUserMap = new Map<string, { full_name: string; phone: string; created_at: string }>()
  for (const ord of orders) {
    if (ord.user_id && ord.shipping_address) {
      if (!orderUserMap.has(ord.user_id)) {
        orderUserMap.set(ord.user_id, {
          full_name: (ord.shipping_address as any).full_name || "—",
          phone: (ord.shipping_address as any).phone || "—",
          created_at: ord.created_at,
        })
      }
    }
  }

  const userTxMap = new Map<string, { earned: number; spent: number; pending: number; lastActivity: string | null }>()
  for (const tx of allTx) {
    const existing = userTxMap.get(tx.user_id) || { earned: 0, spent: 0, pending: 0, lastActivity: null }
    if (tx.type === "earn" || tx.type === "bonus") {
      if (tx.status === "available") existing.earned += tx.amount
      if (tx.status === "pending") existing.pending += tx.amount
    }
    if (tx.type === "spend") {
      if (tx.status !== "cancelled") existing.spent += tx.amount
    }
    if (!existing.lastActivity) existing.lastActivity = tx.created_at
    userTxMap.set(tx.user_id, existing)
  }

  const userIds = [...new Set([
    ...profiles.map((pr: any) => pr.id),
    ...pointsData.map((p: any) => p.user_id),
    ...allTx.map(t => t.user_id),
    ...orders.map((o: any) => o.user_id).filter(Boolean),
  ])]

  const profileMap = new Map(profiles.map((p: any) => [p.id, p]))

  let result = userIds.map(userId => {
    const p = pointsMap.get(userId)
    const tx = userTxMap.get(userId) || { earned: 0, spent: 0, pending: 0, lastActivity: null }
    const profile = profileMap.get(userId)
    const orderFallback = orderUserMap.get(userId)

    const full_name = profile?.full_name || orderFallback?.full_name || "—"
    const phone = profile?.phone || orderFallback?.phone || "—"
    const last_activity = tx.lastActivity || profile?.created_at || orderFallback?.created_at || null

    return {
      user_id: userId,
      balance: p?.balance ?? 0,
      lifetime_earned: p?.lifetime_earned ?? tx.earned,
      lifetime_spent: tx.spent,
      pending: tx.pending,
      tier: p?.tier ?? "bronze",
      full_name,
      phone,
      last_activity,
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

  const [pointsRes, txRes, profileRes, orderRes] = await Promise.all([
    supabase.from("loyalty_points").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("loyalty_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("profiles").select("id, full_name, phone").eq("id", userId).maybeSingle(),
    supabase.from("orders").select("shipping_address").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ])

  let profile = profileRes.data
  if (!profile && (orderRes.data?.shipping_address as any)) {
    profile = {
      id: userId,
      full_name: (orderRes.data?.shipping_address as any).full_name || "Customer",
      phone: (orderRes.data?.shipping_address as any).phone || "—",
    }
  }

  return {
    points: pointsRes.data || { balance: 0, lifetime_earned: 0, tier: "bronze" },
    transactions: txRes.data || [],
    profile: profile || null,
  }
}

// ─── Admin: adjust a user's points (credit only — deductions go through order cancellation) ───
export async function adminAdjustPoints(userId: string, amount: number, note: string) {
  await requireAdmin()
  const supabase = await createAdminClient()

  if (amount <= 0) return { success: false, message: "Amount must be positive. Use order cancellation for deductions." }

  const { data: points } = await supabase
    .from("loyalty_points")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle()

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
    type: "bonus",
    amount: Math.abs(amount),
    reference_type: "admin",
    status: "available",
    note: `Admin credited: ${note}`,
  })

  if (txErr) return { success: false, message: txErr.message }

  // Update lifetime_earned for bonus credit
  const { data: lp } = await supabase
    .from("loyalty_points")
    .select("lifetime_earned")
    .eq("user_id", userId)
    .maybeSingle()
  if (lp) {
    await supabase.from("loyalty_points").update({
      lifetime_earned: (lp.lifetime_earned || 0) + Math.abs(amount),
      updated_at: new Date().toISOString(),
    }).eq("user_id", userId)
  }

  revalidatePath("/admin/rewards/users")
  return { success: true }
}

// ─── Admin: reconcile stuck pending points for delivered/picked_up orders ───
export async function reconcileStuckPendingPoints() {
  await requireAdmin()
  const supabase = await createAdminClient()

  // Find terminal orders (delivered or picked up) that have a pending earn transaction older than 1 day
  const oneDayAgo = new Date(Date.now() - 86400000).toISOString()

  const { data: stuckOrders } = await supabase
    .from("orders")
    .select(`
      id,
      status,
      created_at,
      loyalty_transactions!reference_id!inner(user_id, amount, status, created_at)
    `)
    .in("status", ["delivered", "picked_up"])
    .not("loyalty_transactions", "is", null)
    .eq("loyalty_transactions.type", "earn")
    .eq("loyalty_transactions.status", "pending")
    .lt("loyalty_transactions.created_at", oneDayAgo)
    .limit(1000)

  if (!stuckOrders || stuckOrders.length === 0) return { released: 0 }

  let released = 0
  for (const order of stuckOrders) {
    try {
      await releasePendingPoints(order.id)
      released++
    } catch (err) {
      console.error(`Failed to release points for order ${order.id}:`, err)
    }
  }

  return { released }
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
