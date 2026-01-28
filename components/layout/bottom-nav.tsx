"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, ShoppingBag, Sparkles, User, Award, Search } from "lucide-react"
import { motion } from "framer-motion"
import { useCart } from "@/components/store/use-cart" // Ensure this path matches your cart store

export function BottomNav() {
    const pathname = usePathname()

    // 1. Cart Logic: Assuming a zustand or context store
    const cart = useCart()
    const cartCount = cart.items?.length || 0

    // 2. Haptic Feedback Function
    const triggerHaptic = () => {
        if (typeof window !== "undefined" && window.navigator.vibrate) {
            // 10ms is a subtle "tick" similar to a native system keyboard
            window.navigator.vibrate(10)
        }
    }

    const navItems = [
        { name: 'Home', href: '/', icon: Home },
        { name: 'Brands', href: '/brands', icon: Award },
        { name: 'New', href: '/new-arrivals', icon: Sparkles },
        { name: 'Bag', href: '/cart', icon: ShoppingBag, count: cartCount },
        { name: 'Account', href: '/profile', icon: User },
    ]

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[400] lg:hidden">
            {/* Visual Container: Blur effect + Shadow */}
            <div className="bg-white/90 backdrop-blur-xl border-t border-slate-100 px-2 pt-2 pb-safe shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.08)]">
                <nav className="flex items-center justify-around h-14">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={triggerHaptic}
                                className="relative flex flex-col items-center justify-center flex-1 h-full group outline-none"
                            >
                                <div className="relative">
                                    {/* Icon with scaling effect on active */}
                                    <item.icon
                                        className={`w-5 h-5 transition-all duration-300 transform ${isActive
                                                ? "text-slate-900 stroke-[2.5] scale-110"
                                                : "text-slate-400 stroke-[1.5] group-active:scale-90"
                                            }`}
                                    />

                                    {/* Animated Cart Badge */}
                                    {item.count !== undefined && item.count > 0 && (
                                        <motion.span
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] px-1 bg-slate-900 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white"
                                        >
                                            {item.count}
                                        </motion.span>
                                    )}

                                    {/* Active Indicator: Smooth sliding dot */}
                                    {isActive && (
                                        <motion.div
                                            layoutId="bottomNavDot"
                                            className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-1 h-1 bg-slate-900 rounded-full"
                                            transition={{
                                                type: "spring",
                                                stiffness: 400,
                                                damping: 30
                                            }}
                                        />
                                    )}
                                </div>

                                <span className={`text-[8px] mt-2 font-bold uppercase tracking-[0.15em] transition-colors duration-300 ${isActive ? "text-slate-900" : "text-slate-400"
                                    }`}>
                                    {item.name}
                                </span>
                            </Link>
                        )
                    })}
                </nav>
            </div>
        </div>
    )
}