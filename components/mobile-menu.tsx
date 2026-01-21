"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import {
    ShoppingBag, Home, User, Heart,
    ChevronRight, Package, LayoutGrid,
    Download, Share, PlusSquare, LogOut, Menu, Search
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

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <button className="p-2 -mr-2 lg:hidden active:scale-95 transition-transform outline-none">
                    <Menu className="w-6 h-6 text-slate-900 stroke-[1.2]" />
                </button>
            </SheetTrigger>

            {/* z-[500] covers everything | w-[80%] ensures it's a side drawer */}
            <SheetContent
                side="left"
                className="w-[80%] max-w-[300px] p-0 border-r-0 flex flex-col bg-white z-[500] shadow-[40px_0_80px_-20px_rgba(0,0,0,0.1)]"
            >
                <SheetHeader className="px-6 pt-12 pb-6 border-b border-slate-50 shrink-0">
                    <SheetTitle className="text-left">
                        <div className="flex flex-col">
                            <span className="font-bold text-xl tracking-tight text-slate-900">DACIANA</span>
                            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] mt-1">Shopping App</span>
                        </div>
                    </SheetTitle>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8 no-scrollbar">

                    {/* CORE NAVIGATION */}
                    <nav className="space-y-1">
                        {[
                            { name: 'Home', href: '/', icon: Home },
                            { name: 'Shop All', href: '/shop', icon: ShoppingBag },
                            { name: 'Categories', href: '/categories', icon: LayoutGrid }
                        ].map((item) => (
                            <SheetClose key={item.name} asChild>
                                <Link href={item.href} className="flex items-center justify-between py-4 px-3 rounded-xl active:bg-slate-50 transition-all group">
                                    <div className="flex items-center gap-4">
                                        <item.icon className="w-[18px] h-[18px] text-slate-400 group-active:text-slate-900 stroke-[1.5]" />
                                        <span className="text-sm font-medium text-slate-600 group-active:text-slate-900">{item.name}</span>
                                    </div>
                                    <ChevronRight className="w-3.5 h-3.5 text-slate-200" />
                                </Link>
                            </SheetClose>
                        ))}
                    </nav>

                    {/* REDESIGNED PWA SECTION */}
                    {!isStandalone && (
                        <div className="mx-2 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/50">
                            <div className="p-5">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">
                                            {isIOS ? 'Install for iOS' : 'Daciana App'}
                                        </p>
                                        <p className="text-[11px] text-slate-500 leading-tight max-w-[150px]">
                                            Fast, seamless, and always ready.
                                        </p>
                                    </div>
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm border border-slate-100">
                                        <Download className="w-4 h-4 text-slate-900" />
                                    </div>
                                </div>

                                {isIOS ? (
                                    <div className="space-y-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <Share className="w-3.5 h-3.5 text-slate-400" />
                                            <span className="text-[9px] font-medium text-slate-600">1. Tap the Share button</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <PlusSquare className="w-3.5 h-3.5 text-slate-400" />
                                            <span className="text-[9px] font-medium text-slate-600">2. Add to Home Screen</span>
                                        </div>
                                    </div>
                                ) : (
                                    isInstallable && (
                                        <button
                                            onClick={handleInstallClick}
                                            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-transform"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                            Install Now
                                        </button>
                                    )
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* BOTTOM SECTION: Profile & Auth */}
                <div className="p-4 border-t border-slate-50 bg-white">
                    {user ? (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <SheetClose asChild>
                                    <Link href="/profile/wishlist" className="flex flex-col items-center justify-center py-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                                        <Heart className="w-4 h-4 text-rose-400 mb-1.5" />
                                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-900">Saved</span>
                                    </Link>
                                </SheetClose>
                                <SheetClose asChild>
                                    <Link href="/profile/orders" className="flex flex-col items-center justify-center py-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                                        <Package className="w-4 h-4 text-slate-500 mb-1.5" />
                                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-900">Orders</span>
                                    </Link>
                                </SheetClose>
                            </div>
                            <div className="flex items-center justify-between px-2 pt-2">
                                <span className="text-[10px] text-slate-400 truncate max-w-[120px] italic">{user.email}</span>
                                <button onClick={handleSignOut} className="text-[10px] font-bold text-red-500 uppercase tracking-tighter">Sign Out</button>
                            </div>
                        </div>
                    ) : (
                        <SheetClose asChild>
                            <Link
                                href="/login"
                                className="w-full flex items-center justify-center py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-transform"
                            >
                                Get Started
                            </Link>
                        </SheetClose>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}