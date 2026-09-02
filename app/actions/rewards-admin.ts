"use server"

import { createAdminClient } from "@/utils/supabase/admin"
import { requireAdmin } from "@/lib/admin"
import { revalidatePath } from "next/cache"

// ─── Enhanced Admin Loyalty Stats & Analytics ───
export async function getEnhancedLoyaltyStats() {
  await requireAdmin()
  const supabase = await createAdminClient()

  const [
    totalPointsRes,
    totalUsersRes,
    txRes,
    tierRes,
    rewardProductsRes,
    rewardCouponsRes,
  ] = await Promise.all([
    supabase.from("loyalty_points").select("balance, lifetime_earned, tier"),
    supabase.from("loyalty_points").select("id", { count: "exact", head: true }),
    supabase.from("loyalty_transactions").select("type, amount, status, reference_type, created_at"),
    supabase.from("loyalty_points").select("tier"),
    supabase.from("reward_products").select("*").order("coins_required", { ascending: true }),
    supabase.from("reward_coupons").select("id, used, discount_amount, created_at"),
  ])

  const pointsData = totalPointsRes.data || []
  const totalBalance = pointsData.reduce((s, p) => s + Number(p.balance), 0)
  const totalLifetimeEarned = pointsData.reduce((s, p) => s + Number(p.lifetime_earned), 0)
  const totalUsers = totalUsersRes.count || 0

  const txs = txRes.data || []
  const activeTxs = txs.filter(t => t.status !== "cancelled")
  
  const totalEarned = activeTxs.filter(t => t.type === "earn" || t.type === "bonus").reduce((s, t) => s + t.amount, 0)
  const totalSpent = activeTxs.filter(t => t.type === "spend").reduce((s, t) => s + t.amount, 0)
  const totalPending = activeTxs.filter(t => t.status === "pending").reduce((s, t) => s + t.amount, 0)

  // Redemption rate: spent / (earned + spent)
  const redemptionRate = (totalEarned + totalSpent) > 0 ? Math.round((totalSpent / (totalEarned + totalSpent)) * 100) : 0

  // Source breakdown
  const sourceBreakdown: Record<string, number> = {}
  for (const t of activeTxs.filter(t => t.type === "earn" || t.type === "bonus")) {
    const src = t.reference_type || "other"
    sourceBreakdown[src] = (sourceBreakdown[src] || 0) + t.amount
  }

  // Tier distribution
  const tiers = { bronze: 0, silver: 0, gold: 0 }
  for (const r of tierRes.data || []) {
    if (r.tier in tiers) tiers[r.tier as keyof typeof tiers]++
  }

  // Monthly trends (last 6 months)
  const now = new Date()
  const monthlyTrends: Array<{ month: string; earned: number; spent: number }> = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthKey = d.toLocaleString("default", { month: "short", year: "2-digit" })
    const startIso = d.toISOString()
    const endD = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    const endIso = endD.toISOString()

    const mEarned = activeTxs
      .filter(t => (t.type === "earn" || t.type === "bonus") && t.created_at >= startIso && t.created_at < endIso)
      .reduce((s, t) => s + t.amount, 0)
    
    const mSpent = activeTxs
      .filter(t => t.type === "spend" && t.created_at >= startIso && t.created_at < endIso)
      .reduce((s, t) => s + t.amount, 0)

    monthlyTrends.push({ month: monthKey, earned: mEarned, spent: mSpent })
  }

  return {
    totalCoins: totalBalance,
    totalLiabilityRs: totalBalance, // 1 coin = ₹1
    totalLifetimeEarned,
    totalUsers,
    totalEarned,
    totalSpent,
    totalPending,
    redemptionRate,
    sourceBreakdown,
    tiers,
    monthlyTrends,
    rewardProductsCount: (rewardProductsRes.data || []).length,
    rewardCouponsCount: (rewardCouponsRes.data || []).length,
  }
}

// ─── Reward Products CRUD ───
export async function getAdminRewardProducts() {
  await requireAdmin()
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from("reward_products")
    .select("*")
    .order("coins_required", { ascending: true })
  if (error) throw new Error(error.message)
  return data || []
}

export async function saveRewardProduct(formData: {
  id?: string
  product_name: string
  description?: string
  thumbnail_url?: string
  coins_required: number
  stock: number
  active: boolean
  reward_type: "product" | "coupon"
  discount_amount?: number
  min_order_value?: number
}) {
  await requireAdmin()
  const supabase = await createAdminClient()

  const payload = {
    product_name: formData.product_name,
    description: formData.description || null,
    thumbnail_url: formData.thumbnail_url || null,
    coins_required: Number(formData.coins_required),
    stock: Number(formData.stock),
    active: Boolean(formData.active),
    reward_type: formData.reward_type || "product",
    discount_amount: formData.discount_amount ? Number(formData.discount_amount) : null,
    min_order_value: formData.min_order_value ? Number(formData.min_order_value) : 0,
    updated_at: new Date().toISOString(),
  }

  if (formData.id) {
    const { error } = await supabase.from("reward_products").update(payload).eq("id", formData.id)
    if (error) return { success: false, message: error.message }
  } else {
    const { error } = await supabase.from("reward_products").insert(payload)
    if (error) return { success: false, message: error.message }
  }

  revalidatePath("/admin/rewards")
  return { success: true }
}

export async function deleteRewardProduct(id: string) {
  await requireAdmin()
  const supabase = await createAdminClient()
  const { error } = await supabase.from("reward_products").delete().eq("id", id)
  if (error) return { success: false, message: error.message }
  revalidatePath("/admin/rewards")
  return { success: true }
}

// ─── Reward Coupons & Transactions ───
export async function getAdminRewardCoupons() {
  await requireAdmin()
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from("reward_coupons")
    .select("*, profiles!reward_coupons_user_id_fkey(full_name, phone), reward_products(product_name)")
    .order("created_at", { ascending: false })
    .limit(100)
  if (error) return []
  return data || []
}

export async function revokeRewardCoupon(id: string) {
  await requireAdmin()
  const supabase = await createAdminClient()
  const { error } = await supabase.from("reward_coupons").update({ used: true, used_at: new Date().toISOString() }).eq("id", id)
  if (error) return { success: false, message: error.message }
  revalidatePath("/admin/rewards")
  return { success: true }
}

export async function getGlobalTransactions(limit = 50) {
  await requireAdmin()
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from("loyalty_transactions")
    .select("*, profiles!loyalty_transactions_user_id_fkey(full_name, phone)")
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) return []
  return data || []
}

// ─── Stuck Pending Points (orders with pending loyalty txs older than 7 days) ───
export async function getStuckPendingPoints() {
  await requireAdmin()
  const supabase = await createAdminClient()

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()

  // Fetch pending earn transactions older than 7 days, then join to profiles
  const { data: pendingTxs, error: txErr } = await supabase
    .from("loyalty_transactions")
    .select("id, user_id, amount, created_at, note, reference_id")
    .eq("status", "pending")
    .eq("type", "earn")
    .lt("created_at", sevenDaysAgo)
    .order("created_at", { ascending: true })
    .limit(50)

  if (txErr || !pendingTxs || pendingTxs.length === 0) return []

  // Get profiles for these users
  const userIds = [...new Set(pendingTxs.map(t => t.user_id))]
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, phone")
    .in("id", userIds)

  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))

  return pendingTxs.map(tx => ({
    ...tx,
    profiles: profileMap.get(tx.user_id) || null,
  }))
}

// ─── Reconcile stuck pending points for delivered/picked_up orders ───
export async function reconcileStuckPendingPoints() {
  await requireAdmin()
  const { releasePendingPoints } = await import("./loyalty")
  const supabase = await createAdminClient()

  const oneDayAgo = new Date(Date.now() - 86400000).toISOString()

  // Find delivered/picked_up orders with pending earn txs older than 1 day
  const { data: pendingTxs } = await supabase
    .from("loyalty_transactions")
    .select("reference_id")
    .eq("status", "pending")
    .eq("type", "earn")
    .lt("created_at", oneDayAgo)
    .limit(500)

  if (!pendingTxs || pendingTxs.length === 0) return { released: 0 }

  const orderIds = [...new Set(pendingTxs.map(t => t.reference_id).filter(Boolean))]

  const { data: terminalOrders } = await supabase
    .from("orders")
    .select("id")
    .in("id", orderIds)
    .in("status", ["delivered", "picked_up"])

  if (!terminalOrders || terminalOrders.length === 0) return { released: 0 }

  let released = 0
  for (const order of terminalOrders) {
    try {
      await releasePendingPoints(order.id)
      released++
    } catch (err) {
      console.error(`[reconcile] Failed to release points for order ${order.id}:`, err)
    }
  }

  revalidatePath("/admin/rewards")
  return { released }
}
