
// "use client"

// import * as React from "react"
// import { useParams } from "next/navigation"
// import Link from "next/link"
// import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion"
// import {
//     ArrowLeft,
//     SlidersHorizontal,
//     X,
//     Check,
//     Search,
//     RotateCcw,
//     ChevronRight
// } from "lucide-react"
// import { createClient } from "@/utils/supabase/client"
// import { ProductCard } from "@/components/store/product-card"

// export default function CategoryPage() {
//     const { slug } = useParams()
//     const supabase = createClient()

//     // Data States
//     const [category, setCategory] = React.useState<any>(null)
//     const [siblingCategories, setSiblingCategories] = React.useState<any[]>([])
//     const [products, setProducts] = React.useState<any[]>([])
//     const [brands, setBrands] = React.useState<string[]>([])

//     // UI States
//     const [initialLoading, setInitialLoading] = React.useState(true)
//     const [isFilterOpen, setIsFilterOpen] = React.useState(false)
//     const [sortBy, setSortBy] = React.useState("alphabetical")
//     const [selectedBrand, setSelectedBrand] = React.useState<string | null>(null)
//     const [searchQuery, setSearchQuery] = React.useState("")
//     const [isPillVisible, setIsPillVisible] = React.useState(true)

//     // Scroll Logic for Pill
//     const { scrollY } = useScroll()
//     useMotionValueEvent(scrollY, "change", (latest) => {
//         const previous = scrollY.getPrevious() ?? 0
//         if (latest > previous && latest > 150) {
//             setIsPillVisible(false)
//         } else {
//             setIsPillVisible(true)
//         }
//     })

//     const handleFilterSelection = (type: 'sort' | 'brand', value: any) => {
//         if (type === 'sort') setSortBy(value)
//         if (type === 'brand') setSelectedBrand(value)
//         setTimeout(() => setIsFilterOpen(false), 150)
//     }

//     const resetFilters = () => {
//         setSortBy("alphabetical")
//         setSelectedBrand(null)
//         setSearchQuery("")
//         setIsFilterOpen(false)
//     }

//     // Initial Fetch (Category & Siblings)
//     React.useEffect(() => {
//         async function fetchBaseData() {
//             if (!slug) return
//             setInitialLoading(true)
//             const { data: catData } = await supabase.from('categories').select('*').eq('slug', slug).single()
//             if (catData) {
//                 setCategory(catData)
//                 if (catData.parent_id) {
//                     const { data: siblings } = await supabase.from('categories')
//                         .select('name, slug')
//                         .eq('parent_id', catData.parent_id)
//                         .order('name')
//                     setSiblingCategories(siblings || [])
//                 }
//             }
//             setInitialLoading(false)
//         }
//         fetchBaseData()
//     }, [slug, supabase])

//     // Product Fetch (Re-runs on filter changes, but doesn't trigger initialLoading)
//     // React.useEffect(() => {
//     //     async function fetchProducts() {
//     //         if (!category?.id) return

//     //         const { data: junctionData } = await supabase.from('product_categories').select('product_id').eq('category_id', category.id)
//     //         const ids = junctionData?.map(j => j.product_id) || []

//     //         let query = supabase.from('products').select('*, product_variants(*)').eq('status', 'active')
//     //         if (ids.length > 0) query = query.or(`category_id.eq.${category.id},id.in.(${ids.join(',')})`)
//     //         else query = query.eq('category_id', category.id)

//     //         if (selectedBrand) query = query.eq('brand', selectedBrand)

//     //         const { data: prodData } = await query.order('name')

//     //         let processed = [...(prodData || [])]
//     //         if (sortBy === 'price-low') processed.sort((a, b) => (a.product_variants?.[0]?.price || 0) - (b.product_variants?.[0]?.price || 0))
//     //         if (sortBy === 'price-high') processed.sort((a, b) => (b.product_variants?.[0]?.price || 0) - (a.product_variants?.[0]?.price || 0))
//     //         if (sortBy === 'newest') processed.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

//     //         setProducts(processed)
//     //         if (brands.length === 0) {
//     //             setBrands(Array.from(new Set(prodData?.map(p => p.brand).filter(Boolean) as string[])).sort())
//     //         }
//     //     }
//     //     fetchProducts()
//     // }, [category, sortBy, selectedBrand, supabase])

//     React.useEffect(() => {
//         async function fetchProducts() {
//             if (!category?.id) return

//             const { data: junctionData } = await supabase
//                 .from('product_categories')
//                 .select('product_id')
//                 .eq('category_id', category.id)

//             const ids = junctionData?.map(j => j.product_id) || []

//             let query = supabase
//                 .from('products')
//                 .select('*, product_variants(*)')
//                 .eq('status', 'active')

//             if (ids.length > 0) {
//                 query = query.or(`category_id.eq.${category.id},id.in.(${ids.join(',')})`)
//             } else {
//                 query = query.eq('category_id', category.id)
//             }

//             if (selectedBrand) query = query.eq('brand', selectedBrand)

//             // Initial database fetch is alphabetical
//             const { data: prodData } = await query.order('name')

//             let processed = [...(prodData || [])]

//             // --- SORTING LOGIC ---
//             if (sortBy === 'price-low') {
//                 processed.sort((a, b) => (a.product_variants?.[0]?.price || 0) - (b.product_variants?.[0]?.price || 0))
//             } else if (sortBy === 'price-high') {
//                 processed.sort((a, b) => (b.product_variants?.[0]?.price || 0) - (a.product_variants?.[0]?.price || 0))
//             } else if (sortBy === 'newest') {
//                 processed.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
//             } else {
//                 // Explicitly sort alphabetically if sortBy is 'alpha' or default
//                 processed.sort((a, b) => a.name.localeCompare(b.name))
//             }

//             setProducts(processed)

//             if (brands.length === 0) {
//                 setBrands(Array.from(new Set(prodData?.map(p => p.brand).filter(Boolean) as string[])).sort())
//             }
//         }
//         fetchProducts()
//     }, [category, sortBy, selectedBrand, supabase])
//     const filteredProducts = products.filter(p =>
//         p.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
//         p.name?.toLowerCase().includes(searchQuery.toLowerCase())
//     )

//     const StickyNav = ({ isDataLoaded }: { isDataLoaded: boolean }) => (
//         <nav className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-slate-100">
//             <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center px-4 h-auto sm:h-14 py-3 sm:py-0">
//                 <div className="flex items-center gap-2 mb-3 sm:mb-0 sm:mr-8 flex-shrink-0">
//                     <Link href="/exclusive" className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-black transition-colors">
//                         Hub
//                     </Link>
//                     <ChevronRight className="w-3 h-3 text-slate-200" />
//                     {isDataLoaded ? (
//                         <span className="text-[9px] font-black uppercase tracking-widest text-slate-900 truncate max-w-[150px]">
//                             {category?.name}
//                         </span>
//                     ) : (
//                         <div className="w-16 h-2 bg-slate-100 animate-pulse rounded" />
//                     )}
//                 </div>

//                 <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0 touch-pan-x">
//                     {siblingCategories.length > 0 ? (
//                         siblingCategories.map((sib) => {
//                             const isActive = sib.slug === slug;
//                             return (
//                                 <Link
//                                     key={sib.slug}
//                                     href={`/exclusive/${sib.slug}`}
//                                     className={`text-[9px] font-black uppercase tracking-[0.15em] px-4 py-2 rounded-full whitespace-nowrap transition-all duration-300 border
//                                         ${isActive
//                                             ? 'bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-200'
//                                             : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-300'}`}
//                                 >
//                                     {sib.name}
//                                 </Link>
//                             )
//                         })
//                     ) : (
//                         // Skeleton pills
//                         [1, 2, 3, 4].map((i) => (
//                             <div key={i} className="w-20 h-8 bg-slate-50 border border-slate-100 rounded-full animate-pulse flex-shrink-0" />
//                         ))
//                     )}
//                 </div>
//             </div>
//         </nav>
//     )

//     return (
//         <div className="min-h-screen bg-white text-[#1A1A1A] pb-20 selection:bg-black/5 antialiased">

//             {/* INITIAL LUXURY LOADER (Only shows once per page load) */}
//             <AnimatePresence>
//                 {initialLoading && (
//                     <motion.div
//                         key="loader"
//                         initial={{ opacity: 1 }}
//                         exit={{ opacity: 0 }}
//                         className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center"
//                     >
//                         <h2 className="text-[10px] font-black uppercase tracking-[0.5em] mb-4 text-zinc-900">The Makeup Store</h2>
//                         <div className="w-16 h-[1px] bg-zinc-100 relative overflow-hidden">
//                             <motion.div animate={{ x: ["-100%", "100%"] }} transition={{ duration: 1, repeat: Infinity }} className="absolute inset-0 bg-black w-full h-full" />
//                         </div>
//                     </motion.div>
//                 )}
//             </AnimatePresence>

//             {/* MAIN INTERFACE */}
//             <div className={`transition-all duration-700 ${isFilterOpen ? 'blur-2xl scale-[0.98] opacity-40 pointer-events-none' : ''}`}>
//                 {/* <nav className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-xl border-b border-zinc-50">
//                     <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-between">
//                         <Link href="/categories" className="flex items-center gap-2">
//                             <ArrowLeft className="w-3 h-3 text-zinc-400" />
//                             <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Back</span>
//                         </Link>
//                         <div className="flex gap-6 overflow-x-auto no-scrollbar">
//                             {siblingCategories.map((sib) => (
//                                 <Link key={sib.slug} href={`/categories/${sib.slug}`} className={`text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${sib.slug === slug ? 'text-black' : 'text-zinc-300'}`}>
//                                     {sib.name}
//                                 </Link>
//                             ))}
//                         </div>
//                         <div className="w-8" />
//                     </div>
//                 </nav> */}

//                 <StickyNav isDataLoaded={!initialLoading} />

//                 <main className="max-w-7xl mx-auto px-6 pt-6">
//                     <header className="mb-8">
//                         <h1 className="text-3xl md:text-8xl  tracking-tighter uppercase leading-[0.8]  mb-8">
//                             {category?.name}<span className="text-zinc-100">_</span>
//                         </h1>
//                         <div className="relative w-full md:w-64 group">
//                             <div className="relative flex items-center border-b border-zinc-200 group-focus-within:border-black transition-all pb-2">
//                                 <Search className="w-3.5 h-3.5 text-black stroke-[3px]" />
//                                 <input
//                                     type="text"
//                                     placeholder="SEARCH .."
//                                     value={searchQuery}
//                                     onChange={(e) => setSearchQuery(e.target.value)}
//                                     className="w-full bg-transparent border-none pl-3 text-[10px] font-black tracking-widest focus:outline-none uppercase placeholder:text-zinc-300"
//                                 />
//                             </div>
//                         </div>
//                     </header>

//                     <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-10">
//                         {filteredProducts.map((product) => (
//                             <ProductCard key={product.id} product={product} />
//                         ))}
//                     </div>
//                 </main>
//             </div>

//             {/* COMPACT PILL BUTTON (Bottom-Right & Scroll-Aware) */}
//             <AnimatePresence>
//                 {isPillVisible && !initialLoading && (
//                     <motion.button
//                         initial={{ y: 100, x: 0 }}
//                         animate={{ y: 0, x: 0 }}
//                         exit={{ y: 100 }}
//                         onClick={() => setIsFilterOpen(true)}
//                         className="fixed bottom-20 right-6 z-[60] bg-black text-white px-4 py-3 rounded-full flex items-center gap-3 shadow-2xl active:scale-95 transition-transform"
//                     >
//                         <SlidersHorizontal className="w-3.5 h-3.5" />
//                         <span className="text-[9px] font-black uppercase tracking-widest">Refine</span>
//                         {(selectedBrand || sortBy !== "alphabetical") && (
//                             <div className="w-1.5 h-1.5 bg-white rounded-full" />
//                         )}
//                     </motion.button>
//                 )}
//             </AnimatePresence>

//             {/* COMPACT BOTTOM DRAWER */}
//             <AnimatePresence>
//                 {isFilterOpen && (
//                     <>
//                         <motion.div
//                             initial={{ opacity: 0 }}
//                             animate={{ opacity: 1 }}
//                             exit={{ opacity: 0 }}
//                             onClick={() => setIsFilterOpen(false)}
//                             className="fixed inset-0 bg-black/5 z-[80] backdrop-blur-sm"
//                         />
//                         <motion.div
//                             initial={{ y: "100%" }}
//                             animate={{ y: 0 }}
//                             exit={{ y: "100%" }}
//                             transition={{ type: "spring", damping: 25, stiffness: 200 }}
//                             className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-[420px] bg-white z-[90] rounded-t-[2.5rem] shadow-2xl border-t border-zinc-100 flex flex-col overflow-hidden max-h-[75vh]"
//                         >
//                             <div className="w-10 h-1 bg-zinc-200 rounded-full mx-auto mt-4 mb-2" />

//                             <div className="px-8 py-4 border-b border-zinc-50 flex items-center justify-between">
//                                 <span className="text-[9px] font-black uppercase tracking-[0.3em]">Refine</span>
//                                 {(selectedBrand || sortBy !== "alphabetical") && (
//                                     <button
//                                         onClick={resetFilters}
//                                         className="flex items-center gap-1.5 text-rose-500 hover:text-rose-600 transition-colors"
//                                     >
//                                         <RotateCcw className="w-3 h-3" />
//                                         <span className="text-[8px] font-black uppercase tracking-widest">Clear All</span>
//                                     </button>
//                                 )}
//                             </div>

//                             <div className="flex-1 overflow-y-auto p-8 space-y-10 no-scrollbar">
//                                 <section className="space-y-4">
//                                     <h3 className="text-[8px] font-black text-zinc-300 uppercase tracking-widest italic">Sort Order</h3>
//                                     <div className="grid grid-cols-1 gap-1">
//                                         {['newest', 'price-low', 'price-high'].map((id) => (
//                                             <button
//                                                 key={id}
//                                                 onClick={() => handleFilterSelection('sort', id)}
//                                                 className={`flex items-center justify-between p-4 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${sortBy === id ? 'bg-zinc-900 text-white shadow-md' : 'text-zinc-500 bg-zinc-50 hover:bg-zinc-100'}`}
//                                             >
//                                                 {id.replace('-', ' ')}
//                                                 {sortBy === id && <Check className="w-3 h-3" />}
//                                             </button>
//                                         ))}
//                                     </div>
//                                 </section>

//                                 <section className="space-y-4">
//                                     <h3 className="text-[8px] font-black text-zinc-300 uppercase tracking-widest italic">Brands</h3>
//                                     <div className="flex flex-wrap gap-2">
//                                         {brands.map((brand) => (
//                                             <button
//                                                 key={brand}
//                                                 onClick={() => handleFilterSelection('brand', brand)}
//                                                 className={`px-4 py-2 rounded-lg border text-[9px] font-bold uppercase transition-all ${selectedBrand === brand ? 'bg-zinc-900 text-white border-black' : 'border-zinc-200 text-zinc-400'}`}
//                                             >
//                                                 {brand}
//                                             </button>
//                                         ))}
//                                     </div>
//                                 </section>
//                             </div>

//                             <div className="p-4 bg-zinc-50/50 text-center">
//                                 <p className="text-[8px] font-black text-zinc-300 uppercase tracking-widest">Automatically applied on click</p>
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
import { useParams } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion"
import {
    SlidersHorizontal,
    X,
    Check,
    Search,
    RotateCcw,
    ChevronRight,
    Sparkles,
    LayoutGrid
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { ProductCard } from "@/components/store/product-card"

export default function CategoryPage() {
    const { slug } = useParams()
    const supabase = createClient()

    // Data States
    const [category, setCategory] = React.useState<any>(null)
    const [siblingCategories, setSiblingCategories] = React.useState<any[]>([])
    const [products, setProducts] = React.useState<any[]>([])
    const [brands, setBrands] = React.useState<string[]>([])

    // UI States
    const [initialLoading, setInitialLoading] = React.useState(true)
    const [isFilterOpen, setIsFilterOpen] = React.useState(false)
    const [sortBy, setSortBy] = React.useState("alphabetical")
    const [selectedBrand, setSelectedBrand] = React.useState<string | null>(null)
    const [searchQuery, setSearchQuery] = React.useState("")
    const [isPillVisible, setIsPillVisible] = React.useState(true)

    // Scroll Logic for Filter Pill
    const { scrollY } = useScroll()
    useMotionValueEvent(scrollY, "change", (latest) => {
        const previous = scrollY.getPrevious() ?? 0
        if (latest > previous && latest > 150) {
            setIsPillVisible(false)
        } else {
            setIsPillVisible(true)
        }
    })

    const handleFilterSelection = (type: 'sort' | 'brand', value: any) => {
        if (type === 'sort') setSortBy(value)
        if (type === 'brand') setSelectedBrand(value)
        setTimeout(() => setIsFilterOpen(false), 150)
    }

    const resetFilters = () => {
        setSortBy("alphabetical")
        setSelectedBrand(null)
        setSearchQuery("")
        setIsFilterOpen(false)
    }

    // Initial Fetch (Category & Siblings)
    React.useEffect(() => {
        async function fetchBaseData() {
            if (!slug) return
            setInitialLoading(true)
            const { data: catData } = await supabase.from('categories').select('*').eq('slug', slug).single()
            if (catData) {
                setCategory(catData)
                if (catData.parent_id) {
                    const { data: siblings } = await supabase.from('categories')
                        .select('name, slug, image_url')
                        .eq('parent_id', catData.parent_id)
                        .order('name')
                    setSiblingCategories(siblings || [])
                }
            }
            // Artificial delay to show your signature loader
            setTimeout(() => setInitialLoading(false), 1000)
        }
        fetchBaseData()
    }, [slug, supabase])

    // Product Fetch
    React.useEffect(() => {
        async function fetchProducts() {
            if (!category?.id) return

            const { data: junctionData } = await supabase
                .from('product_categories')
                .select('product_id')
                .eq('category_id', category.id)

            const ids = junctionData?.map(j => j.product_id) || []

            let query = supabase
                .from('products')
                .select('*, product_variants(*)')
                .eq('status', 'active')

            if (ids.length > 0) {
                query = query.or(`category_id.eq.${category.id},id.in.(${ids.join(',')})`)
            } else {
                query = query.eq('category_id', category.id)
            }

            if (selectedBrand) query = query.eq('brand', selectedBrand)

            const { data: prodData } = await query.order('name')
            let processed = [...(prodData || [])]

            if (sortBy === 'price-low') {
                processed.sort((a, b) => (a.product_variants?.[0]?.price || 0) - (b.product_variants?.[0]?.price || 0))
            } else if (sortBy === 'price-high') {
                processed.sort((a, b) => (b.product_variants?.[0]?.price || 0) - (a.product_variants?.[0]?.price || 0))
            } else if (sortBy === 'newest') {
                processed.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            } else {
                processed.sort((a, b) => a.name.localeCompare(b.name))
            }

            setProducts(processed)
            if (brands.length === 0) {
                setBrands(Array.from(new Set(prodData?.map(p => p.brand).filter(Boolean) as string[])).sort())
            }
        }
        fetchProducts()
    }, [category, sortBy, selectedBrand, supabase])

    const filteredProducts = products.filter(p =>
        p.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.name?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // --- NYKAA STORY NAV ---
    const StickyNav = ({ isDataLoaded }: { isDataLoaded: boolean }) => (
        <nav className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-xl border-b border-pink-50">
            <div className="max-w-7xl mx-auto px-4 py-4">
                <div className="flex items-center gap-2 mb-4">
                    <Link href="/exclusive" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-[#fc2779]">
                        Hub
                    </Link>
                    <ChevronRight className="w-3 h-3 text-slate-300" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#fc2779]">
                        {isDataLoaded ? category?.name : '...'}
                    </span>
                </div>

                <div className="flex items-center gap-6 overflow-x-auto no-scrollbar touch-pan-x pb-2">
                    {isDataLoaded ? (
                        siblingCategories.map((sib) => {
                            const isActive = sib.slug === slug;
                            return (
                                <Link
                                    key={sib.slug}
                                    href={`/exclusive/${sib.slug}`}
                                    className="flex flex-col items-center gap-2 shrink-0 group"
                                >
                                    <div className={`w-14 h-14 rounded-full p-[2px] transition-all duration-500 ${isActive ? 'bg-[#fc2779]' : 'bg-slate-100 group-hover:bg-pink-100'}`}>
                                        <div className="w-full h-full rounded-full border-2 border-white bg-white overflow-hidden flex items-center justify-center">
                                            {sib.image_url ? (
                                                <img src={sib.image_url} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                                <span className="text-[10px] font-black text-slate-300 uppercase">{sib.name[0]}</span>
                                            )}
                                        </div>
                                    </div>
                                    <span className={`text-[9px] font-bold uppercase tracking-tighter transition-colors ${isActive ? 'text-[#fc2779]' : 'text-slate-500'}`}>
                                        {sib.name}
                                    </span>
                                </Link>
                            )
                        })
                    ) : (
                        [1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex flex-col items-center gap-2 animate-pulse">
                                <div className="w-14 h-14 rounded-full bg-slate-50" />
                                <div className="w-10 h-2 bg-slate-50 rounded" />
                            </div>
                        ))
                    )}
                </div>
            </div>
        </nav>
    )

    return (
        <div className="min-h-screen bg-[#FDFDFD] text-slate-900 pb-20 antialiased">

            {/* 1. YOUR SIGNATURE LOADER (Nykaa Theme) */}
            <AnimatePresence>
                {initialLoading && (
                    <motion.div
                        key="loader"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center"
                    >
                        <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-[#fc2779] mb-3">
                            The Makeup Store
                        </h2>
                        <div className="w-24 h-[1.5px] bg-pink-50 relative overflow-hidden">
                            <motion.div
                                animate={{ x: ["-100%", "100%"] }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute inset-0 bg-[#fc2779] w-full h-full"
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MAIN INTERFACE */}
            {!initialLoading && (
                <div className={`transition-all duration-700 ${isFilterOpen ? 'blur-2xl scale-[0.98] opacity-40 pointer-events-none' : ''}`}>
                    <StickyNav isDataLoaded={true} />

                    <main className="max-w-7xl mx-auto px-6 pt-10">
                        <header className="mb-12">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-10">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-[#fc2779]">
                                        <Sparkles className="w-4 h-4 fill-[#fc2779]" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">The Premium Edit</span>
                                    </div>
                                    <h1 className="text-5xl md:text-8xl font-serif italic text-slate-950 leading-[0.8] tracking-tighter">
                                        {category?.name}
                                    </h1>
                                </div>

                                <div className="relative w-full md:w-72 group">
                                    <div className="relative flex items-center border-b border-pink-100 group-focus-within:border-[#fc2779] transition-all pb-2">
                                        <Search className="w-4 h-4 text-[#fc2779] stroke-[3px]" />
                                        <input
                                            type="text"
                                            placeholder="SEARCH COLLECTION .."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full bg-transparent border-none pl-3 text-[10px] font-black tracking-widest focus:outline-none uppercase placeholder:text-slate-300"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between border-t border-pink-50 pt-6">
                                <div className="flex items-center gap-3">
                                    <LayoutGrid className="w-4 h-4 text-pink-200" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        {filteredProducts.length} Results Found
                                    </p>
                                </div>
                                {isFilterOpen && (
                                    <button onClick={resetFilters} className="text-[10px] font-black uppercase text-[#fc2779] border-b-2 border-[#fc2779]">
                                        Reset View
                                    </button>
                                )}
                            </div>
                        </header>

                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-0 border-t border-l border-pink-50 bg-white overflow-hidden">
                            {filteredProducts.map((product) => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>
                    </main>
                </div>
            )}

            {/* FLOATING REFINE PILL */}
            <AnimatePresence>
                {isPillVisible && !initialLoading && (
                    <motion.button
                        initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
                        onClick={() => setIsFilterOpen(true)}
                        className="fixed bottom-24 right-6 z-[60] bg-[#fc2779] text-white px-6 py-4 rounded-full flex items-center gap-3 shadow-2xl shadow-pink-200 active:scale-95 transition-all"
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Refine</span>
                        {(selectedBrand || sortBy !== "alphabetical") && (
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        )}
                    </motion.button>
                )}
            </AnimatePresence>

            {/* NYKAA STYLE BOTTOM SHEET */}
            <AnimatePresence>
                {isFilterOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsFilterOpen(false)}
                            className="fixed inset-0 bg-slate-900/40 z-[80] backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-lg bg-white z-[90] rounded-t-[3rem] shadow-2xl flex flex-col overflow-hidden max-h-[85vh]"
                        >
                            <div className="w-12 h-1.5 bg-pink-50 rounded-full mx-auto mt-6" />

                            <div className="px-10 py-8 border-b border-pink-50 flex items-center justify-between">
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-serif italic text-slate-900 leading-none">Filter & Sort</h2>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Customize your boutique view</p>
                                </div>
                                {(selectedBrand || sortBy !== "alphabetical") && (
                                    <button onClick={resetFilters} className="flex items-center gap-2 text-[#fc2779] hover:opacity-70 transition-all">
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-black uppercase">Clear</span>
                                    </button>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto p-10 space-y-12 no-scrollbar">
                                <section className="space-y-6">
                                    <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Sort Order</h3>
                                    <div className="grid grid-cols-1 gap-2">
                                        {[
                                            { id: 'newest', label: 'Recently Dropped' },
                                            { id: 'price-low', label: 'Price: Low to High' },
                                            { id: 'price-high', label: 'Price: High to Low' }
                                        ].map((opt) => (
                                            <button
                                                key={opt.id}
                                                onClick={() => handleFilterSelection('sort', opt.id)}
                                                className={`flex items-center justify-between p-5 rounded-2xl text-[11px] font-bold uppercase transition-all border-2 ${sortBy === opt.id ? 'border-[#fc2779] bg-pink-50/50 text-[#fc2779]' : 'border-slate-50 text-slate-500 bg-white'}`}
                                            >
                                                {opt.label}
                                                {sortBy === opt.id && <Check className="w-4 h-4" />}
                                            </button>
                                        ))}
                                    </div>
                                </section>

                                <section className="space-y-6">
                                    <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Boutique Brands</h3>
                                    <div className="flex flex-wrap gap-2.5">
                                        {brands.map((brand) => (
                                            <button
                                                key={brand}
                                                onClick={() => handleFilterSelection('brand', brand)}
                                                className={`px-5 py-3 rounded-2xl border-2 text-[10px] font-black uppercase transition-all ${selectedBrand === brand ? 'bg-[#fc2779] text-white border-[#fc2779] shadow-lg shadow-pink-100' : 'border-slate-100 text-slate-400'}`}
                                            >
                                                {brand}
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            </div>

                            <div className="p-8 bg-white border-t border-pink-50">
                                <button
                                    onClick={() => setIsFilterOpen(false)}
                                    className="w-full py-5 bg-[#fc2779] text-white text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-pink-200"
                                >
                                    Apply Filters
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}