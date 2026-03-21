"use server"
import { createClient } from "@/utils/supabase/server"

export async function getLiveCarts() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('carts')
        .select(`
            id,
            updated_at,
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
        console.error("Join Error:", error.message)
        return []
    }

    // Filter for carts that actually have items
    const activeCarts = data?.filter(c => c.cart_items && c.cart_items.length > 0) || []

    return activeCarts.map(cart => {
        const items = cart.cart_items || []
        return {
            id: cart.id,
            updatedAt: cart.updated_at,
            customer: cart.profiles || { full_name: "Guest User", phone: "No Contact" },
            totalValue: items.reduce((acc: number, item: any) => acc + (Number(item.unit_price) * item.quantity), 0),
            totalItems: items.reduce((acc: number, item: any) => acc + item.quantity, 0),
            items: items.map((item: any) => ({
                name: item.products?.name || "Unknown Product",
                image: item.products?.thumbnail_url,
                variant: item.product_variants?.title,
                qty: item.quantity
            }))
        }
    })
}