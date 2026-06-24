"use client"

import * as React from "react"
import Link from "next/link"

const banners = ["/banners/KYLIE.png", "/banners/KYLIE1.png"]

export function KylieBanner() {
    const [slide, setSlide] = React.useState(0)
    const [prevSlide, setPrevSlide] = React.useState<number | null>(null)

    React.useEffect(() => {
        const timer = setInterval(() => {
            setSlide((prev) => {
                setPrevSlide(prev)
                return (prev + 1) % banners.length
            })
        }, 4000)
        return () => clearInterval(timer)
    }, [])

    React.useEffect(() => {
        if (prevSlide === null) return
        const timer = setTimeout(() => setPrevSlide(null), 700)
        return () => clearTimeout(timer)
    }, [prevSlide])

    return (
        <Link href="/exclusive/kylie-cosmetics" className="relative block w-full overflow-hidden">
            <div className="w-full" style={{ aspectRatio: "16/9" }} />
            {banners.map((src, i) => {
                const isCurrent = i === slide
                const isExiting = i === prevSlide

                let transform = "translateX(0)"
                let opacity = 0
                let filter = "blur(0px)"

                if (isCurrent) {
                    transform = "translateX(0)"
                    opacity = 1
                    filter = "blur(0px)"
                } else if (isExiting) {
                    transform = "translateX(-40%)"
                    opacity = 0
                    filter = "blur(6px)"
                } else {
                    transform = "translateX(40%)"
                    filter = "blur(6px)"
                }

                return (
                    <div
                        key={i}
                        className="absolute inset-0"
                        style={{
                            transform,
                            opacity,
                            filter,
                            transition: "opacity 0.7s ease, transform 0.7s ease, filter 0.7s ease",
                        }}
                    >
                        <div
                            className="h-full w-full bg-cover bg-center"
                            style={{ backgroundImage: `url(${src})` }}
                        />
                    </div>
                )
            })}

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
                <div className="h-0.5 w-12 overflow-hidden rounded-full bg-white/30">
                    <div key={slide} className="h-full w-full rounded-full bg-white animate-progress" />
                </div>
                <div className="flex items-center gap-1.5">
                    {banners.map((_, i) => (
                        <button
                            key={i}
                            onClick={(e) => {
                                e.preventDefault()
                                setPrevSlide(slide)
                                setSlide(i)
                            }}
                            className={`rounded-full transition-all ${
                                i === slide ? "bg-white w-3 h-1.5" : "bg-white/50 w-1.5 h-1.5"
                            }`}
                        />
                    ))}
                </div>
            </div>
        </Link>
    )
}
