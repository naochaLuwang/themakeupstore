"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import {
    ShoppingBag, Home, User, Heart,
    ChevronRight, Package, LayoutGrid,
    Download, Share, PlusSquare, LogOut, Menu,
    Sparkles, Award, Smartphone, Ticket, Zap
} from "lucide-react"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetClose
} from "@/components/ui/sheet"

export function MobileMenu({ user }: { user: any }) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
    const [isInstallable, setIsInstallable] = useState(false)
    const [isIOS, setIsIOS] = useState(false)
    const [isStandalone, setIsStandalone] = useState(false)

    useEffect(() => {
        setMounted(true)
        const ua = window.navigator.userAgent
        setIsIOS(!!ua.match(/iPad/i) || !!ua.match(/iPhone/i))
        setIsStandalone(window.matchMedia('(display-mode: standalone)').matches)

        const handler = (e: any) => {
            e.preventDefault()
            setDeferredPrompt(e)
            setIsInstallable(true)
        }
        window.addEventListener("beforeinstallprompt", handler)
        return () => window.removeEventListener("beforeinstallprompt", handler)
    }, [])

    const handleInstallClick = async () => {
        if (!deferredPrompt) return
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === "accepted") setIsInstallable(false)
        setDeferredPrompt(null)
    }

    const handleSignOut = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        setOpen(false)
        router.refresh()
        router.push('/')
    }

    if (!mounted) return null

    const mainNav = [
        { name: 'Home', href: '/', icon: Home },
        { name: 'New Arrivals', href: '/new-arrivals', icon: Sparkles, badge: true },
        { name: 'Trending Brands', href: '/brands', icon: Award },
        { name: 'The Shop', href: '/shop', icon: ShoppingBag },
        { name: 'Categories', href: '/categories', icon: LayoutGrid }
    ]

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <button className="p-2 -mr-2 lg:hidden active:scale-90 transition-transform outline-none">
                    <Menu className="w-6 h-6 text-slate-950 stroke-[1.5]" />
                </button>
            </SheetTrigger>

            <SheetContent
                side="left"
                className="w-[85%] max-w-[320px] p-0 border-r-0 flex flex-col bg-white z-[500]"
            >
                {/* 1. LUXE BRAND HEADER */}
                <SheetHeader className="px-6 pt-12 pb-8 border-b border-pink-50 bg-[#FDFDFD] shrink-0">
                    <SheetTitle className="text-left">
                        <div className="flex flex-col ">
                            <h2 className="text-xl font-daciana  font-bold text-slate-900 leading-none">
                                THE MAKEUP STORE
                            </h2>
                            <div className="flex items-center gap-2 mt-2">
                                <div className="h-[1px] w-4 bg-pink-100" />
                                <span className="text-[8px] font-black tracking-[0.4em] text-slate-400 uppercase">WANGKHEI</span>
                            </div>
                        </div>
                    </SheetTitle>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8 no-scrollbar">

                    {/* 2. CORE NAVIGATION (Nykaa High-Density style) */}
                    <nav className="space-y-1">
                        {mainNav.map((item) => (
                            <SheetClose key={item.name} asChild>
                                <Link href={item.href} className="flex items-center justify-between py-4 px-3 rounded-2xl active:bg-pink-50 transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-100 group-active:border-[#fc2779]/20 group-active:bg-pink-50/50">
                                            <item.icon className={`w-[18px] h-[18px] transition-colors ${item.badge ? 'text-[#fc2779]' : 'text-slate-400 group-active:text-[#fc2779]'}`} strokeWidth={2} />
                                        </div>
                                        <span className={`text-[13px] tracking-tight uppercase ${item.badge ? 'font-black text-slate-900' : 'font-bold text-slate-600'}`}>
                                            {item.name}
                                        </span>
                                    </div>
                                    {item.badge && (
                                        <span className="px-2 py-0.5 bg-[#fc2779] text-[8px] font-black text-white rounded uppercase tracking-widest">Hot</span>
                                    )}
                                    <ChevronRight className="w-3.5 h-3.5 text-slate-200" />
                                </Link>
                            </SheetClose>
                        ))}
                    </nav>

                    {/* 3. PWA INSTALLATION (Boutique Loyalty Card Style) */}
                    {!isStandalone && (
                        <div className="mx-2 p-5 rounded-[2rem] bg-pink-50/50 border border-pink-100/50 relative overflow-hidden">
                            <Zap className="absolute -right-4 -top-4 w-24 h-24 text-pink-100/50 rotate-12" />
                            <div className="relative z-10 space-y-4">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-[#fc2779] uppercase tracking-[0.2em]">App Experience</p>
                                    <p className="text-[12px] font-bold text-slate-700 leading-tight">
                                        Add to home screen for faster shopping & exclusive restock alerts.
                                    </p>
                                </div>

                                {isIOS ? (
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-pink-100/30">
                                            <Share className="w-3 h-3 text-[#fc2779]" />
                                            <span className="text-[9px] font-black uppercase text-slate-500">1. Share</span>
                                        </div>
                                        <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-pink-100/30">
                                            <PlusSquare className="w-3 h-3 text-[#fc2779]" />
                                            <span className="text-[9px] font-black uppercase text-slate-500">2. Add</span>
                                        </div>
                                    </div>
                                ) : (
                                    (isInstallable || deferredPrompt) && (
                                        <button
                                            onClick={handleInstallClick}
                                            className="w-full flex items-center justify-center gap-2 py-4 bg-slate-950 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-transform shadow-xl shadow-pink-100"
                                        >
                                            <Download className="w-4 h-4" />
                                            Install Now
                                        </button>
                                    )
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* 4. AUTH & ACCOUNT FOOTER (Glass Shelf Style) */}
                <div className="p-6 border-t border-pink-50 bg-[#FDFDFD]">
                    {user ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-3 gap-2">
                                <SheetClose asChild>
                                    <Link href="/profile/wishlist" className="flex flex-col items-center justify-center py-4 rounded-2xl bg-white border border-pink-50 shadow-sm active:bg-pink-50/30 transition-colors group">
                                        <Heart className="w-5 h-5 text-[#fc2779] mb-2 stroke-[2.5]" />
                                        <span className="text-[7px] font-black uppercase tracking-widest text-slate-900">Wishlist</span>
                                    </Link>
                                </SheetClose>
                                <SheetClose asChild>
                                    <Link href="/rewards" className="flex flex-col items-center justify-center py-4 rounded-2xl bg-white border border-pink-50 shadow-sm active:bg-pink-50/30 transition-colors group">
                                        <Award className="w-5 h-5 text-amber-500 mb-2 stroke-[2]" />
                                        <span className="text-[7px] font-black uppercase tracking-widest text-slate-900">Rewards</span>
                                    </Link>
                                </SheetClose>
                                <SheetClose asChild>
                                    <Link href="/profile/orders" className="flex flex-col items-center justify-center py-4 rounded-2xl bg-white border border-pink-50 shadow-sm active:bg-pink-50/30 transition-colors group">
                                        <Package className="w-5 h-5 text-slate-900 mb-2 stroke-[2]" />
                                        <span className="text-[7px] font-black uppercase tracking-widest text-slate-900">My Orders</span>
                                    </Link>
                                </SheetClose>
                            </div>

                            <div className="flex items-center justify-between px-2">
                                <div className="space-y-0.5">
                                    <span className="text-[10px] font-black text-[#fc2779] uppercase tracking-widest">Premium Member</span>
                                    <p className="text-[11px] font-bold text-slate-500 truncate max-w-[140px]">{user.email}</p>
                                </div>
                                <button
                                    onClick={handleSignOut}
                                    className="p-2 text-rose-500 active:scale-90 transition-transform"
                                >
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Discover Authentic Beauty</p>
                            <SheetClose asChild>
                                <Link
                                    href="/login"
                                    className="w-full h-14 flex items-center justify-center bg-[#fc2779] text-white rounded-[1.2rem] text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-pink-100 active:scale-95 transition-transform"
                                >
                                    Sign In / Join Now
                                </Link>
                            </SheetClose>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}