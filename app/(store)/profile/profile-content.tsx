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
    MessageCircle, Info, FileText, RotateCcw,
    Gift, Clock, History, Award, Coins, Star, TrendingUp, Tag
} from "lucide-react"

function PinkSkeleton({ className }: { className?: string }) {
    return (
        <div
            className={`animate-pulse rounded-lg ${className || ""}`}
            style={{ backgroundColor: "#fce4ec" }}
        />
    )
}

function PinkLoader() {
    return (
        <div className="min-h-screen" style={{ backgroundColor: "#FDFBF7" }}>
            <div className="max-w-lg mx-auto px-4 pt-12 pb-24 space-y-4">
                <div className="flex items-center gap-3">
                    <PinkSkeleton className="w-10 h-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <PinkSkeleton className="h-4 w-32" />
                        <PinkSkeleton className="h-3 w-48" />
                    </div>
                </div>
                <PinkSkeleton className="h-24 w-full rounded-xl" />
                <PinkSkeleton className="h-44 w-full rounded-xl" />
                <div className="grid grid-cols-2 gap-4">
                    <PinkSkeleton className="h-16 w-full rounded-xl" />
                    <PinkSkeleton className="h-16 w-full rounded-xl" />
                </div>
                <PinkSkeleton className="h-56 w-full rounded-xl" />
            </div>
        </div>
    )
}

function formatPrice(amount: number) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount)
}

const statusCfg: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: "Pending", color: "text-amber-600", bg: "bg-amber-50" },
    confirmed: { label: "Confirmed", color: "text-blue-600", bg: "bg-blue-50" },
    processing: { label: "Processing", color: "text-blue-600", bg: "bg-blue-50" },
    shipped: { label: "Shipped", color: "text-purple-600", bg: "bg-purple-50" },
    out_for_delivery: { label: "Out for Delivery", color: "text-purple-600", bg: "bg-purple-50" },
    failed_delivery: { label: "Failed Delivery", color: "text-red-600", bg: "bg-red-50" },
    ready_for_pickup: { label: "Ready for Pickup", color: "text-teal-600", bg: "bg-teal-50" },
    no_show: { label: "No Show", color: "text-orange-600", bg: "bg-orange-50" },
    delivered: { label: "Delivered", color: "text-emerald-600", bg: "bg-emerald-50" },
    picked_up: { label: "Picked Up", color: "text-green-600", bg: "bg-green-50" },
    cancelled: { label: "Cancelled", color: "text-red-600", bg: "bg-red-50" },
}

export function ProfileContent({
    profile, user, ordersCount, wishlistCount, addressesCount, totalSpent, recentOrders, thumbMap, giftCards, loyaltyData, coupons,
}: {
    profile: any
    user: { email: string; id: string }
    ordersCount: number
    wishlistCount: number
    addressesCount: number
    totalSpent: number
    recentOrders: any[]
    thumbMap: Record<string, string>
    giftCards: any[]
    loyaltyData: any
    coupons: any[]
}) {
    const [showConfirm, setShowConfirm] = useState(false)
    const [ready, setReady] = useState(false)
    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        const t = setTimeout(() => setReady(true), 300)
        return () => clearTimeout(t)
    }, [])

    if (!user?.id) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8F8F8]">
                <div className="text-center space-y-4">
                    <User className="w-12 h-12 text-slate-300 mx-auto" />
                    <p className="text-sm font-semibold text-slate-500">Please sign in to view your profile</p>
                    <button onClick={() => router.push("/login")} className="px-6 py-3 bg-[#fc2779] text-white text-sm font-bold rounded-xl">
                        Sign In
                    </button>
                </div>
            </div>
        )
    }

    if (!ready) return <PinkLoader />

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push("/login")
        router.refresh()
    }

    const initial = (profile?.full_name || user?.email?.[0] || "M")[0].toUpperCase()
    const memberSince = profile?.created_at
        ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
        : null

    return (
        <div className="min-h-screen bg-[#F8F8F8] antialiased selection:bg-pink-100">

            {/* ===== DESKTOP LAYOUT (lg+) ===== */}
            <div className="hidden lg:block">
                <div className="max-w-[1600px] mx-auto px-16 pt-12 pb-20">
                    {/* Page header */}
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-slate-900">My Account</h1>
                            <p className="text-sm text-slate-500 mt-1.5">
                                Welcome back, {profile?.full_name?.split(" ")[0] || "friend"} — manage your orders, rewards and settings.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            {profile?.is_admin && (
                                <Link href="/admin"
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950 text-white text-xs font-black uppercase tracking-widest hover:opacity-90 transition-opacity"
                                >
                                    <ShieldCheck className="w-4 h-4" /> Admin
                                </Link>
                            )}
                            <button onClick={() => setShowConfirm(true)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-xs font-black uppercase tracking-widest hover:border-rose-300 hover:text-rose-500 transition-colors"
                            >
                                <LogOut className="w-4 h-4" /> Sign Out
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-[280px_1fr] gap-10 items-start">
                        {/* Sidebar */}
                        <aside className="space-y-6 sticky top-28">
                            {/* Profile card */}
                            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-[#fc2779] flex items-center justify-center ring-4 ring-[#fc2779]/10 flex-shrink-0">
                                        <span className="font-daciana text-3xl text-white leading-none mt-1">{initial}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-lg font-black tracking-tight text-slate-900 truncate">{profile?.full_name || "Customer"}</p>
                                        <p className="text-sm text-slate-400 truncate">{user?.email}</p>
                                        {memberSince && (
                                            <p className="text-xs text-slate-400 mt-1">Since {memberSince}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-6 pt-6 border-t border-slate-100">
                                    <Link href="/profile/settings/edit"
                                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:border-[#fc2779] hover:text-[#fc2779] transition-colors"
                                    >
                                        <User className="w-4 h-4" /> Edit Profile
                                    </Link>
                                </div>
                            </div>

                            {/* Nav */}
                            <nav className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm space-y-1">
                                <Link href="/profile/orders" className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                                    <Package className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm font-semibold text-slate-700">My Orders</span>
                                    {ordersCount > 0 && <span className="ml-auto text-[10px] font-black text-slate-400">{ordersCount}</span>}
                                </Link>
                                <Link href="/profile/wishlist" className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                                    <Heart className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm font-semibold text-slate-700">Wishlist</span>
                                    {wishlistCount > 0 && <span className="ml-auto text-[10px] font-black text-slate-400">{wishlistCount}</span>}
                                </Link>
                                <Link href="/profile/addresses" className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                                    <MapPin className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm font-semibold text-slate-700">Addresses</span>
                                    {addressesCount > 0 && <span className="ml-auto text-[10px] font-black text-slate-400">{addressesCount}</span>}
                                </Link>
                                <Link href="/rewards" className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                                    <Award className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm font-semibold text-slate-700">M Beauty Rewards</span>
                                </Link>
                                <Link href="/gift-cards" className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                                    <Gift className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm font-semibold text-slate-700">Gift Cards</span>
                                </Link>
                                <div className="my-2 border-t border-slate-100" />
                                <Link href="/profile/notifications" className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                                    <Bell className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm font-semibold text-slate-700">Notifications</span>
                                </Link>
                                <Link href="/profile/settings" className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                                    <Settings className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm font-semibold text-slate-700">Account Settings</span>
                                </Link>
                                <Link href="/contact" className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                                    <MessageCircle className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm font-semibold text-slate-700">Contact Us</span>
                                </Link>
                                <div className="my-2 border-t border-slate-100" />
                                <Link href="/legal/return_policy" className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                                    <RotateCcw className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm font-semibold text-slate-700">Return Policy</span>
                                </Link>
                                <Link href="/legal/privacy_policy" className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                                    <FileText className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm font-semibold text-slate-700">Privacy Policy</span>
                                </Link>
                            </nav>
                        </aside>

                        {/* Main content */}
                        <main className="space-y-8 min-w-0">
                            {/* Stats */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                <Link href="/profile/orders" className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:border-[#fc2779]/30 transition-colors">
                                    <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center mb-3">
                                        <Package className="w-5 h-5 text-[#fc2779]" />
                                    </div>
                                    <p className="text-2xl font-black tracking-tight text-slate-900">{ordersCount}</p>
                                    <p className="text-xs font-semibold text-slate-400 mt-0.5">Total Orders</p>
                                </Link>
                                <Link href="/profile/wishlist" className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:border-[#fc2779]/30 transition-colors">
                                    <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center mb-3">
                                        <Heart className="w-5 h-5 text-[#fc2779]" />
                                    </div>
                                    <p className="text-2xl font-black tracking-tight text-slate-900">{wishlistCount}</p>
                                    <p className="text-xs font-semibold text-slate-400 mt-0.5">Wishlist Items</p>
                                </Link>
                                <Link href="/rewards" className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:border-[#fc2779]/30 transition-colors">
                                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-3">
                                        <Award className="w-5 h-5 text-amber-500" />
                                    </div>
                                    <p className="text-2xl font-black tracking-tight text-slate-900">{loyaltyData?.points?.balance ?? 0}</p>
                                    <p className="text-xs font-semibold text-slate-400 mt-0.5">Reward Coins</p>
                                </Link>
                                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
                                        <TrendingUp className="w-5 h-5 text-emerald-500" />
                                    </div>
                                    <p className="text-2xl font-black tracking-tight text-slate-900">₹{Number(totalSpent || 0).toLocaleString("en-IN")}</p>
                                    <p className="text-xs font-semibold text-slate-400 mt-0.5">Total Spent</p>
                                </div>
                            </div>

                            {/* Recent Orders */}
                            <section className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                                    <div className="flex items-center gap-2.5">
                                        <Package className="w-4 h-4 text-slate-400" />
                                        <h2 className="text-base font-black tracking-tight text-slate-900">Recent Orders</h2>
                                    </div>
                                    <Link href="/profile/orders" className="flex items-center gap-1 text-xs font-black text-[#fc2779] uppercase tracking-widest hover:opacity-80">
                                        View All <ChevronRight className="w-3.5 h-3.5" />
                                    </Link>
                                </div>
                                {recentOrders.length > 0 ? (
                                    <div className="divide-y divide-slate-50">
                                        {recentOrders.map((order: any) => {
                                            const cfg = statusCfg[order.status] || statusCfg.pending
                                            const date = new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                            const firstItem = order.order_items?.[0]
                                            const thumbUrl = firstItem?.product_id ? thumbMap[firstItem.product_id] : null
                                            return (
                                                <Link key={order.id} href={`/profile/orders/${order.id}`}
                                                    className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/60 transition-colors"
                                                >
                                                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex-shrink-0 overflow-hidden">
                                                        {thumbUrl ? (
                                                            <img src={thumbUrl} alt={order.order_items?.[0]?.product_name || "Order item"} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <Package className="w-5 h-5 text-slate-300" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-slate-800 truncate">
                                                            {order.order_items?.map((i: any) => i.product_name).join(", ") || "Order"}
                                                        </p>
                                                        <p className="text-xs text-slate-400 mt-0.5">
                                                            {date} · <span className="font-semibold text-slate-500">₹{Number(order.total).toLocaleString("en-IN")}</span>
                                                        </p>
                                                    </div>
                                                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md ${cfg.bg} ${cfg.color}`}>
                                                        {cfg.label}
                                                    </span>
                                                    <ChevronRight className="w-4 h-4 text-slate-300" />
                                                </Link>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <div className="px-6 py-12 text-center">
                                        <Package className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                        <p className="text-sm font-medium text-slate-400">No orders yet</p>
                                        <Link href="/products" className="text-xs font-black text-[#fc2779] uppercase tracking-widest mt-2 inline-block">
                                            Start Shopping
                                        </Link>
                                    </div>
                                )}
                            </section>

                            {/* Gift Cards + Coupons */}
                            <div className="grid grid-cols-2 gap-6">
                                {/* Gift Cards */}
                                <section className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                                        <div className="flex items-center gap-2.5">
                                            <Gift className="w-4 h-4 text-slate-400" />
                                            <h2 className="text-base font-black tracking-tight text-slate-900">Gift Cards</h2>
                                        </div>
                                        <Link href="/gift-cards" className="text-xs font-black text-white bg-[#fc2779] rounded-lg px-3 py-1.5 uppercase tracking-widest hover:opacity-90">
                                            Buy Gift Card
                                        </Link>
                                    </div>
                                    {giftCards.length > 0 ? (
                                        <div className="divide-y divide-slate-50">
                                            {giftCards.map((gc: any) => {
                                                const now = new Date()
                                                const expiry = gc.expires_at ? new Date(gc.expires_at) : null
                                                const daysLeft = expiry ? Math.ceil((expiry.getTime() - now.getTime()) / 86400000) : null
                                                const expiryColor = !expiry ? "text-slate-400"
                                                    : daysLeft! < 0 ? "text-red-500"
                                                    : daysLeft! <= 30 ? "text-amber-600"
                                                    : "text-emerald-600"
                                                return (
                                                    <div key={gc.id} className="flex items-center gap-3 px-6 py-4">
                                                        <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0">
                                                            <Gift className="w-4 h-4 text-rose-400" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono text-sm font-bold text-slate-800 tracking-wider">{gc.code}</span>
                                                                <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                                                                    gc.status === "active" ? "bg-emerald-50 text-emerald-700"
                                                                    : gc.status === "redeemed" ? "bg-blue-50 text-blue-700"
                                                                    : gc.status === "expired" ? "bg-slate-100 text-slate-500"
                                                                    : "bg-red-50 text-red-700"
                                                                }`}>
                                                                    {gc.status}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="text-sm font-semibold text-slate-900">{formatPrice(Number(gc.remaining_balance))}</span>
                                                                <span className="text-xs text-slate-400">/ {formatPrice(Number(gc.original_balance))}</span>
                                                                {expiry && (
                                                                    <span className={`text-xs ${expiryColor}`}>
                                                                        · {daysLeft! < 0 ? "Expired" : `${daysLeft} days left`}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    ) : (
                                        <div className="px-6 py-10 text-center">
                                            <Gift className="w-7 h-7 text-slate-200 mx-auto mb-2" />
                                            <p className="text-sm font-medium text-slate-400">No gift cards</p>
                                        </div>
                                    )}
                                </section>

                                {/* Reward Coupons */}
                                <section className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                                        <div className="flex items-center gap-2.5">
                                            <Tag className="w-4 h-4 text-emerald-500" />
                                            <h2 className="text-base font-black tracking-tight text-slate-900">Reward Coupons</h2>
                                        </div>
                                        <span className="text-xs font-black text-emerald-600">{coupons.length}</span>
                                    </div>
                                    {coupons.length > 0 ? (
                                        <div className="divide-y divide-slate-50">
                                            {coupons.map((c: any) => (
                                                <div key={c.id} className="flex items-center gap-3 px-6 py-4">
                                                    <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                                                        <Tag className="w-4 h-4 text-emerald-500" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <span className="font-mono text-sm font-bold text-slate-800 tracking-wider">{c.code}</span>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-sm font-semibold text-emerald-600">{formatPrice(c.discount_amount)} OFF</span>
                                                            {c.min_order_value > 0 && (
                                                                <span className="text-xs text-slate-400">on {formatPrice(c.min_order_value)}+</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full uppercase tracking-wider">
                                                        {c.reward?.product_name || "Coupon"}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="px-6 py-10 text-center">
                                            <Tag className="w-7 h-7 text-slate-200 mx-auto mb-2" />
                                            <p className="text-sm font-medium text-slate-400">No coupons yet</p>
                                        </div>
                                    )}
                                </section>
                            </div>
                        </main>
                    </div>

                    {/* Footer */}
                    <div className="flex flex-col items-center gap-2 pt-16">
                        <div className="w-8 h-px bg-slate-200" />
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">The Makeup Store Wangkhei</p>
                    </div>
                </div>
            </div>

            {/* ===== MOBILE LAYOUT (unchanged) ===== */}
            <div className="lg:hidden">
            <div className="max-w-lg mx-auto px-4 pt-12 pb-24">
                <div className="space-y-4">
                    {/* Profile Card */}
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

                    {/* Summary Row */}
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

                    {/* M Beauty Rewards */}
                    {loyaltyData?.points && (
                        <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                            <Link href="/rewards" className="flex items-center gap-3 px-4 py-3.5 active:bg-slate-50 transition-colors">
                                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                                    <Award className="w-5 h-5 text-amber-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-bold text-slate-800">M Beauty Rewards</p>
                                        <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                                            loyaltyData.points.tier === "gold" ? "bg-amber-50 text-amber-700"
                                            : loyaltyData.points.tier === "silver" ? "bg-slate-100 text-slate-600"
                                            : "bg-orange-50 text-orange-700"
                                        }`}>
                                            {loyaltyData.points.tier === "gold" ? "Gold"
                                             : loyaltyData.points.tier === "silver" ? "Silver"
                                             : "Bronze"}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1">
                                        <div className="flex items-center gap-1">
                                            <Coins className="w-3 h-3 text-amber-500" />
                                            <span className="text-xs font-black text-amber-600">{loyaltyData.points.balance}</span>
                                            <span className="text-[9px] text-slate-400">coins</span>
                                        </div>
                                        <span className="text-[9px] text-slate-300">·</span>
                                        <span className="text-[9px] text-slate-400">
                                            ₹{loyaltyData.totalSpend.toLocaleString("en-IN")} spent
                                        </span>
                                    </div>
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                            </Link>
                            {loyaltyData.nextTier && (
                                <div className="px-4 pb-3.5">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                                            Next: {loyaltyData.nextTier.tier === "gold" ? "Gold" : "Silver"}
                                        </span>
                                        <span className="text-[8px] font-bold text-slate-400">
                                            ₹{Math.max(0, loyaltyData.nextTier.minSpend - loyaltyData.totalSpend).toLocaleString("en-IN")} away
                                        </span>
                                    </div>
                                    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-amber-400 transition-all"
                                            style={{
                                                width: `${Math.min(100, (loyaltyData.totalSpend / loyaltyData.nextTier.minSpend) * 100)}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Recent Orders */}
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
                                    const thumbUrl = firstItem?.product_id ? thumbMap[firstItem.product_id] : null
                                    return (
                                        <Link key={order.id} href={`/profile/orders/${order.id}`}
                                            className="flex items-center gap-2.5 px-4 py-2.5 active:bg-slate-50 transition-colors"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-slate-50 flex-shrink-0 overflow-hidden">
                                                {thumbUrl ? (
                                                    <img src={thumbUrl} alt={order.order_items?.[0]?.product_name || "Order item"} className="w-full h-full object-cover" />
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

                    {/* Preview Cards */}
                    <Link href="/profile/wishlist"
                        className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm active:scale-[0.99] transition-transform"
                    >
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
                            <Heart className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800">Wishlist</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Items you have saved</p>
                        </div>
                        <span className="text-xs font-black text-[#fc2779]">{wishlistCount}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                    </Link>

                    <Link href="/profile/addresses"
                        className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm active:scale-[0.99] transition-transform"
                    >
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800">Saved Addresses</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Manage your delivery addresses</p>
                        </div>
                        <span className="text-xs font-black text-[#fc2779]">{addressesCount}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                    </Link>

                    {/* Gift Cards */}
                    <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50">
                            <div className="flex items-center gap-2">
                                <Gift className="w-3.5 h-3.5 text-slate-400" />
                                <h2 className="text-xs font-black tracking-tight text-slate-800">Gift Cards</h2>
                            </div>
                            <div className="flex items-center gap-2">
                                {giftCards.length > 0 && (
                                    <span className="text-[9px] font-black text-[#fc2779]">{giftCards.length}</span>
                                )}
                                <Link href="/gift-cards"
                                    className="text-[9px] font-black text-white bg-[#fc2779] rounded-lg px-2.5 py-1.5 uppercase tracking-widest active:scale-95 transition-transform"
                                >
                                    Buy Gift Card
                                </Link>
                            </div>
                        </div>
                            <div className="divide-y divide-slate-50">
                                {giftCards.map((gc: any) => {
                                    const redemptions = gc.gift_card_redemptions || []
                                    const redeemedTotal = redemptions.reduce((s: number, r: any) => s + Number(r.amount), 0)
                                    const now = new Date()
                                    const expiry = gc.expires_at ? new Date(gc.expires_at) : null
                                    const daysLeft = expiry ? Math.ceil((expiry.getTime() - now.getTime()) / 86400000) : null
                                    const expiryColor = !expiry ? "text-slate-400"
                                        : daysLeft! < 0 ? "text-red-500"
                                        : daysLeft! <= 30 ? "text-amber-600"
                                        : "text-emerald-600"

                                    return (
                                        <details key={gc.id} className="group">
                                            <summary className="flex items-center gap-3 px-4 py-3 active:bg-slate-50 transition-colors cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                                                <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0">
                                                    <Gift className="w-4 h-4 text-rose-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-xs font-bold text-slate-800 tracking-wider">{gc.code}</span>
                                                        <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                                                            gc.status === "active" ? "bg-emerald-50 text-emerald-700"
                                                            : gc.status === "redeemed" ? "bg-blue-50 text-blue-700"
                                                            : gc.status === "expired" ? "bg-slate-100 text-slate-500"
                                                            : "bg-red-50 text-red-700"
                                                        }`}>
                                                            {gc.status}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-xs font-semibold text-slate-900">{formatPrice(Number(gc.remaining_balance))}</span>
                                                        <span className="text-[9px] text-slate-400">/ {formatPrice(Number(gc.original_balance))}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <p className={`text-[9px] font-bold ${expiryColor}`}>
                                                        {expiry ? `${daysLeft! < 0 ? "Overdue" : daysLeft === 0 ? "Today" : `${daysLeft}d`}` : "—"}
                                                    </p>
                                                    {redemptions.length > 0 && (
                                                        <p className="text-[8px] text-slate-400 mt-0.5">{redemptions.length} used</p>
                                                    )}
                                                </div>
                                                <ChevronRight className="w-3 h-3 text-slate-300 transition-transform group-open:rotate-90" />
                                            </summary>
                                            {redemptions.length > 0 && (
                                                <div className="px-4 pb-3 space-y-2">
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 pt-1">
                                                        <History className="w-3 h-3" />
                                                        Redemption History
                                                    </p>
                                                    {redemptions.map((r: any, i: number) => {
                                                        const order = r.orders
                                                        const user = order?.user
                                                        const date = order?.created_at
                                                            ? new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                                                            : ""
                                                        const statusCfg_l = statusCfg[order?.status] || statusCfg.pending
                                                        return (
                                                            <div key={i} className="rounded-lg bg-slate-50 p-3 space-y-1.5">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-xs font-bold text-slate-900">{formatPrice(Number(r.amount))}</span>
                                                                    <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${statusCfg_l.bg} ${statusCfg_l.color}`}>
                                                                        {statusCfg_l.label}
                                                                    </span>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                                                                    <span className="text-slate-400">Order</span>
                                                                    <span className="font-semibold text-slate-800 text-right">
                                                                        #{order?.id ? order.id.toString().slice(-8).toUpperCase() : "—"}
                                                                    </span>
                                                                    <span className="text-slate-400">Used by</span>
                                                                    <span className="font-medium text-slate-800 text-right truncate">
                                                                        {user?.full_name || "—"}
                                                                    </span>
                                                                    <span className="text-slate-400">Date</span>
                                                                    <span className="text-slate-600 text-right">{r.redeemed_at ? new Date(r.redeemed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : date}</span>
                                                                    <span className="text-slate-400">Total</span>
                                                                    <span className="font-semibold text-slate-800 text-right">
                                                                        {order?.total != null ? formatPrice(Number(order.total)) : "—"}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                            {redemptions.length === 0 && (
                                                <div className="px-4 pb-3">
                                                    <p className="text-[10px] text-slate-400 italic">Not yet redeemed</p>
                                                </div>
                                            )}
                                        </details>
                                    )
                                })}
                            </div>
                        </div>

                    {/* Reward Coupons */}
                    {coupons.length > 0 && (
                        <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50">
                                <div className="flex items-center gap-2">
                                    <Tag className="w-3.5 h-3.5 text-emerald-500" />
                                    <h2 className="text-xs font-black tracking-tight text-slate-800">Reward Coupons</h2>
                                </div>
                                <span className="text-[9px] font-black text-emerald-600">{coupons.length}</span>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {coupons.map((c: any) => (
                                    <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                                            <Tag className="w-4 h-4 text-emerald-500" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <span className="font-mono text-xs font-bold text-slate-800 tracking-wider">{c.code}</span>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs font-semibold text-emerald-600">{formatPrice(c.discount_amount)} OFF</span>
                                                {c.min_order_value > 0 && (
                                                    <span className="text-[9px] text-slate-400">on {formatPrice(c.min_order_value)}+</span>
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                            {c.reward?.product_name || "Coupon"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Settings & Support */}
                    <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-50">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Settings & Support</p>
                        </div>
                        <div className="divide-y divide-slate-50">
                            <Link href="/profile/notifications"
                                className="flex items-center justify-between px-4 py-3 active:bg-slate-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <Bell className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm font-medium text-slate-700">Notifications</span>
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                            </Link>
                            <Link href="/profile/settings"
                                className="flex items-center justify-between px-4 py-3 active:bg-slate-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <Settings className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm font-medium text-slate-700">Account Settings</span>
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                            </Link>
                            <Link href="/contact"
                                className="flex items-center justify-between px-4 py-3 active:bg-slate-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <MessageCircle className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm font-medium text-slate-700">Contact Us</span>
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                            </Link>
                            <Link href="/about-us"
                                className="flex items-center justify-between px-4 py-3 active:bg-slate-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <Info className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm font-medium text-slate-700">About Us</span>
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                            </Link>
                            <Link href="/legal/return_policy"
                                className="flex items-center justify-between px-4 py-3 active:bg-slate-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <RotateCcw className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm font-medium text-slate-700">Return Policy</span>
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                            </Link>
                            <Link href="/legal/privacy_policy"
                                className="flex items-center justify-between px-4 py-3 active:bg-slate-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <FileText className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm font-medium text-slate-700">Privacy Policy</span>
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                            </Link>
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
            </div>

            {/* Sign Out Confirmation */}
            <AnimatePresence>
                {showConfirm && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowConfirm(false)}
                            className="fixed inset-0 bg-rose-950/20 backdrop-blur-sm z-[60]"
                        />
                        <motion.div
                            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 28, stiffness: 250 }}
                            className="fixed bottom-0 left-0 right-0 bg-white z-[70] rounded-t-[2.5rem] p-8 pb-10 shadow-2xl max-w-lg mx-auto mb-16"
                        >
                            <div className="flex justify-center mb-6">
                                <div className="w-0.5 h-8 rounded-full bg-rose-200" />
                            </div>
                            <div className="text-center space-y-3 mb-8">
                                <div className="w-16 h-16 rounded-2xl bg-[#fc2779]/5 flex items-center justify-center mx-auto rotate-12">
                                    <LogOut className="w-7 h-7 text-[#fc2779] -rotate-12" />
                                </div>
                                <h3 className="text-2xl font-daciana text-slate-900 leading-tight">Leaving so soon?</h3>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em]">You'll be back for more beauty</p>
                            </div>
                            <div className="flex flex-col gap-2.5">
                                <button onClick={handleSignOut}
                                    className="w-full py-4 rounded-2xl bg-[#fc2779] text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-rose-200/60 active:scale-[0.97] transition-all"
                                >
                                    Yes, Sign Out
                                </button>
                                <button onClick={() => setShowConfirm(false)}
                                    className="w-full py-4 rounded-2xl bg-rose-50 text-[#fc2779] text-[10px] font-black uppercase tracking-[0.2em] active:scale-[0.97] transition-all"
                                >
                                    Stay Logged In
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}
