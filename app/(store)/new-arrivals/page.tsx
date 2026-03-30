"use client"

import * as React from "react"
import { createClient } from "@/utils/supabase/client"
import { Loader2, SlidersHorizontal, X, Check, ChevronDown } from "lucide-react"
import { ProductCard } from "@/components/store/product-card"
import { motion, AnimatePresence } from "framer-motion"
import { SignatureLoader } from "@/components/store/signature-loader"
import { Breadcrumbs } from "@/components/store/breadcrumbs"

export default function NewArrivalsPage() {
    const [products, setProducts] = React.useState<any[]>([])
    const [filteredProducts, setFilteredProducts] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(true)
    const [showFilters, setShowFilters] = React.useState(false)

    // Filter/Sort States
    const [sortBy, setSortBy] = React.useState("newest")
    const [selectedBrands, setSelectedBrands] = React.useState<string[]>([])
    const [priceRange, setPriceRange] = React.useState<[number, number]>([0, 50000])

    const supabase = createClient()

    // 1. INITIAL FETCH
    React.useEffect(() => {
        async function getNewArrivals() {
            try {
                setLoading(true)
                const { data: category } = await supabase.from('categories').select('id').eq('slug', 'new-arrivals').single()
                if (!category) return

                const { data: junctionData } = await supabase.from('product_categories').select('product_id').eq('category_id', category.id)
                const productIds = junctionData?.map(j => j.product_id) || []
                
                // Fetch products from BOTH the direct category_id column AND the junction table
                let query = supabase
                    .from('products')
                    .select('*, product_variants(*)')
                    .eq('status', 'active')

                if (productIds.length > 0) {
                    query = query.or(`category_id.eq.${category.id},id.in.(${productIds.join(',')})`)
                } else {
                    query = query.eq('category_id', category.id)
                }

                const { data: finalProducts } = await query
                
                setProducts(finalProducts || [])
                setFilteredProducts(finalProducts || [])
            } finally {
                setLoading(false)
            }
        }
        getNewArrivals()
    }, [supabase])

    // 2. FILTER & SORT ENGINE
    React.useEffect(() => {
        let result = [...products]

        // Brand Filter
        if (selectedBrands.length > 0) {
            result = result.filter(p => selectedBrands.includes(p.brand))
        }

        // Price Filter (Using base_price or default variant price)
        result = result.filter(p => {
            const price = p.base_price || p.product_variants?.[0]?.price || 0
            return price >= priceRange[0] && price <= priceRange[1]
        })

        // Sorting Logic
        result.sort((a, b) => {
            const priceA = a.base_price || a.product_variants?.[0]?.price || 0
            const priceB = b.base_price || b.product_variants?.[0]?.price || 0

            if (sortBy === "price-low") return priceA - priceB
            if (sortBy === "price-high") return priceB - priceA
            if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            return 0
        })

        setFilteredProducts(result)
    }, [products, selectedBrands, priceRange, sortBy])

    // Get Unique Brands for Filter UI
    const brands = Array.from(new Set(products.map(p => p.brand))).filter(Boolean)

    return (
        <div className="min-h-screen bg-white text-zinc-900 pb-20 pt-16">
            {/* FILTER SIDEBAR (UX: Slide-over) */}
            <AnimatePresence>
                {showFilters && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowFilters(false)}
                            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100]"
                        />
                        <motion.div
                            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                            className="fixed right-0 top-0 h-full w-full max-w-xs bg-white z-[101] shadow-xl p-8 overflow-y-auto"
                        >
                            <div className="flex justify-between items-center mb-10">
                                <h2 className="text-sm font-black uppercase tracking-widest">Filter By</h2>
                                <button onClick={() => setShowFilters(false)}><X className="w-5 h-5" /></button>
                            </div>

                            {/* Brand Filter UI */}
                            <div className="mb-10">
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-4">Brands</h3>
                                <div className="space-y-3">
                                    {brands.map(brand => (
                                        <label key={brand} className="flex items-center gap-3 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                className="hidden"
                                                checked={selectedBrands.includes(brand)}
                                                onChange={() => {
                                                    setSelectedBrands(prev =>
                                                        prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]
                                                    )
                                                }}
                                            />
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedBrands.includes(brand) ? 'bg-black border-black' : 'border-zinc-200'}`}>
                                                {selectedBrands.includes(brand) && <Check className="w-2.5 h-2.5 text-white" />}
                                            </div>
                                            <span className="text-[11px] uppercase tracking-wide group-hover:text-primary">{brand}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Sort UI inside Filter for Mobile */}
                            <div className="mb-10">
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-4">Sort By</h3>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="w-full border-b border-zinc-200 py-2 text-[11px] uppercase font-bold outline-none"
                                >
                                    <option value="newest">Newest First</option>
                                    <option value="price-low">Price: Low to High</option>
                                    <option value="price-high">Price: High to Low</option>
                                </select>
                            </div>

                            <button
                                onClick={() => setShowFilters(false)}
                                className="w-full bg-black text-white py-4 text-[10px] font-bold uppercase tracking-widest mt-10"
                            >
                                Show {filteredProducts.length} Results
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* MAIN CONTENT */}
            <main className="max-w-7xl mx-auto px-6 pb-20">
                <Breadcrumbs items={[{ label: 'New Arrivals', href: '/new-arrivals' }]} />
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div>
                        <h1 className="text-4xl font-black uppercase tracking-tighter italic">New Arrivals</h1>
                        <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-2">Latest additions to The Makeup Store</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setShowFilters(true)}
                            className="flex items-center gap-2 px-6 py-3 border border-zinc-200 text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-50 transition-all"
                        >
                            <SlidersHorizontal className="w-3 h-3" /> Filter / Sort
                        </button>
                    </div>
                </div>

                <SignatureLoader loading={loading} text="The Makeup Store / New Arrivals" />

                {!loading && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
                        {filteredProducts.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}