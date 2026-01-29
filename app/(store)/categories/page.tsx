

"use client"

import * as React from "react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { ArrowUpRight, Search, Loader2 } from "lucide-react"

export default function CategoriesPage() {
    const [categories, setCategories] = React.useState<any[]>([])
    const [searchQuery, setSearchQuery] = React.useState("")
    const [loading, setLoading] = React.useState(true)
    const supabase = createClient()

    React.useEffect(() => {
        async function fetchCategories() {
            try {
                // EXCLUSION LOGIC: Filter out specific slugs
                const excludedSlugs = ['exclusive', 'essentials', 'new-arrivals']

                const { data, error } = await supabase
                    .from('categories')
                    .select('id, name, slug, image_url, parent_id')
                    .is('parent_id', null) // Only parent categories
                    .not('slug', 'in', `(${excludedSlugs.join(',')})`) // Exclude the list
                    .order('name', { ascending: true })

                if (error) throw error
                setCategories(data || [])
            } catch (e) {
                console.error("Error fetching categories:", e)
            } finally {
                setLoading(false)
            }
        }
        fetchCategories()
    }, [supabase])

    const filteredCategories = categories.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Calculate unique letters based on FILTERED results so the bar stays relevant
    const alphabet = Array.from(new Set(filteredCategories.map(b => b.name[0].toUpperCase()))).sort()

    // Helper to check if a card is the first of its letter group
    const isFirstOfLetter = (index: number, name: string) => {
        if (index === 0) return true;
        return name[0].toUpperCase() !== filteredCategories[index - 1].name[0].toUpperCase();
    }

    return (
        <div className="min-h-screen bg-white text-[#1A1A1A] pb-32 selection:bg-primary/10">
            <main className="max-w-6xl mx-auto px-6 pt-16">

                <header className="mb-12 space-y-8">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <h1 className="text-5xl font-serif tracking-tighter uppercase leading-none">Collections</h1>
                            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary mt-4">Curated Tiers of Excellence</p>
                        </div>

                        <div className="relative w-full md:w-64 group">
                            <Search className="absolute left-0 bottom-2 w-3.5 h-3.5 text-zinc-300 group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="FIND A TIER..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-transparent border-b border-zinc-100 pb-2 pl-6 text-[10px] tracking-widest focus:outline-none focus:border-primary transition-all uppercase"
                            />
                        </div>
                    </div>

                    {/* JUMP BAR - Optimized with smooth scrolling logic */}
                    <div className="flex flex-wrap gap-4 border-y border-zinc-50 py-4 sticky top-0 bg-white/80 backdrop-blur-md z-20">
                        {alphabet.map(letter => (
                            <button
                                key={letter}
                                onClick={() => {
                                    const el = document.getElementById(`letter-${letter}`);
                                    if (el) {
                                        // offset the scroll to account for the jump bar height
                                        const yOffset = -100;
                                        const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
                                        window.scrollTo({ top: y, behavior: 'smooth' });
                                    }
                                }}
                                className="text-[10px] font-black text-zinc-400 hover:text-primary transition-colors w-4"
                            >
                                {letter}
                            </button>
                        ))}
                    </div>
                </header>

                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {[...Array(5)].map((_, i) => <div key={i} className="animate-pulse aspect-square bg-zinc-50" />)}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-16">
                        {filteredCategories.map((category, index) => {
                            const letter = category.name[0].toUpperCase();
                            const showId = isFirstOfLetter(index, category.name);

                            return (
                                <Link
                                    key={category.id}
                                    // Only attach the ID to the first item of each letter group
                                    id={showId ? `letter-${letter}` : undefined}
                                    href={`/categories/${category.slug}`}
                                    className="group flex flex-col scroll-mt-32"
                                >
                                    <div className="relative aspect-square overflow-hidden bg-zinc-50 mb-5 transition-transform duration-500 group-hover:-translate-y-1">
                                        {category.image_url ? (
                                            <div
                                                className="absolute inset-0 bg-cover bg-center grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110"
                                                style={{ backgroundImage: `url(${category.image_url})` }}
                                            />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-zinc-300 uppercase">{category.name}</div>
                                        )}
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] leading-none">{category.name}</h3>
                                            <ArrowUpRight className="w-3 h-3 text-zinc-300 group-hover:text-primary transition-all" />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="h-[1px] w-4 bg-zinc-100 group-hover:w-8 group-hover:bg-primary transition-all duration-500" />
                                            <span className="text-[9px] text-zinc-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Explore</span>
                                        </div>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                )}
            </main>
        </div>
    )
}