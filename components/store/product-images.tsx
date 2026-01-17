"use client"

import { useState, useEffect } from "react"

export function ProductImages({ images, thumbnail, activeImageFromVariant }: any) {
    const [mainImage, setMainImage] = useState(activeImageFromVariant || thumbnail || images[0]?.url)
    const [isAnimating, setIsAnimating] = useState(false)

    // SYNC: Update main image when variant selection changes
    useEffect(() => {
        if (activeImageFromVariant && activeImageFromVariant !== mainImage) {
            setIsAnimating(true)
            const timeout = setTimeout(() => {
                setMainImage(activeImageFromVariant)
                setIsAnimating(false)
            }, 150) // Quick transition for modern feel
            return () => clearTimeout(timeout)
        }
    }, [activeImageFromVariant])

    // Fallback if images array changes significantly
    useEffect(() => {
        const imageExists = images.some((img: any) => img.url === mainImage)
        if (!imageExists && images.length > 0 && !activeImageFromVariant) {
            setMainImage(images[0].url)
        }
    }, [images])

    return (
        <div className="flex flex-col gap-6">
            {/* Main Stage */}
            <div className="aspect-square overflow-hidden rounded-2xl bg-[#f9f9f9] relative border border-slate-100">
                <img
                    src={mainImage}
                    alt="Product view"
                    className={`h-full w-full object-cover transition-all duration-300 ease-out ${isAnimating ? "opacity-40 scale-95 blur-sm" : "opacity-100 scale-100 blur-0"
                        }`}
                />
            </div>

            {/* Thumbnails */}
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                {images?.map((img: any, i: number) => (
                    <button
                        key={img.url + i}
                        onClick={() => setMainImage(img.url)}
                        className={`w-20 h-20 rounded-xl border-2 overflow-hidden flex-shrink-0 transition-all ${mainImage === img.url
                                ? "border-slate-900 shadow-sm"
                                : "border-transparent opacity-60 hover:opacity-100"
                            }`}
                    >
                        <img src={img.url} className="w-full h-full object-cover" alt={`View ${i}`} />
                    </button>
                ))}
            </div>
        </div>
    )
}