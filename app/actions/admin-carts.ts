"use server"
import { requireAdmin } from "@/lib/admin"

type LiveCartContact = {
  id: string; user_id: string; updated_at: string; profiles: { full_name: string | null };
  cart_items: { quantity: number; products: { name: string } | null }[];
}
type LiveCartRow = {
  id: string; user_id: string; updated_at: string;
  profiles: { full_name: string | null; phone: string | null } | null;
  cart_items: { quantity: number; unit_price: number | string; products: { name: string; thumbnail_url: string | null } | null; product_variants: { title: string | null } | null }[];
}

export async function sendLiveCartEmail(cartId: string) {
  const { supabase } = await requireAdmin()

  const EDGE_FUNCTION_URL =
    (process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") || "") +
    "/functions/v1/send-abandoned-cart"
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !serviceKey) return { success: false, error: 'Email service is not configured' }

  const { data: cart } = await supabase
    .from("carts")
    .select(`
      id,
      user_id,
      updated_at,
      profiles!inner(id, full_name),
      cart_items(
        quantity,
        products!inner(name)
      )
    `)
    .eq("id", cartId)
    .single()

  if (!cart) return { success: false, error: "Cart not found" }

  const typedCart = cart as unknown as LiveCartContact
  const profile = typedCart.profiles
  const userName = profile?.full_name || "there"

  // Fetch email from auth.users
  let email: string | null = null
  if (cart.user_id) {
    const { data: contact, error } = await supabase.auth.admin.getUserById(cart.user_id)
    if (error) return { success: false, error: 'Unable to read the customer email' }
    email = contact.user?.email || null
  }
  const items = typedCart.cart_items || []
  const itemNames = items.map(item => item.products?.name).filter(Boolean).sort().join(", ")

  if (!email) return { success: false, error: "No email on profile" }

  try {
    const resp = await fetch(EDGE_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        userName,
        itemCount: items.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0),
        itemNames,
        cartUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "https://themakeupstorewangkhei.com"}/cart`,
        recoveryKey: `live-cart/${cart.id}/${cart.updated_at}`,
      }),
      signal: AbortSignal.timeout(20_000),
    })
    const body = await resp.text()
    if (!resp.ok) return { success: false, error: `${resp.status}: ${body.slice(0, 200)}` }
    return { success: true }
  } catch {
    return { success: false, error: 'Unable to confirm the email request. Check before retrying.' }
  }
}

export async function getLiveCarts() {
    const { supabase } = await requireAdmin()

    const { data, error } = await supabase
        .from('carts')
        .select(`
            id,
            updated_at,
            user_id,
            profiles (
                full_name,
                phone
            ),
            cart_items (
                quantity,
                unit_price,
                products (
                    name,
                    thumbnail_url
                ),
                product_variants (
                    title
                )
            )
        `)
        .order('updated_at', { ascending: false })

    if (error) {
        console.error("[LiveCarts] Query error:", error.message, error.details, error.hint)
        return []
    }

    console.log("[LiveCarts] Raw carts:", data?.length ?? 0)

    // Filter for carts that actually have items
    const activeCarts = ((data || []) as unknown as LiveCartRow[]).filter(c => c.cart_items && c.cart_items.length > 0)

    return activeCarts.map(cart => {
        const items = cart.cart_items || []
        return {
            id: cart.id,
            updatedAt: cart.updated_at,
            customer: cart.profiles || { full_name: "Guest User", phone: "No Contact" },
            totalValue: items.reduce((acc, item) => acc + (Number(item.unit_price) * item.quantity), 0),
            totalItems: items.reduce((acc, item) => acc + item.quantity, 0),
            items: items.map((item) => ({
                name: item.products?.name || "Unknown Product",
                image: item.products?.thumbnail_url,
                variant: item.product_variants?.title,
                qty: item.quantity
            }))
        }
    })
}
