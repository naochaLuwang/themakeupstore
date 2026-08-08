"use server"
import { requireAdmin } from "@/lib/admin"

export async function sendLiveCartEmail(cartId: string) {
  const { supabase } = await requireAdmin()

  const EDGE_FUNCTION_URL =
    (process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") || "") +
    "/functions/v1/send-abandoned-cart"
  const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const { data: cart } = await supabase
    .from("carts")
    .select(`
      id,
      user_id,
      profiles!inner(id, full_name),
      cart_items(
        products!inner(name)
      )
    `)
    .eq("id", cartId)
    .single()

  if (!cart) return { success: false, error: "Cart not found" }

  const profile = (cart as any).profiles as any
  const userName = profile?.full_name || "there"

  // Fetch email from auth.users
  let email: string | null = null
  if (cart.user_id) {
    const { data: authUser } = await supabase
      .from("auth.users")
      .select("email")
      .eq("id", cart.user_id)
      .single()
    email = authUser?.email || null
  }
  const items = (cart as any).cart_items || []
  const itemNames = items.map((i: any) => i.products?.name).filter(Boolean).join(", ")

  if (!email) return { success: false, error: "No email on profile" }

  try {
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
        itemNames,
        cartUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "https://themakeupstorewangkhei.com"}/cart`,
      }),
    })
    const body = await resp.text()
    if (!resp.ok) return { success: false, error: `${resp.status}: ${body.slice(0, 200)}` }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || "Unknown error" }
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
    const activeCarts = data?.filter(c => c.cart_items && c.cart_items.length > 0) || []

    return activeCarts.map(cart => {
        const items = cart.cart_items || []
        return {
            id: cart.id,
            updatedAt: cart.updated_at,
            customer: (cart.profiles as any) || { full_name: "Guest User", phone: "No Contact" },
            totalValue: items.reduce((acc: number, item: any) => acc + (Number(item.unit_price) * item.quantity), 0),
            totalItems: items.reduce((acc: number, item: any) => acc + item.quantity, 0),
            items: items.map((item: any) => ({
                name: (item.products as any)?.name || "Unknown Product",
                image: (item.products as any)?.thumbnail_url,
                variant: (item.product_variants as any)?.title,
                qty: item.quantity
            }))
        }
    })
}