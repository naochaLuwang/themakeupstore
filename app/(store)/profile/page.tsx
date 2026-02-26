

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
    LogOut, ChevronRight, ShieldCheck, Bell, CreditCard
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
            setTimeout(() => setLoading(false), 800)
        }
        loadProfile()
    }, [supabase, router])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push("/login")
        router.refresh()
    }

    const menuItems = [
        { label: "My Orders", href: "/profile/orders", icon: ShoppingBag, detail: "History, tracking & returns" },
        { label: "My Wishlist", href: "/profile/wishlist", icon: Heart, detail: "Products you've saved" },
        { label: "Notifications", href: "/profile/notifications", icon: Bell, detail: "Manage alerts & updates" },
        { label: "My Addresses", href: "/profile/addresses", icon: MapPin, detail: "Shipping & billing registry" },
        { label: "Account Settings", href: "/profile/settings", icon: Settings, detail: "Privacy, security & password" },
    ]

    return (
        <div className="relative min-h-screen bg-[#F9F9F9] pb-10">
            {/* 1. YOUR ORIGINAL LOADING OVERLAY */}
            <AnimatePresence mode="wait">
                {loading && (
                    <motion.div
                        key="loader"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center"
                    >
                        <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-900 mb-2">The Makeup Store</h2>
                        <motion.div
                            animate={{ width: ["0%", "40%", "0%"] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="h-[1px] bg-slate-900"
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 2. MAIN CONTENT */}
            {!loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {/* NYKAA STYLE COMPACT HEADER */}
                    <header className="px-6 pt-10 pb-8 bg-white border-b border-pink-50 rounded-b-[2.5rem] shadow-sm sticky top-0 z-10">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full bg-slate-100 border-2 border-[#fc2779] p-0.5 shadow-md">
                                    <div className="w-full h-full rounded-full bg-white overflow-hidden flex items-center justify-center">
                                        {profile?.avatar_url ? (
                                            <img src={profile.avatar_url} className="w-full h-full object-cover" alt="" />
                                        ) : (
                                            <User className="w-6 h-6 text-slate-300" />
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#fc2779]">Personal Account</p>
                                    <h1 className="text-2xl font-black tracking-tight text-slate-900 leading-none">
                                        {profile?.full_name || 'Member'}
                                    </h1>
                                </div>
                            </div>
                        </div>

                        {profile?.is_admin && (
                            <Link href="/admin" className="mt-6 flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 rounded-2xl w-full">
                                <ShieldCheck className="w-4 h-4 text-white" />
                                <span className="text-[10px] font-black text-white uppercase tracking-widest">Administrator Access</span>
                            </Link>
                        )}
                    </header>

                    <main className="px-5 py-8 space-y-6">
                        {/* MENU SECTION IN A SINGLE CARD */}
                        <section className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                            {menuItems.map((item, idx) => (
                                <Link
                                    key={item.label}
                                    href={item.href}
                                    className={`flex items-center justify-between p-5 group active:bg-slate-50 transition-colors ${idx !== menuItems.length - 1 ? 'border-b border-slate-50' : ''}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-pink-50 transition-colors">
                                            <item.icon className="w-5 h-5 text-slate-400 group-hover:text-[#fc2779] transition-colors" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black uppercase tracking-tight text-slate-800">{item.label}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{item.detail}</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-200 group-hover:text-[#fc2779] group-hover:translate-x-1 transition-all" />
                                </Link>
                            ))}
                        </section>

                        {/* MINIMALIST ID CARD */}
                        <section className="bg-white rounded-[2rem] p-8 border border-slate-100 text-center space-y-5">
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">Virtual ID Card</p>
                                <p className="text-xs font-mono font-bold text-slate-900">
                                    DACIANA-{profile?.id?.slice(0, 8).toUpperCase()}
                                </p>
                            </div>

                            <div className="flex justify-center items-end gap-[3px] h-10 px-10">
                                {[...Array(24)].map((_, i) => (
                                    <div
                                        key={i}
                                        className="bg-slate-200 rounded-full"
                                        style={{
                                            width: i % 4 === 0 ? '3px' : '1.5px',
                                            height: `${50 + (Math.random() * 50)}%`,
                                        }}
                                    />
                                ))}
                            </div>
                        </section>

                        {/* SIGN OUT ACTION */}
                        <section className="pt-4 pb-10">
                            <button
                                onClick={() => setShowConfirm(true)}
                                className="w-full p-5 rounded-[2rem] border-2 border-slate-100 text-slate-400 hover:text-red-500 hover:border-red-50 hover:bg-red-50/50 transition-all font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3"
                            >
                                <LogOut className="w-4 h-4" />
                                <span>Logout of Account</span>
                            </button>

                            <p className="mt-8 text-center text-[9px] font-black text-slate-300 uppercase tracking-[0.5em] opacity-80">
                                Member Since {profile?.created_at ? new Date(profile.created_at).getFullYear() : '2026'} • v1.0.4
                            </p>
                        </section>
                    </main>
                </motion.div>
            )}

            {/* CONFIRMATION DRAWER (NYKAA STYLE) */}
            <AnimatePresence>
                {showConfirm && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowConfirm(false)}
                            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
                        />

                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="fixed bottom-10 left-0 right-0 bg-white z-[70] rounded-t-[3rem] p-10 shadow-2xl max-w-lg mx-auto"
                        >
                            <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8" />
                            <div className="text-center space-y-3 mb-10">
                                <h3 className="text-3xl font-serif italic text-slate-900">Sign Out?</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">You'll need to log back in to access your wishlist and orders.</p>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleSignOut}
                                    className="w-full py-5 rounded-2xl bg-[#fc2779] text-white text-[11px] font-black uppercase tracking-widest shadow-xl shadow-pink-200 active:scale-95 transition-all"
                                >
                                    Yes, Log Out
                                </button>
                                <button
                                    onClick={() => setShowConfirm(false)}
                                    className="w-full py-5 rounded-2xl bg-slate-50 text-slate-900 text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}