

"use client"

import * as React from "react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { ArrowRight, Search, SearchX, Sparkles } from "lucide-react"
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion"
import Image from "next/image"

export default function BrandsPage() {
    const [brands, setBrands] = React.useState<any[]>([])
    const [searchQuery, setSearchQuery] = React.useState("")
    const [loading, setLoading] = React.useState(true)
    const supabase = createClient()

    const { scrollY } = useScroll()
    const headerBg = useTransform(scrollY, [0, 80], ["rgba(255, 255, 255, 0)", "rgba(255, 255, 255, 1)"])
    const headerShadow = useTransform(scrollY, [0, 80], ["none", "0 10px 30px rgba(0, 0, 0, 0.04)"])

    const BLACKLISTED_NAMES = ["Foundation", "Concealer", "Face Primer", "Lipstick", "Lip Gloss", "Lip Liner", "Liquid Lipstick", "Blush", "Contour", "Highlighter", "Loose Powder", "Compact", "Eye Brow Enhancers", "Eyeliner", "Mascara", "Eye shadow", "Setting Spray", "Makeup Remover", "Skincare", "Fragrance", "Tools & Brushes", "Kajal", "Lip Balm", "Lip Tint", "Cleansers & Toners", "Moisturisers", "Serum", "Sunscreen", "False Eyelashes", "Makeup Brushes", "Makeup remover & wipes", "Sheet Masks", "Sponges & Applicators"]

    React.useEffect(() => {
        async function fetchBrands() {
            try {
                const { data, error } = await supabase
                    .from('categories')
                    .select(`id, name, slug, image_url, parent_id, parent:parent_id (slug)`)
                    .not('parent_id', 'is', null)
                    .order('name', { ascending: true })

                if (error) throw error
                setBrands(data || [])
            } catch (e) {
                console.error(e)
            } finally {
                setTimeout(() => setLoading(false), 1200)
            }
        }
        fetchBrands()
    }, [supabase])

    const filteredBrands = brands.filter(b => {
        const matchesSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase());
        const isNotBlacklisted = !BLACKLISTED_NAMES.some(name => b.name.toLowerCase() === name.toLowerCase());
        return matchesSearch && isNotBlacklisted;
    })

    const alphabet = Array.from(new Set(brands.map(b => b.name[0].toUpperCase()))).sort()

    if (loading) return <LoadingOverlay />

    return (
        <div className="min-h-screen bg-[#FDFDFD] text-slate-900 pb-20">
            {/* 1. STICKY BRAND HEADER */}
            <motion.header
                style={{ backgroundColor: headerBg, boxShadow: headerShadow }}
                className="sticky top-0 z-50 px-6 py-4 transition-all"
            >
                <div className="max-w-6xl mx-auto space-y-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-[#fc2779] flex items-center justify-center shadow-lg shadow-pink-200">
                                <Sparkles className="w-4 h-4 text-white fill-white" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#fc2779]">Brand Directory</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{filteredBrands.length} Houses</span>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        {/* A-Z Horizontal Jump */}
                        <div className="flex flex-1 gap-6 overflow-x-auto no-scrollbar pb-1 px-1">
                            {alphabet.map(letter => (
                                <button
                                    key={letter}
                                    onClick={() => document.getElementById(`letter-${letter}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                                    className="text-[11px] font-black text-slate-400 hover:text-[#fc2779] transition-colors"
                                >
                                    {letter}
                                </button>
                            ))}
                        </div>

                        {/* Search Bar */}
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#fc2779]" />
                            <input
                                type="text"
                                placeholder="Search Brands..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-100 border-none py-3 pl-11 pr-4 rounded-2xl text-[12px] font-bold focus:ring-2 focus:ring-[#fc2779]/20 transition-all outline-none placeholder:text-slate-400 uppercase tracking-widest"
                            />
                        </div>
                    </div>
                </div>
            </motion.header>

            <main className="max-w-6xl mx-auto px-6 pt-10">
                <AnimatePresence>
                    {filteredBrands.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-12">
                            {filteredBrands.map((brand) => {
                                const parentSlug = brand.parent?.slug;
                                const pathSegment = (parentSlug === 'exclusive' || parentSlug === 'essentials') ? parentSlug : 'categories';

                                return (
                                    <Link
                                        key={brand.id}
                                        id={`letter-${brand.name[0].toUpperCase()}`}
                                        href={`/${pathSegment}/${brand.slug}`}
                                        className="group flex flex-col items-center text-center space-y-4"
                                    >
                                        {/* Nykaa Style Story Circle */}
                                        <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-full p-1 bg-gradient-to-tr from-[#fc2779] via-pink-300 to-orange-100 group-hover:rotate-6 transition-all duration-700 shadow-xl">
                                            <div className="w-full h-full rounded-full border-2 border-white overflow-hidden relative bg-slate-50">
                                                {brand.image_url ? (
                                                    <Image
                                                        src={brand.image_url}
                                                        fill
                                                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                                                        alt={brand.name}
                                                    />
                                                ) : (
                                                    <div className="flex h-full items-center justify-center text-[10px] font-black text-slate-300">{brand.name[0]}</div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-800 group-hover:text-[#fc2779] transition-colors">
                                                {brand.name}
                                            </h3>
                                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-all -translate-y-2 group-hover:translate-y-0">
                                                <span className="text-[9px] font-bold text-[#fc2779] uppercase tracking-widest">Shop Now</span>
                                                <ArrowRight className="w-3 h-3 text-[#fc2779]" />
                                            </div>
                                        </div>
                                    </Link>
                                )
                            })}
                        </div>
                    ) : (
                        <EmptyState query={searchQuery} onClear={() => setSearchQuery("")} />
                    )}
                </AnimatePresence>
            </main>
        </div>
    )
}

function LoadingOverlay() {
    return (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center">
            <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-black mb-4">The Makeup Store</h2>
            <div className="w-24 overflow-hidden h-[1.5px] bg-pink-50">
                <motion.div
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    className="h-full bg-black w-full"
                />
            </div>
        </div>
    )
}

function EmptyState({ query, onClear }: { query: string, onClear: () => void }) {
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-32 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-16 h-16 bg-pink-50 rounded-full flex items-center justify-center">
                <SearchX className="w-6 h-6 text-[#fc2779]" />
            </div>
            <div className="space-y-2">
                <h3 className="text-sm font-black uppercase text-slate-800">No Matches Found</h3>
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">We couldn't find any house named "{query}"</p>
            </div>
            <button onClick={onClear} className="text-[10px] font-black uppercase text-[#fc2779] border-b-2 border-[#fc2779] pb-1">Reset Search</button>
        </motion.div>
    )
}