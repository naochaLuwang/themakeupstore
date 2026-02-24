"use client"

import * as React from "react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { ArrowUpRight, Search, SearchX } from "lucide-react"
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion"

export default function BrandsPage() {
    const [brands, setBrands] = React.useState<any[]>([])
    const [searchQuery, setSearchQuery] = React.useState("")
    const [loading, setLoading] = React.useState(true)
    const supabase = createClient()

    // PARALLAX & STICKY ANIMATION SETUP
    const { scrollY } = useScroll()
    const titleY = useTransform(scrollY, [0, 300], [0, -40])
    const titleOpacity = useTransform(scrollY, [0, 200], [1, 0])
    const headerBg = useTransform(scrollY, [0, 100], ["rgba(255, 255, 255, 0)", "rgba(255, 255, 255, 0.8)"])
    const headerBlur = useTransform(scrollY, [0, 100], ["blur(0px)", "blur(12px)"])

    const BLACKLISTED_NAMES = ["Foundation", "Concealer", "Face Primer", "Lipstick", "Lip Gloss", "Lip Liner", "Liquid Lipstick", "Blush", "Contour", "Highlighter", "Loose Powder", "Compact", "Eye Brow Enhancers", "Eyeliner", "Mascara", "Eye shadow", "Setting Spray", "Makeup Remover", "Skincare", "Fragrance", "Tools & Brushes", "Kajal", "Lip Balm", "Lip Tint"]

    React.useEffect(() => {
        async function fetchBrands() {
            try {
                const { data, error } = await supabase
                    .from('categories')
                    .select(`
                        id, 
                        name, 
                        slug, 
                        image_url, 
                        parent_id,
                        parent:parent_id (
                            slug
                        )
                    `)
                    .not('parent_id', 'is', null)
                    .order('name', { ascending: true })

                if (error) throw error
                setBrands(data || [])
            } catch (e) {
                console.error("Error fetching brands:", e)
            } finally {
                // Consistency delay for the luxury loader
                setTimeout(() => setLoading(false), 1200)
            }
        }
        fetchBrands()
    }, [supabase])

    const filteredBrands = brands.filter(b => {
        const matchesSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase());
        const isNotBlacklisted = !BLACKLISTED_NAMES.some(name =>
            b.name.toLowerCase() === name.toLowerCase()
        );
        return matchesSearch && isNotBlacklisted;
    })

    const alphabet = Array.from(new Set(brands.map(b => b.name[0].toUpperCase()))).sort()

    return (
        <div className="min-h-auto bg-white text-[#1A1A1A] antialiased selection:bg-black/5">
            {/* 1. INITIAL LOADING OVERLAY */}
            <AnimatePresence mode="wait">
                {loading && (
                    <motion.div
                        key="loader"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
                        className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center"
                    >
                        <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-900 mb-4">
                            The Makeup Store
                        </h2>
                        <div className="w-24 overflow-hidden">
                            <motion.div
                                animate={{ x: ["-100%", "100%"] }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                className="h-[1px] bg-slate-900 w-full"
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 2. PAGE CONTENT */}
            <div className="max-w-6xl mx-auto">
                <header className="px-6">
                    {/* Parallax Header */}
                    <motion.div
                        style={{ y: titleY, opacity: titleOpacity }}
                        className="pt-8 pb-8 space-y-4 will-change-transform"
                    >
                        <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">
                            Brands
                        </h1>
                        <p className="text-[11px] font-black uppercase tracking-[0.5em] text-zinc-600">
                            Curated Brands / {filteredBrands.length} Results
                        </p>
                    </motion.div>

                    {/* Sticky Navigation & Search */}
                    <motion.div
                        style={{ backgroundColor: headerBg, backdropFilter: headerBlur }}
                        className="sticky top-0 z-50 -mx-6 px-6 py-2  border-b border-transparent data-[stuck]:border-zinc-100 transition-colors"
                    >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                            {/* A-Z Jump */}
                            <div className="flex flex-wrap gap-4 overflow-x-auto no-scrollbar">
                                {alphabet.map(letter => (
                                    <button
                                        key={letter}
                                        onClick={() => {
                                            const el = document.getElementById(`letter-${letter}`);
                                            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        }}
                                        className="text-[12px] font-black text-zinc-900 hover:text-black transition-colors min-w-[12px]"
                                    >
                                        {letter}
                                    </button>
                                ))}
                            </div>

                            {/* Minimalist Search */}
                            <div className="relative w-full md:w-80 group">
                                {/* SEARCH CONTAINER */}
                                <div className="relative flex items-center w-full border-b-2 border-zinc-100 group-focus-within:border-black transition-all duration-500 pb-2">

                                    {/* ICON - Perfectly centered with flex */}
                                    <Search className="w-4 h-4 text-black stroke-[3px] flex-shrink-0" />

                                    {/* INPUT */}
                                    <input
                                        type="text"
                                        placeholder="FIND A BRAND..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-transparent border-none pl-4 pr-2 text-[12px] font-black tracking-[0.2em] focus:outline-none focus:ring-0 uppercase placeholder:text-zinc-300 transition-all"
                                    />

                                    {/* ACCENT LINE (Optional: Decorative minimalist detail) */}
                                    <div className="absolute bottom-[-2px] left-0 w-0 h-[2px] bg-black group-focus-within:w-full transition-all duration-700 ease-in-out" />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </header>

                <main className="px-6 pt-6 pb-8">
                    {!loading && (
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.1, ease: [0.19, 1, 0.22, 1] }}
                        >
                            {filteredBrands.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-8 gap-y-8">
                                    {filteredBrands.map((brand) => {
                                        const parentSlug = brand.parent?.slug;
                                        const pathSegment = (parentSlug === 'exclusive' || parentSlug === 'essentials')
                                            ? parentSlug
                                            : 'categories';

                                        return (
                                            <Link
                                                key={brand.id}
                                                id={`letter-${brand.name[0].toUpperCase()}`}
                                                href={`/${pathSegment}/${brand.slug}`}
                                                className="group flex flex-col"
                                            >
                                                <div className="relative aspect-square overflow-hidden bg-zinc-50 mb-5 transition-transform duration-700 ease-[0.19, 1, 0.22, 1] group-hover:-translate-y-2">
                                                    {brand.image_url ? (
                                                        <div
                                                            className="absolute inset-0 bg-cover bg-center grayscale group-hover:grayscale-0 transition-all duration-1000 group-hover:scale-110"
                                                            style={{ backgroundImage: `url(${brand.image_url})` }}
                                                        />
                                                    ) : (
                                                        <div className="absolute inset-0 flex items-center justify-center text-[9px] font-black uppercase tracking-widest text-zinc-300">
                                                            {brand.name}
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-500" />
                                                </div>

                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <h3 className="text-[12px] font-black uppercase tracking-widest text-black leading-none transition-transform duration-500 group-hover:translate-x-1">
                                                            {brand.name}
                                                        </h3>
                                                        <ArrowUpRight className="w-4 h-4 text-zinc-200 group-hover:text-black transition-all group-hover:translate-x-1 group-hover:-translate-y-1" />
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-[1px] w-6 bg-zinc-100 group-hover:w-12 group-hover:bg-black transition-all duration-700" />
                                                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-[-10px] group-hover:translate-x-0">
                                                            Discover
                                                        </span>
                                                    </div>
                                                </div>
                                            </Link>
                                        )
                                    })}
                                </div>
                            ) : (
                                /* NO RESULTS STATE */
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="py-32 flex flex-col items-center justify-center text-center space-y-6"
                                >
                                    <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center">
                                        <SearchX className="w-6 h-6 text-zinc-300" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-black uppercase tracking-widest text-black">No Boutique Found</h3>
                                        <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-[0.2em]">
                                            No houses match &quot;{searchQuery}&quot;
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setSearchQuery("")}
                                        className="text-[10px] font-black uppercase tracking-widest border-b-2 border-black pb-1 hover:text-zinc-400 hover:border-zinc-200 transition-all"
                                    >
                                        Reset Directory
                                    </button>
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </main>
            </div>
        </div>
    )
}