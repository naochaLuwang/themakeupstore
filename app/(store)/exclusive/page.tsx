"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import {
    Sparkles,
    SlidersHorizontal,
    X,
    Check,
    ArrowUpDown,
    Package,
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { ProductCard } from "@/components/store/product-card"

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

export default function ExclusivePage() {
    const supabase = createClient()

    const [subcategories, setSubcategories] = React.useState<any[]>([])
    const [products, setProducts] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(true)
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

    const fetchData = React.useCallback(async () => {
        setLoading(true)
        try {
            const { data: parent } = await supabase
                .from("categories")
                .select("id, name, slug")
                .eq("slug", "exclusive")
                .single()

            if (!parent) return

            const { data: subs } = await supabase
                .from("categories")
                .select("id, name, slug, image_url")
                .eq("parent_id", parent.id)
                .order("name", { ascending: true })

            if (subs) setSubcategories(subs)

            const categoryIds = [parent.id, ...(subs?.map((s: any) => s.id) || [])]

            const { data: junction } = await supabase
                .from("product_categories")
                .select("product_id")
                .in("category_id", categoryIds)

            const linkedProductIds = junction?.map((j: any) => j.product_id) || []

            let query = supabase
                .from("products")
                .select("*, product_variants(id, price, stock, hex_code, discount_type, discount_value, title, image_url)")
                .eq("status", "active")

            if (linkedProductIds.length > 0) {
                query = query.or(`category_id.in.(${categoryIds.join(",")}),id.in.(${linkedProductIds.join(",")})`)
            } else {
                query = query.in("category_id", categoryIds)
            }

            if (selectedBrands.length > 0) {
                query = query.in("brand", selectedBrands)
            }

            if (sort === "name") {
                query = query.order("name", { ascending: true })
            } else if (sort === "newest") {
                query = query.order("created_at", { ascending: false })
            }

            const { data: prodData } = await query
            let processed = [...(prodData || [])].map((p) => ({
                ...p,
                _effectivePrice: computeEffectivePrice(p),
                outOfStock: p.product_variants?.length > 0
                    ? p.product_variants.every((v: any) => v.stock != null && Number(v.stock) <= 0)
                    : (p.stock != null && Number(p.stock) <= 0),
            }))

            if (selectedPriceRange !== null) {
                const range = PRICE_RANGES[selectedPriceRange]
                processed = processed.filter(
                    (p) => p._effectivePrice >= range.min && (range.max === Infinity || p._effectivePrice < range.max)
                )
            }

            if (sort === "name") {
                processed.sort((a, b) => {
                    const aOOS = a.outOfStock ? 1 : 0
                    const bOOS = b.outOfStock ? 1 : 0
                    if (aOOS !== bOOS) return aOOS - bOOS
                    return a.name.localeCompare(b.name)
                })
            } else if (sort === "newest") {
                processed.sort((a, b) => {
                    const aOOS = a.outOfStock ? 1 : 0
                    const bOOS = b.outOfStock ? 1 : 0
                    if (aOOS !== bOOS) return aOOS - bOOS
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                })
            } else if (sort === "price_asc") {
                processed.sort((a, b) => {
                    const aOOS = a.outOfStock ? 1 : 0
                    const bOOS = b.outOfStock ? 1 : 0
                    if (aOOS !== bOOS) return aOOS - bOOS
                    return a._effectivePrice - b._effectivePrice
                })
            } else if (sort === "price_desc") {
                processed.sort((a, b) => {
                    const aOOS = a.outOfStock ? 1 : 0
                    const bOOS = b.outOfStock ? 1 : 0
                    if (aOOS !== bOOS) return aOOS - bOOS
                    return b._effectivePrice - a._effectivePrice
                })
            }

            setProducts(processed)

            if (availableBrands.length === 0) {
                const brands = Array.from(
                    new Set(prodData?.map((p: any) => p.brand).filter(Boolean) as string[])
                ).sort()
                setAvailableBrands(brands)
            }
        } catch (e) {
            console.error("Fetch Error:", e)
        } finally {
            setLoading(false)
        }
    }, [sort, selectedBrands, selectedPriceRange, supabase])

    React.useEffect(() => {
        fetchData()
    }, [fetchData])

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
        const next = selectedBrands.filter((b) => b !== brand)
        setSelectedBrands(next)
    }

    const removePriceRange = () => {
        setSelectedPriceRange(null)
    }

    return (
        <div className="min-h-screen bg-white pb-24">
            {/* HEADER */}
            <div className="bg-white border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-6 pt-4 pb-2">
                    <div className="mb-3">
                        <h1 className="text-xl font-black tracking-tight text-slate-900">
                            Exclusive
                        </h1>
                        <p className="text-[10px] font-semibold text-slate-400">
                            {loading ? "..." : `${products.length} products`}
                        </p>
                    </div>

                    {/* SUBCATEGORY NAV (Brand Selector / Houses) */}
                    <div className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-2 -mx-6 px-6">
                        {subcategories.length > 0 ? (
                            subcategories.map((cat) => (
                                <Link
                                    key={cat.id}
                                    href={`/exclusive/${cat.slug}`}
                                    className="flex flex-col items-center gap-1.5 shrink-0 group"
                                >
                                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-full p-[2px] bg-gradient-to-tr from-[#fc2779] via-pink-400 to-yellow-200 group-hover:rotate-12 transition-all duration-500">
                                        <div className="w-full h-full rounded-full border-[3px] border-white overflow-hidden relative shadow-sm bg-white">
                                            {cat.image_url ? (
                                                <Image
                                                    src={cat.image_url || "/placeholder.png"}
                                                    fill
                                                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                                                    alt={cat.name}
                                                />
                                            ) : (
                                                <span className="text-sm font-black text-slate-400 uppercase">
                                                    {cat.name?.[0] || "?"}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-[9px] md:text-[10px] font-black uppercase tracking-tighter text-slate-700 group-hover:text-[#fc2779] transition-colors">
                                        {cat.name}
                                    </span>
                                </Link>
                            ))
                        ) : loading ? (
                            [1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex flex-col items-center gap-1.5 animate-pulse shrink-0">
                                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-slate-100" />
                                    <div className="w-10 h-2 bg-slate-50 rounded" />
                                </div>
                            ))
                        ) : null}
                    </div>
                </div>
            </div>

            {/* ACTIVE FILTER CHIPS */}
            {activeFilterCount > 0 && (
                <div className="max-w-7xl mx-auto px-6 pt-4 pb-2 flex flex-wrap gap-2">
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
            <div className="max-w-7xl mx-auto px-6 pt-6">
                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-0">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="border-r border-b border-slate-100 bg-white animate-pulse">
                                <div className="aspect-square bg-slate-50" />
                                <div className="p-4 space-y-3">
                                    <div className="h-3 bg-slate-50 rounded w-1/3" />
                                    <div className="h-4 bg-slate-50 rounded w-3/4" />
                                    <div className="h-3 bg-slate-50 rounded w-1/2" />
                                    <div className="pt-3 border-t border-slate-50 flex items-center gap-3">
                                        <div className="h-5 bg-slate-50 rounded w-1/4" />
                                        <div className="h-3 bg-slate-50 rounded w-1/5" />
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="w-10 h-10 bg-slate-50 rounded-lg" />
                                        <div className="flex-1 h-10 bg-slate-50 rounded-lg" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : products.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 bg-white overflow-hidden">
                        {products.map((p) => (
                            <ProductCard key={p.id} product={p} />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-32">
                        <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mb-8 shadow-sm border border-slate-100">
                            <Package className="w-9 h-9 text-slate-200" />
                        </div>
                        <p className="text-base font-semibold text-slate-400">No products found</p>
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
                        <span>
                            Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                        </span>
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
                                    onClick={() => {
                                        setSort(opt.key)
                                        setShowSort(false)
                                    }}
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
                                <button
                                    onClick={() => setShowFilter(false)}
                                    className="text-sm text-slate-400 font-medium"
                                >
                                    Cancel
                                </button>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-bold text-slate-900">Filters</h2>
                                    {activeFilterCount > 0 && (
                                        <span className="w-5 h-5 rounded-full bg-[#fc2779] text-white text-[10px] font-bold flex items-center justify-center">
                                            {activeFilterCount}
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => {
                                        setTempBrands([])
                                        setTempPriceRange(null)
                                    }}
                                    className="text-sm font-semibold text-[#fc2779]"
                                >
                                    Reset
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto px-6 py-4">
                                <div className="mb-8">
                                    <div className="flex items-center gap-2 mb-4">
                                        <h3 className="text-sm font-semibold text-slate-800">Brand</h3>
                                        {tempBrands.length > 0 && (
                                            <span className="text-xs text-[#fc2779] font-medium ml-auto">
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
                                                            ? "border-[#fc2779]/30 bg-[#fc2779]/5"
                                                            : "border-slate-100 bg-white hover:border-slate-200"
                                                    }`}
                                                >
                                                    <div
                                                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                                            selected ? "border-[#fc2779]" : "border-slate-300"
                                                        }`}
                                                    >
                                                        {selected && (
                                                            <div className="w-2.5 h-2.5 rounded-full bg-[#fc2779]" />
                                                        )}
                                                    </div>
                                                    <span
                                                        className={`text-sm ${
                                                            selected ? "font-semibold text-[#fc2779]" : "text-slate-700"
                                                        }`}
                                                    >
                                                        {range.label}
                                                    </span>
                                                    {selected && (
                                                        <Check className="w-4 h-4 text-[#fc2779] ml-auto" />
                                                    )}
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
