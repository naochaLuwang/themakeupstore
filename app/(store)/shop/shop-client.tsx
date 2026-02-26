// "use client"

// import * as React from "react"
// import { ProductCard } from "@/components/store/product-card"
// import { SlidersHorizontal, X, Check, Package, RotateCcw } from "lucide-react"
// import { motion, AnimatePresence } from "framer-motion"
// import Link from "next/link"

// export default function ShopClient({ initialProducts, searchQuery }: { initialProducts: any[], searchQuery: string }) {
//     const [products, setProducts] = React.useState(initialProducts)
//     const [filtered, setFiltered] = React.useState(initialProducts)

//     // UI & Navigation State
//     const [isFilterOpen, setIsFilterOpen] = React.useState(false)
//     const [sortBy, setSortBy] = React.useState("newest")
//     const [selectedBrand, setSelectedBrand] = React.useState<string | null>(null)
//     const [isVisible, setIsVisible] = React.useState(true)
//     const lastScrollY = React.useRef(0)

//     // Sync products when server props change (e.g., new search query)
//     React.useEffect(() => {
//         setProducts(initialProducts)
//     }, [initialProducts])

//     // Floating Button Visibility Logic
//     React.useEffect(() => {
//         const controlNavbar = () => {
//             if (window.scrollY > lastScrollY.current && window.scrollY > 100) {
//                 setIsVisible(false)
//             } else {
//                 setIsVisible(true)
//             }
//             lastScrollY.current = window.scrollY
//         }
//         window.addEventListener('scroll', controlNavbar)
//         return () => window.removeEventListener('scroll', controlNavbar)
//     }, [])

//     // Filter & Sort Engine
//     React.useEffect(() => {
//         let result = [...products]

//         if (selectedBrand) {
//             result = result.filter(p => p.brand === selectedBrand)
//         }

//         result.sort((a, b) => {
//             if (sortBy === "price-low") return (a.product_variants?.[0]?.price || 0) - (b.product_variants?.[0]?.price || 0)
//             if (sortBy === "price-high") return (b.product_variants?.[0]?.price || 0) - (a.product_variants?.[0]?.price || 0)
//             if (sortBy === "alphabetical") return a.name.localeCompare(b.name)
//             return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
//         })

//         setFiltered(result)
//     }, [selectedBrand, sortBy, products])

//     const brands = Array.from(new Set(products.map(p => p.brand))).filter(Boolean).sort()
//     const isFiltered = selectedBrand !== null || sortBy !== 'newest'

//     const handleFilterSelection = (type: 'sort' | 'brand', value: any) => {
//         if (type === 'sort') setSortBy(value)
//         if (type === 'brand') setSelectedBrand(value)
//         setIsFilterOpen(false)
//     }

//     const resetFilters = () => {
//         setSelectedBrand(null)
//         setSortBy('newest')
//     }

//     return (
//         <div className="min-h-auto bg-white text-[#1A1A1A] pb-8 relative selection:bg-zinc-900 selection:text-white">

//             {/* 1. MAIN CONTENT (Blurs when Refine Drawer is open) */}
//             <div className={`transition-all duration-700 ease-in-out ${isFilterOpen ? 'blur-2xl scale-[0.96] opacity-30 pointer-events-none' : 'blur-0 scale-100 opacity-100 pointer-events-auto'}`}>

//                 {/* DYNAMIC HEADER */}
//                 <div className="bg-white pt-8 pb-8 border-b border-zinc-50">
//                     <div className="max-w-6xl mx-auto px-6">
//                         <motion.div
//                             initial={{ width: 0 }} animate={{ width: 32 }}
//                             className="h-[1px] bg-zinc-900 mb-8"
//                         />
//                         <h1 className="text-5xl md:text-8xl font-serif tracking-tighter uppercase leading-[0.8] mb-6">
//                             {searchQuery ? (
//                                 <><span className="text-zinc-300 italic">Found:</span> <br />{searchQuery}</>
//                             ) : (
//                                 <>The <br /><span className=" font-normal">Collection</span></>
//                             )}
//                         </h1>
//                         <div className="flex items-center justify-between">
//                             <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">
//                                 {filtered.length} Items Indexed
//                             </p>
//                             {isFiltered && (
//                                 <button onClick={resetFilters} className="text-[10px] font-black uppercase tracking-widest text-zinc-900 border-b border-zinc-900">
//                                     Clear All
//                                 </button>
//                             )}
//                         </div>
//                     </div>
//                 </div>

//                 {/* GRID SYSTEM */}
//                 <main className="max-w-6xl mx-auto px-6 py-20">
//                     {filtered.length > 0 ? (
//                         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-16">
//                             {filtered.map((product) => (
//                                 <ProductCard key={product.id} product={product} />
//                             ))}
//                         </div>
//                     ) : (
//                         <div className="py-40 text-center flex flex-col items-center">
//                             <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mb-6">
//                                 <Package className="w-6 h-6 text-zinc-200 stroke-[1.5]" />
//                             </div>
//                             <h3 className="text-xl font-serif italic mb-2">Null Result</h3>
//                             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-8 max-w-[200px] leading-loose">
//                                 Your current refinement yielded zero matches.
//                             </p>
//                             <button onClick={resetFilters} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-zinc-900 text-white px-8 py-4 rounded-full">
//                                 <RotateCcw className="w-3 h-3" /> Reset Grid
//                             </button>
//                         </div>
//                     )}
//                 </main>
//             </div>

//             {/* 2. FLOATING REFINE SYSTEM */}
//             <AnimatePresence>
//                 {isVisible && !isFilterOpen && (
//                     <div className="fixed bottom-24 right-6 z-[60] flex flex-col items-end gap-3 md:bottom-10 md:right-10">

//                         {/* CONTEXTUAL RESET BADGE */}
//                         {isFiltered && (
//                             <motion.button
//                                 initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
//                                 onClick={resetFilters}
//                                 className="bg-white border border-zinc-100 text-zinc-400 px-5 py-3 rounded-full shadow-2xl text-[9px] font-black uppercase tracking-widest hover:text-red-500 transition-colors flex items-center gap-2 backdrop-blur-xl"
//                             >
//                                 <X className="w-3 h-3" /> Clear
//                             </motion.button>
//                         )}

//                         {/* MAIN REFINE BUTTON */}
//                         <motion.button
//                             initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
//                             onClick={() => setIsFilterOpen(true)}
//                             className="bg-zinc-900 text-white p-6 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.2)] hover:scale-110 active:scale-95 transition-all relative group"
//                         >
//                             <SlidersHorizontal className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
//                             {isFiltered && (
//                                 <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full" />
//                             )}
//                         </motion.button>
//                     </div>
//                 )}
//             </AnimatePresence>

//             {/* 3. REFINE DRAWER */}
//             <AnimatePresence>
//                 {isFilterOpen && (
//                     <>
//                         {/* Backdrop - Clicking this closes the drawer */}
//                         <motion.div
//                             initial={{ opacity: 0 }}
//                             animate={{ opacity: 1 }}
//                             exit={{ opacity: 0 }}
//                             onClick={() => setIsFilterOpen(false)}
//                             className="fixed inset-0 bg-black/10 backdrop-blur-sm z-[80] cursor-crosshair"
//                         />

//                         <motion.div
//                             initial={{ y: "100%" }}
//                             animate={{ y: 0 }}
//                             exit={{ y: "100%" }}
//                             transition={{ type: "spring", damping: 30, stiffness: 300 }}
//                             className="fixed bottom-0 left-0 right-0 bg-white z-[90] rounded-t-[3rem] 
//                            flex flex-col overflow-hidden
//                            max-h-[85vh] md:max-h-full 
//                            md:left-auto md:right-0 md:w-full md:max-w-md md:rounded-none md:h-full 
//                            shadow-[-40px_0_80px_-20px_rgba(0,0,0,0.1)]"
//                         >
//                             {/* STICKY HEADER WITH CLEAR ALL */}
//                             <div className="px-10 py-8 border-b border-zinc-50 flex items-center justify-between shrink-0 bg-white">
//                                 <div className="flex items-center gap-4">
//                                     <button
//                                         onClick={() => setIsFilterOpen(false)}
//                                         className="p-2 -ml-2 hover:bg-zinc-50 rounded-full transition-colors"
//                                     >
//                                         <X className="w-5 h-5 text-zinc-900" />
//                                     </button>
//                                     <div>
//                                         <h2 className="text-[11px] font-black uppercase tracking-[0.4em]">Refine</h2>
//                                     </div>
//                                 </div>

//                                 {/* CLEAR ALL BUTTON */}
//                                 {isFiltered && (
//                                     <motion.button
//                                         initial={{ opacity: 0, x: 10 }}
//                                         animate={{ opacity: 1, x: 0 }}
//                                         onClick={resetFilters}
//                                         className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:opacity-70 transition-opacity"
//                                     >
//                                         Clear All
//                                     </motion.button>
//                                 )}
//                             </div>

//                             {/* SCROLLABLE CONTENT - No Footer needed now */}
//                             <div className="flex-1 overflow-y-auto p-10 space-y-16 no-scrollbar pb-10">
//                                 {/* SORT SECTION */}
//                                 <section className="space-y-4">
//                                     <h3 className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em]">Sort Logic</h3>
//                                     <div className="flex flex-col gap-1">
//                                         {[
//                                             { id: 'newest', label: 'Recently Added' },
//                                             { id: 'alphabetical', label: 'Alphabetical' },
//                                             { id: 'price-low', label: 'Value: Low to High' },
//                                             { id: 'price-high', label: 'Value: High to Low' }
//                                         ].map((opt) => (
//                                             <button
//                                                 key={opt.id}
//                                                 onClick={() => handleFilterSelection('sort', opt.id)}
//                                                 className={`flex items-center justify-between py-4 px-6 rounded-2xl transition-all ${sortBy === opt.id ? 'bg-zinc-900 text-white shadow-lg' : 'hover:bg-zinc-50 text-zinc-500'}`}
//                                             >
//                                                 <span className="text-xs font-bold uppercase tracking-wide">{opt.label}</span>
//                                                 {sortBy === opt.id && <Check className="w-4 h-4 text-white" />}
//                                             </button>
//                                         ))}
//                                     </div>
//                                 </section>

//                                 {/* BRANDS SECTION */}
//                                 <section className="space-y-4">
//                                     <h3 className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em]">Brands</h3>
//                                     <div className="flex flex-wrap gap-2.5">
//                                         {brands.map((brand) => (
//                                             <button
//                                                 key={brand}
//                                                 onClick={() => handleFilterSelection('brand', brand)}
//                                                 className={`px-6 py-3 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all ${selectedBrand === brand ? 'bg-zinc-900 text-white border-zinc-900 shadow-md' : 'bg-white text-zinc-400 border-zinc-100 hover:border-zinc-300'}`}
//                                             >
//                                                 {brand}
//                                             </button>
//                                         ))}
//                                     </div>
//                                 </section>
//                             </div>
//                         </motion.div>
//                     </>
//                 )}
//             </AnimatePresence>
//         </div>
//     )
// }


"use client"

import * as React from "react"
import { ProductCard } from "@/components/store/product-card"
import { SlidersHorizontal, X, Check, Package, RotateCcw, Sparkles, Filter, ListFilter } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"

export default function ShopClient({ initialProducts, searchQuery }: { initialProducts: any[], searchQuery: string }) {
    const [products, setProducts] = React.useState(initialProducts)
    const [filtered, setFiltered] = React.useState(initialProducts)

    // UI & Navigation State
    const [isFilterOpen, setIsFilterOpen] = React.useState(false)
    const [sortBy, setSortBy] = React.useState("newest")
    const [selectedBrand, setSelectedBrand] = React.useState<string | null>(null)
    const [isVisible, setIsVisible] = React.useState(true)
    const lastScrollY = React.useRef(0)

    React.useEffect(() => { setProducts(initialProducts) }, [initialProducts])

    React.useEffect(() => {
        const controlNavbar = () => {
            if (window.scrollY > lastScrollY.current && window.scrollY > 100) setIsVisible(false)
            else setIsVisible(true)
            lastScrollY.current = window.scrollY
        }
        window.addEventListener('scroll', controlNavbar)
        return () => window.removeEventListener('scroll', controlNavbar)
    }, [])

    React.useEffect(() => {
        let result = [...products]
        if (selectedBrand) result = result.filter(p => p.brand === selectedBrand)
        result.sort((a, b) => {
            if (sortBy === "price-low") return (a.product_variants?.[0]?.price || 0) - (b.product_variants?.[0]?.price || 0)
            if (sortBy === "price-high") return (b.product_variants?.[0]?.price || 0) - (a.product_variants?.[0]?.price || 0)
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })
        setFiltered(result)
    }, [selectedBrand, sortBy, products])

    const brands = Array.from(new Set(products.map(p => p.brand))).filter(Boolean).sort()
    const isFiltered = selectedBrand !== null || sortBy !== 'newest'

    const handleFilterSelection = (type: 'sort' | 'brand', value: any) => {
        if (type === 'sort') setSortBy(value)
        if (type === 'brand') setSelectedBrand(value)
    }

    const resetFilters = () => {
        setSelectedBrand(null)
        setSortBy('newest')
    }

    return (
        <div className="min-h-screen bg-[#F9F9F9] text-slate-900 pb-20 relative">

            {/* 1. BRANDED HEADER (NYKAA STYLE) */}
            <div className={`transition-all duration-500 ${isFilterOpen ? 'blur-md opacity-40' : 'opacity-100'}`}>
                <div className="bg-white pt-10 pb-10 border-b border-pink-50 rounded-b-[2.5rem] shadow-sm">
                    <div className="max-w-6xl mx-auto px-6">
                        <motion.div
                            initial={{ scale: 0 }} animate={{ scale: 1 }}
                            className="flex items-center gap-2 mb-4 text-[#fc2779]"
                        >
                            <Sparkles className="w-4 h-4 fill-[#fc2779]" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Curated Selection</span>
                        </motion.div>

                        <h1 className="text-4xl md:text-6xl font-serif italic text-slate-950 leading-tight mb-6">
                            {searchQuery ? (
                                <>Search <span className="text-[#fc2779]">results</span> for <br />&quot;{searchQuery}&quot;</>
                            ) : (
                                <>Our <span className="text-[#fc2779]">Collection</span></>
                            )}
                        </h1>

                        <div className="flex items-center justify-between bg-pink-50/50 p-4 rounded-2xl border border-pink-100/50">
                            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                                {filtered.length} Premium Products
                            </p>
                            {isFiltered && (
                                <button onClick={resetFilters} className="text-[10px] font-black uppercase text-[#fc2779] border-b-2 border-[#fc2779]">
                                    Reset Filters
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* PRODUCT GRID */}
                <main className="max-w-6xl mx-auto px-6 py-16">
                    {filtered.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 md:gap-x-8 gap-y-12">
                            {filtered.map((product) => (
                                <div key={product.id} className="hover:-translate-y-1 transition-transform duration-500">
                                    <ProductCard product={product} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-40 text-center flex flex-col items-center bg-white rounded-[3rem] border-2 border-dashed border-pink-100">
                            <Package className="w-12 h-12 text-pink-100 mb-6" />
                            <h3 className="text-xl font-serif italic text-slate-400">No matches found</h3>
                            <button onClick={resetFilters} className="mt-6 text-[10px] font-black uppercase tracking-widest bg-[#fc2779] text-white px-10 py-4 rounded-full shadow-lg shadow-pink-200">
                                Clear All
                            </button>
                        </div>
                    )}
                </main>
            </div>

            {/* 2. FLOATING REFINE BUTTON (NYKAA STYLE) */}
            <AnimatePresence>
                {isVisible && (
                    <div className="fixed bottom-28 left-0 right-0 z-[60] flex justify-center lg:bottom-10 pointer-events-none">
                        <motion.button
                            initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
                            onClick={() => setIsFilterOpen(true)}
                            className="pointer-events-auto bg-[#fc2779] text-white px-8 py-4 rounded-full shadow-2xl shadow-pink-500/30 flex items-center gap-3 hover:scale-105 active:scale-95 transition-all group"
                        >
                            <ListFilter className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Refine Selection</span>
                            {isFiltered && (
                                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                            )}
                        </motion.button>
                    </div>
                )}
            </AnimatePresence>

            {/* 3. NYKAA DRAWER (SHEET UI) */}
            <AnimatePresence>
                {isFilterOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsFilterOpen(false)}
                            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[80]"
                        />

                        <motion.div
                            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            className="fixed bottom-0 left-0 right-0 bg-white z-[90] rounded-t-[3rem] shadow-2xl max-h-[85vh] flex flex-col max-w-lg mx-auto"
                        >
                            <div className="p-8 border-b border-slate-50 flex items-center justify-between shrink-0">
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-serif italic text-slate-900 leading-none">Filter & Sort</h2>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Adjust your boutique view</p>
                                </div>
                                <button onClick={() => setIsFilterOpen(false)} className="h-10 w-10 flex items-center justify-center bg-slate-50 rounded-full">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-12 no-scrollbar">
                                {/* SORT */}
                                <section className="space-y-4">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Sort Order</h3>
                                    <div className="grid grid-cols-1 gap-2">
                                        {[
                                            { id: 'newest', label: 'Recently Dropped' },
                                            { id: 'price-low', label: 'Price: Low to High' },
                                            { id: 'price-high', label: 'Price: High to Low' }
                                        ].map((opt) => (
                                            <button
                                                key={opt.id}
                                                onClick={() => handleFilterSelection('sort', opt.id)}
                                                className={`flex items-center justify-between py-4 px-6 rounded-2xl border-2 transition-all ${sortBy === opt.id ? 'border-[#fc2779] bg-pink-50/50 text-[#fc2779]' : 'border-slate-50 text-slate-500'}`}
                                            >
                                                <span className="text-xs font-bold uppercase tracking-wide">{opt.label}</span>
                                                {sortBy === opt.id && <Check className="w-4 h-4" />}
                                            </button>
                                        ))}
                                    </div>
                                </section>

                                {/* BRANDS */}
                                <section className="space-y-4">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">The Brands</h3>
                                    <div className="flex flex-wrap gap-2.5">
                                        {brands.map((brand) => (
                                            <button
                                                key={brand}
                                                onClick={() => handleFilterSelection('brand', brand)}
                                                className={`px-5 py-3 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest transition-all ${selectedBrand === brand ? 'bg-[#fc2779] text-white border-[#fc2779]' : 'bg-white text-slate-400 border-slate-100'}`}
                                            >
                                                {brand}
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            </div>

                            <div className="p-8 bg-white border-t border-slate-50">
                                <button
                                    onClick={() => setIsFilterOpen(false)}
                                    className="w-full py-5 bg-[#fc2779] text-white text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-pink-200"
                                >
                                    Apply Changes
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}