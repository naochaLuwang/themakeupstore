
// "use client"

// import { useState, useRef, useEffect } from "react"
// import { X, Maximize2, ChevronLeft, ChevronRight } from "lucide-react"
// import { motion, AnimatePresence, useAnimation } from "framer-motion"

// export function ProductImages({ images }: { images: { url: string }[] }) {
//     const [activeIndex, setActiveIndex] = useState(0)
//     const [isLightboxOpen, setIsLightboxOpen] = useState(false)
//     const [zoomStyle, setZoomStyle] = useState({ transformOrigin: 'center center', scale: 1 })
//     const scrollRef = useRef<HTMLDivElement>(null)

//     // Sync scroll position for the main gallery
//     const handleScroll = () => {
//         if (scrollRef.current) {
//             const width = scrollRef.current.offsetWidth
//             const newIndex = Math.round(scrollRef.current.scrollLeft / width)
//             if (newIndex !== activeIndex) setActiveIndex(newIndex)
//         }
//     }

//     const scrollToImage = (index: number) => {
//         if (scrollRef.current) {
//             scrollRef.current.scrollTo({
//                 left: scrollRef.current.offsetWidth * index,
//                 behavior: "smooth"
//             })
//             setActiveIndex(index)
//         }
//     }

//     // Lightbox Swipe Logic
//     const paginate = (newDirection: number) => {
//         const nextIndex = activeIndex + newDirection;
//         if (nextIndex >= 0 && nextIndex < images.length) {
//             setActiveIndex(nextIndex);
//         }
//     }

//     return (
//         <div className="flex flex-col gap-4 md:gap-6">
//             <div className="relative group">
//                 {/* Main Slider (Touch Snap) */}
//                 <div
//                     ref={scrollRef}
//                     onScroll={handleScroll}
//                     className="aspect-square flex overflow-x-auto snap-x snap-mandatory no-scrollbar rounded-[2.5rem] md:rounded-[3rem] bg-slate-50 border border-slate-100"
//                 >
//                     {images.map((img, i) => (
//                         <div
//                             key={i}
//                             className="w-full h-full flex-shrink-0 snap-center overflow-hidden relative cursor-pointer"
//                             onClick={() => setIsLightboxOpen(true)}
//                         >
//                             <img
//                                 src={img.url}
//                                 alt="Product"
//                                 className="h-full w-full object-cover"
//                             />
//                         </div>
//                     ))}
//                 </div>

//                 {/* Mobile Tap-to-Zoom Hint */}
//                 <div className="absolute top-4 right-4 md:hidden bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-sm pointer-events-none">
//                     <Maximize2 className="w-4 h-4 text-slate-900" />
//                 </div>

//                 {/* Indicators */}
//                 {images.length > 1 && (
//                     <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5">
//                         {images.map((_, i) => (
//                             <div key={i} className={`h-1 rounded-full transition-all duration-300 ${activeIndex === i ? "w-6 bg-slate-900" : "w-1.5 bg-slate-400"}`} />
//                         ))}
//                     </div>
//                 )}
//             </div>

//             {/* Thumbnails */}
//             {images.length > 1 && (
//                 <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar px-1">
//                     {images.map((img, i) => (
//                         <button
//                             key={i}
//                             onClick={() => scrollToImage(i)}
//                             className={`w-16 h-16 md:w-24 md:h-24 rounded-2xl border-2 flex-shrink-0 transition-all overflow-hidden ${activeIndex === i ? "border-slate-900 scale-95 shadow-lg" : "border-transparent opacity-40 grayscale"
//                                 }`}
//                         >
//                             <img src={img.url} className="w-full h-full object-cover" />
//                         </button>
//                     ))}
//                 </div>
//             )}

//             {/* FULLSCREEN TOUCH LIGHTBOX */}
//             <AnimatePresence>
//                 {isLightboxOpen && (
//                     <motion.div
//                         initial={{ opacity: 0 }}
//                         animate={{ opacity: 1 }}
//                         exit={{ opacity: 0 }}
//                         className="fixed inset-0 z-[500] bg-white flex flex-col touch-none"
//                     >
//                         {/* Header */}
//                         <div className="p-6 flex justify-between items-center bg-white/80 backdrop-blur-md z-10">
//                             <div>
//                                 <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Detail View</h4>
//                                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{activeIndex + 1} of {images.length}</p>
//                             </div>
//                             <button
//                                 onClick={() => setIsLightboxOpen(false)}
//                                 className="w-12 h-12 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-xl active:scale-90 transition-transform"
//                             >
//                                 <X className="w-6 h-6" />
//                             </button>
//                         </div>

//                         {/* Swipeable Area */}
//                         <div className="flex-1 relative overflow-hidden flex items-center justify-center">
//                             <motion.img
//                                 key={activeIndex}
//                                 src={images[activeIndex].url}
//                                 initial={{ opacity: 0, x: 100 }}
//                                 animate={{ opacity: 1, x: 0 }}
//                                 exit={{ opacity: 0, x: -100 }}
//                                 transition={{ type: "spring", stiffness: 300, damping: 30 }}
//                                 drag="x"
//                                 dragConstraints={{ left: 0, right: 0 }}
//                                 onDragEnd={(_, info) => {
//                                     if (info.offset.x > 50) paginate(-1);
//                                     else if (info.offset.x < -50) paginate(1);
//                                 }}
//                                 className="max-w-[95%] max-h-[80vh] object-contain rounded-3xl"
//                             />

//                             {/* Desktop Navigation Arrows inside Lightbox */}
//                             <div className="hidden md:flex absolute inset-0 justify-between items-center px-10 pointer-events-none">
//                                 <button
//                                     onClick={() => paginate(-1)}
//                                     className="p-4 bg-white/50 backdrop-blur-md rounded-full pointer-events-auto hover:bg-white transition-colors"
//                                 >
//                                     <ChevronLeft className="w-6 h-6" />
//                                 </button>
//                                 <button
//                                     onClick={() => paginate(1)}
//                                     className="p-4 bg-white/50 backdrop-blur-md rounded-full pointer-events-auto hover:bg-white transition-colors"
//                                 >
//                                     <ChevronRight className="w-6 h-6" />
//                                 </button>
//                             </div>
//                         </div>

//                         <div className="p-10 text-center">
//                             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">
//                                 Swipe to navigate • Pinch to zoom
//                             </p>
//                         </div>
//                     </motion.div>
//                 )}
//             </AnimatePresence>
//         </div>
//     )
// }

"use client"

import { useState, useRef, useEffect } from "react"
import { X, Maximize2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export function ProductImages({ images }: { images: { url: string }[] }) {
    const [activeIndex, setActiveIndex] = useState(0)
    const [isLightboxOpen, setIsLightboxOpen] = useState(false)
    const [scale, setScale] = useState(1)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => { setScale(1) }, [activeIndex, isLightboxOpen])

    const handleScroll = () => {
        if (scrollRef.current) {
            const width = scrollRef.current.offsetWidth
            const newIndex = Math.round(scrollRef.current.scrollLeft / width)
            if (newIndex !== activeIndex) setActiveIndex(newIndex)
        }
    }

    const scrollToImage = (index: number) => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ left: scrollRef.current.offsetWidth * index, behavior: "smooth" })
            setActiveIndex(index)
        }
    }

    const paginate = (newDirection: number) => {
        const nextIndex = activeIndex + newDirection;
        if (nextIndex >= 0 && nextIndex < images.length) setActiveIndex(nextIndex);
    }

    return (
        <div className="flex flex-col gap-4 md:gap-6">
            <div className="relative group">
                <div ref={scrollRef} onScroll={handleScroll} className="aspect-square flex overflow-x-auto snap-x snap-mandatory no-scrollbar rounded-[2.5rem] md:rounded-[3rem] bg-slate-50 border border-slate-100">
                    {images.map((img, i) => (
                        <div key={i} className="w-full h-full flex-shrink-0 snap-center overflow-hidden relative cursor-pointer" onClick={() => setIsLightboxOpen(true)}>
                            <img src={img.url} alt="Product" className="h-full w-full object-cover" />
                        </div>
                    ))}
                </div>
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
                        <button key={i} onClick={() => scrollToImage(i)} className={`w-16 h-16 md:w-24 md:h-24 rounded-2xl border-2 flex-shrink-0 overflow-hidden ${activeIndex === i ? "border-slate-900 scale-95" : "border-transparent opacity-40"}`}>
                            <img src={img.url} className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
            )}

            {/* LIGHTBOX */}
            <AnimatePresence>
                {isLightboxOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[500] bg-white flex flex-col touch-none">
                        <div className="p-6 flex justify-between items-center bg-white/80 backdrop-blur-md z-10">
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Detail View</h4>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">{activeIndex + 1} of {images.length}</p>
                            </div>
                            <button onClick={() => setIsLightboxOpen(false)} className="w-12 h-12 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-xl">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-slate-50">
                            <motion.div
                                className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
                                style={{ touchAction: "none" }}
                                // FIXED: If scale is 1, only drag horizontally (x). If scale > 1, drag everywhere.
                                drag={scale > 1 ? true : "x"}
                                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                                dragElastic={0.2}
                                onDragEnd={(_, info) => {
                                    if (scale === 1) {
                                        const threshold = 50;
                                        if (info.offset.x > threshold) paginate(-1);
                                        else if (info.offset.x < -threshold) paginate(1);
                                    }
                                }}
                            >
                                <motion.img
                                    key={activeIndex}
                                    src={images[activeIndex].url}
                                    onDoubleClick={() => setScale(scale === 1 ? 2.5 : 1)}
                                    animate={{ scale }}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    className="max-w-[95%] max-h-[85vh] object-contain rounded-3xl pointer-events-none"
                                />
                            </motion.div>

                            {scale === 1 && (
                                <div className="hidden md:flex absolute inset-0 justify-between items-center px-10 pointer-events-none">
                                    <button onClick={() => paginate(-1)} className="p-4 bg-white/50 backdrop-blur-md rounded-full pointer-events-auto hover:bg-white"><ChevronLeft className="w-6 h-6" /></button>
                                    <button onClick={() => paginate(1)} className="p-4 bg-white/50 backdrop-blur-md rounded-full pointer-events-auto hover:bg-white"><ChevronRight className="w-6 h-6" /></button>
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-white border-t border-slate-100 flex flex-col items-center gap-4">
                            <div className="flex items-center gap-6 bg-slate-100 p-2 rounded-2xl">
                                <button onClick={() => setScale(s => Math.max(s - 0.5, 1))} className="p-2 hover:bg-white rounded-xl shadow-sm"><ZoomOut className="w-5 h-5" /></button>
                                <span className="text-[10px] font-black w-12 text-center tracking-widest">{Math.round(scale * 100)}%</span>
                                <button onClick={() => setScale(s => Math.min(s + 0.5, 4))} className="p-2 hover:bg-white rounded-xl shadow-sm"><ZoomIn className="w-5 h-5" /></button>
                                <div className="w-[1px] h-4 bg-slate-200 mx-1" />
                                <button onClick={() => setScale(1)} className="p-2 hover:bg-white rounded-xl shadow-sm text-slate-400"><RotateCcw className="w-4 h-4" /></button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}