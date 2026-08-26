import { createClient } from "@/utils/supabase/server"
import { CartClearer } from "@/components/store/cart-clearer"
import { ReceiptPage } from "./receipt"
import { redirect } from "next/navigation"

export default async function OrderSuccessPage(props: { searchParams: Promise<{ orderId?: string }> }) {
    const searchParams = await props.searchParams
    const orderId = searchParams.orderId

    if (!orderId) redirect("/")

    const supabase = await createClient()

    const { data: order } = await supabase
        .from("orders")
        .select(`
            id, created_at, total, shipping_price, shipping_label,
            payment_method, payment_status, razorpay_payment_id,
            promo_code, promo_discount_amount, bxgy_discount_amount, coin_discount_amount,
            shipping_address,
            order_items (
                id, product_name, variant_title, quantity, unit_price, mrp, is_gift
            )
        `)
        .eq("id", orderId)
        .maybeSingle()

    if (!order) redirect("/")

    return (
        <>
            <CartClearer />
            <ReceiptPage order={order} />
        </>
    )
}