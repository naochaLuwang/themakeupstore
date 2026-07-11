"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/utils/supabase/client"
import { ProductCard } from "@/components/store/product-card"
import {
    Search, X,
    ChevronDown, ChevronUp, ArrowUpDown, Check, Clock
} from "lucide-react"

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

export default function SearchPage() {
    const router = useRouter()
    const supabase = createClient()
    useEffect(() => { document.title = "Search Products | THE MAKEUP STORE WANGKHEI" }, [])

    const [query, setQuery] = useState("")
    const [results, setResults] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    const [categories, setCategories] = useState<any[]>([])
    const [allBrands, setAllBrands] = useState<string[]>([])
    const [selectedCategories, setSelectedCategories] = useState<string[]>([])
    const [selectedBrands, setSelectedBrands] = useState<string[]>([])
    const [selectedPriceRange, setSelectedPriceRange] = useState<number | null>(null)
    const [sort, setSort] = useState<SortOption>("newest")
    const [showSort, setShowSort] = useState(false)
    const [showFilter, setShowFilter] = useState(false)

    const [tempCategories, setTempCategories] = useState<string[]>([])
    const [tempBrands, setTempBrands] = useState<string[]>([])
    const [tempPriceRange, setTempPriceRange] = useState<number | null>(null)

    const categoryMap = useRef<Map<string, string>>(new Map())
    const [recentSearches, setRecentSearches] = useState<string[]>([])
    const [exclusiveBrands, setExclusiveBrands] = useState<any[]>([])
    const searchTimeout = useRef<any>(null)

    useEffect(() => {
        fetchFilterOptions().catch(() => {})
        fetchExclusiveBrands().catch(() => {})
        const stored = localStorage.getItem("recent_searches")
        if (stored) {
            try { setRecentSearches(JSON.parse(stored)) } catch {}
        }
    }, [])

    const fetchExclusiveBrands = async () => {
        const { data: parent } = await supabase.from("categories").select("id").eq("slug", "exclusive").single()
        if (!parent) return
        const { data } = await supabase
            .from("categories")
            .select("id, name, slug, image_url")
            .eq("parent_id", parent.id)
            .order("name")
        if (data) setExclusiveBrands(data)
    }

    const addRecentSearch = useCallback((term: string) => {
        const t = term.trim()
        if (!t || t.length < 2) return
        setRecentSearches(prev => {
            const next = [t, ...prev.filter(s => s !== t)].slice(0, 8)
            localStorage.setItem("recent_searches", JSON.stringify(next))
            return next
        })
    }, [])

    const clearRecentSearches = useCallback(() => {
        setRecentSearches([])
        localStorage.removeItem("recent_searches")
    }, [])

    const fetchFilterOptions = async () => {
        const [catResult, brandResult] = await Promise.all([
            supabase.from("categories").select("id, name, slug").order("name"),
            supabase.from("products").select("brand").eq("status", "active").not("brand", "is", null),
        ])

        if (catResult.data) {
            setCategories(catResult.data)
            catResult.data.forEach((c: any) => categoryMap.current.set(c.slug, c.id))
        }

        if (brandResult.data) {
            const unique = [...new Set(brandResult.data.map((p: any) => p.brand).filter(Boolean))].sort()
            setAllBrands(unique)
        }
    }

    const computeEffectivePrice = (product: any): number => {
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

    const doSearch = useCallback(async (
        searchText: string,
        opts?: { categories?: string[]; brands?: string[]; priceRangeIdx?: number | null; sortOption?: SortOption }
    ) => {
        const text = searchText.trim()
        const activeCategories = opts?.categories ?? selectedCategories
        const activeBrands = opts?.brands ?? selectedBrands
        const activePriceIdx = opts?.priceRangeIdx !== undefined ? opts.priceRangeIdx : selectedPriceRange
        const activeSort = opts?.sortOption ?? sort

        if (text.length < 2 && activeCategories.length === 0 && activeBrands.length === 0) {
            setResults([])
            return
        }

        setLoading(true)

            try {
                let matchIds: string[] | null = null

                // Step 1: text search — collect matching product IDs
                if (text.length >= 2) {
                    const [nameBrandRes, variantRes] = await Promise.all([
                        supabase.from("products").select("id").textSearch("search_vector", text, { type: "websearch", config: "english" }),
                        supabase.from("product_variants").select("product_id").ilike("title", `%${text}%`),
                    ])
                    const nameIds = (nameBrandRes.data || []).map((p: any) => p.id)
                    const variantIds = [...new Set((variantRes.data || []).map((v: any) => v.product_id))]
                    const allIds = [...new Set([...nameIds, ...variantIds])]
                    if (allIds.length === 0) {
                        setResults([])
                        setLoading(false)
                        return
                    }
                    matchIds = allIds
                }

                // Step 2: category filter — intersect with matchIds
                if (activeCategories.length > 0) {
                    const catIds = activeCategories
                        .map((slug) => categoryMap.current.get(slug))
                        .filter(Boolean) as string[]
                    let catProductIds: string[] = []
                    if (catIds.length > 0) {
                        const { data: pcData } = await supabase
                            .from("product_categories")
                            .select("product_id")
                            .in("category_id", catIds)
                        catProductIds = [...new Set((pcData || []).map((p: any) => p.product_id))]
                    }
                    if (matchIds === null) {
                        matchIds = catProductIds
                    } else {
                        matchIds = matchIds.filter((id) => catProductIds.includes(id))
                    }
                    if (matchIds.length === 0) {
                        setResults([])
                        setLoading(false)
                        return
                    }
                }

                // Step 3: build final query
                let query = supabase
                    .from("products")
                    .select("*, product_variants(id, price, stock, discount_type, discount_value)")
                    .eq("status", "active")

                if (matchIds !== null) {
                    query = query.in("id", matchIds)
                }

                if (activeBrands.length > 0) {
                    query = query.in("brand", activeBrands)
                }

                if (activeSort === "name") {
                    query = query.order("name", { ascending: true })
                } else if (activeSort === "newest") {
                    query = query.order("created_at", { ascending: false })
                }

                const { data } = await query.limit(200)
            if (data) {
                let processed = data.map((p: any) => ({
                    ...p,
                    _effectivePrice: computeEffectivePrice(p),
                }))

                if (activePriceIdx !== null) {
                    const range = PRICE_RANGES[activePriceIdx]
                    processed = processed.filter(
                        (p) => p._effectivePrice >= range.min && (range.max === Infinity || p._effectivePrice < range.max)
                    )
                }

                if (activeSort === "price_asc") {
                    processed.sort((a, b) => a._effectivePrice - b._effectivePrice)
                } else if (activeSort === "price_desc") {
                    processed.sort((a, b) => b._effectivePrice - a._effectivePrice)
                }

                setResults(processed)
            } else {
                setResults([])
            }
        } catch {
            setResults([])
        } finally {
            setLoading(false)
        }
    }, [sort, selectedCategories, selectedBrands, selectedPriceRange])

    const handleSortChange = (newSort: SortOption) => {
        setSort(newSort)
        setShowSort(false)
        if (query.trim().length >= 2 || selectedCategories.length > 0 || selectedBrands.length > 0) {
            doSearch(query, { sortOption: newSort, categories: selectedCategories, brands: selectedBrands, priceRangeIdx: selectedPriceRange })
        }
    }

    const handleSearch = useCallback((text: string) => {
        setQuery(text)
        clearTimeout(searchTimeout.current)

        if (text.trim().length < 2 && selectedCategories.length === 0 && selectedBrands.length === 0) {
            setResults([])
            return
        }

        searchTimeout.current = setTimeout(() => {
            doSearch(text, { categories: selectedCategories, brands: selectedBrands, priceRangeIdx: selectedPriceRange, sortOption: sort })
            if (text.trim().length >= 2) addRecentSearch(text)
        }, 400)
    }, [doSearch, selectedCategories, selectedBrands, selectedPriceRange, sort, addRecentSearch])

    const openFilter = () => {
        setTempCategories([...selectedCategories])
        setTempBrands([...selectedBrands])
        setTempPriceRange(selectedPriceRange)
        setShowFilter(true)
    }

    const applyFilters = () => {
        setSelectedCategories([...tempCategories])
        setSelectedBrands([...tempBrands])
        setSelectedPriceRange(tempPriceRange)
        setShowFilter(false)
        doSearch(query, { categories: tempCategories, brands: tempBrands, priceRangeIdx: tempPriceRange, sortOption: sort })
    }

    const clearTempFilters = () => {
        setTempCategories([])
        setTempBrands([])
        setTempPriceRange(null)
    }

    const clearAllFilters = () => {
        setSelectedCategories([])
        setSelectedBrands([])
        setSelectedPriceRange(null)
        setShowFilter(false)
        doSearch(query, { categories: [], brands: [], priceRangeIdx: null, sortOption: sort })
    }

    const removeCategory = (slug: string) => {
        const next = selectedCategories.filter((s) => s !== slug)
        setSelectedCategories(next)
        doSearch(query, { categories: next, brands: selectedBrands, priceRangeIdx: selectedPriceRange, sortOption: sort })
    }

    const removeBrand = (brand: string) => {
        const next = selectedBrands.filter((b) => b !== brand)
        setSelectedBrands(next)
        doSearch(query, { categories: selectedCategories, brands: next, priceRangeIdx: selectedPriceRange, sortOption: sort })
    }

    const removePriceRange = () => {
        setSelectedPriceRange(null)
        doSearch(query, { categories: selectedCategories, brands: selectedBrands, priceRangeIdx: null, sortOption: sort })
    }

    const activeFilterCount =
        selectedCategories.length + selectedBrands.length + (selectedPriceRange !== null ? 1 : 0)

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Search bar */}
            <div className="flex items-center gap-2 px-3 pt-2 pb-1">
                <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-full px-4 h-11">
                    <Search className="w-4 h-4 text-gray-400 shrink-0" />
                    <input
                        type="text"
                        placeholder="Search products, brands..."
                        value={query}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none"
                    />
                    {query.length > 0 && (
                        <button onClick={() => { setQuery(""); setResults([]) }}>
                            <X className="w-4 h-4 text-gray-400" />
                        </button>
                    )}
                </div>
            </div>

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
                <div className="flex flex-wrap gap-2 px-4 py-1.5">
                    {selectedCategories.map((slug) => {
                        const cat = categories.find((c) => c.slug === slug)
                        return (
                            <button
                                key={slug}
                                onClick={() => removeCategory(slug)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#fc2779]/30 bg-[#fc2779]/10"
                            >
                                <span className="text-[11px] font-medium text-[#fc2779]">{cat?.name || slug}</span>
                                <X className="w-3 h-3 text-[#fc2779]" />
                            </button>
                        )
                    })}
                    {selectedBrands.map((brand) => (
                        <button
                            key={brand}
                            onClick={() => removeBrand(brand)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#fc2779]/30 bg-[#fc2779]/10"
                        >
                            <span className="text-[11px] font-medium text-[#fc2779]">{brand}</span>
                            <X className="w-3 h-3 text-[#fc2779]" />
                        </button>
                    ))}
                    {selectedPriceRange !== null && (
                        <button
                            onClick={removePriceRange}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#fc2779]/30 bg-[#fc2779]/10"
                        >
                            <span className="text-[11px] font-medium text-[#fc2779]">{PRICE_RANGES[selectedPriceRange].label}</span>
                            <X className="w-3 h-3 text-[#fc2779]" />
                        </button>
                    )}
                    <button onClick={clearAllFilters} className="px-2 py-1">
                        <span className="text-[11px] text-gray-400">Clear all</span>
                    </button>
                </div>
            )}

            {/* Sort + results count row */}
            {(results.length > 0 || loading) && (
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
                    <span className="text-[13px] text-gray-500 font-medium">
                        {loading ? "Searching..." : `${results.length} result${results.length !== 1 ? "s" : ""}`}
                    </span>
                    <button
                        onClick={() => setShowSort(!showSort)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md hover:bg-gray-100 transition-colors"
                    >
                        <ArrowUpDown className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-[13px] text-gray-600 font-medium">
                            {sortOptions.find((o) => o.key === sort)?.label}
                        </span>
                        {showSort ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                    </button>
                </div>
            )}

            {/* Sort dropdown */}
            {showSort && (
                <div className="mx-4 rounded-lg border border-gray-100 bg-white shadow-sm overflow-hidden mb-1">
                    {sortOptions.map((opt) => (
                        <button
                            key={opt.key}
                            onClick={() => handleSortChange(opt.key)}
                            className={`w-full flex items-center justify-between px-4 py-3 text-left border-b border-gray-50 last:border-b-0 transition-colors
                                ${sort === opt.key ? "bg-[#fc2779]/5" : "hover:bg-gray-50"}`}
                        >
                            <span className={`text-sm ${sort === opt.key ? "text-[#fc2779] font-semibold" : "text-gray-600"}`}>
                                {opt.label}
                            </span>
                            {sort === opt.key && <Check className="w-4 h-4 text-[#fc2779]" />}
                        </button>
                    ))}
                </div>
            )}

            {/* Results */}
            <div className="flex-1">
                {query.length === 0 && activeFilterCount === 0 ? (
                    <>
                        {recentSearches.length > 0 && (
                            <div className="px-4 pt-3">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-base font-light text-gray-700">Recent Searches</h3>
                                    <button onClick={clearRecentSearches} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Clear</button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {recentSearches.map((term) => (
                                        <button
                                            key={term}
                                            onClick={() => {
                                                setQuery(term)
                                                doSearch(term, { categories: [], brands: [], priceRangeIdx: null, sortOption: sort })
                                                addRecentSearch(term)
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 hover:border-gray-300 transition-colors"
                                        >
                                            <Clock className="w-3 h-3 text-gray-400" />
                                            <span className="text-sm text-gray-600">{term}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}



                        {exclusiveBrands.length > 0 && (
                            <div className="pt-4">
                                <h3 className="text-base font-light text-gray-700 mb-3 px-4">ICONIC BEAUTY BRANDS</h3>
                                {[exclusiveBrands.slice(0, Math.ceil(exclusiveBrands.length / 2)), exclusiveBrands.slice(Math.ceil(exclusiveBrands.length / 2))].map((row, i) => (
                                    <div key={i} className="flex gap-2 px-4 mb-2 last:mb-0 overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                                        {row.map((brand) => (
                                            <Link
                                                key={brand.id}
                                                href={`/exclusive/${brand.slug}`}
                                                className="shrink-0 relative h-10 min-w-[100px] rounded-full bg-white overflow-hidden border border-gray-200 shadow-sm"
                                            >
                                                {brand.image_url ? (
                                                    <Image src={brand.image_url} alt={brand.name} fill className="object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-gray-400">{brand.name[0]}</div>
                                                )}
                                            </Link>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        )}

                        {recentSearches.length === 0 && exclusiveBrands.length === 0 && (
                            <div className="flex flex-col items-center pt-28 px-4">
                                <Search className="w-20 h-20 text-gray-200 stroke-[1]" />
                                <p className="text-lg font-semibold text-gray-700 mt-5">Search for products</p>
                                <p className="text-sm text-gray-400 mt-1">Try searching by name or brand</p>
                            </div>
                        )}
                    </>
                ) : loading && results.length === 0 ? (
                    <div className="flex flex-col items-center pt-28 px-4">
                        <div className="w-8 h-8 border-2 border-[#fc2779] border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-gray-400 mt-4">Searching...</p>
                    </div>
                ) : results.length === 0 ? (
                    <div className="flex flex-col items-center pt-28 px-4">
                        <Search className="w-16 h-16 text-gray-200 stroke-[1]" />
                        <p className="text-lg font-semibold text-gray-700 mt-5">No results found</p>
                        <p className="text-sm text-gray-400 mt-1">Try different search terms or filters</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-0 px-0">
                        {results.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                )}
            </div>

            {/* ─── Filter Modal ─── */}
            {showFilter && (
                <div className="fixed inset-0 z-50">
                    <div
                        className="absolute inset-0 bg-black/40"
                        onClick={() => setShowFilter(false)}
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[80vh] flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
                            <button onClick={() => setShowFilter(false)} className="text-sm text-gray-400">
                                Cancel
                            </button>
                            <span className="text-base font-bold text-gray-900">Filters</span>
                            <button onClick={clearTempFilters} className="text-sm text-gray-400">
                                Reset
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
                            {/* Category */}
                            <div>
                                <p className="text-sm font-semibold text-gray-900 mb-2">Category</p>
                                {categories.length === 0 ? (
                                    <p className="text-xs text-gray-400 italic">No categories available</p>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {categories.map((cat) => {
                                            const selected = tempCategories.includes(cat.slug)
                                            return (
                                                <button
                                                    key={cat.slug}
                                                    onClick={() =>
                                                        setTempCategories((prev) =>
                                                            prev.includes(cat.slug)
                                                                ? prev.filter((s) => s !== cat.slug)
                                                                : [...prev, cat.slug]
                                                        )
                                                    }
                                                    className={`px-3.5 py-1.5 rounded-full border text-sm transition-colors
                                                        ${selected
                                                            ? "border-[#fc2779] bg-[#fc2779]/10 text-[#fc2779] font-semibold"
                                                            : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                                                >
                                                    {cat.name}
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Brand */}
                            <div>
                                <p className="text-sm font-semibold text-gray-900 mb-2">Brand</p>
                                {allBrands.length === 0 ? (
                                    <p className="text-xs text-gray-400 italic">No brands available</p>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {allBrands.map((brand) => {
                                            const selected = tempBrands.includes(brand)
                                            return (
                                                <button
                                                    key={brand}
                                                    onClick={() =>
                                                        setTempBrands((prev) =>
                                                            prev.includes(brand)
                                                                ? prev.filter((b) => b !== brand)
                                                                : [...prev, brand]
                                                        )
                                                    }
                                                    className={`px-3.5 py-1.5 rounded-full border text-sm transition-colors
                                                        ${selected
                                                            ? "border-[#fc2779] bg-[#fc2779]/10 text-[#fc2779] font-semibold"
                                                            : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                                                >
                                                    {brand}
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Price Range */}
                            <div>
                                <p className="text-sm font-semibold text-gray-900 mb-2">Price Range</p>
                                {PRICE_RANGES.map((range, idx) => {
                                    const selected = tempPriceRange === idx
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => setTempPriceRange(selected ? null : idx)}
                                            className={`w-full flex items-center gap-3 py-2.5 border-b border-gray-50 transition-colors
                                                ${selected ? "bg-[#fc2779]/5" : ""}`}
                                        >
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
                                                ${selected ? "border-[#fc2779]" : "border-gray-300"}`}
                                            >
                                                {selected && <div className="w-2.5 h-2.5 rounded-full bg-[#fc2779]" />}
                                            </div>
                                            <span className={`text-sm ${selected ? "text-gray-900 font-medium" : "text-gray-600"}`}>
                                                {range.label}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-3 pb-6">
                            <button
                                onClick={applyFilters}
                                className="w-full py-3 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors"
                            >
                                Apply Filters
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
