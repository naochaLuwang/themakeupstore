"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
    ShoppingBag, Heart, MapPin, Settings,
    LogOut, ShieldCheck, Bell,
    Package, ChevronRight, User,
    MessageCircle, Info, FileText, RotateCcw
} from "lucide-react"
import { SignatureLoader } from "@/components/store/signature-loader"

export default function ProfilePage() {
    const [profile, setProfile] = useState<any>(null)
    const [user, setUser] = useState<any>(null)
    const [ordersCount, setOrdersCount] = useState(0)
    const [wishlistCount, setWishlistCount] = useState(0)
    const [addressesCount, setAddressesCount] = useState(0)
    const [totalSpent, setTotalSpent] = useState(0)
    const [recentOrders, setRecentOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showConfirm, setShowConfirm] = useState(false)
    const [recentThumbMap, setRecentThumbMap] = useState<Record<string, string>>({})

    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        async function loadProfile() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push("/login"); return }

            const [
                profileRes,
                ordersCountRes,
                wishlistRes,
                addressesRes,
                totalSpentRes,
                recentOrdersRes,
            ] = await Promise.all([
                supabase.from("profiles").select("*").eq("id", user.id).single(),
                supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", user.id),
                supabase.from("wishlist").select("id", { count: "exact", head: true }).eq("user_id", user.id),
                supabase.from("user_addresses").select("id", { count: "exact", head: true }).eq("user_id", user.id),
                supabase.from("orders").select("total").eq("user_id", user.id).neq("status", "cancelled"),
                supabase.from("orders").select(`
                    id, created_at, status, total, payment_status, delivered_at,
                    order_items (id, product_id, product_name, quantity, unit_price)
                `).eq("user_id", user.id).order("created_at", { ascending: false }).limit(3),
            ])

            setProfile(profileRes.data)
            setUser(user)
            setOrdersCount(ordersCountRes.count ?? 0)
            setWishlistCount(wishlistRes.count ?? 0)
            setAddressesCount(addressesRes.count ?? 0)

            const spent = totalSpentRes.data?.reduce((sum: number, o: any) => sum + Number(o.total), 0) ?? 0
            setTotalSpent(spent)

            const orders = recentOrdersRes.data || []
            setRecentOrders(orders)

            const productIds = orders
                .flatMap((o: any) => o.order_items || [])
                .map((i: any) => i.product_id)
                .filter(Boolean)
            const uniqueIds = [...new Set(productIds)]
            if (uniqueIds.length > 0) {
                const { data: products } = await supabase
                    .from("products")
                    .select("id, thumbnail_url")
                    .in("id", uniqueIds)
                if (products) {
                    const map: Record<string, string> = {}
                    for (const p of products) map[p.id] = p.thumbnail_url
                    setRecentThumbMap(map)
                }
            }

            setTimeout(() => setLoading(false), 600)
        }
        loadProfile()
    }, [supabase, router])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push("/login")
        router.refresh()
    }

    const initial = (profile?.full_name || user?.email?.[0] || "M")[0].toUpperCase()
    const memberSince = profile?.created_at
        ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
        : null

    const formatPrice = (amount: number) =>
        new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount)

    const statusCfg: Record<string, { label: string; color: string; bg: string }> = {
        pending: { label: "Pending", color: "text-amber-600", bg: "bg-amber-50" },
        processing: { label: "Processing", color: "text-blue-600", bg: "bg-blue-50" },
        shipped: { label: "Shipped", color: "text-purple-600", bg: "bg-purple-50" },
        delivered: { label: "Delivered", color: "text-emerald-600", bg: "bg-emerald-50" },
        cancelled: { label: "Cancelled", color: "text-red-600", bg: "bg-red-50" },
    }

    function ProfileCard() {
        return (
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#fc2779] flex items-center justify-center ring-2 ring-[#fc2779]/20 flex-shrink-0">
                    <span className="font-daciana text-lg text-white leading-none mt-0.5">{initial}</span>
                </div>
                <div className="min-w-0">
                    <h1 className="text-base font-black tracking-tight text-slate-900 truncate">
                        {profile?.full_name || "Customer"}
                    </h1>
                    <p className="text-[11px] text-slate-400 truncate">{user?.email || ""}</p>
                </div>
                <Link
                    href="/profile/settings/edit"
                    className="ml-auto w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center flex-shrink-0 active:bg-slate-50 transition-colors"
                >
                    <User className="w-3.5 h-3.5 text-slate-400" />
                </Link>
            </div>
        )
    }

    function SummaryRow() {
        return (
            <div className="rounded-xl border border-slate-100 bg-white shadow-sm">
                <div className="flex divide-x divide-slate-100">
                    <Link href="/profile/orders" className="flex-1 flex flex-col items-center py-3 gap-0.5 active:bg-slate-50 transition-colors">
                        <p className="text-lg font-black tracking-tight text-slate-900">{ordersCount}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Orders</p>
                    </Link>
                    <Link href="/profile/wishlist" className="flex-1 flex flex-col items-center py-3 gap-0.5 active:bg-slate-50 transition-colors">
                        <p className="text-lg font-black tracking-tight text-slate-900">{wishlistCount}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Wishlist</p>
                    </Link>
                    <div className="flex-1 flex flex-col items-center py-3 gap-0.5">
                        <p className="text-lg font-black tracking-tight text-slate-900">{formatPrice(totalSpent)}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Spent</p>
                    </div>
                </div>
                {memberSince && (
                    <div className="border-t border-slate-50 py-2 text-center">
                        <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Member since {memberSince}</p>
                    </div>
                )}
            </div>
        )
    }

    function RecentOrdersCard() {
        return (
            <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50">
                    <div className="flex items-center gap-2">
                        <Package className="w-3.5 h-3.5 text-slate-400" />
                        <h2 className="text-xs font-black tracking-tight text-slate-800">Recent Orders</h2>
                    </div>
                    <Link href="/profile/orders" className="flex items-center gap-0.5 text-[9px] font-black text-[#fc2779] uppercase tracking-widest">
                        View All
                        <ChevronRight className="w-3 h-3" />
                    </Link>
                </div>
                {recentOrders.length > 0 ? (
                    <div className="divide-y divide-slate-50">
                        {recentOrders.map((order: any) => {
                            const cfg = statusCfg[order.status] || statusCfg.pending
                            const date = new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                            const firstItem = order.order_items?.[0]
                            const thumbUrl = firstItem?.product_id ? recentThumbMap[firstItem.product_id] : null
                            return (
                                <Link key={order.id} href={`/profile/orders/${order.id}`}
                                    className="flex items-center gap-2.5 px-4 py-2.5 active:bg-slate-50 transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex-shrink-0 overflow-hidden">
                                        {thumbUrl ? (
                                            <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Package className="w-3.5 h-3.5 text-slate-300" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-slate-800 truncate leading-tight">
                                            {order.order_items?.map((i: any) => i.product_name).join(", ") || "Order"}
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className="text-[10px] text-slate-400">{date}</span>
                                            <span className="text-[9px] text-slate-200">·</span>
                                            <span className="text-[10px] font-semibold text-slate-500">₹{Number(order.total).toLocaleString("en-IN")}</span>
                                        </div>
                                    </div>
                                    <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${cfg.bg} ${cfg.color}`}>
                                        {cfg.label}
                                    </span>
                                </Link>
                            )
                        })}
                    </div>
                ) : (
                    <div className="px-4 py-6 text-center">
                        <Package className="w-6 h-6 text-slate-200 mx-auto mb-1.5" />
                        <p className="text-xs font-medium text-slate-400">No orders yet</p>
                        <Link href="/products" className="text-[9px] font-black text-[#fc2779] uppercase tracking-widest mt-1.5 inline-block">
                            Start Shopping
                        </Link>
                    </div>
                )}
            </div>
        )
    }

    function PreviewCard({ icon: Icon, label, description, href, count }: {
        icon: any; label: string; description: string; href: string; count?: number
    }) {
        return (
            <Link href={href}
                className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm active:scale-[0.99] transition-transform"
            >
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800">{label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{description}</p>
                </div>
                {count !== undefined && (
                    <span className="text-xs font-black text-[#fc2779]">{count}</span>
                )}
                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            </Link>
        )
    }

    function SettingsLink({ icon: Icon, label, href }: { icon: any; label: string; href: string }) {
        return (
            <Link href={href}
                className="flex items-center justify-between px-4 py-3 active:bg-slate-50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            </Link>
        )
    }

    return (
        <div className="min-h-screen bg-[#F8F8F8] antialiased selection:bg-pink-100">
            <SignatureLoader loading={loading} />

            {!loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="max-w-lg mx-auto px-4 pt-12 pb-24">
                        <div className="space-y-4">
                            {/* Profile Card */}
                            <ProfileCard />

                            {/* Summary Row */}
                            <SummaryRow />

                            {/* Recent Orders */}
                            <RecentOrdersCard />

                            {/* Wishlist Preview */}
                            <PreviewCard
                                icon={Heart}
                                label="Wishlist"
                                description="Items you have saved"
                                href="/profile/wishlist"
                                count={wishlistCount}
                            />

                            {/* Addresses Preview */}
                            <PreviewCard
                                icon={MapPin}
                                label="Saved Addresses"
                                description="Manage your delivery addresses"
                                href="/profile/addresses"
                                count={addressesCount}
                            />

                            {/* Settings & Support */}
                            <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                                <div className="px-4 py-3 border-b border-slate-50">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Settings & Support</p>
                                </div>
                                <div className="divide-y divide-slate-50">
                                    <SettingsLink icon={Bell} label="Notifications" href="/profile/notifications" />
                                    <SettingsLink icon={Settings} label="Account Settings" href="/profile/settings" />
                                    <SettingsLink icon={MessageCircle} label="Contact Us" href="/contact" />
                                    <SettingsLink icon={Info} label="About Us" href="/about-us" />
                                    <SettingsLink icon={RotateCcw} label="Return Policy" href="/legal/return_policy" />
                                    <SettingsLink icon={FileText} label="Privacy Policy" href="/legal/privacy_policy" />
                                </div>
                            </div>

                            {/* Admin + Sign Out */}
                            <div className="pt-2 space-y-2">
                                {profile?.is_admin && (
                                    <Link href="/admin"
                                        className="flex items-center justify-center gap-2 py-3 bg-slate-950 rounded-xl active:scale-[0.98] transition-transform"
                                    >
                                        <ShieldCheck className="w-3 h-3 text-white" />
                                        <span className="text-[8px] font-black text-white uppercase tracking-widest">Admin Dashboard</span>
                                    </Link>
                                )}
                                <button onClick={() => setShowConfirm(true)}
                                    className="w-full py-3 rounded-xl border border-slate-200 text-slate-400 font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
                                >
                                    <LogOut className="w-3 h-3" />
                                    Sign Out
                                </button>
                            </div>

                            {/* Footer */}
                            <div className="flex flex-col items-center gap-1.5 pt-4 pb-4">
                                <div className="w-6 h-px bg-slate-200" />
                                <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em]">The Makeup Store Wangkhei</p>
                            </div>
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
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">We will keep your wishlist safe.</p>
                            </div>
                            <div className="flex flex-col gap-3">
                                <button onClick={handleSignOut}
                                    className="w-full py-5 rounded-3xl bg-[#fc2779] text-white text-[11px] font-black uppercase tracking-widest shadow-xl shadow-pink-200 active:scale-95 transition-all"
                                >
                                    Confirm Logout
                                </button>
                                <button onClick={() => setShowConfirm(false)}
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
