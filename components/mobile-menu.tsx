
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import {
    ShoppingBag, Home, User, Heart,
    ChevronRight, Package, LayoutGrid,
    Download, Share, PlusSquare, LogOut, Menu,
    Sparkles, Award, Smartphone
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

    // Navigation configuration
    const mainNav = [
        { name: 'Home', href: '/', icon: Home },
        { name: 'New Arrivals', href: '/new-arrivals', icon: Sparkles, badge: true },
        { name: 'Brands', href: '/brands', icon: Award },
        { name: 'Shop All', href: '/shop', icon: ShoppingBag },
        { name: 'Categories', href: '/categories', icon: LayoutGrid }
    ]

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <button className="p-2 -mr-2 lg:hidden active:scale-95 transition-transform outline-none">
                    <Menu className="w-6 h-6 text-slate-900 stroke-[1.2]" />
                </button>
            </SheetTrigger>

            <SheetContent
                side="left"
                className="w-[85%] max-w-[320px] p-0 border-r-0 flex flex-col bg-white z-[500] shadow-[40px_0_80px_-20px_rgba(0,0,0,0.1)]"
            >
                {/* BRAND HEADER */}
                <SheetHeader className="px-6 pt-12 pb-6 border-b border-slate-50 shrink-0">
                    <SheetTitle className="text-left">
                        <div className="flex flex-col">
                            <span className=" text-2xl tracking-tighter text-slate-900 font-daciana">THE MAKEUP STORE</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1">WANGKHEI</span>
                        </div>
                    </SheetTitle>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8 no-scrollbar">

                    {/* CORE NAVIGATION */}
                    <nav className="space-y-1">
                        {mainNav.map((item) => (
                            <SheetClose key={item.name} asChild>
                                <Link href={item.href} className="flex items-center justify-between py-4 px-3 rounded-xl active:bg-slate-50 transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <item.icon className="w-[18px] h-[18px] text-slate-400 group-active:text-slate-900 stroke-[1.5]" />
                                            {item.badge && (
                                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white" />
                                            )}
                                        </div>
                                        <span className={`text-sm tracking-tight ${item.badge ? 'font-bold text-slate-900' : 'font-medium text-slate-600'}`}>
                                            {item.name}
                                        </span>
                                    </div>
                                    <ChevronRight className="w-3.5 h-3.5 text-slate-200" />
                                </Link>
                            </SheetClose>
                        ))}
                    </nav>

                    {/* PWA INSTALLATION UX */}
                    {!isStandalone && (
                        <div className="mx-2 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/50">
                            <div className="p-5">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                            <Smartphone className="w-3 h-3" />
                                            App Experience
                                        </p>
                                        <p className="text-[11px] text-slate-500 leading-tight">
                                            Add to home screen for faster browsing and offline access.
                                        </p>
                                    </div>
                                </div>

                                {isIOS ? (
                                    <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-6 h-6 rounded-md bg-slate-50 flex items-center justify-center">
                                                <Share className="w-3 h-3 text-slate-400" />
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">1. Tap Share</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-6 h-6 rounded-md bg-slate-50 flex items-center justify-center">
                                                <PlusSquare className="w-3 h-3 text-slate-400" />
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">2. Add to Home Screen</span>
                                        </div>
                                    </div>
                                ) : (
                                    (isInstallable || deferredPrompt) && (
                                        <button
                                            onClick={handleInstallClick}
                                            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-transform shadow-lg shadow-slate-200"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                            Install App
                                        </button>
                                    )
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* AUTH & ACCOUNT FOOTER */}
                <div className="p-4 border-t border-slate-50 bg-white">
                    {user ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-2">
                                <SheetClose asChild>
                                    <Link href="/profile/wishlist" className="flex flex-col items-center justify-center py-4 rounded-xl bg-slate-50 border border-slate-100 active:bg-slate-100 transition-colors">
                                        <Heart className="w-4 h-4 text-rose-500 mb-1.5 stroke-[2]" />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-900">Wishlist</span>
                                    </Link>
                                </SheetClose>
                                <SheetClose asChild>
                                    <Link href="/profile/orders" className="flex flex-col items-center justify-center py-4 rounded-xl bg-slate-50 border border-slate-100 active:bg-slate-100 transition-colors">
                                        <Package className="w-4 h-4 text-slate-900 mb-1.5 stroke-[2]" />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-900">Orders</span>
                                    </Link>
                                </SheetClose>
                            </div>
                            <div className="flex items-center justify-between px-2 pt-1">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-slate-900 uppercase">Account</span>
                                    <span className="text-[9px] text-slate-400 truncate max-w-[140px] lowercase">{user.email}</span>
                                </div>
                                <button
                                    onClick={handleSignOut}
                                    className="px-3 py-1.5 rounded-lg border border-red-100 text-[9px] font-bold text-red-500 uppercase tracking-tighter hover:bg-red-50 transition-colors"
                                >
                                    Log Out
                                </button>
                            </div>
                        </div>
                    ) : (
                        <SheetClose asChild>
                            <Link
                                href="/login"
                                className="w-full flex items-center justify-center py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-transform"
                            >
                                Sign In / Register
                            </Link>
                        </SheetClose>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}