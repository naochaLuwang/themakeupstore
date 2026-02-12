
"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion"
import {
    ArrowLeft,
    SlidersHorizontal,
    X,
    Check,
    Search,
    RotateCcw
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

    // Scroll Logic for Pill
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
                        .select('name, slug')
                        .eq('parent_id', catData.parent_id)
                        .order('name')
                    setSiblingCategories(siblings || [])
                }
            }
            setInitialLoading(false)
        }
        fetchBaseData()
    }, [slug, supabase])

    // Product Fetch (Re-runs on filter changes, but doesn't trigger initialLoading)
    React.useEffect(() => {
        async function fetchProducts() {
            if (!category?.id) return

            const { data: junctionData } = await supabase.from('product_categories').select('product_id').eq('category_id', category.id)
            const ids = junctionData?.map(j => j.product_id) || []

            let query = supabase.from('products').select('*, product_variants(*)').eq('status', 'active')
            if (ids.length > 0) query = query.or(`category_id.eq.${category.id},id.in.(${ids.join(',')})`)
            else query = query.eq('category_id', category.id)

            if (selectedBrand) query = query.eq('brand', selectedBrand)

            const { data: prodData } = await query.order('name')

            let processed = [...(prodData || [])]
            if (sortBy === 'price-low') processed.sort((a, b) => (a.product_variants?.[0]?.price || 0) - (b.product_variants?.[0]?.price || 0))
            if (sortBy === 'price-high') processed.sort((a, b) => (b.product_variants?.[0]?.price || 0) - (a.product_variants?.[0]?.price || 0))
            if (sortBy === 'newest') processed.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

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

    return (
        <div className="min-h-screen bg-white text-[#1A1A1A] pb-20 selection:bg-black/5 antialiased">

            {/* INITIAL LUXURY LOADER (Only shows once per page load) */}
            <AnimatePresence>
                {initialLoading && (
                    <motion.div
                        key="loader"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center"
                    >
                        <h2 className="text-[10px] font-black uppercase tracking-[0.5em] mb-4 text-zinc-900">The Makeup Store</h2>
                        <div className="w-16 h-[1px] bg-zinc-100 relative overflow-hidden">
                            <motion.div animate={{ x: ["-100%", "100%"] }} transition={{ duration: 1, repeat: Infinity }} className="absolute inset-0 bg-black w-full h-full" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MAIN INTERFACE */}
            <div className={`transition-all duration-700 ${isFilterOpen ? 'blur-2xl scale-[0.98] opacity-40 pointer-events-none' : ''}`}>
                <nav className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-xl border-b border-zinc-50">
                    <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-between">
                        <Link href="/categories" className="flex items-center gap-2">
                            <ArrowLeft className="w-3 h-3 text-zinc-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Back</span>
                        </Link>
                        <div className="flex gap-6 overflow-x-auto no-scrollbar">
                            {siblingCategories.map((sib) => (
                                <Link key={sib.slug} href={`/categories/${sib.slug}`} className={`text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${sib.slug === slug ? 'text-black' : 'text-zinc-300'}`}>
                                    {sib.name}
                                </Link>
                            ))}
                        </div>
                        <div className="w-8" />
                    </div>
                </nav>

                <main className="max-w-7xl mx-auto px-6 pt-6">
                    <header className="mb-8">
                        <h1 className="text-3xl md:text-8xl  tracking-tighter uppercase leading-[0.8]  mb-8">
                            {category?.name}<span className="text-zinc-100">_</span>
                        </h1>
                        <div className="relative w-full md:w-64 group">
                            <div className="relative flex items-center border-b border-zinc-200 group-focus-within:border-black transition-all pb-2">
                                <Search className="w-3.5 h-3.5 text-black stroke-[3px]" />
                                <input
                                    type="text"
                                    placeholder="SEARCH .."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-transparent border-none pl-3 text-[10px] font-black tracking-widest focus:outline-none uppercase placeholder:text-zinc-300"
                                />
                            </div>
                        </div>
                    </header>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-10">
                        {filteredProducts.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                </main>
            </div>

            {/* COMPACT PILL BUTTON (Bottom-Right & Scroll-Aware) */}
            <AnimatePresence>
                {isPillVisible && !initialLoading && (
                    <motion.button
                        initial={{ y: 100, x: 0 }}
                        animate={{ y: 0, x: 0 }}
                        exit={{ y: 100 }}
                        onClick={() => setIsFilterOpen(true)}
                        className="fixed bottom-20 right-6 z-[60] bg-black text-white px-4 py-3 rounded-full flex items-center gap-3 shadow-2xl active:scale-95 transition-transform"
                    >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Refine</span>
                        {(selectedBrand || sortBy !== "alphabetical") && (
                            <div className="w-1.5 h-1.5 bg-white rounded-full" />
                        )}
                    </motion.button>
                )}
            </AnimatePresence>

            {/* COMPACT BOTTOM DRAWER */}
            <AnimatePresence>
                {isFilterOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsFilterOpen(false)}
                            className="fixed inset-0 bg-black/5 z-[80] backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-[420px] bg-white z-[90] rounded-t-[2.5rem] shadow-2xl border-t border-zinc-100 flex flex-col overflow-hidden max-h-[75vh]"
                        >
                            <div className="w-10 h-1 bg-zinc-200 rounded-full mx-auto mt-4 mb-2" />

                            <div className="px-8 py-4 border-b border-zinc-50 flex items-center justify-between">
                                <span className="text-[9px] font-black uppercase tracking-[0.3em]">Refine</span>
                                {(selectedBrand || sortBy !== "alphabetical") && (
                                    <button
                                        onClick={resetFilters}
                                        className="flex items-center gap-1.5 text-rose-500 hover:text-rose-600 transition-colors"
                                    >
                                        <RotateCcw className="w-3 h-3" />
                                        <span className="text-[8px] font-black uppercase tracking-widest">Clear All</span>
                                    </button>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-10 no-scrollbar">
                                <section className="space-y-4">
                                    <h3 className="text-[8px] font-black text-zinc-300 uppercase tracking-widest italic">Sort Order</h3>
                                    <div className="grid grid-cols-1 gap-1">
                                        {['newest', 'price-low', 'price-high'].map((id) => (
                                            <button
                                                key={id}
                                                onClick={() => handleFilterSelection('sort', id)}
                                                className={`flex items-center justify-between p-4 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${sortBy === id ? 'bg-zinc-900 text-white shadow-md' : 'text-zinc-500 bg-zinc-50 hover:bg-zinc-100'}`}
                                            >
                                                {id.replace('-', ' ')}
                                                {sortBy === id && <Check className="w-3 h-3" />}
                                            </button>
                                        ))}
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <h3 className="text-[8px] font-black text-zinc-300 uppercase tracking-widest italic">Brands</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {brands.map((brand) => (
                                            <button
                                                key={brand}
                                                onClick={() => handleFilterSelection('brand', brand)}
                                                className={`px-4 py-2 rounded-lg border text-[9px] font-bold uppercase transition-all ${selectedBrand === brand ? 'bg-zinc-900 text-white border-black' : 'border-zinc-200 text-zinc-400'}`}
                                            >
                                                {brand}
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            </div>

                            <div className="p-4 bg-zinc-50/50 text-center">
                                <p className="text-[8px] font-black text-zinc-300 uppercase tracking-widest">Automatically applied on click</p>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}