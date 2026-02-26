

// "use client"

// import * as React from "react"
// import Link from "next/link"
// import { usePathname } from "next/navigation"
// import {
//     Home,
//     User,
//     Award,
//     LayoutGrid
// } from "lucide-react"
// import { motion } from "framer-motion"

// export function BottomNav() {
//     const pathname = usePathname()

//     // UX Logic: Tunneling Effect. 
//     // We hide navigation on checkout to minimize cognitive friction and exit intent.
//     const isCheckoutPage = pathname.startsWith('/checkout')

//     const triggerHaptic = () => {
//         if (typeof window !== "undefined" && window.navigator.vibrate) {
//             window.navigator.vibrate(10)
//         }
//     }

//     const navItems = [
//         { name: 'Home', href: '/', icon: Home },
//         { name: 'Brands', href: '/brands', icon: Award },
//         { name: 'Categories', href: '/categories', icon: LayoutGrid },
//         { name: 'Account', href: '/profile', icon: User },
//     ]

//     // If we are on the checkout flow, render nothing
//     if (isCheckoutPage) return null

//     return (
//         <div className="fixed bottom-0 left-0 right-0 z-[400] lg:hidden">
//             <div className="bg-white/90 backdrop-blur-xl border-t border-slate-100 px-2 pt-2 pb-safe shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.08)]">
//                 <nav className="flex items-center justify-around h-14 max-w-sm mx-auto">
//                     {navItems.map((item) => {
//                         const isActive = pathname === item.href

//                         return (
//                             <Link
//                                 key={item.name}
//                                 href={item.href}
//                                 onClick={triggerHaptic}
//                                 className="relative flex flex-col items-center justify-center flex-1 h-full group outline-none"
//                             >
//                                 <div className="relative">
//                                     <item.icon
//                                         className={`w-[20px] h-[20px] transition-all duration-300 transform ${isActive
//                                             ? "text-slate-900 stroke-[2.5] scale-110"
//                                             : "text-slate-400 stroke-[1.5] group-active:scale-90"
//                                             }`}
//                                     />

//                                     {isActive && (
//                                         <motion.div
//                                             layoutId="bottomNavDot"
//                                             className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-1 h-1 bg-slate-900 rounded-full"
//                                             transition={{
//                                                 type: "spring",
//                                                 stiffness: 400,
//                                                 damping: 30
//                                             }}
//                                         />
//                                     )}
//                                 </div>

//                                 <span className={`text-[8px] mt-2 font-black uppercase tracking-[0.1em] transition-colors duration-300 ${isActive ? "text-slate-900" : "text-slate-400"
//                                     }`}>
//                                     {item.name}
//                                 </span>
//                             </Link>
//                         )
//                     })}
//                 </nav>
//             </div>
//         </div>
//     )
// }


"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    Home,
    User,
    Award,
    LayoutGrid,
    Percent
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

                    {/* 1. THE PROMO SLOT: "OFFERS" */}
                    <Link
                        href="/offers"
                        onClick={triggerHaptic}
                        className="flex flex-col items-center justify-center pr-4 group relative"
                    >
                        <div className={`relative p-2 rounded-2xl transition-all duration-300 ${pathname === '/offers' ? 'bg-[#fc2779] shadow-lg shadow-pink-200' : 'bg-pink-50'}`}>
                            <Percent
                                className={`w-5 h-5 transition-colors ${pathname === '/offers' ? 'text-white' : 'text-[#fc2779]'}`}
                                strokeWidth={3}
                            />
                            {/* The "Live" Badge */}
                            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#fc2779] border-2 border-white"></span>
                            </span>
                        </div>
                        <span className="text-[7px] mt-1.5 font-black uppercase text-[#fc2779] tracking-tighter">
                            Upto 50% Off
                        </span>
                    </Link>

                    {/* 2. MODERN HAIRLINE DIVIDER */}
                    <div className="h-10 w-[1.5px] bg-gradient-to-b from-transparent via-slate-100 to-transparent" />

                    {/* 3. PRIMARY NAV ITEMS */}
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