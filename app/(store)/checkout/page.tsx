// import { createClient } from "@/utils/supabase/server"
// import { redirect } from "next/navigation"
// import CheckoutClient from "./checkout-client"

// export default async function CheckoutPage() {
//     const supabase = await createClient()

//     // 1. Get the authenticated user
//     const { data: { user } } = await supabase.auth.getUser()

//     // Redirect to login if no session exists
//     if (!user) {
//         redirect("/login?next=/checkout")
//     }

//     // 2. Fetch the profile (including address fields)
//     const { data: profile, error } = await supabase
//         .from("profiles")
//         .select("*")
//         .eq("id", user.id)
//         .single()

//     // 3. Pass profile data to the Client Component
//     // We pass an empty object as fallback if profile is not found
//     return (
//         <main className="min-h-screen bg-slate-50/50">
//             <CheckoutClient profile={profile || {}} />
//         </main>
//     )
// }

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import CheckoutClient from "./checkout-client"

export default async function CheckoutPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login?next=/checkout")
    }

    // Fetch profile and addresses with their fixed shipping methods
    const [profileRes, addressRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("user_addresses")
            .select(`
                *,
                shipping_methods:shipping_method_id (*)
            `)
            .eq("user_id", user.id)
            .order("is_default", { ascending: false })
    ])

    // Calculate server-side subtotal to prevent hydration flicker
    // This is just a snapshot for the first paint
    const initialProfile = profileRes.data || {}
    const initialAddresses = addressRes.data || []

    return (
        <main className="min-h-screen bg-slate-50/50">
            <CheckoutClient
                profile={initialProfile}
                initialAddresses={initialAddresses}
            />
        </main>
    )
}