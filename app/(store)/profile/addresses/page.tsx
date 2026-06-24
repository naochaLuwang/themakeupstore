import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { AddressList } from "./address-list"

export default async function AddressesPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    const { data: addresses } = await supabase
        .from("user_addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })

    return (
        <div className="min-h-screen bg-white">
            <header className="px-5 pt-3 pb-4 border-b border-gray-100">
                <div className="max-w-xl mx-auto">
                    <h1 className="text-lg font-semibold text-gray-900">My Addresses</h1>
                    <p className="text-xs text-gray-400 mt-0.5">{addresses?.length || 0} saved addresses</p>
                </div>
            </header>

            <main className="max-w-xl mx-auto px-5 py-5 pb-20">
                <AddressList
                    initialAddresses={addresses || []}
                    userId={user.id}
                />
            </main>
        </div>
    )
}
