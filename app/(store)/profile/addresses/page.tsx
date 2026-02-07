import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, MapPin, Plus, Home, Briefcase, Trash2, CheckCircle2 } from "lucide-react"
import { AddressList } from "./address-list" // We'll create this below

export default async function AddressesPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    // Fetch user addresses
    const { data: addresses } = await supabase
        .from("user_addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })

    return (
        <div className="min-h-screen bg-white pb-32">
            <header className="px-6 pt-16 pb-8 border-b border-zinc-50 bg-white/80 backdrop-blur-md sticky top-0 z-10">
                <Link href="/profile" className="flex items-center gap-2 text-zinc-400 hover:text-primary transition-colors mb-6 group">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Back to Account</span>
                </Link>

                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">
                            Shipping Registry
                        </p>
                        <h1 className="text-4xl font-serif tracking-tighter uppercase italic leading-none">
                            Addresses
                        </h1>
                    </div>
                </div>
            </header>

            <main className="px-6 py-8">
                {/* Client Component to handle List/Add/Delete logic */}
                <AddressList
                    initialAddresses={addresses || []}
                    userId={user.id}
                />
            </main>
        </div>
    )
}