import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import CheckoutClient from "./checkout-client"
import { getActivePromos } from "@/app/actions/promo"

export default async function CheckoutPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login?next=/checkout")
    }

    // Fetch profile and addresses with their fixed shipping methods
    const [profileRes, addressRes, promos] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("user_addresses")
            .select(`
                *,
                shipping_methods:shipping_method_id (*)
            `)
            .eq("user_id", user.id)
            .order("is_default", { ascending: false }),
        getActivePromos()
    ])

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