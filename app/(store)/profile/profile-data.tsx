import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { ProfileContent } from "./profile-content"
import { getMyGiftCards } from "@/app/actions/gift-cards"
import { getLoyaltyData, getMyCoupons } from "@/app/actions/loyalty"

export default async function ProfileData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  let profileRes: any, ordersCountRes: any, wishlistRes: any, addressesRes: any, totalSpentRes: any, recentOrdersRes: any, giftCards: any, loyaltyData: any, coupons: any
  try {
    [profileRes, ordersCountRes, wishlistRes, addressesRes, totalSpentRes, recentOrdersRes, giftCards, loyaltyData, coupons] = await Promise.all([
      supabase.from("profiles").select("full_name, created_at, is_admin").eq("id", user.id).single(),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("wishlist").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("user_addresses").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("orders").select("total").eq("user_id", user.id).neq("status", "cancelled"),
      supabase.from("orders").select(`
        id, created_at, status, total, payment_status, delivered_at,
        order_items (id, product_id, product_name, quantity, unit_price)
      `).eq("user_id", user.id).order("created_at", { ascending: false }).limit(3),
      getMyGiftCards(),
      getLoyaltyData(),
      getMyCoupons(),
    ])
  } catch {
    profileRes = { data: null }
    ordersCountRes = { count: 0 }
    wishlistRes = { count: 0 }
    addressesRes = { count: 0 }
    totalSpentRes = { data: [] }
    recentOrdersRes = { data: [] }
    giftCards = []
    loyaltyData = null
    coupons = []
  }

  const orders = recentOrdersRes.data || []
  const productIds = [...new Set(
    orders.flatMap((o: any) => o.order_items || []).map((i: any) => i.product_id).filter(Boolean)
  )]

  let thumbMap: Record<string, string> = {}
  if (productIds.length > 0) {
    const { data: products } = await supabase
      .from("products")
      .select("id, thumbnail_url")
      .in("id", productIds)
    if (products) {
      for (const p of products) thumbMap[p.id] = p.thumbnail_url
    }
  }

  const profile = profileRes.data
  const ordersCount = ordersCountRes.count ?? 0
  const wishlistCount = wishlistRes.count ?? 0
  const addressesCount = addressesRes.count ?? 0
  const totalSpent = totalSpentRes.data?.reduce((sum: number, o: any) => sum + Number(o.total), 0) ?? 0

  return (
    <ProfileContent
      profile={profile}
      user={{ email: user.email || "", id: user.id }}
      ordersCount={ordersCount}
      wishlistCount={wishlistCount}
      addressesCount={addressesCount}
      totalSpent={totalSpent}
      recentOrders={orders}
      thumbMap={thumbMap}
      giftCards={giftCards}
      loyaltyData={loyaltyData}
      coupons={coupons}
    />
  )
}
