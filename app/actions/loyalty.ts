"use server"

import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"
import { requireAdmin } from "@/lib/admin"
import { revalidatePath } from "next/cache"
import { rewardFilters, rewardTxFilters, rewardId, rewardCSV, rewardDate, validateCredit,
  type RewardParams, type RewardTxParams, type RewardDirectory, type RewardUserDetail,
  type CreditRequest, type CreditReceipt,
} from '@/lib/reward-users'

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

  const totalSpend = (ordersRes.data || []).reduce((s: number, o: { total: number }) => s + Number(o.total), 0)
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

  const balance = (totalPoints.data || []).reduce((s: number, r: { balance: number }) => s + Number(r.balance), 0)
  const redeemed = (totalRedeemed.data || []).reduce((s: number, r: { amount: number }) => s + Number(r.amount), 0)
  const tiers: Record<string, number> = { bronze: 0, silver: 0, gold: 0 }
  for (const r of tierCounts.data || []) tiers[r.tier] = (tiers[r.tier] || 0) + 1

  return {
    totalCoins: balance,
    totalUsers: totalUsers.count || 0,
    totalRedeemed: redeemed,
    tiers,
  }
}

// Admin reward reads aggregate the full dataset before pagination.
export async function adminGetAllUsersPoints(params: RewardParams = {}, exportRows = false): Promise<RewardDirectory> {
  const { supabase } = await requireAdmin()
  const filters = rewardFilters(params)
  const { data, error } = await supabase.rpc('admin_reward_users', {
    p_search: filters.q, p_tier: filters.tier, p_spent: filters.spent, p_hide_zero: filters.hideZero,
    p_sort: filters.sort, p_page: exportRows ? 1 : filters.page, p_size: exportRows ? 5001 : 25,
  })
  if (error || !data) throw new Error('Unable to load reward users. Refresh to try again.')
  return data as RewardDirectory
}

export async function adminGetUserTransactions(userId: string, params: RewardTxParams = {}, exportRows = false): Promise<RewardUserDetail | null> {
  const { supabase } = await requireAdmin()
  if (!rewardId(userId)) return null
  const filters = rewardTxFilters(params)
  const { data, error } = await supabase.rpc('admin_reward_user', {
    p_user: userId, p_type: filters.type, p_status: filters.status, p_from: filters.from || null,
    p_to: filters.to || null, p_page: exportRows ? 1 : filters.page, p_size: exportRows ? 5001 : 25,
  })
  if (error) throw new Error('Unable to load reward history. Refresh to try again.')
  return data as RewardUserDetail | null
}

export async function adminAdjustPoints(request: CreditRequest) {
  const { supabase, user } = await requireAdmin()
  try { validateCredit(request) } catch (error) {
    return { success: false as const, message: error instanceof Error ? error.message : 'Invalid credit request.', uncertain: false }
  }
  try {
    const { data, error } = await supabase.rpc('credit_reward_user', {
      p_request: request.requestId, p_user: request.userId, p_actor: user.id, p_amount: request.amount,
      p_note: request.note.trim(), p_expected: request.expectedBalance,
    })
    if (error || !data) {
      if (error?.code === 'P0001') return { success: false as const, message: error.message, uncertain: false }
      return { success: false as const, message: 'Unable to confirm this credit. Retry the same request or reload to check the history.', uncertain: true }
    }
    revalidatePath('/admin/rewards/users')
    revalidatePath(`/admin/rewards/users/${request.userId}`)
    revalidatePath('/admin/rewards')
    revalidatePath('/rewards')
    return { success: true as const, receipt: data as CreditReceipt }
  } catch {
    return { success: false as const, message: 'Unable to confirm this credit. Retry the same request or reload to check the history.', uncertain: true }
  }
}

export async function exportRewardUsers(params: RewardParams) {
  const result = await adminGetAllUsersPoints(params, true)
  if (result.total > 5000) throw new Error('Narrow the filters to 5,000 users or fewer before exporting.')
  return rewardCSV([['Customer', 'Email', 'Phone', 'User ID', 'Balance', 'Lifetime earned (stored)', 'Spent', 'Pending', 'Tier'], ...result.users.map(u => [u.full_name, u.email, u.phone, u.user_id, u.balance, u.lifetime_earned, u.lifetime_spent, u.pending, u.tier])])
}

export async function exportRewardHistory(userId: string, params: RewardTxParams) {
  const result = await adminGetUserTransactions(userId, params, true)
  if (!result) throw new Error('Customer not found.')
  if (result.total > 5000) throw new Error('Narrow the filters to 5,000 transactions or fewer before exporting.')
  return rewardCSV([['Date (IST)', 'Transaction ID', 'Type', 'Status', 'Amount', 'Balance before', 'Balance after (snapshot)', 'Reason', 'Admin', 'Admin ID', 'Reference type', 'Reference ID'], ...result.transactions.map(t => [rewardDate(t.created_at), t.id, t.type, t.status, t.amount, t.balance_before, t.balance_after, t.note, t.actor_name, t.admin_actor_id, t.reference_type, t.reference_id])])
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

// Backfill runs under order/wallet locks and relies on the ledger trigger exactly once.
export async function backfillDeliveredOrderPoints() {
  const { supabase, user } = await requireAdmin()
  const { data, error } = await supabase.rpc('backfill_reward_orders', { p_actor: user.id, p_limit: 100 })
  if (error || !data) throw new Error('Unable to backfill rewards. Reload before retrying.')
  revalidatePath('/admin/rewards')
  revalidatePath('/admin/rewards/users')
  return data as { backfilled: number; remaining: number }
}
