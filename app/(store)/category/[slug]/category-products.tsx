"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { SlidersHorizontal, X, Check, ArrowUpDown, Package, PackageCheck } from "lucide-react"
import { ProductCard } from "@/components/store/product-card"

interface CategoryItem {
    id: string
    name: string
    slug: string
    image_url: string | null
}

interface ConcernItem {
    id: string
    name: string
    slug: string
    image_url: string | null
}

interface ProductVariant {
    id: string
    price: number
    stock: number
    hex_code: string | null
    discount_type: string
    discount_value: number
    title: string
    image_url: string | null
}

interface ProductConcern {
    concern_id: string
}

interface ProductCategory {
    category_id: string
}

interface StoreProduct {
    id: string
    name: string
    slug: string
    base_price: number | null
    thumbnail_url: string | null
    brand: string
    discount_type: string
    discount_value: number
    has_variants: boolean
    status: string
    product_variants: ProductVariant[]
    product_concerns: ProductConcern[]
    product_categories: ProductCategory[]
    created_at: string
}

interface Props {
    slug: string
    parent: CategoryItem | null
    subcategories: CategoryItem[]
    concerns: ConcernItem[]
    initialProducts: StoreProduct[]
    showConcerns?: boolean
}

type SortOption = "newest" | "price_asc" | "price_desc" | "name"

const PRICE_RANGES = [
    { label: "Under ₹500", min: 0, max: 500 },
    { label: "₹500 – ₹1,000", min: 500, max: 1000 },
    { label: "₹1,000 – ₹2,000", min: 1000, max: 2000 },
    { label: "Above ₹2,000", min: 2000, max: Infinity },
] as const

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
    { key: "newest", label: "Newest First" },
    { key: "price_asc", label: "Price: Low to High" },
    { key: "price_desc", label: "Price: High to Low" },
    { key: "name", label: "Name: A-Z" },
]

function computeEffectivePrice(product: StoreProduct): number {
    if (product.has_variants && product.product_variants?.length > 0) {
        const prices = product.product_variants.map((v) => {
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

export function CategoryProducts({ slug, parent, subcategories, concerns, initialProducts, showConcerns = true }: Props) {
    const [activeSub, setActiveSub] = useState<string | null>(null)
    const [activeConcern, setActiveConcern] = useState<string | null>(null)
    const [sort, setSort] = useState<SortOption>("newest")
    const [showSort, setShowSort] = useState(false)
    const [showFilter, setShowFilter] = useState(false)
    const [selectedBrands, setSelectedBrands] = useState<string[]>([])
    const [selectedPriceRange, setSelectedPriceRange] = useState<number | null>(null)
    const [tempBrands, setTempBrands] = useState<string[]>([])
    const [tempPriceRange, setTempPriceRange] = useState<number | null>(null)
    const [inStockOnly, setInStockOnly] = useState(false)

    const sortRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
                setShowSort(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const subImage = useMemo(() => {
        const map: Record<string, string> = {}
        for (const p of initialProducts) {
            const catIds = p.product_categories?.map((pc: ProductCategory) => pc.category_id) || []
            for (const cid of catIds) {
                if (!map[cid] && p.thumbnail_url) map[cid] = p.thumbnail_url
            }
        }
        return map
    }, [initialProducts])

    const availableBrands = useMemo(() => {
        const brands = Array.from(new Set(initialProducts.map((p) => p.brand).filter(Boolean)))
        return brands.sort()
    }, [initialProducts])

    const products = useMemo(() => {
        const filtered = initialProducts.filter(p => {
            if (activeSub) {
                const catIds = p.product_categories?.map((pc: ProductCategory) => pc.category_id) || []
                if (!catIds.includes(activeSub)) return false
            }
            if (activeConcern) {
                const concernIds = p.product_concerns?.map((pc: ProductConcern) => pc.concern_id) || []
                if (!concernIds.includes(activeConcern)) return false
            }
            if (selectedBrands.length > 0 && !selectedBrands.includes(p.brand)) return false
            if (selectedPriceRange !== null) {
                const effective = computeEffectivePrice(p)
                const range = PRICE_RANGES[selectedPriceRange]
                if (effective < range.min || effective >= range.max) return false
            }
            if (inStockOnly) {
                const oos = p.product_variants?.length > 0
                    ? p.product_variants.every((v: any) => v.stock != null && Number(v.stock) <= 0)
                    : false
                if (oos) return false
            }
            return true
        }).map(p => {
            const oos = p.product_variants?.length > 0
                ? p.product_variants.every((v: any) => v.stock != null && Number(v.stock) <= 0)
                : false
            return { ...p, _effectivePrice: computeEffectivePrice(p), _outOfStock: oos }
        })

        switch (sort) {
            case "price_asc":
                return filtered.sort((a, b) => {
                    const aOOS = (a as any)._outOfStock ? 1 : 0;
                    const bOOS = (b as any)._outOfStock ? 1 : 0;
                    if (aOOS !== bOOS) return aOOS - bOOS;
                    return (a as any)._effectivePrice - (b as any)._effectivePrice;
                })
            case "price_desc":
                return filtered.sort((a, b) => {
                    const aOOS = (a as any)._outOfStock ? 1 : 0;
                    const bOOS = (b as any)._outOfStock ? 1 : 0;
                    if (aOOS !== bOOS) return aOOS - bOOS;
                    return (b as any)._effectivePrice - (a as any)._effectivePrice;
                })
            case "name":
                return filtered.sort((a, b) => {
                    const aOOS = (a as any)._outOfStock ? 1 : 0;
                    const bOOS = (b as any)._outOfStock ? 1 : 0;
                    if (aOOS !== bOOS) return aOOS - bOOS;
                    return a.name.localeCompare(b.name);
                })
            default:
                return filtered.sort((a, b) => {
                    const aOOS = (a as any)._outOfStock ? 1 : 0;
                    const bOOS = (b as any)._outOfStock ? 1 : 0;
                    if (aOOS !== bOOS) return aOOS - bOOS;
                    return 0;
                })
        }
    }, [initialProducts, activeSub, activeConcern, sort, selectedBrands, selectedPriceRange, inStockOnly])

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

    const clearAllFilters = () => {
        setSelectedBrands([])
        setSelectedPriceRange(null)
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
            {/* Category Header */}
            <div className="px-4 pt-6 pb-2">
                <div className="flex items-center gap-3 mb-1">
                    <span className="text-[9px] font-bold text-rose-400 uppercase tracking-[0.4em]">Collection</span>
                </div>
                <h1 className="text-3xl font-light text-slate-900 tracking-tight leading-tight">
                    {parent?.name || ""}
                </h1>
                <div className="flex items-center gap-2 mt-3">
                    <div className="h-px w-8 bg-rose-300" />
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    <div className="h-px flex-1 bg-slate-100" />
                </div>
            </div>

            {/* Subcategory Circles */}
            {subcategories.length > 0 && (
                <div className="flex gap-4 overflow-x-auto px-4 py-5 snap-x snap-mandatory no-scrollbar">
                    {subcategories.map((sub) => {
                        const img = subImage[sub.id]
                        return (
                            <button
                                key={sub.id}
                                onClick={() => setActiveSub(activeSub === sub.id ? null : sub.id)}
                                className="snap-start shrink-0 flex flex-col items-center gap-2"
                            >
                                <div className={`w-20 h-20 rounded-full overflow-hidden transition-all duration-300 ${
                                    activeSub === sub.id
                                        ? "ring-2 ring-rose-400 ring-offset-2 scale-105 shadow-lg shadow-rose-100"
                                        : "shadow-md hover:shadow-lg"
                                }`}>
                                    {img ? (
                                        <img src={img} alt={sub.name} className="w-full h-full object-cover" loading="lazy" />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-rose-50 to-slate-100 flex items-center justify-center">
                                            <span className="text-xl font-bold text-rose-300">{sub.name[0]}</span>
                                        </div>
                                    )}
                                </div>
                                <span className={`text-[10px] font-semibold tracking-tight transition-colors duration-200 ${
                                    activeSub === sub.id ? "text-rose-500" : "text-slate-500"
                                }`}>
                                    {sub.name}
                                </span>
                            </button>
                        )
                    })}
                </div>
            )}

            {/* Concern Pills with Images */}
            {showConcerns && concerns.length > 0 && (
                <div className="px-4 pt-3 pb-4">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em]">Shop by Skin Type</span>
                        <div className="h-px flex-1 bg-slate-100" />
                    </div>
                    <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar">
                        {concerns.map((c) => (
                            <button
                                key={c.id}
                                onClick={() => setActiveConcern(activeConcern === c.id ? null : c.id)}
                                className={`snap-start shrink-0 flex flex-col items-center gap-1.5 transition-all duration-200 ${
                                    activeConcern === c.id ? "scale-105" : ""
                                }`}
                            >
                                <div className={`w-14 h-14 rounded-xl overflow-hidden transition-all duration-200 ${
                                    activeConcern === c.id
                                        ? "ring-2 ring-rose-400 ring-offset-2 shadow-md shadow-rose-200"
                                        : "ring-1 ring-slate-200 hover:ring-slate-300"
                                }`}>
                                    {c.image_url ? (
                                        <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" loading="lazy" />
                                    ) : (
                                        <div className="w-full h-full bg-rose-50 flex items-center justify-center">
                                            <span className="text-lg font-medium text-rose-400">{c.name[0]}</span>
                                        </div>
                                    )}
                                </div>
                                <span className={`text-[9px] font-semibold text-center leading-tight transition-colors ${
                                    activeConcern === c.id ? "text-rose-500" : "text-slate-500"
                                }`}>
                                    {c.name}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Active Filter Chips */}
            {activeFilterCount > 0 && (
                <div className="px-4 pt-3 pb-2 flex flex-wrap gap-2">
                    {selectedBrands.map((brand) => (
                        <button
                            key={brand}
                            onClick={() => removeBrand(brand)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-rose-400/25 bg-rose-50/60 text-[10px] font-semibold text-rose-500 hover:bg-rose-100 transition-all"
                        >
                            {brand}
                            <X className="w-3 h-3" />
                        </button>
                    ))}
                    {selectedPriceRange !== null && (
                        <button
                            onClick={removePriceRange}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-rose-400/25 bg-rose-50/60 text-[10px] font-semibold text-rose-500 hover:bg-rose-100 transition-all"
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

            {/* Results bar */}
            <div className="px-4 pt-4 pb-3 flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500">
                    <span className="text-slate-900">{products.length}</span> products
                </p>
                <button
                    onClick={() => setInStockOnly(!inStockOnly)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all ${
                        inStockOnly
                            ? "bg-rose-50 text-rose-500 border border-rose-400/25"
                            : "bg-slate-50 text-slate-500 border border-slate-200"
                    }`}
                >
                    <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-all ${
                        inStockOnly ? "bg-rose-500 border-rose-500" : "border-slate-300"
                    }`}>
                        {inStockOnly && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    In Stock Only
                </button>
            </div>

            {/* Products Grid */}
            <div className="flex-1">
                {products.length === 0 ? (
                    <div className="flex flex-col items-center pt-16 px-6">
                        <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm border border-slate-100">
                            <Package className="w-7 h-7 text-slate-300" />
                        </div>
                        <p className="text-sm font-medium text-slate-700">No products found</p>
                        <p className="text-xs text-slate-400 mt-1">Try selecting a different subcategory or concern</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-0">
                        {products.map((product, idx) => (
                            <motion.div
                                key={product.id}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: idx * 0.02 }}
                            >
                                <ProductCard product={product} />
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Bottom Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 z-50">
                <div className="flex">
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
                        <span>{SORT_OPTIONS.find((o) => o.key === sort)?.label || "Sort"}</span>
                    </button>
                </div>
            </div>

            {/* Sort Popover */}
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
                            {SORT_OPTIONS.map((opt) => (
                                <button
                                    key={opt.key}
                                    onClick={() => {
                                        setSort(opt.key)
                                        setShowSort(false)
                                    }}
                                    className={`w-full flex items-center justify-between px-5 py-4 text-sm transition-all hover:bg-slate-50 ${
                                        sort === opt.key
                                            ? "text-rose-500 font-semibold bg-rose-50/60"
                                            : "text-slate-600 font-medium"
                                    }`}
                                >
                                    {opt.label}
                                    {sort === opt.key && (
                                        <div className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center">
                                            <Check className="w-3 h-3 text-white" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Filter Bottom Sheet */}
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
                                <button onClick={() => setShowFilter(false)} className="text-sm text-slate-400 font-medium">
                                    Cancel
                                </button>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-bold text-slate-900">Filters</h2>
                                    {activeFilterCount > 0 && (
                                        <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                                            {activeFilterCount}
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => {
                                        setTempBrands([])
                                        setTempPriceRange(null)
                                    }}
                                    className="text-sm font-semibold text-rose-500"
                                >
                                    Reset
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto px-6 py-4">
                                <div className="mb-8">
                                    <div className="flex items-center gap-2 mb-4">
                                        <h3 className="text-sm font-semibold text-slate-800">Brand</h3>
                                        {tempBrands.length > 0 && (
                                            <span className="text-xs text-rose-500 font-medium ml-auto">
                                                {tempBrands.length} selected
                                            </span>
                                        )}
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
                                                                ? "border-rose-400/30 bg-rose-50/60 text-rose-500 font-semibold"
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
                                    <div className="flex items-center gap-2 mb-4">
                                        <h3 className="text-sm font-semibold text-slate-800">Price Range</h3>
                                    </div>
                                    <div className="space-y-2">
                                        {PRICE_RANGES.map((range, idx) => {
                                            const selected = tempPriceRange === idx
                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => setTempPriceRange(selected ? null : idx)}
                                                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all ${
                                                        selected
                                                            ? "border-rose-400/30 bg-rose-50/60"
                                                            : "border-slate-100 bg-white hover:border-slate-200"
                                                    }`}
                                                >
                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                                        selected ? "border-rose-500" : "border-slate-300"
                                                    }`}>
                                                        {selected && <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />}
                                                    </div>
                                                    <span className={`text-sm ${selected ? "font-semibold text-rose-500" : "text-slate-700"}`}>
                                                        {range.label}
                                                    </span>
                                                    {selected && <Check className="w-4 h-4 text-rose-500 ml-auto" />}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 py-4 border-t border-slate-100 pb-8">
                                <button
                                    onClick={applyFilters}
                                    className="w-full py-4 rounded-2xl bg-slate-900 text-white text-sm font-bold tracking-wider hover:bg-slate-800 transition-all active:scale-[0.98]"
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