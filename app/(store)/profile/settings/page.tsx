"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
    ChevronLeft,
    User,
    FileText,
    Trash2,
    ChevronRight,
    ArrowRight
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"

export default function SettingsPage() {
    const router = useRouter()
    const supabase = createClient()
    const [profile, setProfile] = React.useState<any>(null)
    const [loading, setLoading] = React.useState(true)
    const [isDeleting, setIsDeleting] = React.useState(false)

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
        // In a real Supabase production app, account deletion usually requires 
        // a specialized Edge Function because client SDKs cannot delete users from auth.users easily.
        toast.error("Please contact support to permanently delete your account.")
        setIsDeleting(false)
    }

    if (loading) return <div className="min-h-screen bg-white flex items-center justify-center text-[10px] font-black uppercase tracking-[0.3em] text-zinc-300">Loading Settings...</div>

    return (
        <div className="min-h-auto bg-white pb-5">
            {/* HEADER */}
            <header className="px-6 pt-8 pb-6 border-b border-zinc-50 sticky top-0 bg-white/80 backdrop-blur-md z-20">
                <div className="flex items-center gap-2">
                    <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-zinc-50 transition-colors">
                        <ChevronLeft className="w-5 h-5 text-zinc-900" />
                    </button>
                    <h1 className="text-xl font-black uppercase tracking-tight text-zinc-900">Profile Settings</h1>
                </div>
            </header>

            <main className="px-6 py-4 max-w-2xl mx-auto">
                <div className="space-y-12">

                    {/* SECTION: PERSONAL INFO */}
                    <section>
                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-0">Identity</h2>
                        <Link href="/profile/settings/edit" className="group flex items-center justify-between p-6 bg-zinc-50 rounded-3xl hover:bg-zinc-100 transition-all">
                            <div className="flex items-center gap-5">
                                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center border border-zinc-100 shadow-sm">
                                    <User className="w-5 h-5 text-zinc-900" />
                                </div>
                                <div>
                                    <p className="text-sm font-black uppercase tracking-tight text-zinc-900">My Profile</p>
                                    <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-widest mt-1">Manage personal information</p>
                                </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-900 transition-all" />
                        </Link>
                    </section>

                    {/* SECTION: LEGAL */}
                    <section>
                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-6">Legal & Policy</h2>
                        <Link href="/terms" className="group flex items-center justify-between p-6 border border-zinc-100 rounded-3xl hover:border-zinc-900 transition-all">
                            <div className="flex items-center gap-5">
                                <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-zinc-900" />
                                </div>
                                <div>
                                    <p className="text-sm font-black uppercase tracking-tight text-zinc-900">Terms and Conditions</p>
                                    <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-widest mt-1">Privacy and usage policies</p>
                                </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-900 transition-all" />
                        </Link>
                    </section>

                    {/* SECTION: DANGER ZONE */}
                    <section className="pt-2 border-t border-zinc-100">
                        <div className="p-8 rounded-[2.5rem] bg-red-50/50 border border-red-100/50">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="p-3 bg-red-100 rounded-2xl">
                                    <Trash2 className="w-5 h-5 text-red-600" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-tight text-red-900">Delete Account</h3>
                                    <p className="text-[11px] text-red-700/60 font-medium leading-relaxed mt-2 uppercase tracking-wider">
                                        Your account will no longer be accessible on any device. This action is permanent and cannot be reversed.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsDeleting(true)}
                                className="w-full py-4 bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                            >
                                Initiate Deletion
                            </button>
                        </div>
                    </section>
                </div>
            </main>

            {/* DELETE CONFIRMATION MODAL */}
            <AnimatePresence>
                {isDeleting && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-zinc-900/60 backdrop-blur-md z-[100]"
                            onClick={() => setIsDeleting(false)}
                        />
                        <motion.div
                            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[3rem] p-10 z-[101] shadow-2xl max-w-xl mx-auto"
                        >
                            <div className="text-center space-y-4 mb-10">
                                <h4 className="text-2xl font-serif italic tracking-tighter uppercase">Are you sure?</h4>
                                <p className="text-xs text-zinc-500 font-medium leading-relaxed max-w-xs mx-auto">
                                    ALL YOUR ORDERS, WISHLISTS, AND ADDRESSES WILL BE PERMANENTLY ERASED FROM OUR SERVERS.
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => setIsDeleting(false)} className="py-5 rounded-2xl bg-zinc-100 text-[10px] font-black uppercase tracking-widest text-zinc-900">Cancel</button>
                                <button onClick={handleDeleteAccount} className="py-5 rounded-2xl bg-red-600 text-[10px] font-black uppercase tracking-widest text-white">Delete Forever</button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}