// "use client"

// import * as React from "react"
// import Link from "next/link"
// import { useRouter } from "next/navigation"
// import {
//     ChevronLeft,
//     User,
//     FileText,
//     ShieldCheck,
//     Truck,
//     Mail,
//     ChevronRight,
// } from "lucide-react"
// import { createClient } from "@/utils/supabase/client"
// import { AnimatePresence, motion } from "framer-motion"

// export default function SettingsPage() {
//     const router = useRouter()
//     const supabase = createClient()
//     const [profile, setProfile] = React.useState<any>(null)
//     const [loading, setLoading] = React.useState(true)

//     React.useEffect(() => {
//         async function getProfile() {
//             const { data: { user } } = await supabase.auth.getUser()
//             if (!user) return router.push("/login")

//             const { data } = await supabase
//                 .from("profiles")
//                 .select("*")
//                 .eq("id", user.id)
//                 .single()

//             setProfile(data)
//             setLoading(false)
//         }
//         getProfile()
//     }, [router, supabase])



//     const legalLinks = [
//         { label: "Terms of Use", href: "/legal/terms_and_conditions", icon: FileText, detail: "Usage & agreements" },
//         { label: "Privacy Policy", href: "/legal/privacy_policy", icon: ShieldCheck, detail: "Your data security" },
//         { label: "Return Policy", href: "/legal/return_policy", icon: Truck, detail: "Shipping & refunds" },
//         { label: "Contact Us", href: "/contact", icon: Mail, detail: "Get in touch with us" },
//     ]

//     return (
//         <div className="min-h-screen bg-white pb-10">

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

//             {/* HEADER */}
//             <header className="px-6 pt-12 pb-6 border-b border-zinc-50 sticky top-0 bg-white/80 backdrop-blur-md z-20">
//                 <div className="flex items-center gap-2">
//                     <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-zinc-50 transition-colors">
//                         <ChevronLeft className="w-5 h-5 text-zinc-900" />
//                     </button>
//                     <h1 className="text-xl font-black uppercase tracking-tight text-zinc-900 leading-none">Settings</h1>
//                 </div>
//             </header>

//             <main className="px-6 py-8 max-w-2xl mx-auto space-y-12">

//                 {/* SECTION: PERSONAL INFO */}
//                 <section>
//                     <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-4">Identity</h2>
//                     <Link href="/profile/settings/edit" className="group flex items-center justify-between p-6 bg-zinc-50 rounded-[2rem] hover:bg-zinc-100 transition-all border border-transparent hover:border-zinc-200">
//                         <div className="flex items-center gap-5">
//                             <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center border border-zinc-100 shadow-sm">
//                                 <User className="w-5 h-5 text-zinc-900" />
//                             </div>
//                             <div>
//                                 <p className="text-sm font-black uppercase tracking-tight text-zinc-900">My Profile</p>
//                                 <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-widest mt-1">Manage personal information</p>
//                             </div>
//                         </div>
//                         <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-900 transition-all" />
//                     </Link>
//                 </section>

//                 {/* SECTION: LEGAL & SUPPORT */}
//                 <section>
//                     <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-4">Support & Legal</h2>
//                     <div className="grid grid-cols-1 gap-3">
//                         {legalLinks.map((item) => (
//                             <Link
//                                 key={item.label}
//                                 href={item.href}
//                                 className="group flex items-center justify-between p-5 border border-zinc-100 rounded-[1.5rem] hover:border-zinc-900 transition-all"
//                             >
//                                 <div className="flex items-center gap-4">
//                                     <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center group-hover:bg-zinc-900 group-hover:text-white transition-colors">
//                                         <item.icon className="w-4 h-4" />
//                                     </div>
//                                     <div>
//                                         <p className="text-[11px] font-black uppercase tracking-tight text-zinc-900">{item.label}</p>
//                                         <p className="text-[9px] text-zinc-400 font-medium uppercase tracking-widest mt-0.5">{item.detail}</p>
//                                     </div>
//                                 </div>
//                                 <ChevronRight className="w-3.5 h-3.5 text-zinc-300 group-hover:translate-x-1 transition-all" />
//                             </Link>
//                         ))}
//                     </div>
//                 </section>

//                 {/* VERSION FOOTER */}
//                 <footer className="pt-10 text-center">
//                     <p className="text-[9px] font-bold text-zinc-300 uppercase tracking-[0.3em]">
//                         The Makeup Store • Version 1.0.4 (TWA)
//                     </p>
//                 </footer>
//             </main>
//         </div>
//     )
// }

"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
    ChevronLeft,
    User,
    FileText,
    ShieldCheck,
    Truck,
    Mail,
    ChevronRight,
    AlertTriangle,
    Trash2,
    Loader2,
    Zap
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { AnimatePresence, motion } from "framer-motion"
import { toast } from "sonner"
import { Breadcrumbs } from "@/components/store/breadcrumbs"

export default function SettingsPage() {
    const router = useRouter()
    const supabase = createClient()

    // States
    const [profile, setProfile] = React.useState<any>(null)
    const [loading, setLoading] = React.useState(true)
    const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)
    const [deleteLoading, setDeleteLoading] = React.useState(false)

    React.useEffect(() => {
        async function getProfile() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return router.push("/login")

            const { data } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .single()

            setProfile(data)
            setLoading(false)
        }
        getProfile()
    }, [router, supabase])

    const handleDeleteAccount = async () => {
        setDeleteLoading(true)
        try {
            // Call the SQL function (Ensure delete_user_account exists in your Supabase SQL editor)
            const { error: deleteError } = await supabase.rpc('delete_user_account')
            if (deleteError) throw deleteError

            await supabase.auth.signOut()
            toast.success("Account permanently removed")
            router.push('/')
            router.refresh()
        } catch (error: any) {
            toast.error(error.message || "Failed to delete account")
            setShowDeleteConfirm(false)
        } finally {
            setDeleteLoading(false)
        }
    }

    const legalLinks = [
        { label: "Terms of Use", href: "/legal/terms_and_conditions", icon: FileText, detail: "Usage & agreements" },
        { label: "Privacy Policy", href: "/legal/privacy_policy", icon: ShieldCheck, detail: "Your data security" },
        { label: "Return Policy", href: "/legal/return_policy", icon: Truck, detail: "Shipping & refunds" },
        { label: "Contact Us", href: "/contact", icon: Mail, detail: "Get in touch with us" },
    ]

    return (
        <div className="min-h-screen bg-[#FDFDFD] pb-20 antialiased">
            <AnimatePresence mode="wait">
                {loading && (
                    <motion.div
                        key="loader"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center"
                    >
                        <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-[#fc2779] mb-2">The Makeup Store</h2>
                        <motion.div
                            animate={{ width: ["0%", "40%", "0%"] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="h-[1px] bg-[#fc2779]"
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* HEADER */}
            <header className="px-6 pt-12 pb-6 border-b border-pink-50 sticky top-0 bg-white/80 backdrop-blur-xl z-20">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-900 active:scale-90 transition-all">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#fc2779]">Preferences</p>
                        <h1 className="text-xl font-black uppercase tracking-tight text-slate-950 leading-none">Settings</h1>
                    </div>
                </div>
            </header>

            <main className="px-6 py-8 max-w-2xl mx-auto space-y-10">
                <Breadcrumbs
                    items={[
                        { label: 'Profile', href: '/profile' },
                        { label: 'Account Settings', href: '/profile/settings' }
                    ]}
                />

                {/* SECTION: IDENTITY */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <Zap className="w-3 h-3 text-[#fc2779]" />
                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Identity & Access</h2>
                    </div>
                    <Link href="/profile/settings/edit" className="group flex items-center justify-between p-6 bg-white rounded-[2.5rem] border border-pink-50 shadow-sm hover:border-[#fc2779]/30 transition-all active:scale-[0.98]">
                        <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-2xl bg-pink-50 flex items-center justify-center text-[#fc2779]">
                                <User className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-sm font-black uppercase tracking-tight text-slate-900">Personal Profile</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Edit name, email & avatar</p>
                            </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-200 group-hover:text-[#fc2779] transition-all" />
                    </Link>
                </section>

                {/* SECTION: SUPPORT & LEGAL */}
                <section>
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 ml-1">Support & Legal</h2>
                    <div className="bg-white rounded-[2.5rem] border border-pink-50 overflow-hidden shadow-sm">
                        {legalLinks.map((item, idx) => (
                            <Link
                                key={item.label}
                                href={item.href}
                                className={`group flex items-center justify-between p-5 hover:bg-pink-50/30 transition-all ${idx !== legalLinks.length - 1 ? 'border-b border-pink-50' : ''}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-[#fc2779] group-hover:bg-white transition-all shadow-sm">
                                        <item.icon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black uppercase tracking-tight text-slate-800">{item.label}</p>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{item.detail}</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-200 group-hover:translate-x-1 transition-all" />
                            </Link>
                        ))}
                    </div>
                </section>

                {/* SECTION: DANGER ZONE */}
                <section className="pt-4">
                    <div className="bg-rose-50/30 border border-rose-100 rounded-[2.5rem] p-8 space-y-4">
                        <div className="flex items-center gap-2 text-rose-500">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Danger Zone</span>
                        </div>

                        <div className="space-y-1">
                            <h3 className="text-lg font-serif italic font-bold text-slate-900">Delete Account</h3>
                            <p className="text-[11px] text-slate-500 font-medium">Permanently remove your boutique profile and history.</p>
                        </div>

                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="text-[10px] font-black uppercase tracking-widest text-rose-400 border-b border-rose-200 pb-0.5 hover:text-rose-600 transition-colors"
                        >
                            Request Data Removal
                        </button>
                    </div>
                </section>

                <footer className="pt-10 text-center">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.5em]">
                        The Makeup Store • Version 1.0.4 (TWA)
                    </p>
                </footer>
            </main>

            {/* DELETE CONFIRMATION DRAWER */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !deleteLoading && setShowDeleteConfirm(false)}
                            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="fixed bottom-0 left-0 right-0 bg-white z-[70] rounded-t-[3rem] p-10 shadow-2xl max-w-lg mx-auto"
                        >
                            <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8" />
                            <div className="text-center space-y-4 mb-10">
                                <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto">
                                    <Trash2 className="w-6 h-6 text-rose-500" />
                                </div>
                                <h3 className="text-3xl font-serif italic text-slate-900">Are you sure?</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-relaxed">
                                    All your orders, wishlists, and preferences will be <br />
                                    <span className="text-rose-500">permanently deleted</span>. This cannot be undone.
                                </p>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleDeleteAccount}
                                    disabled={deleteLoading}
                                    className="w-full py-5 rounded-2xl bg-rose-600 text-white text-[11px] font-black uppercase tracking-widest shadow-xl shadow-rose-200 active:scale-95 transition-all flex items-center justify-center"
                                >
                                    {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Yes, Delete Permanently"}
                                </button>
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    disabled={deleteLoading}
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