"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    SlidersHorizontal,
    X,
    Check,
    ArrowUpDown,
    Package,
} from "lucide-react"
import { ProductCard } from "@/components/store/product-card"
import { Bone } from "@/components/store/bone"
import { createClient } from "@/utils/supabase/client"
import type { ActiveFlashSale } from "@/lib/active-flash-sales"

type SortOption = "newest" | "price_asc" | "price_desc" | "name"

const PRICE_RANGES = [
    { label: "Under ₹500", min: 0, max: 500 },
    { label: "₹500 – ₹1,000", min: 500, max: 1000 },
    { label: "₹1,000 – ₹2,000", min: 1000, max: 2000 },
    { label: "Above ₹2,000", min: 2000, max: Infinity },
] as const

const sortOptions: { key: SortOption; label: string }[] = [
    { key: "newest", label: "Newest First" },
    { key: "price_asc", label: "Price: Low to High" },
    { key: "price_desc", label: "Price: High to Low" },
    { key: "name", label: "Name: A-Z" },
]

function computeEffectivePrice(product: any, activeFlashSale?: ActiveFlashSale | null): number {
    const basePrice = product.has_variants && product.product_variants?.length > 0
        ? Math.min(...product.product_variants.map((v: any) => v.price || 0))
        : product.base_price || 0
    
    const dType = product.discount_type || "none"
    const dVal = product.discount_value || 0
    
    let regularPrice = basePrice
    if (dType === "percentage" && dVal > 0) regularPrice = basePrice * (1 - dVal / 100)
    else if ((dType === "fixed" || dType === "amount") && dVal > 0) regularPrice = Math.max(0, basePrice - dVal)
    
    if (!activeFlashSale) return regularPrice
    
    const flashPrice = activeFlashSale.discount_type === 'percentage'
        ? basePrice * (1 - activeFlashSale.discount_value / 100)
        : Math.max(0, basePrice - activeFlashSale.discount_value)
    
    return Math.min(regularPrice, flashPrice)
}

function getProductCategoryIds(product: any): string[] {
    const ids: string[] = []
    if (product.category_id) ids.push(product.category_id)
    if (product.product_categories) {
        for (const pc of product.product_categories) {
            if (pc?.category_id && !ids.includes(pc.category_id)) ids.push(pc.category_id)
        }
    }
    if (product.categories) {
        const cats = Array.isArray(product.categories) ? product.categories : [product.categories]
        for (const c of cats) {
            if (c?.id && !ids.includes(c.id)) ids.push(c.id)
        }
    }
    return ids
}

function findBestFlashSale(
    flashSales: ActiveFlashSale[],
    product: any
): ActiveFlashSale | null {
    let best: ActiveFlashSale | null = null
    let bestDiscount = 0
    
    const productId = product.id
    const categoryIds = getProductCategoryIds(product)
    const brand = product.brand || null
    
    for (const fs of flashSales) {
        let match = false
        switch (fs.scope) {
            case 'all':
                match = true
                break
            case 'product':
                match = fs.product_id === productId
                break
            case 'category':
                match = fs.category_id ? categoryIds.includes(fs.category_id) : false
                break
            case 'brand':
                match = fs.brand === brand
                break
        }
        if (!match) continue
        
        const discountValue = fs.discount_type === 'percentage' ? fs.discount_value : fs.discount_value * 100
        if (!best || discountValue > bestDiscount) {
            best = fs
            bestDiscount = discountValue
        }
    }
    
    return best
}

export default function ShopClient({ initialProducts }: { initialProducts: any[] }) {
    const [products, setProducts] = React.useState(initialProducts)
    const [filtered, setFiltered] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(false)
    const [showSort, setShowSort] = React.useState(false)
    const [showFilter, setShowFilter] = React.useState(false)
    const [sort, setSort] = React.useState<SortOption>("newest")
    const [selectedBrands, setSelectedBrands] = React.useState<string[]>([])
    const [selectedPriceRange, setSelectedPriceRange] = React.useState<number | null>(null)
    const [availableBrands, setAvailableBrands] = React.useState<string[]>([])
    const [tempBrands, setTempBrands] = React.useState<string[]>([])
    const [tempPriceRange, setTempPriceRange] = React.useState<number | null>(null)
    const [flashSales, setFlashSales] = React.useState<ActiveFlashSale[]>([])
    const sortRef = React.useRef<HTMLDivElement>(null)

    // Fetch active + scheduled flash sales
    React.useEffect(() => {
        const fetchFlashSales = async () => {
            const supabase = createClient()
            const now = new Date().toISOString()
            const { data } = await supabase
                .from('flash_sales')
                .select('*')
                .eq('is_active', true)
                .gte('ends_at', now)
            if (data) setFlashSales(data as ActiveFlashSale[])
        }
        fetchFlashSales()
        // Refetch every 30 seconds
        const interval = setInterval(fetchFlashSales, 30000)
        return () => clearInterval(interval)
    }, [])

    React.useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
                setShowSort(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    React.useEffect(() => {
        const brands = Array.from(
            new Set(initialProducts?.map((p: any) => p.brand).filter(Boolean) as string[])
        ).sort()
        setAvailableBrands(brands)
    }, [initialProducts])

    React.useEffect(() => {
        const nowMs = Date.now()
        const liveSales = flashSales.filter((fs) => new Date(fs.starts_at).getTime() <= nowMs)
        const upcomingSales = flashSales.filter((fs) => new Date(fs.starts_at).getTime() > nowMs)
        let processed = [...products].map((p) => {
            const bestFlashSale = findBestFlashSale(liveSales, p)
            const upcomingFlashSale = bestFlashSale ? null : findBestFlashSale(upcomingSales, p)
            return {
                ...p,
                _bestFlashSale: bestFlashSale,
                _upcomingFlashSale: upcomingFlashSale,
                _effectivePrice: computeEffectivePrice(p, bestFlashSale),
                _outOfStock: p.product_variants?.length > 0
                    ? p.product_variants.every((v: any) => v.stock != null && Number(v.stock) <= 0)
                    : false,
            }
        })

        if (selectedBrands.length > 0) {
            processed = processed.filter((p) => selectedBrands.includes(p.brand))
        }

        if (selectedPriceRange !== null) {
            const range = PRICE_RANGES[selectedPriceRange]
            processed = processed.filter(
                (p) => p._effectivePrice >= range.min && (range.max === Infinity || p._effectivePrice < range.max)
            )
        }

        if (sort === "name") {
            processed.sort((a, b) => {
                const aOOS = a._outOfStock ? 1 : 0;
                const bOOS = b._outOfStock ? 1 : 0;
                if (aOOS !== bOOS) return aOOS - bOOS;
                return a.name.localeCompare(b.name);
            });
        } else if (sort === "price_asc") {
            processed.sort((a, b) => {
                const aOOS = a._outOfStock ? 1 : 0;
                const bOOS = b._outOfStock ? 1 : 0;
                if (aOOS !== bOOS) return aOOS - bOOS;
                return a._effectivePrice - b._effectivePrice;
            });
        } else if (sort === "price_desc") {
            processed.sort((a, b) => {
                const aOOS = a._outOfStock ? 1 : 0;
                const bOOS = b._outOfStock ? 1 : 0;
                if (aOOS !== bOOS) return aOOS - bOOS;
                return b._effectivePrice - a._effectivePrice;
            });
        } else if (sort === "newest") {
            processed.sort((a, b) => {
                const aOOS = a._outOfStock ? 1 : 0;
                const bOOS = b._outOfStock ? 1 : 0;
                if (aOOS !== bOOS) return aOOS - bOOS;
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });
        }

        setFiltered(processed)
        setLoading(false)
    }, [sort, selectedBrands, selectedPriceRange, products, flashSales])

    const activeFilterCount = selectedBrands.length + (selectedPriceRange !== null ? 1 : 0)

    const applyFilters = () => {
        setSelectedBrands(tempBrands)
        setSelectedPriceRange(tempPriceRange)
        setShowFilter(false)
    }

    const clearFilters = () => {
        setTempBrands([])
        setTempPriceRange(null)
    }

    return (
        <div className="w-full">
            {/* Toolbar */}
            <div className="sticky top-16 z-40 bg-white/80 backdrop-blur-sm border-b border-slate-200">
                <div className="container mx-auto px-4 py-3 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{filtered.length} products</p>
                        {activeFilterCount > 0 && (
                            <button
                                onClick={() => { setTempBrands([]); setTempPriceRange(null); setSelectedBrands([]); setSelectedPriceRange(null); }}
                                className="text-xs text-rose-500 font-semibold hover:underline flex items-center gap-1"
                            >
                                <X className="w-3 h-3" /> Clear all
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Sort */}
                        <div className="relative" ref={sortRef}>
                            <button
                                onClick={() => setShowSort(!showSort)}
                                className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                            >
                                <ArrowUpDown className="w-4 h-4" />
                                <span>{sortOptions.find(o => o.key === sort)?.label}</span>
                            </button>
                            {showSort && (
                                <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 min-w-[180px] overflow-hidden">
                                    {sortOptions.map(opt => (
                                        <button
                                            key={opt.key}
                                            onClick={() => { setSort(opt.key); setShowSort(false) }}
                                            className={`w-full px-4 py-2 text-left text-sm transition-colors ${sort === opt.key ? 'bg-rose-50 text-rose-600 font-semibold' : 'text-slate-700 hover:bg-slate-50'}`}
                                        >
                                            {opt.label}
                                            {sort === opt.key && <Check className="w-4 h-4 ml-auto" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        {/* Filter */}
                        <button
                            onClick={() => { setTempBrands(selectedBrands); setTempPriceRange(selectedPriceRange); setShowFilter(true) }}
                            className={`flex items-center gap-1.5 h-9 px-3 rounded-lg border text-sm font-semibold transition-colors ${activeFilterCount > 0 ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                        >
                            <Package className="w-4 h-4" />
                            <span>Filter</span>
                            {activeFilterCount > 0 && (
                                <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Filter Sheet */}
            <AnimatePresence>
                {showFilter && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm sm:hidden"
                        onClick={() => setShowFilter(false)}
                    >
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            className="fixed right-0 top-0 h-full w-full sm:w-80 bg-white shadow-xl flex flex-col"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                                <h3 className="text-lg font-bold text-slate-900">Filters</h3>
                                <button onClick={() => setShowFilter(false)} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 mb-3">Brands</h4>
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                        {availableBrands.map(brand => (
                                            <label key={brand} className="flex items-center gap-3 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={tempBrands.includes(brand)}
                                                    onChange={e => e.target.checked ? setTempBrands([...tempBrands, brand]) : setTempBrands(tempBrands.filter(b => b !== brand))}
                                                    className="w-4 h-4 rounded border-slate-300 text-rose-500 focus:ring-rose-500"
                                                />
                                                <span className="text-sm text-slate-700">{brand}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 mb-3">Price Range</h4>
                                    <div className="space-y-2">
                                        {PRICE_RANGES.map((range, idx) => (
                                            <label key={idx} className="flex items-center gap-3 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="priceRange"
                                                    checked={tempPriceRange === idx}
                                                    onChange={() => setTempPriceRange(idx)}
                                                    className="w-4 h-4 rounded border-slate-300 text-rose-500 focus:ring-rose-500"
                                                />
                                                <span className="text-sm text-slate-700">{range.label}</span>
                                            </label>
                                        ))}
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="priceRange"
                                                checked={tempPriceRange === null}
                                                onChange={() => setTempPriceRange(null)}
                                                className="w-4 h-4 rounded border-slate-300 text-rose-500 focus:ring-rose-500"
                                            />
                                            <span className="text-sm text-slate-700">All Prices</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 border-t border-slate-200 flex gap-2">
                                <button onClick={clearFilters} className="flex-1 h-10 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Clear</button>
                                <button onClick={applyFilters} className="flex-1 h-10 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800">Apply</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Product Grid */}
            <div className="container mx-auto px-4 py-6 md:py-8">
                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="space-y-4">
                                <Bone className="aspect-[4/5] w-full rounded-2xl" />
                                <div className="space-y-2">
                                    <Bone className="h-3 w-1/2" />
                                    <Bone className="h-4 w-full" />
                                    <Bone className="h-4 w-1/4" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20 px-6">
                        <Package className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                        <p className="text-lg font-semibold text-slate-900 mb-1">No products found</p>
                        <p className="text-slate-500">Try adjusting your filters</p>
                        <button onClick={() => { setSelectedBrands([]); setSelectedPriceRange(null); }} className="mt-4 text-sm font-semibold text-rose-500 hover:underline">Clear filters</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 bg-white overflow-hidden">
                        {filtered.map((p, idx) => (
                            <ProductCard key={p.id} product={p} priority={idx < 4} activeFlashSale={p._bestFlashSale} upcomingFlashSale={p._upcomingFlashSale} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}