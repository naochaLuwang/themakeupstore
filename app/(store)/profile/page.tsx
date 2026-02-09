

// import { createClient } from "@/utils/supabase/server"
// import { redirect } from "next/navigation"
// import Link from "next/link"
// import {
//     User,
//     ShoppingBag,
//     Heart,
//     MapPin,
//     Settings,
//     LogOut,
//     ChevronRight,
//     ShieldCheck,
//     Bell
// } from "lucide-react"

// export default async function ProfilePage() {
//     const supabase = await createClient()

//     const { data: { user } } = await supabase.auth.getUser()
//     if (!user) redirect("/login")

//     const { data: profile } = await supabase
//         .from("profiles")
//         .select("*")
//         .eq("id", user.id)
//         .single()

//     const menuItems = [
//         { label: "Orders", href: "/profile/orders", icon: ShoppingBag, detail: "History & Tracking" },
//         { label: "Wishlist", href: "/profile/wishlist", icon: Heart, detail: "Your saved items" },
//         { label: "Notifications", href: "/profile/notifications", icon: Bell, detail: "Preferences" },
//         { label: "Addresses", href: "/profile/addresses", icon: MapPin, detail: "Shipping registry" },
//         { label: "Account Settings", href: "/profile/settings", icon: Settings, detail: "Security & Privacy" },
//     ]

//     return (
//         <div className="min-h-auto bg-white pb-0">
//             {/* STICKY HEADER AREA */}
//             <header className="px-6 pt-16 pb-8 border-b border-zinc-50 bg-white/80 backdrop-blur-md sticky top-0 z-10">
//                 <div className="flex items-center justify-between">
//                     <div className="space-y-1">
//                         <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">
//                             Welcome Back
//                         </p>
//                         <h1 className="text-4xl font-serif tracking-tighter uppercase italic leading-none">
//                             {profile?.full_name?.split(' ')[0] || 'Member'}
//                         </h1>
//                     </div>
//                     <div className="w-12 h-12 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center overflow-hidden">
//                         {profile?.avatar_url ? (
//                             <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
//                         ) : (
//                             <User className="w-5 h-5 text-zinc-400" />
//                         )}
//                     </div>
//                 </div>

//                 {profile?.is_admin && (
//                     <Link href="/admin" className="mt-6 flex items-center gap-2 px-4 py-2 bg-slate-900 rounded-full w-fit">
//                         <ShieldCheck className="w-3 h-3 text-white" />
//                         <span className="text-[9px] font-black text-white uppercase tracking-widest">Access Admin Panel</span>
//                     </Link>
//                 )}
//             </header>

//             <main className="px-6 py-8 space-y-10">
//                 {/* QUICK NAV LIST */}
//                 <section className="space-y-2">
//                     <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-6">
//                         Account Management
//                     </h2>

//                     <div className="space-y-1">
//                         {menuItems.map((item) => (
//                             <Link
//                                 key={item.label}
//                                 href={item.href}
//                                 className="group flex items-center justify-between p-4 -mx-2 rounded-2xl hover:bg-zinc-50 active:bg-zinc-100 active:scale-[0.98] transition-all"
//                             >
//                                 <div className="flex items-center gap-4">
//                                     <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center group-hover:bg-white border border-transparent group-hover:border-zinc-100 transition-colors">
//                                         <item.icon className="w-4 h-4 text-slate-900" />
//                                     </div>
//                                     <div>
//                                         <p className="text-sm font-black uppercase tracking-tight leading-none mb-1">
//                                             {item.label}
//                                         </p>
//                                         <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-widest">
//                                             {item.detail}
//                                         </p>
//                                     </div>
//                                 </div>
//                                 <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-primary transition-colors" />
//                             </Link>
//                         ))}
//                     </div>
//                 </section>

//                 {/* SIGN OUT AREA */}
//                 <section className="pt-6 border-t border-zinc-50">
//                     <form action="/auth/signout" method="post">
//                         <button
//                             type="submit"
//                             className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-zinc-50 hover:bg-red-50 hover:text-red-600 text-zinc-500 transition-all font-black uppercase text-[11px] tracking-widest"
//                         >
//                             <LogOut className="w-4 h-4" />
//                             Sign Out of Account
//                         </button>
//                     </form>
//                     <p className="mt-8 text-center text-[9px] font-bold text-zinc-300 uppercase tracking-widest">
//                         THE MAKEUP STORE Member Since {new Date(profile?.created_at).getFullYear()}
//                     </p>
//                 </section>
//             </main>
//         </div>
//     )
// }


"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
    User, ShoppingBag, Heart, MapPin, Settings,
    LogOut, ChevronRight, ShieldCheck, Bell, X
} from "lucide-react"

export default function ProfilePage() {
    const [profile, setProfile] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [showConfirm, setShowConfirm] = useState(false)

    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        async function loadProfile() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push("/login")
                return
            }

            const { data } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .single()

            setProfile(data)
            setLoading(false)
        }
        loadProfile()
    }, [supabase, router])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push("/login")
        router.refresh()
    }

    if (loading) return null // Or a minimalist skeleton

    const menuItems = [
        { label: "Orders", href: "/profile/orders", icon: ShoppingBag, detail: "History & Tracking" },
        { label: "Wishlist", href: "/profile/wishlist", icon: Heart, detail: "Your saved items" },
        { label: "Notifications", href: "/profile/notifications", icon: Bell, detail: "Preferences" },
        { label: "Addresses", href: "/profile/addresses", icon: MapPin, detail: "Shipping registry" },
        { label: "Account Settings", href: "/profile/settings", icon: Settings, detail: "Security & Privacy" },
    ]

    return (
        <div className="relative min-h-auto bg-white pb-20">
            {/* STICKY HEADER */}
            <header className="px-6 pt-16 pb-8 border-b border-zinc-50 bg-white/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Welcome Back</p>
                        <h1 className="text-4xl font-serif tracking-tighter uppercase italic leading-none text-slate-900">
                            {profile?.full_name?.split(' ')[0] || 'Member'}
                        </h1>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center overflow-hidden shadow-inner">
                        {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-5 h-5 text-zinc-400" />
                        )}
                    </div>
                </div>
            </header>

            <main className="px-6 py-8 space-y-10">
                <section className="space-y-2">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300 mb-6">Management</h2>
                    <div className="space-y-1">
                        {menuItems.map((item) => (
                            <Link key={item.label} href={item.href} className="group flex items-center justify-between p-4 -mx-2 rounded-2xl hover:bg-zinc-50 active:scale-[0.98] transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center border border-transparent group-hover:border-zinc-100 transition-colors">
                                        <item.icon className="w-4 h-4 text-slate-900" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black uppercase tracking-tight leading-none mb-1 text-slate-900">{item.label}</p>
                                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-widest">{item.detail}</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-zinc-300" />
                            </Link>
                        ))}
                    </div>
                </section>

                <section className="pt-6 border-t border-zinc-50">
                    <button
                        onClick={() => setShowConfirm(true)}
                        className="w-full flex items-center justify-center gap-3 p-5 rounded-2xl bg-zinc-100 hover:bg-zinc-900 hover:text-white text-zinc-500 transition-all font-black uppercase text-[11px] tracking-widest"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </section>
            </main>

            {/* CONFIRMATION OVERLAY */}
            <AnimatePresence>
                {showConfirm && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowConfirm(false)}
                            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed bottom-10 left-0 right-0 bg-white z-50 rounded-t-[2.5rem] p-10 pb-12 shadow-[0_-20px_50px_rgba(0,0,0,0.1)]"
                        >
                            <div className="flex justify-center mb-6">
                                <div className="w-12 h-1.5 bg-zinc-100 rounded-full" />
                            </div>

                            <h3 className="text-2xl font-serif italic uppercase tracking-tighter text-center mb-2">Wait a moment</h3>
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center mb-8">Are you sure you want to end your session?</p>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setShowConfirm(false)}
                                    className="p-4 rounded-xl border border-zinc-100 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:bg-zinc-50 transition-colors"
                                >
                                    Stay
                                </button>
                                <button
                                    onClick={handleSignOut}
                                    className="p-4 rounded-xl bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-zinc-200 active:scale-95 transition-all"
                                >
                                    Log Out
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}