import { createClient } from "@/utils/supabase/server"
import OrdersHistoryClient from "@/components/orders-history-client"

export default async function OrdersHistoryPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: orders, error } = await supabase
        .from("orders")
        .select(`
            id,
            created_at,
            status,
            total,
            order_items (count)
        `)
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })

    if (error) return <div>Error loading orders.</div>

    // Pass the fetched data to our Client Component
    return <OrdersHistoryClient initialOrders={orders || []} />
}