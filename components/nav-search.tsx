"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Search, Loader2, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { createClient } from "@/utils/supabase/client"
import Image from "next/image"
import Link from "next/link"

export function NavSearch() {
    const [query, setQuery] = useState("")
    const [results, setResults] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const supabase = createClient()

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
        const fetchResults = async () => {
            if (query.length < 2) {
                setResults([])
                return
            }
            setLoading(true)
            const { data } = await supabase
                .from('products')
                .select('id, name, thumbnail_url, base_price')
                .ilike('name', `%${query}%`)
                .limit(5)

            setResults(data || [])
            setLoading(false)
            setIsOpen(true)
        }

        const debounce = setTimeout(fetchResults, 300)
        return () => clearTimeout(debounce)
    }, [query, supabase])

    return (
        <div className="relative w-full" ref={containerRef}>
            <div className="relative flex items-center group">
                <Input
                    placeholder="FIND A PRODUCT..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query.length >= 2 && setIsOpen(true)}
                    className="h-9 w-full bg-transparent border-none border-b border-charcoal/10 rounded-none px-0 text-[10px] tracking-[0.2em] placeholder:text-zinc-400 focus-visible:ring-0 focus-visible:border-primary transition-all duration-500"
                />

                <div className="absolute right-0 flex items-center gap-2">
                    {loading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    ) : query.length > 0 ? (
                        <button onClick={() => setQuery("")}>
                            <X className="w-3.5 h-3.5 text-zinc-400 hover:text-charcoal" />
                        </button>
                    ) : (
                        <Search className="w-3.5 h-3.5 text-charcoal/40 group-focus-within:text-primary transition-colors" />
                    )}
                </div>
            </div>

            {/* LIVE DROPDOWN - LUXURY EDITION */}
            {isOpen && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-0 bg-white dark:bg-background-dark shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-charcoal/5 z-[100] animate-in fade-in slide-in-from-top-1 duration-300">
                    <div className="flex flex-col">
                        {results.map((product) => (
                            <Link
                                key={product.id}
                                href={`/products/${product.id}`}
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-4 p-4 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors border-b border-charcoal/5 last:border-none group"
                            >
                                <div className="relative w-14 h-16 bg-zinc-100 overflow-hidden shrink-0">
                                    <Image
                                        src={product.thumbnail_url}
                                        alt={product.name}
                                        fill
                                        className="object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                                    />
                                </div>
                                <div className="flex flex-col overflow-hidden text-left">
                                    <span className="text-[10px] font-bold text-charcoal dark:text-white tracking-widest truncate uppercase">
                                        {product.name}
                                    </span>
                                    <span className="text-[11px] font-serif italic text-primary mt-1">
                                        ₹{product.base_price.toLocaleString()}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>

                    <Link
                        href={`/shop?q=${query}`}
                        className="block py-4 text-center text-[9px] font-bold tracking-[0.3em] text-charcoal hover:text-primary border-t border-charcoal/5 bg-zinc-50/50 uppercase transition-colors"
                        onClick={() => setIsOpen(false)}
                    >
                        View All Collections
                    </Link>
                </div>
            )}
        </div>
    )
}