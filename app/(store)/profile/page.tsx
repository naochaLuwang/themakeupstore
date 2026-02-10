

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
    LogOut, ChevronRight, ShieldCheck, Bell
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
        { label: "Orders", href: "/profile/orders", icon: ShoppingBag, detail: "History & Tracking" },
        { label: "Wishlist", href: "/profile/wishlist", icon: Heart, detail: "Your saved items" },
        { label: "Notifications", href: "/profile/notifications", icon: Bell, detail: "Preferences" },
        { label: "Addresses", href: "/profile/addresses", icon: MapPin, detail: "Shipping registry" },
        { label: "Account Settings", href: "/profile/settings", icon: Settings, detail: "Security & Privacy" },
    ]

    return (
        <div className="relative min-h-auto bg-white pb-5">
            {/* 1. LOADING OVERLAY */}
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
                    <header className="px-6 pt-8 pb-8 border-b border-zinc-50 bg-white/80 backdrop-blur-md sticky top-0 z-10">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Welcome Back</p>
                                <h1 className="text-4xl font-serif tracking-tighter uppercase italic text-slate-900 leading-none">
                                    {profile?.full_name?.split(' ')[0] || 'Member'}
                                </h1>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-zinc-100 border border-zinc-200 overflow-hidden shadow-inner flex items-center justify-center">
                                {profile?.avatar_url ? (
                                    <img src={profile.avatar_url} className="w-full h-full object-cover" alt="" />
                                ) : (
                                    <User className="w-5 h-5 text-zinc-400" />
                                )}
                            </div>
                        </div>

                        {profile?.is_admin && (
                            <Link href="/admin" className="mt-6 flex items-center gap-2 px-4 py-2 bg-slate-900 rounded-full w-fit">
                                <ShieldCheck className="w-3 h-3 text-white" />
                                <span className="text-[9px] font-black text-white uppercase tracking-widest">Admin Access</span>
                            </Link>
                        )}
                    </header>

                    <main className="px-6 py-8 space-y-12">
                        <section className="space-y-1">
                            {menuItems.map((item) => (
                                <Link key={item.label} href={item.href} className="flex items-center justify-between p-4 -mx-2 rounded-2xl hover:bg-zinc-50 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center border border-transparent group-hover:border-zinc-100">
                                            <item.icon className="w-4 h-4 text-slate-900" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black uppercase tracking-tight text-slate-900">{item.label}</p>
                                            <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-widest leading-none mt-1">{item.detail}</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-zinc-300" />
                                </Link>
                            ))}
                        </section>

                        {/* MEMBER BARCODE SECTION */}
                        <section className="bg-zinc-50 rounded-[2.5rem] p-10 text-center space-y-6">
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.4em]">Membership ID</p>
                                <p className="text-[11px] font-mono font-bold text-slate-900">
                                    TMS-{profile?.id?.slice(0, 8).toUpperCase()}
                                </p>
                            </div>

                            {/* Visual Barcode Aesthetic */}
                            <div className="flex justify-center items-end gap-[2px] h-12">
                                {[...Array(30)].map((_, i) => (
                                    <div
                                        key={i}
                                        className="bg-slate-900 rounded-full"
                                        style={{
                                            width: i % 3 === 0 ? '3px' : '1px',
                                            height: `${40 + (Math.random() * 60)}%`,
                                            opacity: 0.8
                                        }}
                                    />
                                ))}
                            </div>


                        </section>

                        <section className="pt-2 px-2">
                            <button
                                onClick={() => setShowConfirm(true)}
                                className="
            w-full flex items-center justify-center gap-3 p-5 
            rounded-[2rem] 
            bg-slate-900 text-white 
            hover:bg-red-600 
            active:scale-[0.97]
            transition-all duration-300
            font-black uppercase text-[11px] tracking-[0.25em]
            shadow-xl shadow-slate-200 
            relative overflow-hidden
            group
        "
                            >
                                {/* Subtle shine effect on hover */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                                <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                                <span>Sign Out of Account</span>
                            </button>

                            <p className="mt-10 text-center text-[9px] font-bold text-zinc-300 uppercase tracking-[0.4em] opacity-60">
                                Member Since {profile?.created_at ? new Date(profile.created_at).getFullYear() : '2026'}
                            </p>
                        </section>
                    </main>
                </motion.div>
            )}

            {/* CONFIRMATION OVERLAY (Remains Same) */}
            <AnimatePresence>
                {showConfirm && (
                    <>
                        {/* Backdrop with a heavier blur for focus */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowConfirm(false)}
                            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60]"
                        />

                        {/* Floating Card - Positioned above the Navbar */}
                        <motion.div
                            initial={{ y: 100, opacity: 0, scale: 0.95 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 40, opacity: 0, scale: 0.95 }}
                            transition={{ type: "spring", damping: 20, stiffness: 300 }}
                            className="fixed bottom-28 left-6 right-6 bg-white z-[70] rounded-[2.5rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-zinc-100 max-w-md mx-auto"
                        >
                            {/* Minimalist handle */}
                            <div className="flex justify-center mb-6">
                                <div className="w-10 h-1 bg-zinc-100 rounded-full" />
                            </div>

                            <div className="text-center space-y-2">
                                <h3 className="text-3xl font-serif italic uppercase tracking-tighter text-slate-900">
                                    Ending Session?
                                </h3>
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">
                                    You'll need to sign back in for your next visit.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mt-10">
                                <button
                                    onClick={() => setShowConfirm(false)}
                                    className="py-5 rounded-2xl bg-zinc-50 text-[10px] font-black uppercase tracking-widest text-zinc-900 hover:bg-zinc-100 transition-colors"
                                >
                                    Stay
                                </button>
                                <button
                                    onClick={handleSignOut}
                                    className="py-5 rounded-2xl bg-red-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-100 active:scale-95 transition-all"
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