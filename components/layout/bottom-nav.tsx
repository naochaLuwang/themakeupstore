"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    Home,
    User,
    Award,
    LayoutGrid,
} from "lucide-react"
import { motion } from "framer-motion"

export function BottomNav() {
    const pathname = usePathname()
    const isCheckoutPage = pathname.startsWith('/checkout')

    const triggerHaptic = () => {
        if (typeof window !== "undefined" && window.navigator.vibrate) {
            window.navigator.vibrate(12)
        }
    }

    const navItems = [
        { name: 'Home', href: '/', icon: Home },
        { name: 'Brands', href: '/brands', icon: Award },
        { name: 'Categories', href: '/categories', icon: LayoutGrid },
        { name: 'Account', href: '/profile', icon: User },
    ]

    if (isCheckoutPage) return null

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[400] lg:hidden">
            {/* Soft Glassy Backdrop */}
            <div className="bg-white/95 backdrop-blur-2xl border-t border-pink-50 pt-2 pb-safe px-4 shadow-[0_-15px_40px_rgba(252,39,121,0.08)]">
                <nav className="flex items-center justify-between h-14 max-w-md mx-auto">

                    {/* PRIMARY NAV ITEMS */}
                    <div className="flex flex-1 items-center justify-around">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href

                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={triggerHaptic}
                                    className="relative flex flex-col items-center justify-center flex-1 group"
                                >
                                    {/* Nykaa Signature: Moving Background Capsule */}
                                    <div className="relative py-1 px-4 rounded-2xl transition-all">
                                        <item.icon
                                            className={`w-5 h-5 transition-all duration-300 ${isActive
                                                ? "text-[#fc2779] stroke-[2.5] scale-110"
                                                : "text-slate-400 stroke-[1.5] group-hover:text-pink-300"
                                                }`}
                                        />

                                        {isActive && (
                                            <motion.div
                                                layoutId="nykaaActivePill"
                                                className="absolute inset-0 bg-pink-50/60 rounded-xl -z-10"
                                                transition={{
                                                    type: "spring",
                                                    stiffness: 400,
                                                    damping: 30
                                                }}
                                            />
                                        )}
                                    </div>

                                    <span className={`text-[9px] mt-1 font-bold uppercase tracking-tight transition-colors duration-300 ${isActive ? "text-[#fc2779]" : "text-slate-400"}`}>
                                        {item.name}
                                    </span>
                                </Link>
                            )
                        })}
                    </div>
                </nav>
            </div>
        </div>
    )
}