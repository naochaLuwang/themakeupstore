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
    LayoutGrid,
    ArrowUpDown,
    Zap
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { ProductCard } from "@/components/store/product-card"
import { Breadcrumbs } from "@/components/store/breadcrumbs"
import { SignatureLoader } from "@/components/store/signature-loader"

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

    // --- ENHANCED SCROLL LOGIC FOR FAB ---
    const { scrollY } = useScroll()

    useMotionValueEvent(scrollY, "change", (latest) => {
        const previous = scrollY.getPrevious() ?? 0
        if (latest > previous && latest > 150) {
            setIsPillVisible(false)
        } else {
            setIsPillVisible(true)
        }
    })

    // AUTO-APPLY & CLOSE LOGIC
    const handleFilterSelection = (type: 'sort' | 'brand', value: any) => {
        if (type === 'sort') setSortBy(value)
        if (type === 'brand') setSelectedBrand(value)
        setTimeout(() => setIsFilterOpen(false), 400)
    }

    const resetFilters = () => {
        setSortBy("alphabetical")
        setSelectedBrand(null)
        setSearchQuery("")
        setTimeout(() => setIsFilterOpen(false), 400)
    }

    // Initial Fetch
    React.useEffect(() => {
        async function fetchBaseData() {
            if (!slug) return
            setInitialLoading(true)
            const { data: catData } = await supabase.from('categories')
                .select('*, parent:parent_id(id, name, slug)')
                .eq('slug', slug)
                .single()
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
            // YOUR SIGNATURE DELAY
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

    const StickyNav = ({ isDataLoaded }: { isDataLoaded: boolean }) => (
        <nav className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-xl border-b border-pink-50">
            <div className="max-w-7xl mx-auto px-4 py-4">
                <div className="mb-4">
                    <Breadcrumbs
                        items={[
                            { label: 'Categories', href: '/categories' },
                            ...(category?.parent ? [{ label: category.parent.name, href: `/categories/${category.parent.slug}` }] : []),
                            { label: category?.name || '...', href: `/categories/${slug}` }
                        ]}
                    />
                </div>

                <div className="flex items-center gap-6 overflow-x-auto no-scrollbar touch-pan-x pb-2">
                    {isDataLoaded ? (
                        siblingCategories.map((sib) => {
                            const isActive = sib.slug === slug;
                            return (
                                <Link
                                    key={sib.slug}
                                    href={`/categories/${sib.slug}`}
                                    className="flex flex-col items-center gap-2 shrink-0 group"
                                >
                                    <div className={`w-14 h-14 rounded-full p-[2px] transition-all duration-500 ${isActive ? 'bg-[#fc2779]' : 'bg-slate-100'}`}>
                                        <div className="w-full h-full rounded-full border-2 border-white bg-white overflow-hidden flex items-center justify-center">
                                            {sib.image_url ? (
                                                <img src={sib.image_url} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                                <span className="text-sm font-black text-slate-400 uppercase">
                                                    {sib.name ? sib.name.charAt(0) : '?'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <span className={`text-[9px] font-bold uppercase tracking-tighter ${isActive ? 'text-[#fc2779]' : 'text-slate-500'}`}>
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

            {/* SIGNATURE LOADER */}
            <SignatureLoader loading={initialLoading} text={`The Makeup Store / ${category?.name || 'Discovery'}`} />

            {!initialLoading && (
                <div className={`transition-all duration-700 ${isFilterOpen ? 'blur-2xl scale-[0.98] opacity-40 pointer-events-none' : ''}`}>
                    <StickyNav isDataLoaded={true} />
                    <main className="max-w-7xl mx-auto px-6 pt-10">
                        <header className="mb-12 border-b border-pink-50 pb-10">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-10">
                                {/* <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-[#fc2779]">
                                        <Sparkles className="w-4 h-4 fill-[#fc2779]" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">The Premium Edit</span>
                                    </div>
                                    <h1 className="text-5xl md:text-8xl font-serif italic text-slate-950 leading-[0.8] tracking-tighter">
                                        {category?.name}
                                    </h1>
                                </div> */}
                                <div className="relative w-full md:w-72 flex items-center border-b border-pink-100 pb-2">
                                    <Search className="w-4 h-4 text-[#fc2779] stroke-[3px]" />
                                    <input
                                        type="text"
                                        placeholder="SEARCH COLLECTION .."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-transparent border-none pl-3 text-[10px] font-black tracking-widest outline-none uppercase placeholder:text-slate-300"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <LayoutGrid className="w-4 h-4 text-pink-200" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    {filteredProducts.length} Results Found
                                </p>
                            </div>
                        </header>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 border-t border-l border-pink-50 bg-white overflow-hidden">
                            {filteredProducts.map((p) => <ProductCard key={p.id} product={p} />)}
                        </div>
                    </main>
                </div>
            )}

            {/* FAB WITH HIDE/SHOW SCROLL LOGIC */}
            <AnimatePresence>
                {isPillVisible && !initialLoading && !isFilterOpen && (
                    <motion.button
                        initial={{ scale: 0, y: 20, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0, y: 20, opacity: 0 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setIsFilterOpen(true)}
                        className="fixed bottom-20 right-6 z-[60] bg-slate-950 text-white w-16 h-16 rounded-full flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.25)] border-2 border-white"
                    >
                        <div className="relative">
                            <SlidersHorizontal className="w-6 h-6 stroke-[1.5]" />
                            {(selectedBrand || sortBy !== "alphabetical") && (
                                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#fc2779] border-2 border-slate-950 rounded-full animate-pulse" />
                            )}
                        </div>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* SIDE DRAWER */}
            <AnimatePresence>
                {isFilterOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsFilterOpen(false)}
                            className="fixed inset-0 bg-slate-950/40 z-[500] backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 28, stiffness: 220 }}
                            className="fixed top-0 right-0 h-full w-full max-w-[400px] bg-white z-[501] shadow-[-20px_0_60px_rgba(0,0,0,0.1)] flex flex-col"
                        >
                            <div className="px-8 pt-16 pb-8 border-b border-pink-50 flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-[#fc2779]">
                                        <Zap className="w-3.5 h-3.5 fill-[#fc2779]" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Refine View</span>
                                    </div>
                                    <h2 className="text-3xl font-serif italic text-slate-900">Filter & Sort</h2>
                                </div>
                                <button
                                    onClick={() => setIsFilterOpen(false)}
                                    className="w-12 h-12 flex items-center justify-center bg-white rounded-full shadow-sm border border-pink-50 hover:rotate-90 transition-all duration-500"
                                >
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-8 space-y-12 no-scrollbar">
                                <section className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        <ArrowUpDown className="w-4 h-4 text-[#fc2779]" />
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sort Order</h3>
                                    </div>
                                    <div className="space-y-2">
                                        {['newest', 'price-low', 'price-high', 'alphabetical'].map((id) => (
                                            <button
                                                key={id}
                                                onClick={() => handleFilterSelection('sort', id)}
                                                className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all duration-300 ${sortBy === id ? 'bg-pink-50 border-[#fc2779] text-[#fc2779]' : 'border-slate-100 text-slate-500'}`}
                                            >
                                                <span className="text-[11px] font-bold uppercase">{id.replace('-', ' ')}</span>
                                                {sortBy === id && <Check className="w-4 h-4 text-[#fc2779]" />}
                                            </button>
                                        ))}
                                    </div>
                                </section>
                                <section className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        <Sparkles className="w-4 h-4 text-[#fc2779]" />
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Boutique Brands</h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2.5 pb-10">
                                        {brands.map((b) => (
                                            <button
                                                key={b}
                                                onClick={() => handleFilterSelection('brand', b)}
                                                className={`px-4 py-4 rounded-xl border text-[9px] font-black uppercase transition-all ${selectedBrand === b ? 'bg-[#fc2779] border-[#fc2779] text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}
                                            >
                                                {b}
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            </div>
                            <div className="p-8 bg-slate-50/50 border-t border-slate-100 mt-auto">
                                <button
                                    onClick={resetFilters}
                                    className="w-full h-16 bg-white border border-slate-200 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-sm"
                                >
                                    <RotateCcw className="w-4 h-4 text-slate-400" />
                                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-900">Clear All Selections</span>
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}