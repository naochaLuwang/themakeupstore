"use server"

import { createClient } from "@/utils/supabase/server"
import { requireAdmin } from "@/lib/admin"
import { revalidatePath } from "next/cache"
import type { RecoveryResult } from "@/lib/admin-directory"

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

type RecoveryCandidate = {
  id: string; user_id: string; updated_at: string;
  profiles: { full_name: string | null };
  cart_items: { quantity: number; products: { name: string } | null }[];
}

// The explicit page IDs bound the operation. Eligibility and contact details are
// read again on the server; the browser cannot supply recipients or email content.
export async function sendRecoveryEmails(cartIds: string[]): Promise<RecoveryResult> {
  const { supabase } = await requireAdmin()
  if (!Array.isArray(cartIds) || cartIds.length > 25 || cartIds.some(id => typeof id !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) {
    throw new Error('Select up to 25 valid carts.')
  }
  const ids = [...new Set(cartIds)]
  const outcomes: RecoveryResult['outcomes'] = []
  if (ids.length === 0) return { sent: 0, failed: 0, skipped: 0, unconfirmed: 0, outcomes }
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!baseUrl || !serviceKey) throw new Error('Recovery email service is not configured.')

  const cutoff = new Date(Date.now() - 3_600_000).toISOString()
  const { data, error } = await supabase.from('carts').select(`
    id,user_id,updated_at,profiles!inner(full_name,deleted_at),
    cart_items!inner(quantity,products(name))
  `).in('id', ids).lt('updated_at', cutoff).is('abandoned_email_sent_at', null)
    .is('profiles.deleted_at', null).gt('cart_items.quantity', 0)
  if (error) throw new Error('Unable to check cart eligibility. No emails were sent.')
  const candidates = new Map(((data || []) as unknown as RecoveryCandidate[]).map(cart => [cart.id, cart]))

  for (const id of ids) {
    const cart = candidates.get(id)
    if (!cart || !cart.cart_items.length) { outcomes.push({ id, status: 'skipped' }); continue }
    let attempted = false
    try {
      const { data: contact, error: contactError } = await supabase.auth.admin.getUserById(cart.user_id)
      if (contactError) { outcomes.push({ id, status: 'failed', message: 'Unable to read the customer email.' }); continue }
      const email = contact.user?.email
      if (!email) { outcomes.push({ id, status: 'skipped', message: 'Email unavailable.' }); continue }
      const { data: current, error: currentError } = await supabase.from('carts')
        .select('id,cart_items!inner(quantity)').eq('id', id).eq('updated_at', cart.updated_at)
        .is('abandoned_email_sent_at', null).lt('updated_at', cutoff).gt('cart_items.quantity', 0).maybeSingle()
      if (currentError) { outcomes.push({ id, status: 'failed', message: 'Unable to recheck the cart.' }); continue }
      if (!current) { outcomes.push({ id, status: 'skipped' }); continue }
      attempted = true
      const response = await fetch(`${baseUrl}/functions/v1/send-abandoned-cart`, {
        method: 'POST', headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email, userName: cart.profiles.full_name || 'there',
          itemCount: cart.cart_items.reduce((sum, item) => sum + item.quantity, 0),
          itemNames: cart.cart_items.map(item => item.products?.name).filter(Boolean).sort().join(', '),
          recoveryKey: `cart-recovery/${id}`,
        }), signal: AbortSignal.timeout(20_000),
      })
      if (!response.ok) {
        outcomes.push({ id, status: response.status >= 500 ? 'unconfirmed' : 'failed', message: 'The email service could not confirm sending.' })
        continue
      }
      const { data: marked, error: markError } = await supabase.from('carts')
        .update({ abandoned_email_sent_at: new Date().toISOString() }).eq('id', id)
        .eq('updated_at', cart.updated_at).is('abandoned_email_sent_at', null).select('id')
      if (markError || !marked?.length) {
        outcomes.push({ id, status: 'unconfirmed', message: 'Email accepted, but its saved status could not be confirmed.' })
      } else outcomes.push({ id, status: 'sent' })
    } catch {
      outcomes.push({ id, status: attempted ? 'unconfirmed' : 'failed', message: 'Unable to confirm the request. Check before retrying.' })
    }
  }
  revalidatePath('/admin/abandoned-carts')
  return {
    sent: outcomes.filter(result => result.status === 'sent').length,
    failed: outcomes.filter(result => result.status === 'failed').length,
    skipped: outcomes.filter(result => result.status === 'skipped').length,
    unconfirmed: outcomes.filter(result => result.status === 'unconfirmed').length, outcomes,
  }
}
