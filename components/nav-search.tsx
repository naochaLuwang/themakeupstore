"use client"

import { useState, useEffect, useRef, useId } from "react"
import { Search, Loader2, X, AlertCircle, Clock, Trash2 } from "lucide-react"
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
    // 1. Load history on mount
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

    // 2. Clear everything
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

    // 3. Save to history and reset UI
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
        clearSearch() // This closes the dropdown and empties input
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

    // 4. Search Logic
    useEffect(() => {
        if (!mounted) return

        // If query is too short, reset results so we show History instead
        if (query.trim().length < 2) {
            setResults([])
            setLoading(false)
            return
        }

        const fetchResults = async () => {
            setLoading(true)
            const { data, error } = await supabase
                .from('products')
                .select('id, name, thumbnail_url')
                .ilike('name', `%${query}%`)
                .limit(5)

            if (!error) setResults(data || [])
            setLoading(false)
        }

        const debounce = setTimeout(fetchResults, 300)
        return () => clearTimeout(debounce)
    }, [query, supabase, mounted])

    // State Helpers
    const isSearching = query.trim().length >= 2;
    const showHistory = !isSearching && recentSearches.length > 0;

    return (
        <div className="relative w-full" ref={containerRef} suppressHydrationWarning>
            <div className="relative flex items-center group">
                <Input
                    id={`search-input-${instanceId}`}
                    placeholder="FIND A PRODUCT..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsOpen(true)}
                    className="h-9 w-full bg-transparent border-none rounded-none px-0 text-[10px] tracking-[0.25em] placeholder:text-zinc-400 focus-visible:ring-0"
                    autoComplete="off"
                />
                <div className="absolute right-0 flex items-center gap-2">
                    {loading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    ) : query.length > 0 ? (
                        <button onClick={clearSearch} type="button">
                            <X className="w-3.5 h-3.5 text-zinc-400 hover:text-charcoal" />
                        </button>
                    ) : (
                        <Search className="w-3.5 h-3.5 text-charcoal/40" />
                    )}
                </div>
            </div>

            {mounted && isOpen && (
                <div className="absolute top-[calc(100%+1px)] left-0 right-0 bg-white shadow-2xl border border-charcoal/5 z-[999] animate-in fade-in slide-in-from-top-2 duration-300">

                    {/* MODE 1: LIVE SEARCH RESULTS */}
                    {isSearching ? (
                        results.length > 0 ? (
                            <div className="flex flex-col">
                                {results.map((product) => (
                                    <Link
                                        key={`${instanceId}-live-${product.id}`}
                                        href={`/products/${product.id}`}
                                        onClick={() => saveToHistory(product)}
                                        className="flex items-center gap-5 p-4 hover:bg-zinc-50 transition-colors border-b border-charcoal/5 last:border-none group"
                                    >
                                        <div className="relative w-12 h-14 bg-zinc-100 shrink-0">
                                            <Image src={product.thumbnail_url || "/placeholder.png"} alt="" fill className="object-cover" sizes="48px" />
                                        </div>
                                        <span className="text-[10px] font-medium text-zinc-500 group-hover:text-charcoal transition-colors tracking-[0.1em] uppercase">
                                            {product.name}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        ) : !loading && (
                            <div className="p-10 text-center flex flex-col items-center gap-3">
                                <AlertCircle className="w-6 h-6 text-zinc-200 stroke-[1px]" />
                                <p className="text-[9px] font-bold tracking-[0.3em] text-zinc-400 uppercase">No matching products</p>
                            </div>
                        )
                    ) : null}

                    {/* MODE 2: RECENT SEARCHES (Only if not searching) */}
                    {showHistory && (
                        <div className="flex flex-col">
                            <div className="px-5 py-3 bg-zinc-50/50 border-b border-charcoal/5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-3 h-3 text-zinc-400" />
                                    <span className="text-[8px] font-bold tracking-[0.2em] text-zinc-400 uppercase">Recently Viewed</span>
                                </div>
                                <button onClick={clearHistory} className="text-[8px] font-bold tracking-[0.1em] text-red-400 hover:text-red-600 uppercase transition-colors flex items-center gap-1">
                                    <Trash2 className="w-2.5 h-2.5" />
                                    Clear
                                </button>
                            </div>
                            {recentSearches.map((product) => (
                                <Link
                                    key={`${instanceId}-history-${product.id}`}
                                    href={`/products/${product.id}`}
                                    onClick={clearSearch}
                                    className="flex items-center gap-5 p-4 hover:bg-zinc-50 transition-colors border-b border-charcoal/5 last:border-none group"
                                >
                                    <div className="relative w-10 h-12 bg-zinc-100 shrink-0">
                                        <Image src={product.thumbnail_url || "/placeholder.png"} alt="" fill className="object-cover" sizes="40px" />
                                    </div>
                                    <span className="text-[10px] font-medium text-zinc-500 group-hover:text-charcoal transition-colors tracking-[0.1em] uppercase">
                                        {product.name}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* GLOBAL FOOTER */}
                    <button
                        onClick={() => {
                            const target = isSearching ? `/search?q=${encodeURIComponent(query)}` : '/shop';
                            router.push(target);
                            setIsOpen(false);
                        }}
                        className="w-full block py-4 text-center text-[9px] font-bold tracking-[0.4em] text-charcoal bg-zinc-50/50 hover:bg-zinc-100 hover:text-primary border-t border-charcoal/5 uppercase transition-all"
                    >
                        {isSearching ? `View All results for "${query}"` : "View All Collections"}
                    </button>
                </div>
            )}
        </div>
    )
}

