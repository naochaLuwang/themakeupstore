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
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { AnimatePresence, motion } from "framer-motion"

export default function SettingsPage() {
    const router = useRouter()
    const supabase = createClient()
    const [profile, setProfile] = React.useState<any>(null)
    const [loading, setLoading] = React.useState(true)

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



    const legalLinks = [
        { label: "Terms of Use", href: "/legal/terms_and_conditions", icon: FileText, detail: "Usage & agreements" },
        { label: "Privacy Policy", href: "/legal/privacy_policy", icon: ShieldCheck, detail: "Your data security" },
        { label: "Return Policy", href: "/legal/return_policy", icon: Truck, detail: "Shipping & refunds" },
        { label: "Contact Us", href: "/contact", icon: Mail, detail: "Get in touch with us" },
    ]

    return (
        <div className="min-h-screen bg-white pb-10">

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

            {/* HEADER */}
            <header className="px-6 pt-12 pb-6 border-b border-zinc-50 sticky top-0 bg-white/80 backdrop-blur-md z-20">
                <div className="flex items-center gap-2">
                    <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-zinc-50 transition-colors">
                        <ChevronLeft className="w-5 h-5 text-zinc-900" />
                    </button>
                    <h1 className="text-xl font-black uppercase tracking-tight text-zinc-900 leading-none">Settings</h1>
                </div>
            </header>

            <main className="px-6 py-8 max-w-2xl mx-auto space-y-12">

                {/* SECTION: PERSONAL INFO */}
                <section>
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-4">Identity</h2>
                    <Link href="/profile/settings/edit" className="group flex items-center justify-between p-6 bg-zinc-50 rounded-[2rem] hover:bg-zinc-100 transition-all border border-transparent hover:border-zinc-200">
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

                {/* SECTION: LEGAL & SUPPORT */}
                <section>
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-4">Support & Legal</h2>
                    <div className="grid grid-cols-1 gap-3">
                        {legalLinks.map((item) => (
                            <Link
                                key={item.label}
                                href={item.href}
                                className="group flex items-center justify-between p-5 border border-zinc-100 rounded-[1.5rem] hover:border-zinc-900 transition-all"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                                        <item.icon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black uppercase tracking-tight text-zinc-900">{item.label}</p>
                                        <p className="text-[9px] text-zinc-400 font-medium uppercase tracking-widest mt-0.5">{item.detail}</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-zinc-300 group-hover:translate-x-1 transition-all" />
                            </Link>
                        ))}
                    </div>
                </section>

                {/* VERSION FOOTER */}
                <footer className="pt-10 text-center">
                    <p className="text-[9px] font-bold text-zinc-300 uppercase tracking-[0.3em]">
                        The Makeup Store • Version 1.0.4 (TWA)
                    </p>
                </footer>
            </main>
        </div>
    )
}