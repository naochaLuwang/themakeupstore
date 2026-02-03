// "use client"

// import { useState, useEffect } from "react"

// export function ProductImages({ images, thumbnail, activeImageFromVariant }: any) {
//     const [mainImage, setMainImage] = useState(activeImageFromVariant || thumbnail || images[0]?.url)
//     const [isAnimating, setIsAnimating] = useState(false)

//     // SYNC: Update main image when variant selection changes
//     useEffect(() => {
//         if (activeImageFromVariant && activeImageFromVariant !== mainImage) {
//             setIsAnimating(true)
//             const timeout = setTimeout(() => {
//                 setMainImage(activeImageFromVariant)
//                 setIsAnimating(false)
//             }, 150) // Quick transition for modern feel
//             return () => clearTimeout(timeout)
//         }
//     }, [activeImageFromVariant])

//     // Fallback if images array changes significantly
//     useEffect(() => {
//         const imageExists = images.some((img: any) => img.url === mainImage)
//         if (!imageExists && images.length > 0 && !activeImageFromVariant) {
//             setMainImage(images[0].url)
//         }
//     }, [images])

//     return (
//         <div className="flex flex-col gap-6">
//             {/* Main Stage */}
//             <div className="aspect-square overflow-hidden rounded-2xl bg-[#f9f9f9] relative border border-slate-100">
//                 <img
//                     src={mainImage}
//                     alt="Product view"
//                     className={`h-full w-full object-cover transition-all duration-300 ease-out ${isAnimating ? "opacity-40 scale-95 blur-sm" : "opacity-100 scale-100 blur-0"
//                         }`}
//                 />
//             </div>

//             {/* Thumbnails */}
//             <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
//                 {images?.map((img: any, i: number) => (
//                     <button
//                         key={img.url + i}
//                         onClick={() => setMainImage(img.url)}
//                         className={`w-20 h-20 rounded-xl border-2 overflow-hidden flex-shrink-0 transition-all ${mainImage === img.url
//                                 ? "border-slate-900 shadow-sm"
//                                 : "border-transparent opacity-60 hover:opacity-100"
//                             }`}
//                     >
//                         <img src={img.url} className="w-full h-full object-cover" alt={`View ${i}`} />
//                     </button>
//                 ))}
//             </div>
//         </div>
//     )
// }
"use client"

import { useState, useRef, useEffect } from "react"

export function ProductImages({ images }: { images: { url: string }[] }) {
    const [activeIndex, setActiveIndex] = useState(0)
    const scrollRef = useRef<HTMLDivElement>(null)

    // Reset scroll to index 0 whenever the image set changes
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ left: 0 });
            setActiveIndex(0);
        }
    }, [images]);

    const handleScroll = () => {
        if (scrollRef.current) {
            const width = scrollRef.current.offsetWidth
            const currentScroll = scrollRef.current.scrollLeft
            const newIndex = Math.round(currentScroll / width)
            if (newIndex !== activeIndex) setActiveIndex(newIndex)
        }
    }

    const scrollToImage = (index: number) => {
        if (scrollRef.current) {
            const width = scrollRef.current.offsetWidth
            scrollRef.current.scrollTo({
                left: width * index,
                behavior: "smooth"
            })
            setActiveIndex(index)
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="relative group overflow-hidden">
                <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="aspect-square flex overflow-x-auto snap-x snap-mandatory no-scrollbar rounded-3xl bg-[#f9f9f9] border border-slate-100"
                >
                    {images.map((img, i) => (
                        <div key={`${img.url}-${i}`} className="w-full h-full flex-shrink-0 snap-center">
                            <img
                                src={img.url}
                                alt="Product variant"
                                className="h-full w-full object-cover pointer-events-none"
                            />
                        </div>
                    ))}
                </div>

                {/* Mobile indicators */}
                {images.length > 1 && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 lg:hidden">
                        {images.map((_, i) => (
                            <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${activeIndex === i ? "w-6 bg-slate-900" : "w-1.5 bg-slate-300"}`} />
                        ))}
                    </div>
                )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                    {images.map((img, i) => (
                        <button
                            key={`${img.url}-thumb-${i}`}
                            onClick={() => scrollToImage(i)}
                            className={`w-20 h-20 rounded-2xl border-2 overflow-hidden flex-shrink-0 transition-all ${activeIndex === i ? "border-slate-900 shadow-md" : "border-transparent opacity-40"
                                }`}
                        >
                            <img src={img.url} className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}