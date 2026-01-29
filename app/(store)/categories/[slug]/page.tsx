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
    const [sortBy, setSortBy] = React.useState("newest")
    const [selectedBrand, setSelectedBrand] = React.useState<string | null>(null)

    const handleFilterSelection = (type: 'sort' | 'brand', value: any) => {
        if (type === 'sort') setSortBy(value)
        if (type === 'brand') setSelectedBrand(value)
        setIsFilterOpen(false)
    }

    React.useEffect(() => {
        async function fetchContent() {
            if (!slug) return
            setLoading(true)
            try {
                // 1. Fetch Category Info
                const { data: catData, error: catError } = await supabase
                    .from('categories')
                    .select('id, name, slug, parent_id')
                    .eq('slug', slug)
                    .single()

                if (catError) throw catError
                setCategory(catData)

                // 2. Fetch Siblings
                if (catData.parent_id) {
                    const { data: siblings } = await supabase
                        .from('categories')
                        .select('name, slug')
                        .eq('parent_id', catData.parent_id)
                        .order('name', { ascending: true })
                    if (siblings) setSiblingCategories(siblings)
                }

                // 3. Fetch Product IDs from Junction Table
                const { data: junctionData } = await supabase
                    .from('product_categories')
                    .select('product_id')
                    .eq('category_id', catData.id)

                const junctionProductIds = junctionData?.map(j => j.product_id) || []

                // 4. Build Product Query
                let query = supabase
                    .from('products')
                    .select('*, product_variants(*)')
                    .eq('status', 'active')

                if (junctionProductIds.length > 0) {
                    query = query.or(`category_id.eq.${catData.id},id.in.(${junctionProductIds.join(',')})`)
                } else {
                    query = query.eq('category_id', catData.id)
                }

                if (selectedBrand) {
                    query = query.eq('brand', selectedBrand)
                }

                // Note: We don't use .order('price') here because it causes the error you saw.
                // We fetch the data and sort it manually below.
                const { data: prodData, error: prodError } = await query
                if (prodError) throw prodError

                // 5. LOCAL SORTING LOGIC
                let sortedProducts = [...(prodData || [])]

                if (sortBy === 'price-low' || sortBy === 'price-high') {
                    sortedProducts.sort((a, b) => {
                        // Safely get price from the first variant
                        const priceA = a.product_variants?.[0]?.price || 0
                        const priceB = b.product_variants?.[0]?.price || 0
                        return sortBy === 'price-low' ? priceA - priceB : priceB - priceA
                    })
                } else {
                    // Default: Newest First
                    sortedProducts.sort((a, b) =>
                        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    )
                }

                setProducts(sortedProducts)

                // 6. Update brand list only if not filtering by brand
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
            <Loader2 className="w-5 h-5 animate-spin text-zinc-300 stroke-[1.5]" />
        </div>
    )

    return (
        <div className="min-h-screen bg-white text-[#1A1A1A] pb-40 selection:bg-primary/10">
            <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-zinc-50">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/categories" className="group flex items-center gap-2">
                        <ArrowLeft className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-900 transition-colors" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 group-hover:text-zinc-900 transition-colors hidden md:block">Collections</span>
                    </Link>

                    <div className="flex items-center gap-8 overflow-x-auto no-scrollbar px-4">
                        {siblingCategories.map((sib) => (
                            <Link
                                key={sib.slug}
                                href={`/categories/${sib.slug}`}
                                className={`text-[9px] font-black uppercase tracking-[0.25em] whitespace-nowrap transition-all relative py-2 ${sib.slug === slug ? 'text-zinc-900' : 'text-zinc-300 hover:text-zinc-500'}`}
                            >
                                {sib.name}
                                {sib.slug === slug && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />}
                            </Link>
                        ))}
                    </div>

                    <button onClick={() => setIsFilterOpen(true)} className="flex items-center gap-2 group flex-shrink-0">
                        <span className="text-[10px] font-black uppercase tracking-widest group-hover:text-primary transition-colors">Refine</span>
                        <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400 group-hover:text-primary transition-colors" />
                    </button>
                </div>
            </nav>

            <main className="max-w-6xl mx-auto px-6 pt-5">
                {error ? (
                    <div className="py-20 flex flex-col items-center text-center gap-4">
                        <AlertCircle className="w-6 h-6 text-zinc-200" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{error}</p>
                    </div>
                ) : (
                    <>
                        <header className="mb-20 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-[1px] w-8 bg-primary" />
                            </div>
                            <h1 className="text-6xl md:text-8xl font-serif tracking-tighter uppercase leading-[0.85]">
                                {category?.name}
                            </h1>
                        </header>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-16">
                            {products.map((product) => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>
                    </>
                )}
            </main>

            <AnimatePresence>
                {isFilterOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsFilterOpen(false)}
                            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100]"
                        />
                        <motion.div
                            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            className="fixed right-0 top-0 bottom-0 w-full max-w-xs bg-white z-[101] shadow-2xl flex flex-col"
                        >
                            <div className="p-8 flex items-center justify-between border-b border-zinc-50">
                                <h2 className="text-xs font-black uppercase tracking-[0.3em]">Refine By</h2>
                                <button onClick={() => setIsFilterOpen(false)}><X className="w-4 h-4" /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-12 no-scrollbar">
                                <section className="space-y-4">
                                    <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Sort Order</h3>
                                    <div className="flex flex-col gap-2">
                                        {[
                                            { id: 'newest', label: 'Newest First' },
                                            { id: 'price-low', label: 'Price: Low to High' },
                                            { id: 'price-high', label: 'Price: High to Low' }
                                        ].map((opt) => (
                                            <button
                                                key={opt.id}
                                                onClick={() => handleFilterSelection('sort', opt.id)}
                                                className="flex items-center justify-between py-2 group text-left"
                                            >
                                                <span className={`text-[11px] font-bold uppercase tracking-wider transition-colors ${sortBy === opt.id ? 'text-zinc-900' : 'text-zinc-400 group-hover:text-zinc-600'}`}>{opt.label}</span>
                                                {sortBy === opt.id && <Check className="w-3 h-3 text-primary" />}
                                            </button>
                                        ))}
                                    </div>
                                </section>

                                <section className="space-y-4 pb-40">
                                    <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Filter by Brand</h3>
                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={() => handleFilterSelection('brand', null)}
                                            className="flex items-center justify-between py-2 group text-left"
                                        >
                                            <span className={`text-[11px] font-bold uppercase tracking-wider ${!selectedBrand ? 'text-zinc-900' : 'text-zinc-400'}`}>All Brands</span>
                                            {!selectedBrand && <Check className="w-3 h-3 text-primary" />}
                                        </button>
                                        {brands.map((brand) => (
                                            <button
                                                key={brand}
                                                onClick={() => handleFilterSelection('brand', brand)}
                                                className="flex items-center justify-between py-2 group text-left"
                                            >
                                                <span className={`text-[11px] font-bold uppercase tracking-wider transition-colors ${selectedBrand === brand ? 'text-zinc-900' : 'text-zinc-400 group-hover:text-zinc-600'}`}>{brand}</span>
                                                {selectedBrand === brand && <Check className="w-3 h-3 text-primary" />}
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