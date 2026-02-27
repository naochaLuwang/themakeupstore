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
import { X, Check, Package, Sparkles, ListFilter, ArrowUpDown, RotateCcw, LayoutGrid, Zap, ChevronRight } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export default function ShopClient({ initialProducts, searchQuery }: { initialProducts: any[], searchQuery: string }) {
    const [products, setProducts] = React.useState(initialProducts)
    const [filtered, setFiltered] = React.useState(initialProducts)

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
        if (type === 'brand') setSelectedBrand(selectedBrand === value ? null : value)
        // Manual close for Sort, but maybe keep open for Brands? 
        // For best UX, let's close after any selection to show results.
        setTimeout(() => setIsFilterOpen(false), 400)
    }

    return (
        <div className="min-h-screen bg-white text-slate-900 pb-24 relative selection:bg-pink-100">

            {/* MAIN CONTENT AREA */}
            <div className={`transition-all duration-700 ${isFilterOpen ? 'blur-2xl scale-[0.98] opacity-30' : 'opacity-100'}`}>

                {/* 1. MINIMALIST EDITORIAL HEADER */}
                <header className="bg-white border-b border-slate-50">
                    <div className="max-w-7xl mx-auto px-6 py-12 md:py-20">
                        <div className="flex items-center gap-2 mb-4 text-[#fc2779]">
                            <Zap className="w-3.5 h-3.5 fill-[#fc2779]" />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em]">The Official Edit</span>
                        </div>

                        <h1 className="text-4xl md:text-8xl font-serif italic text-slate-950 leading-[0.9] tracking-tighter">
                            {searchQuery ? (
                                <>Results: <span className="text-[#fc2779]">&quot;{searchQuery}&quot;</span></>
                            ) : (
                                <>The  Catalog</>
                            )}
                        </h1>

                        <div className="mt-10 flex items-center gap-6">
                            <div className="flex items-center gap-2 text-slate-300">
                                <LayoutGrid className="w-4 h-4" />
                                <span className="text-[11px] font-black uppercase tracking-widest">{filtered.length} Selections</span>
                            </div>
                            {isFiltered && (
                                <button onClick={() => { setSelectedBrand(null); setSortBy('newest') }} className="text-[10px] font-black text-[#fc2779] uppercase border-b border-[#fc2779] pb-0.5">
                                    Reset All
                                </button>
                            )}
                        </div>
                    </div>
                </header>

                {/* 2. SEAMLESS GRID */}
                <main className="max-w-7xl mx-auto px-6 py-6">
                    {filtered.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-px bg-pink-50 border-y border-pink-50 md:border-x md:rounded-[2.5rem] overflow-hidden shadow-sm">
                            {filtered.map((product) => (
                                <div key={product.id} className="bg-white hover:z-10 transition-all">
                                    <ProductCard product={product} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-40 text-center flex flex-col items-center">
                            <Package className="w-12 h-12 text-pink-100 mb-6" />
                            <h3 className="text-xl font-serif italic text-slate-300">No items match your criteria</h3>
                        </div>
                    )}
                </main>
            </div>

            {/* 3. REFINED FLOATING ACTION BUTTON (FAB) */}
            <AnimatePresence>
                {isVisible && (
                    <div className="fixed bottom-20 right-10 z-[60] pointer-events-none">
                        <motion.button
                            initial={{ scale: 0, rotate: -45 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0, rotate: 45 }}
                            onClick={() => setIsFilterOpen(true)}
                            className="pointer-events-auto bg-[#fc2779] text-white w-16 h-16 rounded-full shadow-[0_20px_50px_rgba(252,39,121,0.3)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all relative group"
                        >
                            <ListFilter className="w-7 h-7 group-hover:scale-110 transition-transform" />
                            {isFiltered && (
                                <span className="absolute -top-1 -right-1 w-6 h-6 bg-slate-950 border-4 border-white text-[10px] font-black rounded-full flex items-center justify-center animate-bounce">
                                    !
                                </span>
                            )}
                        </motion.button>
                    </div>
                )}
            </AnimatePresence>

            {/* 4. SIDE SLIDE DRAWER (NYKAA LUXE STYLE) */}
            <AnimatePresence>
                {isFilterOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsFilterOpen(false)}
                            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xl z-[500]"
                        />

                        <motion.div
                            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed top-0 right-0 bottom-0 w-full max-w-[400px] bg-white z-[501] shadow-2xl flex flex-col"
                        >
                            {/* Header */}
                            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                                <div className="space-y-1">
                                    <h2 className="text-3xl font-serif italic text-slate-900">Refine</h2>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tailor your boutique view</p>
                                </div>
                                <button onClick={() => setIsFilterOpen(false)} className="w-12 h-12 flex items-center justify-center bg-white rounded-full shadow-sm hover:rotate-90 transition-all duration-500">
                                    <X className="w-5 h-5 text-slate-950" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-12 no-scrollbar">

                                {/* 4a. SORT SECTION (Vertical) */}
                                <section className="space-y-6">
                                    <label className="text-[11px] font-black uppercase tracking-[0.3em] text-[#fc2779] flex items-center gap-3">
                                        <ArrowUpDown className="w-3.5 h-3.5" /> Sort Order
                                    </label>
                                    <div className="grid gap-2">
                                        {[
                                            { id: 'newest', label: 'Newest First' },
                                            { id: 'price-low', label: 'Price: Low to High' },
                                            { id: 'price-high', label: 'Price: High to Low' }
                                        ].map((opt) => (
                                            <button
                                                key={opt.id}
                                                onClick={() => handleFilterSelection('sort', opt.id)}
                                                className={`group flex items-center justify-between p-5 rounded-2xl border transition-all ${sortBy === opt.id ? 'bg-pink-50 border-[#fc2779] text-[#fc2779]' : 'border-slate-100 text-slate-500 hover:border-pink-100 hover:bg-pink-50/20'}`}
                                            >
                                                <span className="text-xs font-bold uppercase tracking-wide">{opt.label}</span>
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${sortBy === opt.id ? 'bg-[#fc2779] border-[#fc2779]' : 'border-slate-200'}`}>
                                                    {sortBy === opt.id && <Check className="w-3 h-3 text-white stroke-[4]" />}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </section>

                                {/* 4b. BRAND SECTION (Scrollable Grid) */}
                                <section className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[11px] font-black uppercase tracking-[0.3em] text-[#fc2779] flex items-center gap-3">
                                            <Sparkles className="w-3.5 h-3.5" /> Brands
                                        </label>
                                        <span className="text-[10px] font-bold text-slate-300">{brands.length} Available</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => handleFilterSelection('brand', null)}
                                            className={`p-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${!selectedBrand ? 'bg-slate-950 text-white border-slate-950' : 'bg-slate-50 text-slate-400 border-slate-50'}`}
                                        >
                                            All Brands
                                        </button>
                                        {brands.map((brand) => (
                                            <button
                                                key={brand}
                                                onClick={() => handleFilterSelection('brand', brand)}
                                                className={`p-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${selectedBrand === brand ? 'bg-[#fc2779] text-white border-[#fc2779] shadow-lg shadow-pink-100' : 'bg-slate-50 text-slate-400 border-slate-50 hover:bg-pink-50/50 hover:text-slate-600'}`}
                                            >
                                                {brand}
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            </div>

                            {/* Footer */}
                            <div className="p-8 bg-slate-50/50 border-t border-slate-100">
                                <button
                                    onClick={() => setIsFilterOpen(false)}
                                    className="w-full h-16 bg-slate-950 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl"
                                >
                                    Done <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}