import type { Metadata } from "next"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import CheckoutClient from "./checkout-client"
import { getActivePromos } from "@/app/actions/promo"

export const metadata: Metadata = {
    title: "Checkout",
    description: "Complete your order at THE MAKEUP STORE WANGKHEI.",
}

export default async function CheckoutPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login?next=/checkout")
    }

    // Fetch profile and addresses with their fixed shipping methods
    let profileRes: any, addressRes: any, promos: any
    try {
        [profileRes, addressRes, promos] = await Promise.all([
            supabase.from("profiles").select("id, email").eq("id", user.id).single(),
            supabase.from("user_addresses")
                .select(`
                    *,
                    shipping_methods:shipping_method_id (*)
                `)
                .eq("user_id", user.id)
                .order("is_default", { ascending: false }),
            getActivePromos()
        ])
    } catch {
        profileRes = { data: null }
        addressRes = { data: [] }
        promos = []
    }

    const initialProfile = profileRes.data || {}
    const initialAddresses = addressRes.data || []
    const allPromos = promos || []

    return (
        <CheckoutClient
            profile={initialProfile}
            initialAddresses={initialAddresses}
            allPromos={allPromos}
        />
    )
}