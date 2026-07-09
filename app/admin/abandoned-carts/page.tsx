import { createAdminClient } from "@/utils/supabase/admin"
import { requireAdmin } from "@/lib/admin"
import { AbandonedCartsClient } from "./client"

export default async function AbandonedCartsPage() {
  await requireAdmin()
  const supabase = await createAdminClient()

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { data: carts, error } = await supabase
    .from("carts")
    .select(`
      id, user_id, updated_at, abandoned_email_sent_at,
      profiles!inner(id, full_name),
      cart_items(product_id, product_variant_id, quantity, unit_price)
    `)
    .order("updated_at", { ascending: false })
    .limit(50)

  if (error) {
    console.error("Abandoned carts query error:", error)
  }

  const now = new Date()
  const abandoned = (carts || []).filter((c: any) => {
    const updated = new Date(c.updated_at)
    const diffMs = now.getTime() - updated.getTime()
    return diffMs > 60 * 60 * 1000
  })

  // Attach emails from auth.users
  const userIds = abandoned.map((c: any) => c.user_id).filter(Boolean)
  if (userIds.length > 0) {
    const { data: authUsers } = await supabase
      .from("auth.users")
      .select("id, email")
      .in("id", userIds)
    const emailMap = new Map(authUsers?.map(u => [u.id, u.email]) || [])
    for (const c of abandoned as any[]) {
      c.profiles.email = emailMap.get(c.user_id) || null
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Abandoned Carts</h1>
        <p className="text-sm text-slate-500 mt-1">Carts inactive for over 1 hour</p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          <p className="font-semibold mb-1">Query Error:</p>
          <p className="font-mono">{error.message}</p>
        </div>
      )}

      <AbandonedCartsClient carts={abandoned as any[]} />
    </div>
  )
}
