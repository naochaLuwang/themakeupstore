"use client"

import { usePathname } from "next/navigation"
import { BottomNav } from "./bottom-nav"

const HIDE_BOTTOM_NAV_PATHS = ["/products/", "/cart", "/categories/", "/exclusive/", "/essentials/", "/shop", "/category/", "/concern/"]

export function BottomNavWrapper() {
    const pathname = usePathname()
    const hideBottomNav = HIDE_BOTTOM_NAV_PATHS.some((path) => pathname.startsWith(path))

    if (hideBottomNav) return null

    return <BottomNav />
}
