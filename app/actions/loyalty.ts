"use server"

import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"
import { requireAdmin } from "@/lib/admin"
import { revalidatePath } from "next/cache"

const TIER_THRESHOLDS = [
  { tier: "gold", minSpend: 13000 },
  { tier: "silver", minSpend: 5000 },
  { tier: "bronze", minSpend: 0 },
] as const

function computeTier(totalSpend: number): string {
  for (const t of TIER_THRESHOLDS) {
    if (totalSpend >= t.minSpend) return t.tier
  }
  return "bronze"
}

function calcPoints(total: number): number {
  return Math.floor(total / 60)
}

function generateCouponCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = "MB-"
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
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

  const [pointsRes, transactionsRes, ordersRes, rewardsRes] = await Promise.all([
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
    supabase.from("reward_products").select("id, product_name, thumbnail_url, coins_required, stock, reward_type, tier_restriction, discount_amount, min_order_value").eq("active", true).order("coins_required", { ascending: true }),
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
    rewards: rewardsRes.data || [],
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
  const supabase = await createClient()

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

  // Trigger already set loyalty_points.balance = balance_after on INSERT
  // Only need to bump lifetime_earned now that status is 'available'
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

// ─── Redeem coins for a reward ───
export async function redeemReward(rewardProductId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, message: "Please sign in" }

  const [rewardRes, pointsRes] = await Promise.all([
    supabase.from("reward_products").select("*").eq("id", rewardProductId).single(),
    supabase.from("loyalty_points").select("balance, tier").eq("user_id", user.id).maybeSingle(),
  ])

  const reward = rewardRes.data
  const points = pointsRes.data

  if (!reward || !reward.active) return { success: false, message: "Reward not found" }
  if (reward.stock <= 0) return { success: false, message: "Out of stock" }
  if (!points || points.balance < reward.coins_required) return { success: false, message: "Insufficient coins" }
  if (reward.tier_restriction && reward.tier_restriction !== points.tier) return { success: false, message: "This reward is not available for your tier" }

  if (reward.reward_type === "coupon") {
    // 1. Generate coupon code first (before any deduction)
    let code = generateCouponCode()
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: existing } = await supabase.from("reward_coupons").select("id").eq("code", code).maybeSingle()
      if (!existing) break
      code = generateCouponCode()
    }

    const { error: couponErr } = await supabase.from("reward_coupons").insert({
      user_id: user.id,
      reward_id: reward.id,
      code,
      discount_amount: reward.discount_amount || reward.coins_required * 100,
      min_order_value: reward.min_order_value || 0,
    })

    if (couponErr) return { success: false, message: "Failed to generate coupon" }

    // 2. Deduct coins
    await supabase.from("loyalty_points").update({
      balance: Math.max((points.balance || 0) - reward.coins_required, 0),
      updated_at: new Date().toISOString(),
    }).eq("user_id", user.id)

    // 3. Log transaction
    await supabase.from("loyalty_transactions").insert({
      user_id: user.id,
      type: "spend",
      amount: reward.coins_required,
      reference_type: "redemption",
      reference_id: reward.id,
      status: "available",
      note: `Redeemed coupon: ${reward.product_name}`,
    })

    // 4. Decrement stock (atomic with optimistic lock)
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data: r } = await supabase.from("reward_products").select("stock").eq("id", reward.id).single()
      if (!r || r.stock <= 0) return { success: false, message: "Out of stock" }
      const { error: decErr } = await supabase.from("reward_products").update({ stock: r.stock - 1 }).eq("id", reward.id).eq("stock", r.stock)
      if (!decErr) break
      if (attempt === 2) return { success: false, message: "Stock update failed, try again" }
    }

    revalidatePath("/rewards")
    return { success: true, type: "coupon", code, discount_amount: reward.discount_amount || reward.coins_required * 100, min_order_value: reward.min_order_value || 0, product_name: reward.product_name }
  }

  // Product redemption: create tx first, then deduct
  const { error: txErr } = await supabase.from("loyalty_transactions").insert({
    user_id: user.id,
    type: "spend",
    amount: reward.coins_required,
    reference_type: "redemption",
    reference_id: reward.id,
    status: "available",
    note: `Redeemed for ${reward.product_name}`,
  })

  if (txErr) return { success: false, message: "Failed to process redemption" }

  await supabase.from("loyalty_points").update({
    balance: Math.max((points.balance || 0) - reward.coins_required, 0),
    updated_at: new Date().toISOString(),
  }).eq("user_id", user.id)

  // Decrement stock (atomic with optimistic lock)
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: r } = await supabase.from("reward_products").select("stock").eq("id", reward.id).single()
    if (!r || r.stock <= 0) return { success: false, message: "Out of stock" }
    const { error: decErr } = await supabase.from("reward_products").update({ stock: r.stock - 1 }).eq("id", reward.id).eq("stock", r.stock)
    if (!decErr) break
    if (attempt === 2) return { success: false, message: "Stock update failed, try again" }
  }

  revalidatePath("/rewards")
  return { success: true, type: "product", reward }
}

// ─── Get user's unused reward coupons ───
export async function getMyCoupons() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from("reward_coupons")
    .select("*, reward:reward_products(product_name)")
    .eq("user_id", user.id)
    .eq("used", false)
    .order("created_at", { ascending: false })

  return data || []
}

// ─── Apply a reward coupon (mark as used) ───
export async function applyRewardCoupon(code: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, message: "Please sign in" }

  const { data: coupon } = await supabase
    .from("reward_coupons")
    .select("*")
    .eq("code", code)
    .eq("used", false)
    .eq("user_id", user.id)
    .maybeSingle()

  if (!coupon) return { success: false, message: "Invalid or already used coupon" }

  return {
    success: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      discount_amount: coupon.discount_amount,
      min_order_value: coupon.min_order_value,
    },
  }
}

// ─── Mark coupon as used at checkout ───
export async function markCouponUsed(couponId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false }

  await supabase.from("reward_coupons").update({
    used: true,
    used_at: new Date().toISOString(),
  }).eq("id", couponId).eq("user_id", user.id)

  return { success: true }
}

// ─── Admin: list all reward products ───
export async function listRewardProducts() {
  await requireAdmin()
  const supabase = await createAdminClient()
  const { data } = await supabase.from("reward_products").select("id, product_name, thumbnail_url, coins_required, stock, reward_type, tier_restriction, discount_amount, min_order_value, active, description").order("coins_required", { ascending: true })
  return data || []
}

// ─── Admin: create reward product ───
export async function createRewardProduct(formData: FormData) {
  await requireAdmin()
  const supabase = await createAdminClient()

  const rewardType = formData.get("reward_type") as string

  const payload: any = {
    product_name: formData.get("product_name") as string,
    description: (formData.get("description") as string) || null,
    thumbnail_url: (formData.get("thumbnail_url") as string) || null,
    coins_required: Number(formData.get("coins_required")),
    stock: Number(formData.get("stock")) || 0,
    reward_type: rewardType,
    tier_restriction: (formData.get("tier_restriction") as string) || null,
  }

  if (rewardType === "coupon") {
    payload.discount_amount = Number(formData.get("discount_amount")) || 0
    payload.min_order_value = Number(formData.get("min_order_value")) || 0
  }

  const { error } = await supabase.from("reward_products").insert(payload)
  if (error) throw new Error(error.message)
  revalidatePath("/admin/rewards")
}

// ─── Admin: update reward product ───
export async function updateRewardProduct(id: string, formData: FormData) {
  await requireAdmin()
  const supabase = await createAdminClient()

  const rewardType = formData.get("reward_type") as string

  const payload: any = {
    product_name: formData.get("product_name") as string,
    description: (formData.get("description") as string) || null,
    thumbnail_url: (formData.get("thumbnail_url") as string) || null,
    coins_required: Number(formData.get("coins_required")),
    stock: Number(formData.get("stock")) || 0,
    reward_type: rewardType,
    active: formData.get("active") === "true",
    tier_restriction: (formData.get("tier_restriction") as string) || null,
    updated_at: new Date().toISOString(),
  }

  if (rewardType === "coupon") {
    payload.discount_amount = Number(formData.get("discount_amount")) || 0
    payload.min_order_value = Number(formData.get("min_order_value")) || 0
  } else {
    payload.discount_amount = null
    payload.min_order_value = null
  }

  const { error } = await supabase.from("reward_products").update(payload).eq("id", id)
  if (error) return { success: false, message: error.message }
  revalidatePath("/admin/rewards")
  return { success: true }
}

// ─── Admin: toggle reward product active ───
export async function toggleRewardProduct(id: string, currentActive: boolean) {
  await requireAdmin()
  const supabase = await createAdminClient()
  const { error } = await supabase.from("reward_products").update({
    active: !currentActive,
    updated_at: new Date().toISOString(),
  }).eq("id", id)
  if (error) return { success: false, message: error.message }
  revalidatePath("/admin/rewards")
  return { success: true }
}

// ─── Admin: delete reward product ───
export async function deleteRewardProduct(id: string) {
  await requireAdmin()
  const supabase = await createAdminClient()
  const { error } = await supabase.from("reward_products").delete().eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/admin/rewards")
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
  const earned = txs.filter(t => t.type === "earn" || t.type === "bonus").reduce((s, t) => s + t.amount, 0)
  const spent = txs.filter(t => t.type === "spend").reduce((s, t) => s + t.amount, 0)

  return {
    points: pointsRes.data || { balance: 0, lifetime_earned: 0, tier: "bronze" },
    transactions: txs,
    summary: {
      earned,
      spent,
      pending: txs.filter(t => t.status === "pending").reduce((s, t) => s + t.amount, 0),
    },
  }
}

// ─── Admin: get all users' points ───
export async function adminGetAllUsersPoints() {
  await requireAdmin()
  const supabase = await createAdminClient()

  // Get all users who have loyalty transactions (most reliable source)
  const { data: allTx } = await supabase
    .from("loyalty_transactions")
    .select("user_id, type, amount, status, created_at")
    .order("created_at", { ascending: false })

  // Also fetch loyalty_points table
  const { data: pointsData } = await supabase
    .from("loyalty_points")
    .select("*")

  const pointsMap = new Map((pointsData || []).map((p: any) => [p.user_id, p]))

  // Build user aggregates from transactions
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

  // Fetch profiles
  const { data: profiles } = userIds.length > 0
    ? await supabase.from("profiles").select("id, full_name, phone").in("id", userIds)
    : { data: [] }
  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))

  const result = userIds.map(userId => {
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

  // Get current balance
  const { data: points } = await supabase
    .from("loyalty_points")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle()

  const currentBalance = points?.balance || 0

  // Prevent negative balance on deduction
  if (amount < 0 && currentBalance + amount < 0) {
    return { success: false, message: `User only has ${currentBalance} coins — cannot deduct ${Math.abs(amount)}` }
  }

  // Ensure loyalty_points row exists
  if (!points) {
    await supabase.from("loyalty_points").insert({
      user_id: userId,
      balance: 0,
      lifetime_earned: 0,
      tier: "bronze",
    })
  }

  // DB triggers auto-update balance_before/balance_after and loyalty_points.balance
  // For credits: use type='bonus' (trigger does balance += amount, lifetime_earned += amount)
  // For debits: use type='spend' (trigger does balance -= amount)
  const { error: txErr } = await supabase.from("loyalty_transactions").insert({
    user_id: userId,
    type: amount > 0 ? "bonus" : "spend",
    amount: Math.abs(amount),
    reference_type: "admin",
    status: "available",
    note: `Admin ${amount > 0 ? "credited" : "deducted"}: ${note}`,
  })

  if (txErr) return { success: false, message: txErr.message }

  revalidatePath("/admin/rewards/users")
  return { success: true }
}
