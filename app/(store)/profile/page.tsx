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
    Sparkles, Package, Info,
    MessageCircle, FileText, RotateCcw
} from "lucide-react"
import { SignatureLoader } from "@/components/store/signature-loader"

export default function ProfilePage() {
    const [profile, setProfile] = useState<any>(null)
    const [ordersCount, setOrdersCount] = useState(0)
    const [wishlistCount, setWishlistCount] = useState(0)
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

            const [profileRes, ordersRes, wishlistRes] = await Promise.all([
                supabase.from("profiles").select("*").eq("id", user.id).single(),
                supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", user.id),
                supabase.from("wishlist").select("id", { count: "exact", head: true }).eq("user_id", user.id),
            ])

            setProfile(profileRes.data)
            setOrdersCount(ordersRes.count ?? 0)
            setWishlistCount(wishlistRes.count ?? 0)
            setTimeout(() => setLoading(false), 600)
        }
        loadProfile()
    }, [supabase, router])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push("/login")
        router.refresh()
    }

    const initial = (profile?.full_name || 'M')[0].toUpperCase()
    const memberSince = profile?.created_at
        ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : null

    const menuSections = [
        {
            title: "Account",
            items: [
                { label: "Orders", href: "/profile/orders", icon: Package },
                { label: "Saved Addresses", href: "/profile/addresses", icon: MapPin },
                { label: "Notifications", href: "/profile/notifications", icon: Bell },
                { label: "Settings", href: "/profile/settings", icon: Settings },
            ],
        },
        {
            title: "Support",
            items: [
                { label: "Contact Us", href: "/contact", icon: MessageCircle },
                { label: "About Us", href: "/about-us", icon: Info },
            ],
        },
        {
            title: "Legal",
            items: [
                { label: "Return Policy", href: "/legal/return_policy", icon: RotateCcw },
                { label: "Terms & Conditions", href: "/legal/terms_and_conditions", icon: FileText },
                { label: "Privacy Policy", href: "/legal/privacy_policy", icon: ShieldCheck },
            ],
        },
    ]

    return (
        <div className="min-h-screen bg-[#F8F8F8] pb-24 antialiased selection:bg-pink-100">
            <SignatureLoader loading={loading} />

            {!loading && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    {/* GRADIENT COVER + AVATAR */}
                    <div className="relative bg-gradient-to-b from-[#fc2779]/10 to-transparent pt-14 pb-8 px-6">
                        <div className="max-w-lg mx-auto flex flex-col items-center gap-2">
                            <div className="w-20 h-20 rounded-full border-2 border-[#fc2779]/20 flex items-center justify-center">
                                <div className="w-16 h-16 rounded-full bg-[#fc2779] flex items-center justify-center">
                                    <span className="text-3xl font-black text-white">{initial}</span>
                                </div>
                            </div>
                            <h1 className="text-2xl font-black tracking-tight text-slate-900 text-center">
                                {profile?.full_name || 'Customer'}
                            </h1>
                            <p className="text-sm text-slate-400">{profile?.email || ''}</p>
                            {memberSince && (
                                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                                    Member since {memberSince}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* STATS ROW */}
                    <div className="max-w-lg mx-auto px-6 mb-8">
                        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm flex items-center py-5">
                            <div className="flex-1 flex flex-col items-center gap-1">
                                <Package className="w-4 h-4 text-[#fc2779]" />
                                <span className="text-lg font-black text-slate-900">{ordersCount}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Orders</span>
                            </div>
                            <div className="w-px h-8 bg-slate-100" />
                            <div className="flex-1 flex flex-col items-center gap-1">
                                <Heart className="w-4 h-4 text-[#fc2779]" />
                                <span className="text-lg font-black text-slate-900">{wishlistCount}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Wishlist</span>
                            </div>
                            <div className="w-px h-8 bg-slate-100" />
                            <div className="flex-1 flex flex-col items-center gap-1">
                                <Sparkles className="w-4 h-4 text-[#fc2779]" />
                                <span className="text-lg font-black text-slate-900">{memberSince ? new Date().getFullYear() - new Date(profile?.created_at).getFullYear() + 'yr' : '—'}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Member</span>
                            </div>
                        </div>

                        {profile?.is_admin && (
                            <Link
                                href="/admin"
                                className="mt-3 flex items-center justify-center gap-2 py-3 bg-slate-950 rounded-2xl hover:bg-slate-800 transition-colors"
                            >
                                <ShieldCheck className="w-3 h-3 text-white" />
                                <span className="text-[9px] font-black text-white uppercase tracking-widest">Admin Dashboard</span>
                            </Link>
                        )}
                    </div>

                    {/* MENU SECTIONS */}
                    <div className="max-w-lg mx-auto px-6 space-y-8">
                        {menuSections.map((section) => (
                            <div key={section.title}>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">
                                    {section.title}
                                </p>
                                <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
                                    {section.items.map((item, idx) => (
                                        <Link
                                            key={item.label}
                                            href={item.href}
                                            className={`flex items-center justify-between px-5 py-4 group active:bg-slate-50 transition-colors ${
                                                idx !== section.items.length - 1 ? 'border-b border-slate-50' : ''
                                            }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-pink-50 group-hover:text-[#fc2779] transition-all">
                                                    <item.icon className="w-4 h-4 stroke-[1.5] text-slate-400 group-hover:text-[#fc2779] transition-colors" />
                                                </div>
                                                <span className="text-sm font-medium text-slate-800 group-hover:text-slate-900 transition-colors">
                                                    {item.label}
                                                </span>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#fc2779] group-hover:translate-x-0.5 transition-all" />
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {/* SIGN OUT */}
                        <div className="pt-2">
                            <button
                                onClick={() => setShowConfirm(true)}
                                className="w-full py-4 rounded-[2rem] bg-slate-900 text-white font-black uppercase text-[11px] tracking-[0.3em] flex items-center justify-center gap-3 active:scale-[0.98] transition-all hover:bg-slate-800 shadow-lg shadow-slate-200"
                            >
                                <LogOut className="w-4 h-4 text-red-400" />
                                <span>Sign Out</span>
                            </button>

                            <Link
                                href="/profile/settings"
                                className="block w-full text-center mt-4 py-3 text-[11px] font-semibold text-slate-400 hover:text-red-400 transition-colors tracking-wider"
                            >
                                Delete Account
                            </Link>
                        </div>

                        {/* FOOTER */}
                        <div className="pb-10 pt-4 flex flex-col items-center gap-2">
                            <div className="w-8 h-px bg-slate-200" />
                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">
                                The Makeup Store Wangkhei
                            </p>
                            <p className="text-[8px] font-bold text-slate-200 uppercase tracking-[0.3em]">
                                v1.0 · Luxe Web
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* SIGN OUT CONFIRMATION */}
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
                                <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto">
                                    <LogOut className="w-6 h-6 text-red-400" />
                                </div>
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
