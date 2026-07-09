"use client"

import * as React from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
    SlidersHorizontal,
    X,
    Check,
    ArrowUpDown,
    Package,
} from "lucide-react"
import { ProductCard } from "@/components/store/product-card"
import { Skeleton } from "@/components/ui/skeleton"

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

function computeEffectivePrice(product: any): number {
    if (product.has_variants && product.product_variants?.length > 0) {
        const prices = product.product_variants.map((v: any) => {
            const base = v.price || 0
            const dType = v.discount_type || product.discount_type || "none"
            const dVal = v.discount_value || product.discount_value || 0
            if (dType === "percentage" && dVal > 0) return base * (1 - dVal / 100)
            if ((dType === "fixed" || dType === "amount") && dVal > 0) return Math.max(0, base - dVal)
            return base
        })
        return Math.min(...prices)
    }
    const base = product.base_price || 0
    const dType = product.discount_type || "none"
    const dVal = product.discount_value || 0
    if (dType === "percentage" && dVal > 0) return base * (1 - dVal / 100)
    if ((dType === "fixed" || dType === "amount") && dVal > 0) return Math.max(0, base - dVal)
    return base
}

interface Props {
    category: any
    siblings: any[]
    products: any[]
    parentSlug: string
}

export default function EssentialCategoryClient({ category, siblings, products: initialProducts, parentSlug }: Props) {
    const [products, setProducts] = React.useState<any[]>(initialProducts)
    const [loading, setLoading] = React.useState(false)
    const [availableBrands, setAvailableBrands] = React.useState<string[]>([])

    const [sort, setSort] = React.useState<SortOption>("newest")
    const [selectedBrands, setSelectedBrands] = React.useState<string[]>([])
    const [selectedPriceRange, setSelectedPriceRange] = React.useState<number | null>(null)
    const [showSort, setShowSort] = React.useState(false)
    const [showFilter, setShowFilter] = React.useState(false)

    const [tempBrands, setTempBrands] = React.useState<string[]>([])
    const [tempPriceRange, setTempPriceRange] = React.useState<number | null>(null)

    const sortRef = React.useRef<HTMLDivElement>(null)

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
        let processed = [...initialProducts].map((p) => ({
            ...p,
            _effectivePrice: computeEffectivePrice(p),
        }))

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
                const aOOS = a.outOfStock ? 1 : 0;
                const bOOS = b.outOfStock ? 1 : 0;
                if (aOOS !== bOOS) return aOOS - bOOS;
                return a.name.localeCompare(b.name);
            });
        } else if (sort === "price_asc") {
            processed.sort((a, b) => {
                const aOOS = a.outOfStock ? 1 : 0;
                const bOOS = b.outOfStock ? 1 : 0;
                if (aOOS !== bOOS) return aOOS - bOOS;
                return a._effectivePrice - b._effectivePrice;
            });
        } else if (sort === "price_desc") {
            processed.sort((a, b) => {
                const aOOS = a.outOfStock ? 1 : 0;
                const bOOS = b.outOfStock ? 1 : 0;
                if (aOOS !== bOOS) return aOOS - bOOS;
                return b._effectivePrice - a._effectivePrice;
            });
        } else if (sort === "newest") {
            processed.sort((a, b) => {
                const aOOS = a.outOfStock ? 1 : 0;
                const bOOS = b.outOfStock ? 1 : 0;
                if (aOOS !== bOOS) return aOOS - bOOS;
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });
        }

        setProducts(processed)
    }, [sort, selectedBrands, selectedPriceRange, initialProducts])

    const activeFilterCount = selectedBrands.length + (selectedPriceRange !== null ? 1 : 0)

    const openFilter = () => {
        setTempBrands([...selectedBrands])
        setTempPriceRange(selectedPriceRange)
        setShowFilter(true)
    }

    const applyFilters = () => {
        setSelectedBrands([...tempBrands])
        setSelectedPriceRange(tempPriceRange)
        setShowFilter(false)
    }

    const toggleTempBrand = (brand: string) => {
        setTempBrands((prev) =>
            prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
        )
    }

    const removeBrand = (brand: string) => {
        setSelectedBrands((prev) => prev.filter((b) => b !== brand))
    }

    const removePriceRange = () => {
        setSelectedPriceRange(null)
    }

    return (
        <div className="min-h-screen bg-white pb-24">
            {/* HEADER */}
            <div className="bg-white border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-4 pt-4 pb-2">
                    <div className="mb-3">
                        <h1 className="text-xl font-black tracking-tight text-slate-900">{category?.name || "..."}</h1>
                        <p className="text-[10px] font-semibold text-slate-400">{products.length} products</p>
                    </div>

                    {/* SUBCATEGORY NAV */}
                    <div className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
                        {siblings.map((sib: any) => {
                            const isActive = sib.slug === category.slug
                            return (
                                <Link
                                    key={sib.slug}
                                    href={`/essentials/${sib.slug}`}
                                    className="flex flex-col items-center gap-1.5 shrink-0 group"
                                >
                                    <div
                                        className={`w-12 h-12 rounded-full p-[2px] transition-all duration-500 ${
                                            isActive ? "bg-[#fc2779]" : "bg-slate-200 group-hover:bg-pink-200"
                                        }`}
                                    >
                                        <div className="w-full h-full rounded-full border-2 border-white bg-slate-100 overflow-hidden flex items-center justify-center">
                                            {sib.image_url ? (
                                                <img src={sib.image_url} className="w-full h-full object-cover" alt={sib.name || "Category"} loading="lazy" />
                                            ) : (
                                                <span className="text-[9px] font-black text-slate-400 uppercase">
                                                    {sib.name?.[0] || "?"}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <span
                                        className={`text-[8px] font-bold uppercase tracking-tighter whitespace-nowrap ${
                                            isActive ? "text-[#fc2779]" : "text-slate-500"
                                        }`}
                                    >
                                        {sib.name}
                                    </span>
                                </Link>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* ACTIVE FILTER CHIPS */}
            {activeFilterCount > 0 && (
                <div className="max-w-7xl mx-auto px-4 pt-3 pb-2 flex flex-wrap gap-2">
                    {selectedBrands.map((brand) => (
                        <button
                            key={brand}
                            onClick={() => removeBrand(brand)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#fc2779]/25 bg-[#fc2779]/8 text-[10px] font-semibold text-[#fc2779] hover:bg-[#fc2779]/15 transition-all"
                        >
                            {brand}
                            <X className="w-3 h-3" />
                        </button>
                    ))}
                    {selectedPriceRange !== null && (
                        <button
                            onClick={removePriceRange}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#fc2779]/25 bg-[#fc2779]/8 text-[10px] font-semibold text-[#fc2779] hover:bg-[#fc2779]/15 transition-all"
                        >
                            {PRICE_RANGES[selectedPriceRange].label}
                            <X className="w-3 h-3" />
                        </button>
                    )}
                    <button
                        onClick={() => {
                            setSelectedBrands([])
                            setSelectedPriceRange(null)
                        }}
                        className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 hover:text-slate-600 transition-all"
                    >
                        Clear all
                    </button>
                </div>
            )}

            {/* PRODUCT GRID */}
            <div>
                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="border-r border-b border-slate-100">
                                <div className="aspect-square bg-[#F1F5F9] flex items-center justify-center">
                                    <span className="font-daciana text-[80px] text-[#CBD5E1]" style={{ lineHeight: 1 }}>M</span>
                                </div>
                                <div className="p-4 space-y-3">
                                    <Skeleton className="h-3 w-1/3 rounded" />
                                    <Skeleton className="h-4 w-3/4 rounded" />
                                    <Skeleton className="h-3 w-1/2 rounded" />
                                    <div className="pt-3 border-t border-slate-50 flex items-center gap-3">
                                        <Skeleton className="h-5 w-1/4 rounded" />
                                        <Skeleton className="h-3 w-1/5 rounded" />
                                    </div>
                                    <div className="flex gap-2">
                                        <Skeleton className="w-10 h-10 rounded-lg" />
                                        <Skeleton className="flex-1 h-10 rounded-lg" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : products.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 bg-white overflow-hidden">
                        {products.map((p, idx) => (
                            <ProductCard key={p.id} product={p} priority={idx < 4} />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-32">
                        <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mb-8 shadow-sm border border-slate-100">
                            <Package className="w-9 h-9 text-slate-200" />
                        </div>
                        <p className="text-base font-semibold text-slate-400">Coming Soon to {category?.name}</p>
                    </div>
                )}
            </div>

            {/* BOTTOM BAR */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 z-50">
                <div className="max-w-7xl mx-auto flex">
                    <button
                        onClick={openFilter}
                        className="flex-1 flex items-center justify-center gap-2 py-4 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-all"
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                        <span>Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}</span>
                    </button>
                    <div className="w-px bg-slate-100" />
                    <button
                        onClick={() => setShowSort(!showSort)}
                        className="flex-1 flex items-center justify-center gap-2 py-4 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-all relative"
                    >
                        <ArrowUpDown className="w-4 h-4" />
                        <span>{sortOptions.find((o) => o.key === sort)?.label || "Sort"}</span>
                    </button>
                </div>
            </div>

            {/* SORT POPOVER */}
            <AnimatePresence>
                {showSort && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[60]"
                            onClick={() => setShowSort(false)}
                        />
                        <motion.div
                            ref={sortRef}
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="fixed bottom-20 right-6 z-[70] bg-white rounded-2xl shadow-2xl border border-slate-100 min-w-[220px] overflow-hidden"
                        >
                            {sortOptions.map((opt) => (
                                <button
                                    key={opt.key}
                                    onClick={() => { setSort(opt.key); setShowSort(false) }}
                                    className={`w-full flex items-center justify-between px-5 py-4 text-sm transition-all hover:bg-slate-50 ${
                                        sort === opt.key
                                            ? "text-[#fc2779] font-semibold bg-[#fc2779]/5"
                                            : "text-slate-600 font-medium"
                                    }`}
                                >
                                    {opt.label}
                                    {sort === opt.key && (
                                        <div className="w-5 h-5 rounded-full bg-[#fc2779] flex items-center justify-center">
                                            <Check className="w-3 h-3 text-white" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* FILTER BOTTOM SHEET */}
            <AnimatePresence>
                {showFilter && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowFilter(false)}
                            className="fixed inset-0 bg-black/30 z-[60]"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 28, stiffness: 220 }}
                            className="fixed bottom-0 left-0 right-0 bg-white z-[70] rounded-t-[2rem] shadow-2xl max-h-[75vh] flex flex-col"
                        >
                            <div className="flex justify-center pt-3 pb-1">
                                <div className="w-10 h-1 rounded-full bg-slate-300" />
                            </div>

                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                                <button onClick={() => setShowFilter(false)} className="text-sm text-slate-400 font-medium">Cancel</button>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-bold text-slate-900">Filters</h2>
                                    {activeFilterCount > 0 && (
                                        <span className="w-5 h-5 rounded-full bg-[#fc2779] text-white text-[10px] font-bold flex items-center justify-center">{activeFilterCount}</span>
                                    )}
                                </div>
                                <button onClick={() => { setTempBrands([]); setTempPriceRange(null) }} className="text-sm font-semibold text-[#fc2779]">Reset</button>
                            </div>

                            <div className="flex-1 overflow-y-auto px-6 py-4">
                                <div className="mb-8">
                                    <div className="flex items-center gap-2 mb-4">
                                        <h3 className="text-sm font-semibold text-slate-800">Brand</h3>
                                        {tempBrands.length > 0 && <span className="text-xs text-[#fc2779] font-medium ml-auto">{tempBrands.length} selected</span>}
                                    </div>
                                    {availableBrands.length === 0 ? (
                                        <p className="text-sm italic text-slate-400">No brands available</p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {availableBrands.map((brand) => {
                                                const selected = tempBrands.includes(brand)
                                                return (
                                                    <button
                                                        key={brand}
                                                        onClick={() => toggleTempBrand(brand)}
                                                        className={`px-4 py-2.5 rounded-full border text-xs font-medium transition-all ${
                                                            selected
                                                                ? "border-[#fc2779] bg-[#fc2779]/8 text-[#fc2779] font-semibold"
                                                                : "border-slate-200 text-slate-500 hover:border-slate-300"
                                                        }`}
                                                    >
                                                        {brand}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>

                                <div className="h-px bg-slate-100 -mx-6 mb-8" />

                                <div className="mb-6">
                                    <h3 className="text-sm font-semibold text-slate-800 mb-4">Price Range</h3>
                                    <div className="space-y-2">
                                        {PRICE_RANGES.map((range, idx) => {
                                            const selected = tempPriceRange === idx
                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => setTempPriceRange(selected ? null : idx)}
                                                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all ${
                                                        selected ? "border-[#fc2779]/30 bg-[#fc2779]/5" : "border-slate-100 bg-white hover:border-slate-200"
                                                    }`}
                                                >
                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selected ? "border-[#fc2779]" : "border-slate-300"}`}>
                                                        {selected && <div className="w-2.5 h-2.5 rounded-full bg-[#fc2779]" />}
                                                    </div>
                                                    <span className={`text-sm ${selected ? "font-semibold text-[#fc2779]" : "text-slate-700"}`}>{range.label}</span>
                                                    {selected && <Check className="w-4 h-4 text-[#fc2779] ml-auto" />}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 py-4 border-t border-slate-100 pb-8">
                                <button onClick={applyFilters} className="w-full py-4 rounded-2xl bg-slate-900 text-white text-sm font-bold tracking-wider hover:bg-slate-800 transition-all active:scale-[0.98]">
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
