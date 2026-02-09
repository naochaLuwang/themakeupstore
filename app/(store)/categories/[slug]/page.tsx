// "use client"

// import * as React from "react"
// import { useParams } from "next/navigation"
// import Link from "next/link"
// import { motion, AnimatePresence } from "framer-motion"
// import {
//     Loader2,
//     ArrowLeft,
//     AlertCircle,
//     SlidersHorizontal,
//     X,
//     Check
// } from "lucide-react"
// import { createClient } from "@/utils/supabase/client"
// import { ProductCard } from "@/components/store/product-card"

// export default function CategoryPage() {
//     const { slug } = useParams()
//     const supabase = createClient()

//     // Data State
//     const [category, setCategory] = React.useState<any>(null)
//     const [siblingCategories, setSiblingCategories] = React.useState<any[]>([])
//     const [products, setProducts] = React.useState<any[]>([])
//     const [brands, setBrands] = React.useState<string[]>([])

//     // UI & Filter State
//     const [loading, setLoading] = React.useState(true)
//     const [error, setError] = React.useState<string | null>(null)
//     const [isFilterOpen, setIsFilterOpen] = React.useState(false)

//     // CHANGED: Default sort is now alphabetical
//     const [sortBy, setSortBy] = React.useState("alphabetical")
//     const [selectedBrand, setSelectedBrand] = React.useState<string | null>(null)

//     const handleFilterSelection = (type: 'sort' | 'brand', value: any) => {
//         if (type === 'sort') setSortBy(value)
//         if (type === 'brand') setSelectedBrand(value)
//         setIsFilterOpen(false)
//     }

//     React.useEffect(() => {
//         async function fetchContent() {
//             if (!slug) return
//             setLoading(true)
//             try {
//                 // 1. Fetch Category Info
//                 const { data: catData, error: catError } = await supabase
//                     .from('categories')
//                     .select('id, name, slug, parent_id')
//                     .eq('slug', slug)
//                     .single()

//                 if (catError) throw catError
//                 setCategory(catData)

//                 // 2. Fetch Siblings
//                 if (catData.parent_id) {
//                     const { data: siblings } = await supabase
//                         .from('categories')
//                         .select('name, slug')
//                         .eq('parent_id', catData.parent_id)
//                         .order('name', { ascending: true })
//                     if (siblings) setSiblingCategories(siblings)
//                 }

//                 // 3. Fetch Product IDs from Junction Table
//                 const { data: junctionData } = await supabase
//                     .from('product_categories')
//                     .select('product_id')
//                     .eq('category_id', catData.id)

//                 const junctionProductIds = junctionData?.map(j => j.product_id) || []

//                 // 4. Build Product Query
//                 let query = supabase
//                     .from('products')
//                     .select('*, product_variants(*)')
//                     .eq('status', 'active')

//                 if (junctionProductIds.length > 0) {
//                     query = query.or(`category_id.eq.${catData.id},id.in.(${junctionProductIds.join(',')})`)
//                 } else {
//                     query = query.eq('category_id', catData.id)
//                 }

//                 // ALWAYS order by name in Supabase for the 'alphabetical' default
//                 query = query.order('name', { ascending: true })

//                 if (selectedBrand) {
//                     query = query.eq('brand', selectedBrand)
//                 }

//                 const { data: prodData, error: prodError } = await query
//                 if (prodError) throw prodError

//                 // 5. LOCAL SORTING LOGIC
//                 // We keep the Supabase order unless a different sort is explicitly chosen
//                 let processedProducts = [...(prodData || [])]

//                 if (sortBy === 'price-low' || sortBy === 'price-high') {
//                     processedProducts.sort((a, b) => {
//                         const priceA = a.product_variants?.[0]?.price || 0
//                         const priceB = b.product_variants?.[0]?.price || 0
//                         return sortBy === 'price-low' ? priceA - priceB : priceB - priceA
//                     })
//                 } else if (sortBy === 'newest') {
//                     processedProducts.sort((a, b) =>
//                         new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
//                     )
//                 }
//                 // NOTE: If sortBy === 'alphabetical', we don't need a .sort() here 
//                 // because 'query.order' already handled it.

//                 setProducts(processedProducts)

//                 if (!selectedBrand) {
//                     const uniqueBrands: string[] = Array.from(new Set(prodData?.map(p => p.brand).filter(Boolean)))
//                     setBrands(uniqueBrands.sort())
//                 }

//             } catch (e: any) {
//                 setError(e.message)
//             } finally {
//                 setLoading(false)
//             }
//         }
//         fetchContent()
//     }, [slug, sortBy, selectedBrand, supabase])

//     if (loading) return (
//         <div className="min-h-screen flex items-center justify-center bg-white">
//             <Loader2 className="w-5 h-5 animate-spin text-zinc-300 stroke-[1.5]" />
//         </div>
//     )

//     return (
//         <div className="min-h-screen bg-white text-[#1A1A1A] pb-40 selection:bg-primary/10">
//             <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-zinc-50">
//                 <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
//                     <Link href="/categories" className="group flex items-center gap-2">
//                         <ArrowLeft className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-900 transition-colors" />
//                         <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 group-hover:text-zinc-900 transition-colors hidden md:block">Collections</span>
//                     </Link>

//                     <div className="flex items-center gap-8 overflow-x-auto no-scrollbar px-4">
//                         {siblingCategories.map((sib) => (
//                             <Link
//                                 key={sib.slug}
//                                 href={`/categories/${sib.slug}`}
//                                 className={`text-[9px] font-black uppercase tracking-[0.25em] whitespace-nowrap transition-all relative py-2 ${sib.slug === slug ? 'text-zinc-900' : 'text-zinc-300 hover:text-zinc-500'}`}
//                             >
//                                 {sib.name}
//                                 {sib.slug === slug && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />}
//                             </Link>
//                         ))}
//                     </div>

//                     <button onClick={() => setIsFilterOpen(true)} className="flex items-center gap-2 group flex-shrink-0">
//                         <span className="text-[10px] font-black uppercase tracking-widest group-hover:text-primary transition-colors">Refine</span>
//                         <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400 group-hover:text-primary transition-colors" />
//                     </button>
//                 </div>
//             </nav>

//             <main className="max-w-6xl mx-auto px-6 pt-5">
//                 {error ? (
//                     <div className="py-20 flex flex-col items-center text-center gap-4">
//                         <AlertCircle className="w-6 h-6 text-zinc-200" />
//                         <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{error}</p>
//                     </div>
//                 ) : (
//                     <>
//                         <header className="mb-20 space-y-4">
//                             <div className="flex items-center gap-3">
//                                 <div className="h-[1px] w-8 bg-primary" />
//                             </div>
//                             <h1 className="text-6xl md:text-8xl font-serif tracking-tighter uppercase leading-[0.85]">
//                                 {category?.name}
//                             </h1>
//                         </header>

//                         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-16">
//                             {products.map((product) => (
//                                 <ProductCard key={product.id} product={product} />
//                             ))}
//                         </div>
//                     </>
//                 )}
//             </main>

//             <AnimatePresence>
//                 {isFilterOpen && (
//                     <>
//                         <motion.div
//                             initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
//                             onClick={() => setIsFilterOpen(false)}
//                             className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100]"
//                         />
//                         <motion.div
//                             initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
//                             transition={{ type: "spring", damping: 30, stiffness: 300 }}
//                             className="fixed right-0 top-0 bottom-0 w-full max-w-xs bg-white z-[101] shadow-2xl flex flex-col"
//                         >
//                             <div className="p-8 flex items-center justify-between border-b border-zinc-50">
//                                 <h2 className="text-xs font-black uppercase tracking-[0.3em]">Refine By</h2>
//                                 <button onClick={() => setIsFilterOpen(false)}><X className="w-4 h-4" /></button>
//                             </div>

//                             <div className="flex-1 overflow-y-auto p-8 space-y-12 no-scrollbar">
//                                 <section className="space-y-4">
//                                     <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Sort Order</h3>
//                                     <div className="flex flex-col gap-2">
//                                         {[
//                                             { id: 'alphabetical', label: 'Alphabetical (A-Z)' },
//                                             { id: 'newest', label: 'Newest First' },
//                                             { id: 'price-low', label: 'Price: Low to High' },
//                                             { id: 'price-high', label: 'Price: High to Low' }
//                                         ].map((opt) => (
//                                             <button
//                                                 key={opt.id}
//                                                 onClick={() => handleFilterSelection('sort', opt.id)}
//                                                 className="flex items-center justify-between py-2 group text-left"
//                                             >
//                                                 <span className={`text-[11px] font-bold uppercase tracking-wider transition-colors ${sortBy === opt.id ? 'text-zinc-900' : 'text-zinc-400 group-hover:text-zinc-600'}`}>{opt.label}</span>
//                                                 {sortBy === opt.id && <Check className="w-3 h-3 text-primary" />}
//                                             </button>
//                                         ))}
//                                     </div>
//                                 </section>

//                                 <section className="space-y-4 pb-40">
//                                     <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Filter by Brand</h3>
//                                     <div className="flex flex-col gap-2">
//                                         <button
//                                             onClick={() => handleFilterSelection('brand', null)}
//                                             className="flex items-center justify-between py-2 group text-left"
//                                         >
//                                             <span className={`text-[11px] font-bold uppercase tracking-wider ${!selectedBrand ? 'text-zinc-900' : 'text-zinc-400'}`}>All Brands</span>
//                                             {!selectedBrand && <Check className="w-3 h-3 text-primary" />}
//                                         </button>
//                                         {brands.map((brand) => (
//                                             <button
//                                                 key={brand}
//                                                 onClick={() => handleFilterSelection('brand', brand)}
//                                                 className="flex items-center justify-between py-2 group text-left"
//                                             >
//                                                 <span className={`text-[11px] font-bold uppercase tracking-wider transition-colors ${selectedBrand === brand ? 'text-zinc-900' : 'text-zinc-400 group-hover:text-zinc-600'}`}>{brand}</span>
//                                                 {selectedBrand === brand && <Check className="w-3 h-3 text-primary" />}
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
import { useParams } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
    Loader2,
    ArrowLeft,
    AlertCircle,
    SlidersHorizontal,
    X,
    Check
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { ProductCard } from "@/components/store/product-card"

export default function CategoryPage() {
    const { slug } = useParams()
    const supabase = createClient()

    // Data State
    const [category, setCategory] = React.useState<any>(null)
    const [siblingCategories, setSiblingCategories] = React.useState<any[]>([])
    const [products, setProducts] = React.useState<any[]>([])
    const [brands, setBrands] = React.useState<string[]>([])

    // UI & Filter State
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState<string | null>(null)
    const [isFilterOpen, setIsFilterOpen] = React.useState(false)
    const [sortBy, setSortBy] = React.useState("alphabetical")
    const [selectedBrand, setSelectedBrand] = React.useState<string | null>(null)

    // Scroll State for Button Visibility
    const [isVisible, setIsVisible] = React.useState(true)
    const lastScrollY = React.useRef(0)

    const handleFilterSelection = (type: 'sort' | 'brand', value: any) => {
        if (type === 'sort') setSortBy(value)
        if (type === 'brand') setSelectedBrand(value)
        setIsFilterOpen(false)
    }

    // Scroll Logic: Hide on scroll down, Show on scroll up
    React.useEffect(() => {
        const controlNavbar = () => {
            if (typeof window !== 'undefined') {
                if (window.scrollY > lastScrollY.current && window.scrollY > 100) {
                    setIsVisible(false)
                } else {
                    setIsVisible(true)
                }
                lastScrollY.current = window.scrollY
            }
        }

        window.addEventListener('scroll', controlNavbar)
        return () => window.removeEventListener('scroll', controlNavbar)
    }, [])

    React.useEffect(() => {
        async function fetchContent() {
            if (!slug) return
            setLoading(true)
            try {
                const { data: catData, error: catError } = await supabase
                    .from('categories')
                    .select('id, name, slug, parent_id')
                    .eq('slug', slug)
                    .single()

                if (catError) throw catError
                setCategory(catData)

                if (catData.parent_id) {
                    const { data: siblings } = await supabase
                        .from('categories')
                        .select('name, slug')
                        .eq('parent_id', catData.parent_id)
                        .order('name', { ascending: true })
                    if (siblings) setSiblingCategories(siblings)
                }

                const { data: junctionData } = await supabase
                    .from('product_categories')
                    .select('product_id')
                    .eq('category_id', catData.id)

                const junctionProductIds = junctionData?.map(j => j.product_id) || []

                let query = supabase
                    .from('products')
                    .select('*, product_variants(*)')
                    .eq('status', 'active')

                if (junctionProductIds.length > 0) {
                    query = query.or(`category_id.eq.${catData.id},id.in.(${junctionProductIds.join(',')})`)
                } else {
                    query = query.eq('category_id', catData.id)
                }

                query = query.order('name', { ascending: true })

                if (selectedBrand) {
                    query = query.eq('brand', selectedBrand)
                }

                const { data: prodData, error: prodError } = await query
                if (prodError) throw prodError

                let processedProducts = [...(prodData || [])]

                if (sortBy === 'price-low' || sortBy === 'price-high') {
                    processedProducts.sort((a, b) => {
                        const priceA = a.product_variants?.[0]?.price || 0
                        const priceB = b.product_variants?.[0]?.price || 0
                        return sortBy === 'price-low' ? priceA - priceB : priceB - priceA
                    })
                } else if (sortBy === 'newest') {
                    processedProducts.sort((a, b) =>
                        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    )
                }

                setProducts(processedProducts)

                if (!selectedBrand) {
                    const uniqueBrands: string[] = Array.from(new Set(prodData?.map(p => p.brand).filter(Boolean)))
                    setBrands(uniqueBrands.sort())
                }

            } catch (e: any) {
                setError(e.message)
            } finally {
                setLoading(false)
            }
        }
        fetchContent()
    }, [slug, sortBy, selectedBrand, supabase])

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <Loader2 className="w-4 h-4 animate-spin text-zinc-300 stroke-[1.5]" />
        </div>
    )

    return (
        <div className="min-h-screen bg-white text-[#1A1A1A] pb-40 relative overflow-x-hidden">

            {/* WRAP CONTENT IN MOTION DIV FOR BLUR EFFECT */}
            <motion.div
                animate={{
                    filter: isFilterOpen ? "blur(8px)" : "blur(0px)",
                    scale: isFilterOpen ? 0.98 : 1,
                    opacity: isFilterOpen ? 0.6 : 1
                }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            >
                {/* Top Navigation */}
                <nav className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-zinc-50">
                    <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                        <Link href="/categories" className="group flex items-center gap-2">
                            <ArrowLeft className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-900 transition-colors" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 group-hover:text-zinc-900 hidden md:block">Back</span>
                        </Link>

                        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar px-4">
                            {siblingCategories.map((sib) => (
                                <Link
                                    key={sib.slug}
                                    href={`/categories/${sib.slug}`}
                                    className={`text-[9px] font-black uppercase tracking-[0.25em] whitespace-nowrap py-2 ${sib.slug === slug ? 'text-zinc-900' : 'text-zinc-300'}`}
                                >
                                    {sib.name}
                                </Link>
                            ))}
                        </div>
                        <div className="w-6 md:hidden" />
                    </div>
                </nav>

                <main className="max-w-6xl mx-auto px-6 pt-10">
                    {error ? (
                        <div className="py-20 flex flex-col items-center gap-4 text-center">
                            <AlertCircle className="w-5 h-5 text-zinc-200" />
                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{error}</p>
                        </div>
                    ) : (
                        <>
                            <header className="mb-16">
                                <h1 className="text-5xl md:text-8xl font-serif tracking-tighter uppercase leading-none mb-4">
                                    {category?.name}
                                </h1>
                                <div className="h-[1px] w-12 bg-zinc-900" />
                            </header>

                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 md:gap-x-8 gap-y-12">
                                {products.map((product) => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        </>
                    )}
                </main>
            </motion.div>

            {/* ANIMATED FLOATING BUTTON */}
            <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                    scale: isVisible && !isFilterOpen ? 1 : 0,
                    opacity: isVisible && !isFilterOpen ? 1 : 0,
                    y: isVisible && !isFilterOpen ? 0 : 40
                }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                onClick={() => setIsFilterOpen(true)}
                className="fixed bottom-24 right-6 z-50 bg-zinc-900 text-white p-5 rounded-full shadow-2xl md:bottom-10 md:right-10"
            >
                <SlidersHorizontal className="w-5 h-5" />
            </motion.button>

            <AnimatePresence>
                {isFilterOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsFilterOpen(false)}
                            className="fixed inset-0 bg-black/20 z-[100]"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            className="fixed bottom-0 left-0 right-0 bg-white z-[101] rounded-t-[2.5rem] flex flex-col overflow-hidden shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.3)] md:left-auto md:right-0 md:w-full md:max-w-sm md:rounded-none md:h-full"
                        >
                            <div className="px-8 py-8 border-b border-zinc-100 flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Refine</span>
                                <button onClick={() => setIsFilterOpen(false)} className="p-2 bg-zinc-50 rounded-full">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-12 no-scrollbar pb-24">
                                <section className="space-y-4">
                                    <h3 className="text-[9px] font-black text-zinc-300 uppercase tracking-[0.2em]">Sort Order</h3>
                                    <div className="grid grid-cols-1 gap-1">
                                        {[
                                            { id: 'alphabetical', label: 'Alphabetical (A-Z)' },
                                            { id: 'newest', label: 'Newest Arrivals' },
                                            { id: 'price-low', label: 'Price: Low to High' },
                                            { id: 'price-high', label: 'Price: High to Low' }
                                        ].map((opt) => (
                                            <button
                                                key={opt.id}
                                                onClick={() => handleFilterSelection('sort', opt.id)}
                                                className={`flex items-center justify-between py-4 px-5 rounded-2xl transition-all ${sortBy === opt.id ? 'bg-zinc-900 text-white shadow-lg' : 'hover:bg-zinc-50 text-zinc-500'}`}
                                            >
                                                <span className="text-[11px] font-bold uppercase tracking-wider">{opt.label}</span>
                                                {sortBy === opt.id && <Check className="w-3 h-3 text-white" />}
                                            </button>
                                        ))}
                                    </div>
                                </section>

                                <section className="space-y-6">
                                    <h3 className="text-[9px] font-black text-zinc-300 uppercase tracking-[0.2em]">Filter Brand</h3>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => handleFilterSelection('brand', null)}
                                            className={`px-5 py-2.5 rounded-full border text-[10px] font-bold uppercase tracking-wider transition-all ${!selectedBrand ? 'bg-zinc-900 border-zinc-900 text-white shadow-md' : 'bg-white border-zinc-100 text-zinc-400'}`}
                                        >
                                            All Brands
                                        </button>
                                        {brands.map((brand) => (
                                            <button
                                                key={brand}
                                                onClick={() => handleFilterSelection('brand', brand)}
                                                className={`px-5 py-2.5 rounded-full border text-[10px] font-bold uppercase tracking-wider transition-all ${selectedBrand === brand ? 'bg-zinc-900 border-zinc-900 text-white shadow-md' : 'bg-white border-zinc-100 text-zinc-400'}`}
                                            >
                                                {brand}
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}