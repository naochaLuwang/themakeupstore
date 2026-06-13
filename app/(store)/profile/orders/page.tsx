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
            payment_status,
            payment_method,
            shipping_address,
            order_items (id, product_id, product_name, variant_title, quantity, unit_price)
        `)
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })

    if (error) return <div>Error loading orders.</div>

    let ordersWithThumbs = orders || []

    if (orders && orders.length > 0) {
        const productIds = orders
            .flatMap(o => o.order_items || [])
            .map((i: any) => i.product_id)
            .filter(Boolean)
        const uniqueIds = [...new Set(productIds)]

        if (uniqueIds.length > 0) {
            const { data: products } = await supabase
                .from('products')
                .select('id, thumbnail_url')
                .in('id', uniqueIds)

            const thumbMap: Record<string, string> = {}
            if (products) {
                for (const p of products) {
                    thumbMap[p.id] = p.thumbnail_url
                }
            }

            ordersWithThumbs = orders.map(o => ({
                ...o,
                order_items: o.order_items?.map((oi: any) => ({
                    ...oi,
                    image_url: oi.product_id ? thumbMap[oi.product_id] : null,
                })),
            }))
        }
    }

    return <OrdersHistoryClient initialOrders={ordersWithThumbs} />
}
