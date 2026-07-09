"use client"

import { useState, useEffect, useRef, useId } from "react"
import { Search, Loader2, X, AlertCircle, Clock, Trash2, Sparkles, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { createClient } from "@/utils/supabase/client"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"

export function NavSearch() {
    const instanceId = useId()
    const [mounted, setMounted] = useState(false)
    const [query, setQuery] = useState("")
    const [results, setResults] = useState<any[]>([])
    const [recentSearches, setRecentSearches] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        setMounted(true)
        const saved = localStorage.getItem("recent_searches")
        if (saved) {
            try {
                const parsed = JSON.parse(saved)
                if (Array.isArray(parsed)) setRecentSearches(parsed)
            } catch (e) {
                setRecentSearches([])
            }
        }
    }, [])

    const clearSearch = () => {
        setQuery("")
        setResults([])
        setIsOpen(false)
    }

    const clearHistory = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setRecentSearches([])
        localStorage.removeItem("recent_searches")
    }

    const saveToHistory = (product: any) => {
        if (!product?.id) return
        const historyItem = {
            id: product.id,
            name: product.name,
            thumbnail_url: product.thumbnail_url
        }
        const updated = [historyItem, ...recentSearches.filter(p => p.id !== product.id)].slice(0, 3)
        setRecentSearches(updated)
        localStorage.setItem("recent_searches", JSON.stringify(updated))
        clearSearch()
    }

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    useEffect(() => {
        if (!mounted) return
        if (query.trim().length < 2) {
            setResults([])
            setLoading(false)
            return
        }

        const fetchResults = async () => {
            setLoading(true)
            const { data, error } = await supabase
                .from('products')
                .select('id, name, thumbnail_url, brand')
                .textSearch("search_vector", query, { type: "websearch", config: "english" })
                .limit(5)

            if (!error) setResults(data || [])
            setLoading(false)
        }

        const debounce = setTimeout(fetchResults, 300)
        return () => clearTimeout(debounce)
    }, [query, supabase, mounted])

    const isSearching = query.trim().length >= 2;
    const showHistory = !isSearching && recentSearches.length > 0;

    return (
        <div className="relative w-full" ref={containerRef} suppressHydrationWarning>
            {/* SEARCH INPUT FIELD - Semi-transparent background */}
            <div className="relative flex items-center group bg-slate-100/40 backdrop-blur-sm rounded-full px-4 border border-pink-50/50 transition-all focus-within:bg-white focus-within:ring-2 focus-within:ring-pink-100 focus-within:border-[#fc2779]/30">
                <Search className={`w-4 h-4 transition-colors ${loading ? 'text-pink-200' : 'text-[#fc2779]'}`} />
                <Input
                    id={`search-input-${instanceId}`}
                    placeholder="SHOP BY BRAND OR PRODUCT"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsOpen(true)}
                    className="h-10 w-full bg-transparent border-none rounded-none px-3 text-[12px] font-bold tracking-wider placeholder:text-slate-400 focus-visible:ring-0 uppercase"
                    autoComplete="off"
                />
                <div className="flex items-center gap-2">
                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#fc2779]" />
                    ) : query.length > 0 && (
                        <button onClick={clearSearch} type="button" aria-label="Clear search" className="p-1 hover:bg-pink-50 rounded-full">
                            <X className="w-4 h-4 text-slate-400 hover:text-[#fc2779]" />
                        </button>
                    )}
                </div>
            </div>

            {mounted && isOpen && (
                /* DROPDOWN - Glassmorphism applied here */
                <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white/90 backdrop-blur-xl shadow-[0_20px_50px_rgba(252,39,121,0.15)] border border-white/40 z-[999] rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">

                    {/* LIVE SEARCH RESULTS */}
                    {isSearching ? (
                        <div className="flex flex-col">
                            <div className="px-5 py-3 bg-[#fc2779]/5 flex items-center gap-2 border-b border-pink-50/50">
                                <Sparkles className="w-3 h-3 text-[#fc2779]" />
                                <span className="text-[9px] font-black tracking-widest text-[#fc2779] uppercase">Beauty Match Found</span>
                            </div>
                            {results.length > 0 ? (
                                <div className="divide-y divide-pink-50/50">
                                    {results.map((product) => (
                                        <Link
                                            key={`${instanceId}-live-${product.id}`}
                                            href={`/products/${product.id}`}
                                            onClick={() => saveToHistory(product)}
                                            className="flex items-center gap-4 p-4 hover:bg-[#fc2779]/5 transition-all group"
                                        >
                                            <div className="relative w-12 h-12 bg-white/50 rounded-lg overflow-hidden shrink-0 border border-pink-50 shadow-sm">
                                                <Image src={product.thumbnail_url || "/placeholder.png"} alt={product.name} fill className="object-cover transition-transform group-hover:scale-110" sizes="48px" />
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[8px] font-black text-[#fc2779] uppercase tracking-tighter">
                                                    {product.brand || "Exclusive"}
                                                </span>
                                                <span className="text-[11px] font-bold text-slate-800 tracking-tight uppercase group-hover:text-[#fc2779] transition-colors">
                                                    {product.name}
                                                </span>
                                            </div>
                                            <ChevronRight className="w-3.5 h-3.5 ml-auto text-slate-200 group-hover:text-[#fc2779] transition-all" />
                                        </Link>
                                    ))}
                                </div>
                            ) : !loading && (
                                <div className="p-12 text-center flex flex-col items-center gap-3">
                                    <div className="w-12 h-12 bg-pink-50/50 rounded-full flex items-center justify-center">
                                        <AlertCircle className="w-6 h-6 text-[#fc2779] stroke-[1.5]" />
                                    </div>
                                    <p className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">Product not found. Try another?</p>
                                </div>
                            )}
                        </div>
                    ) : null}

                    {/* RECENT SEARCHES */}
                    {showHistory && (
                        <div className="flex flex-col">
                            <div className="px-5 py-3 bg-slate-50/40 border-b border-pink-50/50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Recently Viewed</span>
                                </div>
                                <button onClick={clearHistory} className="text-[9px] font-black tracking-widest text-pink-400 hover:text-[#fc2779] uppercase transition-colors flex items-center gap-1">
                                    <Trash2 className="w-3 h-3" />
                                    Clear
                                </button>
                            </div>
                            <div className="divide-y divide-pink-50/50">
                                {recentSearches.map((product) => (
                                    <Link
                                        key={`${instanceId}-history-${product.id}`}
                                        href={`/products/${product.id}`}
                                        onClick={clearSearch}
                                        className="flex items-center gap-4 p-4 hover:bg-[#fc2779]/5 transition-all group"
                                    >
                                        <div className="relative w-10 h-10 bg-white/50 rounded-md overflow-hidden shrink-0 border border-pink-50">
                                            <Image src={product.thumbnail_url || "/placeholder.png"} alt={product.name} fill className="object-cover" sizes="40px" />
                                        </div>
                                        <span className="text-[11px] font-bold text-slate-600 group-hover:text-slate-900 transition-colors uppercase tracking-tight">
                                            {product.name}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* GLOBAL FOOTER CTA - Solid color to ground the dropdown */}
                    <button
                        onClick={() => {
                            const target = isSearching ? `/search?q=${encodeURIComponent(query)}` : '/shop';
                            router.push(target);
                            setIsOpen(false);
                        }}
                        className="w-full block py-5 text-center text-[10px] font-black tracking-[0.3em] text-white bg-[#fc2779] hover:bg-pink-600 uppercase transition-all shadow-[0_-4px_20px_rgba(252,39,121,0.3)]"
                    >
                        {isSearching ? `See all results for "${query}"` : "Discover More"}
                    </button>
                </div>
            )}
        </div>
    )
}