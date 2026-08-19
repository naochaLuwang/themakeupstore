"use client"

import { useEffect, useState } from "react"

export function HeaderScroll({ children }: { children: React.ReactNode }) {
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        const scroller = document.getElementById("app-scroller")
        if (!scroller) return

        const onScroll = () => {
            setScrolled(scroller.scrollTop > 20)
        }
        scroller.addEventListener("scroll", onScroll, { passive: true })
        return () => scroller.removeEventListener("scroll", onScroll)
    }, [])

    return (
        <div
            id="store-header"
            className={`sticky top-0 z-[200] w-full transition-all duration-300 ${
                scrolled
                    ? "bg-white/90 backdrop-blur-xl border-b border-pink-50/60 shadow-sm shadow-pink-100/40"
                    : "bg-transparent border-b border-transparent"
            }`}
        >
            {children}
        </div>
    )
}