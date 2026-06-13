"use client"

import { useEffect, useRef, useState } from "react"

export function HeaderScroll({ children }: { children: React.ReactNode }) {
    const [scrolled, setScrolled] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

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
            ref={ref}
            className={`sticky top-0 z-[200] w-full transition-all duration-300 ${
                scrolled ? "bg-white shadow-sm" : "bg-transparent"
            }`}
        >
            {children}
        </div>
    )
}
