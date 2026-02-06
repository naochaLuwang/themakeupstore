
// "use client"

// import { useState, useRef, useEffect } from "react"

// export function ProductImages({ images }: { images: { url: string }[] }) {
//     const [activeIndex, setActiveIndex] = useState(0)
//     const scrollRef = useRef<HTMLDivElement>(null)

//     // Reset scroll to index 0 whenever the image set changes
//     useEffect(() => {
//         if (scrollRef.current) {
//             scrollRef.current.scrollTo({ left: 0 });
//             setActiveIndex(0);
//         }
//     }, [images]);

//     const handleScroll = () => {
//         if (scrollRef.current) {
//             const width = scrollRef.current.offsetWidth
//             const currentScroll = scrollRef.current.scrollLeft
//             const newIndex = Math.round(currentScroll / width)
//             if (newIndex !== activeIndex) setActiveIndex(newIndex)
//         }
//     }

//     const scrollToImage = (index: number) => {
//         if (scrollRef.current) {
//             const width = scrollRef.current.offsetWidth
//             scrollRef.current.scrollTo({
//                 left: width * index,
//                 behavior: "smooth"
//             })
//             setActiveIndex(index)
//         }
//     }

//     return (
//         <div className="flex flex-col gap-6">
//             <div className="relative group overflow-hidden">
//                 <div
//                     ref={scrollRef}
//                     onScroll={handleScroll}
//                     className="aspect-square flex overflow-x-auto snap-x snap-mandatory no-scrollbar rounded-3xl bg-[#f9f9f9] border border-slate-100"
//                 >
//                     {images.map((img, i) => (
//                         <div key={`${img.url}-${i}`} className="w-full h-full flex-shrink-0 snap-center">
//                             <img
//                                 src={img.url}
//                                 alt="Product variant"
//                                 className="h-full w-full object-cover pointer-events-none"
//                             />
//                         </div>
//                     ))}
//                 </div>

//                 {/* Mobile indicators */}
//                 {images.length > 1 && (
//                     <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 lg:hidden">
//                         {images.map((_, i) => (
//                             <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${activeIndex === i ? "w-6 bg-slate-900" : "w-1.5 bg-slate-300"}`} />
//                         ))}
//                     </div>
//                 )}
//             </div>

//             {/* Thumbnails */}
//             {images.length > 1 && (
//                 <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
//                     {images.map((img, i) => (
//                         <button
//                             key={`${img.url}-thumb-${i}`}
//                             onClick={() => scrollToImage(i)}
//                             className={`w-20 h-20 rounded-2xl border-2 overflow-hidden flex-shrink-0 transition-all ${activeIndex === i ? "border-slate-900 shadow-md" : "border-transparent opacity-40"
//                                 }`}
//                         >
//                             <img src={img.url} className="w-full h-full object-cover" />
//                         </button>
//                     ))}
//                 </div>
//             )}
//         </div>
//     )
// }


"use client"

import { useState, useRef, useEffect } from "react"
import { X, Maximize2, ChevronLeft, ChevronRight } from "lucide-react"
import { motion, AnimatePresence, useAnimation } from "framer-motion"

export function ProductImages({ images }: { images: { url: string }[] }) {
    const [activeIndex, setActiveIndex] = useState(0)
    const [isLightboxOpen, setIsLightboxOpen] = useState(false)
    const [zoomStyle, setZoomStyle] = useState({ transformOrigin: 'center center', scale: 1 })
    const scrollRef = useRef<HTMLDivElement>(null)

    // Sync scroll position for the main gallery
    const handleScroll = () => {
        if (scrollRef.current) {
            const width = scrollRef.current.offsetWidth
            const newIndex = Math.round(scrollRef.current.scrollLeft / width)
            if (newIndex !== activeIndex) setActiveIndex(newIndex)
        }
    }

    const scrollToImage = (index: number) => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                left: scrollRef.current.offsetWidth * index,
                behavior: "smooth"
            })
            setActiveIndex(index)
        }
    }

    // Lightbox Swipe Logic
    const paginate = (newDirection: number) => {
        const nextIndex = activeIndex + newDirection;
        if (nextIndex >= 0 && nextIndex < images.length) {
            setActiveIndex(nextIndex);
        }
    }

    return (
        <div className="flex flex-col gap-4 md:gap-6">
            <div className="relative group">
                {/* Main Slider (Touch Snap) */}
                <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="aspect-square flex overflow-x-auto snap-x snap-mandatory no-scrollbar rounded-[2.5rem] md:rounded-[3rem] bg-slate-50 border border-slate-100"
                >
                    {images.map((img, i) => (
                        <div
                            key={i}
                            className="w-full h-full flex-shrink-0 snap-center overflow-hidden relative cursor-pointer"
                            onClick={() => setIsLightboxOpen(true)}
                        >
                            <img
                                src={img.url}
                                alt="Product"
                                className="h-full w-full object-cover"
                            />
                        </div>
                    ))}
                </div>

                {/* Mobile Tap-to-Zoom Hint */}
                <div className="absolute top-4 right-4 md:hidden bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-sm pointer-events-none">
                    <Maximize2 className="w-4 h-4 text-slate-900" />
                </div>

                {/* Indicators */}
                {images.length > 1 && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {images.map((_, i) => (
                            <div key={i} className={`h-1 rounded-full transition-all duration-300 ${activeIndex === i ? "w-6 bg-slate-900" : "w-1.5 bg-slate-400"}`} />
                        ))}
                    </div>
                )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar px-1">
                    {images.map((img, i) => (
                        <button
                            key={i}
                            onClick={() => scrollToImage(i)}
                            className={`w-16 h-16 md:w-24 md:h-24 rounded-2xl border-2 flex-shrink-0 transition-all overflow-hidden ${activeIndex === i ? "border-slate-900 scale-95 shadow-lg" : "border-transparent opacity-40 grayscale"
                                }`}
                        >
                            <img src={img.url} className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
            )}

            {/* FULLSCREEN TOUCH LIGHTBOX */}
            <AnimatePresence>
                {isLightboxOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[500] bg-white flex flex-col touch-none"
                    >
                        {/* Header */}
                        <div className="p-6 flex justify-between items-center bg-white/80 backdrop-blur-md z-10">
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Detail View</h4>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{activeIndex + 1} of {images.length}</p>
                            </div>
                            <button
                                onClick={() => setIsLightboxOpen(false)}
                                className="w-12 h-12 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-xl active:scale-90 transition-transform"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Swipeable Area */}
                        <div className="flex-1 relative overflow-hidden flex items-center justify-center">
                            <motion.img
                                key={activeIndex}
                                src={images[activeIndex].url}
                                initial={{ opacity: 0, x: 100 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -100 }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                drag="x"
                                dragConstraints={{ left: 0, right: 0 }}
                                onDragEnd={(_, info) => {
                                    if (info.offset.x > 50) paginate(-1);
                                    else if (info.offset.x < -50) paginate(1);
                                }}
                                className="max-w-[95%] max-h-[80vh] object-contain rounded-3xl"
                            />

                            {/* Desktop Navigation Arrows inside Lightbox */}
                            <div className="hidden md:flex absolute inset-0 justify-between items-center px-10 pointer-events-none">
                                <button
                                    onClick={() => paginate(-1)}
                                    className="p-4 bg-white/50 backdrop-blur-md rounded-full pointer-events-auto hover:bg-white transition-colors"
                                >
                                    <ChevronLeft className="w-6 h-6" />
                                </button>
                                <button
                                    onClick={() => paginate(1)}
                                    className="p-4 bg-white/50 backdrop-blur-md rounded-full pointer-events-auto hover:bg-white transition-colors"
                                >
                                    <ChevronRight className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        <div className="p-10 text-center">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">
                                Swipe to navigate • Pinch to zoom
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}