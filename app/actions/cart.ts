"use server"

import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"
import { requireAdmin } from "@/lib/admin"

// ─── Save cart server-side (called from client on cart changes) ───
export async function saveCart(items: {
  productId: string
  variantId: string
  name: string
  variantTitle: string
  price: number
  mrp: number
  image: string
  quantity: number
  stock: number
}[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false }

  // Upsert cart
  const { data: existingCart } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()

  let cartId: string
  if (existingCart) {
    cartId = existingCart.id
    await supabase.from("carts").update({ updated_at: new Date().toISOString() }).eq("id", cartId)
  } else {
    const { data: newCart } = await supabase
      .from("carts")
      .insert({ user_id: user.id })
      .select("id")
      .single()
    if (!newCart) return { success: false }
    cartId = newCart.id
  }

  // Replace cart items
  await supabase.from("cart_items").delete().eq("cart_id", cartId)

  if (items.length > 0) {
    const { error } = await supabase.from("cart_items").insert(
      items.map(item => ({
        cart_id: cartId,
        product_id: item.productId,
        product_variant_id: item.variantId || null,
        quantity: item.quantity,
        unit_price: item.price,
      }))
    )
    if (error) return { success: false }
  }

  return { success: true }
}

// ─── Get cart contents (for recovery email) ───
export async function getAbandonedCarts() {
  await requireAdmin()
  const supabase = await createAdminClient()

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { data } = await supabase
    .from("carts")
    .select(`
      id, user_id, updated_at,
      profiles!inner(id, full_name),
      cart_items(product_id, product_variant_id, quantity, unit_price,
        products!inner(id, name, slug, thumbnail_url))
    `)
    .lt("updated_at", oneHourAgo)
    .is("abandoned_email_sent_at", null)
    .order("updated_at", { ascending: false })

  if (!data) return []

  // Fetch emails from auth.users (profiles table doesn't have email)
  const userIds = data.map(c => c.user_id).filter(Boolean)
  const { data: authUsers } = await supabase
    .from("auth.users")
    .select("id, email")
    .in("id", userIds)

  const emailMap = new Map(authUsers?.map(u => [u.id, u.email]) || [])

  return data.map(cart => ({
    ...cart,
    profiles: {
      ...(cart as any).profiles,
      email: emailMap.get(cart.user_id || "") || null,
    },
  }))
}

// ─── Send recovery emails for abandoned carts ───
export async function sendRecoveryEmails() {
  await requireAdmin()

  const EDGE_FUNCTION_URL =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") +
    "/functions/v1/send-abandoned-cart"
  const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const carts = await getAbandonedCarts()
  const results: { email: string; success: boolean; status?: string }[] = []

  for (const cart of carts) {
    const profile = (cart as any).profiles as any
    const email = profile?.email
    const userName = profile?.full_name || "there"
    const items = (cart as any).cart_items || []

    if (!email) { results.push({ email: "no-email", success: false, status: "no email on profile" }); continue }

    try {
      let ok = false
      let status = "skipped"
      if (EDGE_FUNCTION_URL && ANON_KEY) {
        const resp = await fetch(EDGE_FUNCTION_URL, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${ANON_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            userName,
            itemCount: items.length,
            itemNames: items.map((i: any) => (i as any).products?.name).filter(Boolean).join(", "),
            cartUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "https://themakeupstorewangkhei.com"}/cart`,
          }),
        })
        const body = await resp.text()
        status = `${resp.status}: ${body.slice(0, 100)}`
        ok = resp.ok
      }

      if (ok) {
        const admin = await createAdminClient()
        await admin.from("carts").update({ abandoned_email_sent_at: new Date().toISOString() }).eq("id", cart.id)
      }

      results.push({ email, success: ok, status })
    } catch (err: any) {
      results.push({ email, success: false, status: `error: ${err?.message?.slice(0, 100) || "unknown"}` })
    }
  }

  return {
    sent: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    debug: results,
  }
}
