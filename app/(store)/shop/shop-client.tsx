"use client"

import * as React from "react"
import { ProductCard } from "@/components/store/product-card"
import { SlidersHorizontal, X, ChevronDown, LayoutGrid, Square, Package, Search } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"

export default function ShopClient({ initialProducts, searchQuery }: { initialProducts: any[], searchQuery: string }) {
    const [products, setProducts] = React.useState(initialProducts)
    const [filtered, setFiltered] = React.useState(initialProducts)
    const [showFilters, setShowFilters] = React.useState(false)
    const [sortBy, setSortBy] = React.useState("newest")
    const [selectedBrands, setSelectedBrands] = React.useState<string[]>([])

    // Sync search query if it changes
    React.useEffect(() => { setProducts(initialProducts) }, [initialProducts])

    // UX: Instant Filter/Sort Engine
    React.useEffect(() => {
        let result = [...products]
        if (selectedBrands.length > 0) {
            result = result.filter(p => selectedBrands.includes(p.brand))
        }

        result.sort((a, b) => {
            if (sortBy === "low-high") return (a.base_price || 0) - (b.base_price || 0)
            if (sortBy === "high-low") return (b.base_price || 0) - (a.base_price || 0)
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })
        setFiltered(result)
    }, [selectedBrands, sortBy, products])

    const brands = Array.from(new Set(products.map(p => p.brand))).filter(Boolean)

    return (
        <div className="min-h-screen bg-white">
            {/* 1. MINIMAL SEARCH HEADER */}
            <div className="bg-zinc-50 border-b border-zinc-100 py-12">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase mb-4">
                        {searchQuery ? `Results for "${searchQuery}"` : "The Collection"}
                    </h1>
                    <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-400">
                        {filtered.length} items
                    </p>
                </div>
            </div>

            {/* 2. STICKY FILTER BAR (Professional UX) */}
            <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-zinc-100">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => setShowFilters(true)}
                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:text-primary transition-colors"
                        >
                            <SlidersHorizontal className="w-3.5 h-3.5" /> Filter
                        </button>

                        {/* Active Filter Badges (Crucial UX) */}
                        <div className="hidden lg:flex items-center gap-2">
                            {selectedBrands.map(b => (
                                <span key={b} className="flex items-center gap-1.5 px-3 py-1 bg-zinc-100 rounded-full text-[9px] font-bold uppercase tracking-tight">
                                    {b} <X className="w-2.5 h-2.5 cursor-pointer" onClick={() => setSelectedBrands(s => s.filter(x => x !== b))} />
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="relative group cursor-pointer">
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="appearance-none bg-transparent pr-6 text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer"
                            >
                                <option value="newest">Newest</option>
                                <option value="low-high">Price: Low</option>
                                <option value="high-low">Price: High</option>
                            </select>
                            <ChevronDown className="w-3 h-3 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </div>
                </div>
            </nav>

            {/* 3. PRODUCT GRID */}
            <main className="max-w-7xl mx-auto px-6 py-12">
                {filtered.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-12 md:gap-x-8 md:gap-y-20">
                        {filtered.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                ) : (
                    <div className="py-40 text-center">
                        <Package className="w-10 h-10 text-zinc-200 mx-auto mb-4 stroke-[1]" />
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">No matches in our warehouse</p>
                        <Link href="/shop" className="inline-block mt-6 border-b border-black text-[10px] font-bold uppercase pb-1">Reset All</Link>
                    </div>
                )}
            </main>

            {/* 4. FILTER SLIDE-OVER */}
            <AnimatePresence>
                {showFilters && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowFilters(false)}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
                        />
                        <motion.div
                            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                            className="fixed right-0 top-0 h-full w-80 bg-white z-[101] shadow-2xl p-8"
                        >
                            <div className="flex justify-between items-center mb-12">
                                <h2 className="text-xs font-black uppercase tracking-widest">Preferences</h2>
                                <X className="w-5 h-5 cursor-pointer" onClick={() => setShowFilters(false)} />
                            </div>

                            <div className="space-y-10">
                                <div>
                                    <h3 className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-6">Brands</h3>
                                    <div className="space-y-3">
                                        {brands.map(brand => (
                                            <label key={brand} className="flex items-center gap-3 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="w-3.5 h-3.5 accent-black rounded-none"
                                                    checked={selectedBrands.includes(brand)}
                                                    onChange={() => {
                                                        setSelectedBrands(prev =>
                                                            prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]
                                                        )
                                                    }}
                                                />
                                                <span className="text-[11px] font-bold uppercase tracking-tight">{brand}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowFilters(false)}
                                className="absolute bottom-8 left-8 right-8 bg-black text-white py-4 text-[10px] font-bold uppercase tracking-widest"
                            >
                                Show Results
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}