// import { createClient } from "@/utils/supabase/server"
// import { redirect } from "next/navigation"
// import Link from "next/link"
// import { ArrowLeft, Sparkles } from "lucide-react"
// import { AddressList } from "./address-list"

// export default async function AddressesPage() {
//     const supabase = await createClient()

//     const { data: { user } } = await supabase.auth.getUser()
//     if (!user) redirect("/login")

//     const { data: addresses } = await supabase
//         .from("user_addresses")
//         .select("*")
//         .eq("user_id", user.id)
//         .order("is_default", { ascending: false })

//     return (
//         <div className="min-h-screen bg-white pb-32 selection:bg-pink-100">
//             {/* Soft Boutique Glow Background */}
//             <div className="fixed inset-0 pointer-events-none overflow-hidden">
//                 <div className="absolute top-[-5%] right-[-5%] w-[300px] h-[300px] bg-pink-50/40 rounded-full blur-[80px]" />
//             </div>

//             <header className="px-6 pt-16 pb-8 border-b border-pink-50/50 bg-white/70 backdrop-blur-xl sticky top-0 z-20">
//                 <Link
//                     href="/profile"
//                     className="flex items-center gap-2 text-zinc-400 hover:text-[#fc2779] transition-colors mb-8 group"
//                 >
//                     <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
//                     <span className="text-[9px] font-black uppercase tracking-[0.3em]">
//                         Your Profile
//                     </span>
//                 </Link>

//                 <div className="flex items-end justify-between">
//                     <div className="space-y-3">
//                         <div className="flex items-center gap-2">
//                             <Sparkles className="w-3 h-3 text-[#fc2779]" />
//                             <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[#fc2779]">
//                                 Shipping Registry
//                             </p>
//                         </div>
//                         <h1 className="text-5xl font-serif tracking-tighter italic leading-[0.8] text-zinc-900">
//                             Saved <br />
//                             <span className="text-zinc-400">Destinations.</span>
//                         </h1>
//                     </div>
//                 </div>
//             </header>

//             <main className="relative z-10 px-6 py-10">
//                 {/* Ensure your AddressList component also uses 
//                    #fc2779 for primary buttons and 
//                    soft rounded-2xl corners for the cards. 
//                 */}
//                 <AddressList
//                     initialAddresses={addresses || []}
//                     userId={user.id}
//                 />
//             </main>
//         </div>
//     )
// }


import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Sparkles } from "lucide-react"
import { AddressList } from "./address-list"
import { Breadcrumbs } from "@/components/store/breadcrumbs"

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
        <div className="min-h-screen bg-white pb-0 selection:bg-pink-100">
            {/* Extremely Subtle Ambient Glow */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-2%] right-[-2%] w-[200px] h-[200px] bg-[#fc2779]/5 rounded-full blur-[60px]" />
            </div>

            <header className="px-6 pt-5 pb-6 border-b border-zinc-50 bg-white/80 backdrop-blur-md sticky top-0 z-20">
                <div className="flex items-center justify-between mb-4">
                    <Link
                        href="/profile"
                        className="p-2 -ml-2 text-zinc-400 hover:text-[#fc2779] transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>

                    <div className="flex items-center gap-1.5 opacity-60">
                        <Sparkles className="w-3 h-3 text-[#fc2779]" />
                        <span className="text-[8px] font-black uppercase tracking-[0.4em] text-zinc-900">
                            Verified Registry
                        </span>
                    </div>
                </div>

                <div className="space-y-0.5">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#fc2779]">
                        Your
                    </p>
                    <h1 className="text-3xl font-serif italic tracking-tighter text-zinc-900 leading-none">
                        Destinations.
                    </h1>
                </div>
            </header>

            <main className="relative z-10 px-5 py-6">
                <Breadcrumbs
                    items={[
                        { label: 'Profile', href: '/profile' },
                        { label: 'My Addresses', href: '/profile/addresses' }
                    ]}
                />
                {/* The compact AddressList should use:
                   - Gap of 4 instead of 6
                   - Cards with rounded-2xl
                   - Simplified labels
                */}
                <AddressList
                    initialAddresses={addresses || []}
                    userId={user.id}
                />
            </main>
        </div>
    )
}