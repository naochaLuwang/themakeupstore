
// "use client"

// import * as React from "react"
// import { useState, useEffect } from "react"
// import { createClient } from "@/utils/supabase/client"
// import { useRouter } from "next/navigation"
// import Link from "next/link"
// import { motion, AnimatePresence } from "framer-motion"
// import {
//     User, ShoppingBag, Heart, MapPin, Settings,
//     LogOut, ChevronRight, ShieldCheck, Bell,
//     AlertTriangle, Trash2, Lock, Eye, EyeOff, Loader2
// } from "lucide-react"
// import { toast } from "sonner"

// export default function ProfilePage() {
//     const [profile, setProfile] = useState<any>(null)
//     const [loading, setLoading] = useState(true)
//     const [showConfirm, setShowConfirm] = useState(false)

//     // Delete Account States
//     const [isDeleting, setIsDeleting] = useState(false)
//     const [deleteLoading, setDeleteLoading] = useState(false)
//     const [password, setPassword] = useState("")
//     const [showPassword, setShowPassword] = useState(false)

//     const supabase = createClient()
//     const router = useRouter()

//     useEffect(() => {
//         async function loadProfile() {
//             const { data: { user } } = await supabase.auth.getUser()
//             if (!user) {
//                 router.push("/login")
//                 return
//             }

//             const { data } = await supabase
//                 .from("profiles")
//                 .select("*")
//                 .eq("id", user.id)
//                 .single()

//             setProfile(data)
//             setTimeout(() => setLoading(false), 800)
//         }
//         loadProfile()
//     }, [supabase, router])

//     const handleSignOut = async () => {
//         await supabase.auth.signOut()
//         router.push("/login")
//         router.refresh()
//     }

//     const handleDeleteAccount = async (e: React.FormEvent) => {
//         e.preventDefault()
//         setDeleteLoading(true)

//         try {
//             // 1. Re-authenticate
//             const { data: { user } } = await supabase.auth.getUser()
//             if (!user?.email) throw new Error("Session expired")

//             const { error: authError } = await supabase.auth.signInWithPassword({
//                 email: user.email,
//                 password: password,
//             })

//             if (authError) throw new Error("Incorrect password. Verification failed.")

//             // 2. Call SQL Function (Must be created in Supabase SQL Editor first)
//             const { error: deleteError } = await supabase.rpc('delete_user_account')
//             if (deleteError) throw deleteError

//             // 3. Final Sign Out & Redirect
//             await supabase.auth.signOut()
//             toast.success("Account permanently removed")
//             router.push('/')
//         } catch (error: any) {
//             toast.error(error.message || "Failed to delete account")
//         } finally {
//             setDeleteLoading(false)
//         }
//     }

//     const menuItems = [
//         { label: "My Orders", href: "/profile/orders", icon: ShoppingBag, detail: "History, tracking & returns" },
//         { label: "My Wishlist", href: "/profile/wishlist", icon: Heart, detail: "Products you've saved" },
//         { label: "Notifications", href: "/profile/notifications", icon: Bell, detail: "Manage alerts & updates" },
//         { label: "My Addresses", href: "/profile/addresses", icon: MapPin, detail: "Shipping & billing registry" },
//         { label: "Account Settings", href: "/profile/settings", icon: Settings, detail: "Privacy, security & password" },
//     ]

//     return (
//         <div className="relative min-h-screen bg-[#F9F9F9] pb-24">
//             {/* 1. LOADING OVERLAY */}
//             <AnimatePresence mode="wait">
//                 {loading && (
//                     <motion.div
//                         key="loader"
//                         initial={{ opacity: 1 }}
//                         exit={{ opacity: 0, y: -20 }}
//                         className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center"
//                     >
//                         <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-900 mb-2">The Makeup Store</h2>
//                         <motion.div
//                             animate={{ width: ["0%", "40%", "0%"] }}
//                             transition={{ duration: 1.5, repeat: Infinity }}
//                             className="h-[1px] bg-slate-900"
//                         />
//                     </motion.div>
//                 )}
//             </AnimatePresence>

//             {/* 2. MAIN CONTENT */}
//             {!loading && (
//                 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
//                     <header className="px-6 pt-10 pb-8 bg-white border-b border-pink-50 rounded-b-[2.5rem] shadow-sm sticky top-0 z-10">
//                         <div className="flex items-center justify-between">
//                             <div className="flex items-center gap-4">
//                                 <div className="w-14 h-14 rounded-full bg-slate-100 border-2 border-[#fc2779] p-0.5 shadow-md">
//                                     <div className="w-full h-full rounded-full bg-white overflow-hidden flex items-center justify-center">
//                                         {profile?.avatar_url ? (
//                                             <img src={profile.avatar_url} className="w-full h-full object-cover" alt="" />
//                                         ) : (
//                                             <User className="w-6 h-6 text-slate-300" />
//                                         )}
//                                     </div>
//                                 </div>
//                                 <div className="space-y-0.5">
//                                     <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#fc2779]">Personal Account</p>
//                                     <h1 className="text-2xl font-black tracking-tight text-slate-900 leading-none">
//                                         {profile?.full_name || 'Member'}
//                                     </h1>
//                                 </div>
//                             </div>
//                         </div>

//                         {profile?.is_admin && (
//                             <Link href="/admin" className="mt-6 flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 rounded-2xl w-full">
//                                 <ShieldCheck className="w-4 h-4 text-white" />
//                                 <span className="text-[10px] font-black text-white uppercase tracking-widest">Administrator Access</span>
//                             </Link>
//                         )}
//                     </header>

//                     <main className="px-5 py-8 space-y-8">
//                         {/* NAV MENU */}
//                         <section className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
//                             {menuItems.map((item, idx) => (
//                                 <Link
//                                     key={item.label}
//                                     href={item.href}
//                                     className={`flex items-center justify-between p-5 group active:bg-slate-50 transition-colors ${idx !== menuItems.length - 1 ? 'border-b border-slate-50' : ''}`}
//                                 >
//                                     <div className="flex items-center gap-4">
//                                         <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-pink-50 transition-colors">
//                                             <item.icon className="w-5 h-5 text-slate-400 group-hover:text-[#fc2779] transition-colors" />
//                                         </div>
//                                         <div>
//                                             <p className="text-sm font-black uppercase tracking-tight text-slate-800">{item.label}</p>
//                                             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{item.detail}</p>
//                                         </div>
//                                     </div>
//                                     <ChevronRight className="w-4 h-4 text-slate-200 group-hover:text-[#fc2779] group-hover:translate-x-1 transition-all" />
//                                 </Link>
//                             ))}
//                         </section>

//                         {/* VIRTUAL ID */}
//                         <section className="bg-white rounded-[2rem] p-8 border border-slate-100 text-center space-y-5 shadow-sm">
//                             <div className="space-y-1">
//                                 <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">Virtual ID Card</p>
//                                 <p className="text-xs font-mono font-bold text-slate-900">
//                                     DACIANA-{profile?.id?.slice(0, 8).toUpperCase()}
//                                 </p>
//                             </div>
//                             <div className="flex justify-center items-end gap-[3px] h-10 px-10">
//                                 {[...Array(24)].map((_, i) => (
//                                     <div key={i} className="bg-slate-200 rounded-full" style={{ width: i % 4 === 0 ? '3px' : '1.5px', height: `${50 + (Math.random() * 50)}%` }} />
//                                 ))}
//                             </div>
//                         </section>

//                         {/* DELETE ACCOUNT (TWA COMPLIANCE) */}
//                         {/* <section className="pt-4">
//                             <div className="bg-rose-50/30 border border-rose-100 rounded-[2.5rem] p-8 space-y-6">
//                                 <div className="flex items-center gap-2 text-rose-500">
//                                     <AlertTriangle className="w-4 h-4" />
//                                     <span className="text-[10px] font-black uppercase tracking-[0.3em]">Danger Zone</span>
//                                 </div>

//                                 <div className="space-y-2">
//                                     <h3 className="text-lg font-serif italic font-bold text-slate-900 leading-none">Delete <span className="text-rose-600">Account</span></h3>
//                                     <p className="text-[11px] text-slate-500 leading-relaxed font-medium">Permanently remove your orders, wishlist, and boutique preferences. This action is irreversible.</p>
//                                 </div>

//                                 {!isDeleting ? (
//                                     <button
//                                         onClick={() => setIsDeleting(true)}
//                                         className="text-[10px] font-black uppercase tracking-widest text-rose-400 border-b border-rose-200 pb-0.5"
//                                     >
//                                         Request Data Removal
//                                     </button>
//                                 ) : (
//                                     <form onSubmit={handleDeleteAccount} className="space-y-4 animate-in fade-in slide-in-from-top-2">
//                                         <div className="relative">
//                                             <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
//                                             <input
//                                                 required
//                                                 type={showPassword ? "text" : "password"}
//                                                 value={password}
//                                                 onChange={(e) => setPassword(e.target.value)}
//                                                 placeholder="VERIFY PASSWORD"
//                                                 className="w-full bg-white border border-rose-100 rounded-2xl py-4 pl-12 pr-12 text-[10px] font-black tracking-widest outline-none focus:ring-2 focus:ring-rose-100 uppercase"
//                                             />
//                                             <button
//                                                 type="button"
//                                                 onClick={() => setShowPassword(!showPassword)}
//                                                 className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300"
//                                             >
//                                                 {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
//                                             </button>
//                                         </div>
//                                         <div className="flex gap-2">
//                                             <button
//                                                 type="submit"
//                                                 disabled={deleteLoading}
//                                                 className="flex-1 h-14 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-rose-200 flex items-center justify-center"
//                                             >
//                                                 {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Delete"}
//                                             </button>
//                                             <button
//                                                 type="button"
//                                                 onClick={() => { setIsDeleting(false); setPassword(""); }}
//                                                 className="px-6 h-14 bg-white border border-slate-200 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest"
//                                             >
//                                                 Cancel
//                                             </button>
//                                         </div>
//                                     </form>
//                                 )}
//                             </div>
//                         </section> */}

//                         {/* SIGN OUT */}
//                         <section className="pb-10">
//                             <button
//                                 onClick={() => setShowConfirm(true)}
//                                 className="w-full p-5 rounded-[2.5rem] bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"
//                             >
//                                 <LogOut className="w-4 h-4" />
//                                 <span>Logout of Account</span>
//                             </button>
//                             <p className="mt-8 text-center text-[9px] font-black text-slate-300 uppercase tracking-[0.5em] opacity-80">
//                                 Member Since {profile?.created_at ? new Date(profile.created_at).getFullYear() : '2026'} • v1.0.4
//                             </p>
//                         </section>
//                     </main>
//                 </motion.div>
//             )}

//             {/* LOGOUT CONFIRMATION */}
//             <AnimatePresence>
//                 {showConfirm && (
//                     <>
//                         <motion.div
//                             initial={{ opacity: 0 }}
//                             animate={{ opacity: 1 }}
//                             exit={{ opacity: 0 }}
//                             onClick={() => setShowConfirm(false)}
//                             className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
//                         />
//                         <motion.div
//                             initial={{ y: "100%" }}
//                             animate={{ y: 0 }}
//                             exit={{ y: "100%" }}
//                             transition={{ type: "spring", damping: 25, stiffness: 300 }}
//                             className="fixed bottom-0 left-0 right-0 bg-white z-[70] rounded-t-[3rem] p-10 shadow-2xl max-w-lg mx-auto"
//                         >
//                             <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8" />
//                             <div className="text-center space-y-3 mb-10">
//                                 <h3 className="text-3xl font-serif italic text-slate-900">Sign Out?</h3>
//                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">You'll need to log back in to access your wishlist and orders.</p>
//                             </div>
//                             <div className="flex flex-col gap-3">
//                                 <button onClick={handleSignOut} className="w-full py-5 rounded-2xl bg-[#fc2779] text-white text-[11px] font-black uppercase tracking-widest shadow-xl shadow-pink-200">Yes, Log Out</button>
//                                 <button onClick={() => setShowConfirm(false)} className="w-full py-5 rounded-2xl bg-slate-50 text-slate-900 text-[11px] font-black uppercase tracking-widest">Cancel</button>
//                             </div>
//                         </motion.div>
//                     </>
//                 )}
//             </AnimatePresence>
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
    ShoppingBag, Heart, MapPin, Settings,
    LogOut, ChevronRight, ShieldCheck, Bell,
    Sparkles, User
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
        { label: "My Orders", href: "/profile/orders", icon: ShoppingBag },
        { label: "My Wishlist", href: "/profile/wishlist", icon: Heart },
        { label: "Notifications", href: "/profile/notifications", icon: Bell },
        { label: "My Addresses", href: "/profile/addresses", icon: MapPin },
        { label: "Account Settings", href: "/profile/settings", icon: Settings },
    ]

    return (
        <div className="min-h-screen bg-[#F8F8F8] pb-24 antialiased selection:bg-pink-100">
            {/* 1. SIGNATURE LOADER */}
            <AnimatePresence mode="wait">
                {loading && (
                    <motion.div
                        key="loader"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-white flex items-center justify-center"
                    >
                        <div className="w-12 h-[1px] bg-[#fc2779]" />
                    </motion.div>
                )}
            </AnimatePresence>

            {!loading && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-md mx-auto px-5 pt-12"
                >
                    {/* COMPACT COMPACT HEADER */}
                    <header className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm mb-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="bg-pink-50 p-2 rounded-full">
                                <Sparkles className="w-4 h-4 text-[#fc2779] fill-[#fc2779]" />
                            </div>
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-300">Official Profile</p>
                        </div>

                        <div className="space-y-1">
                            <h1 className="text-4xl font-serif italic text-slate-900 leading-tight">
                                {profile?.full_name || 'Member'}
                            </h1>
                            <p className="text-[10px] font-bold text-[#fc2779] uppercase tracking-widest">
                                {profile?.email?.split('@')[0]}
                            </p>
                        </div>

                        {profile?.is_admin && (
                            <Link href="/admin" className="mt-6 flex items-center justify-center gap-2 py-3 bg-slate-950 rounded-2xl">
                                <ShieldCheck className="w-3 h-3 text-white" />
                                <span className="text-[9px] font-black text-white uppercase tracking-widest">Admin Access</span>
                            </Link>
                        )}
                    </header>

                    {/* NAVIGATION MENU (BOXED STYLE) */}
                    <main className="space-y-3">
                        <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                            {menuItems.map((item, idx) => (
                                <Link
                                    key={item.label}
                                    href={item.href}
                                    className={`flex items-center justify-between p-5 group active:bg-slate-50 transition-colors ${idx !== menuItems.length - 1 ? 'border-b border-slate-100' : ''}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-pink-50 group-hover:text-[#fc2779] transition-all">
                                            <item.icon className="w-4 h-4 stroke-[1.5]" />
                                        </div>
                                        <span className="text-[11px] font-black uppercase tracking-widest text-slate-800">
                                            {item.label}
                                        </span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-200 group-hover:text-[#fc2779] group-hover:translate-x-1 transition-all" />
                                </Link>
                            ))}
                        </div>

                        {/* MINIMALIST ID TAG */}
                        <div className="bg-white rounded-[2rem] border border-slate-200 p-6 flex items-center justify-between">
                            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Store ID</p>
                            <p className="text-[10px] font-mono font-bold text-slate-400">
                                DAC-{profile?.id?.slice(0, 8).toUpperCase()}
                            </p>
                        </div>

                        {/* SIGN OUT BUTTON (COLORED) */}
                        <section className="pt-6 pb-10">
                            <button
                                onClick={() => setShowConfirm(true)}
                                className="w-full p-5 rounded-[2rem] bg-slate-900 text-white shadow-xl shadow-slate-200 font-black uppercase text-[11px] tracking-[0.3em] flex items-center justify-center gap-3 active:scale-95 transition-all"
                            >
                                <LogOut className="w-4 h-4" />
                                <span>Sign Out</span>
                            </button>

                            <p className="mt-10 text-center text-[8px] font-black text-slate-300 uppercase tracking-[0.4em]">
                                The Makeup Store Wangkhei • 2026
                            </p>
                        </section>
                    </main>
                </motion.div>
            )}

            {/* EXIT CONFIRMATION */}
            <AnimatePresence>
                {showConfirm && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowConfirm(false)}
                            className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[60]"
                        />
                        <motion.div
                            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed bottom-12 left-0 right-0 bg-white z-[70] rounded-t-[3rem] p-10 shadow-2xl max-w-lg mx-auto"
                        >
                            <div className="text-center space-y-4 mb-10">
                                <h3 className="text-3xl font-serif italic text-slate-900">Sign Out?</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">We'll keep your wishlist safe.</p>
                            </div>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleSignOut}
                                    className="w-full py-5 rounded-3xl bg-[#fc2779] text-white text-[11px] font-black uppercase tracking-widest shadow-xl shadow-pink-200 active:scale-95 transition-all"
                                >
                                    Confirm Logout
                                </button>
                                <button
                                    onClick={() => setShowConfirm(false)}
                                    className="w-full py-5 rounded-3xl bg-slate-50 text-slate-400 text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all"
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