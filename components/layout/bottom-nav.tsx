

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
    LayoutGrid
} from "lucide-react"
import { motion } from "framer-motion"

export function BottomNav() {
    const pathname = usePathname()

    // UX Logic: Tunneling Effect. 
    // We hide navigation on checkout to minimize cognitive friction and exit intent.
    const isCheckoutPage = pathname.startsWith('/checkout')

    const triggerHaptic = () => {
        if (typeof window !== "undefined" && window.navigator.vibrate) {
            window.navigator.vibrate(10)
        }
    }

    const navItems = [
        { name: 'Home', href: '/', icon: Home },
        { name: 'Brands', href: '/brands', icon: Award },
        { name: 'Categories', href: '/categories', icon: LayoutGrid },
        { name: 'Account', href: '/profile', icon: User },
    ]

    // If we are on the checkout flow, render nothing
    if (isCheckoutPage) return null

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[400] lg:hidden">
            <div className="bg-white/90 backdrop-blur-xl border-t border-slate-100 px-2 pt-2 pb-safe shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.08)]">
                <nav className="flex items-center justify-around h-14 max-w-sm mx-auto">
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
                                    <item.icon
                                        className={`w-[20px] h-[20px] transition-all duration-300 transform ${isActive
                                            ? "text-slate-900 stroke-[2.5] scale-110"
                                            : "text-slate-400 stroke-[1.5] group-active:scale-90"
                                            }`}
                                    />

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

                                <span className={`text-[8px] mt-2 font-black uppercase tracking-[0.1em] transition-colors duration-300 ${isActive ? "text-slate-900" : "text-slate-400"
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