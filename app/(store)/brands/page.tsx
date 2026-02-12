

// "use client"

// import * as React from "react"
// import Link from "next/link"
// import { createClient } from "@/utils/supabase/client"
// import { Loader2, ArrowUpRight, Search } from "lucide-react"

// export default function BrandsPage() {
//     const [brands, setBrands] = React.useState<any[]>([])
//     const [searchQuery, setSearchQuery] = React.useState("")
//     const [loading, setLoading] = React.useState(true)
//     const supabase = createClient()
//     const BLACKLISTED_NAMES = ["Foundation", "Concealer", "Face Primer", "Lipstick", "Lip Gloss", "Lip Liner", "Liquid Lipstick"]

//     React.useEffect(() => {
//         async function fetchBrands() {
//             try {
//                 // We fetch the parent slug to determine the routing path
//                 const { data, error } = await supabase
//                     .from('categories')
//                     .select(`
//                         id, 
//                         name, 
//                         slug, 
//                         image_url, 
//                         parent_id,
//                         parent:parent_id (
//                             slug
//                         )
//                     `)
//                     .not('parent_id', 'is', null)
//                     .order('name', { ascending: true })

//                 if (error) throw error
//                 setBrands(data || [])
//             } catch (e) {
//                 console.error("Error fetching brands:", e)
//             } finally {
//                 setLoading(false)
//             }
//         }
//         fetchBrands()
//     }, [supabase])

//     const filteredBrands = brands.filter(b => {
//         const matchesSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase());
//         const isNotBlacklisted = !BLACKLISTED_NAMES.some(name =>
//             b.name.toLowerCase() === name.toLowerCase()
//         );

//         return matchesSearch && isNotBlacklisted;
//     })

//     // Get unique starting letters for the A-Z jump
//     const alphabet = Array.from(new Set(brands.map(b => b.name[0].toUpperCase()))).sort()

//     return (
//         <div className="min-h-screen bg-white text-[#1A1A1A] pb-32 selection:bg-primary/10">
//             <main className="max-w-6xl mx-auto px-6 pt-8 md:pt-16">

//                 {/* HEADER & SEARCH */}
//                 <header className="mb-12 space-y-8">
//                     <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
//                         <div>
//                             <h1 className="text-5xl font-serif tracking-tighter uppercase leading-none">
//                                 Brands
//                             </h1>
//                             <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary mt-4">
//                                 Curated Brands trusted by professionals
//                             </p>
//                         </div>

//                         {/* Minimalist Search */}
//                         <div className="relative w-full md:w-64 group">
//                             <Search className="absolute left-0 bottom-2 w-3.5 h-3.5 text-zinc-300 group-focus-within:text-primary transition-colors" />
//                             <input
//                                 type="text"
//                                 placeholder="FIND A HOUSE..."
//                                 value={searchQuery}
//                                 onChange={(e) => setSearchQuery(e.target.value)}
//                                 className="w-full bg-transparent border-b border-zinc-100 pb-2 pl-6 text-[10px] tracking-widest focus:outline-none focus:border-primary transition-all placeholder:text-zinc-300 uppercase"
//                             />
//                         </div>
//                     </div>

//                     {/* A-Z JUMP BAR */}
//                     <div className="flex flex-wrap gap-4 border-y border-zinc-50 py-4">
//                         {alphabet.map(letter => (
//                             <button
//                                 key={letter}
//                                 onClick={() => {
//                                     const el = document.getElementById(`letter-${letter}`);
//                                     el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
//                                 }}
//                                 className="text-[10px] font-bold text-zinc-400 hover:text-primary transition-colors w-4"
//                             >
//                                 {letter}
//                             </button>
//                         ))}
//                     </div>
//                 </header>

//                 {/* BRANDS GRID */}
//                 {loading ? (
//                     <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
//                         {[...Array(10)].map((_, i) => (
//                             <div key={i} className="animate-pulse space-y-4">
//                                 <div className="aspect-square bg-zinc-50" />
//                                 <div className="h-2 w-2/3 bg-zinc-50" />
//                             </div>
//                         ))}
//                     </div>
//                 ) : (
//                     <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-16">
//                         {filteredBrands.map((brand) => {
//                             // Logic: Determine the URL based on the parent category slug
//                             const parentSlug = brand.parent?.slug;
//                             const pathSegment = (parentSlug === 'exclusive' || parentSlug === 'essentials')
//                                 ? parentSlug
//                                 : 'categories';

//                             return (
//                                 <Link
//                                     key={brand.id}
//                                     id={`letter-${brand.name[0].toUpperCase()}`}
//                                     href={`/${pathSegment}/${brand.slug}`}
//                                     className="group flex flex-col"
//                                 >
//                                     {/* Image Container with "Lift" effect */}
//                                     <div className="relative aspect-square overflow-hidden bg-zinc-50 mb-5 transition-transform duration-500 group-hover:-translate-y-1">
//                                         {brand.image_url ? (
//                                             <div
//                                                 className="absolute inset-0 bg-cover bg-center grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110"
//                                                 style={{ backgroundImage: `url(${brand.image_url})` }}
//                                             />
//                                         ) : (
//                                             <div className="absolute inset-0 flex items-center justify-center text-[8px] font-bold uppercase tracking-widest text-zinc-300">
//                                                 {brand.name}
//                                             </div>
//                                         )}
//                                         <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
//                                     </div>

//                                     {/* Labeling */}
//                                     <div className="space-y-1.5">
//                                         <div className="flex items-center justify-between">
//                                             <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-charcoal leading-none">
//                                                 {brand.name}
//                                             </h3>
//                                             <ArrowUpRight className="w-3 h-3 text-zinc-300 group-hover:text-primary transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
//                                         </div>
//                                         <div className="flex items-center gap-2">
//                                             <div className="h-[1px] w-4 bg-zinc-100 group-hover:w-8 group-hover:bg-primary transition-all duration-500" />
//                                             <span className="text-[9px] text-zinc-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
//                                                 Discover
//                                             </span>
//                                         </div>
//                                     </div>
//                                 </Link>
//                             )
//                         })}
//                     </div>
//                 )}

//                 {/* Empty Results UX */}
//                 {!loading && filteredBrands.length === 0 && (
//                     <div className="py-32 text-center border-t border-zinc-50">
//                         <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-400 font-bold">
//                             No boutique found matching &quot;{searchQuery}&quot;
//                         </p>
//                     </div>
//                 )}
//             </main>
//         </div>
//     )
// }


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

    const BLACKLISTED_NAMES = ["Foundation", "Concealer", "Face Primer", "Lipstick", "Lip Gloss", "Lip Liner", "Liquid Lipstick"]

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
        <div className="min-h-screen bg-white text-[#1A1A1A] antialiased selection:bg-black/5">
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
                        className="pt-16 pb-8 space-y-4 will-change-transform"
                    >
                        <h1 className="text-6xl font-black uppercase tracking-tighter leading-none">
                            Brands
                        </h1>
                        <p className="text-[11px] font-black uppercase tracking-[0.5em] text-zinc-400">
                            Curated Houses / {filteredBrands.length} Results
                        </p>
                    </motion.div>

                    {/* Sticky Navigation & Search */}
                    <motion.div
                        style={{ backgroundColor: headerBg, backdropFilter: headerBlur }}
                        className="sticky top-0 z-50 -mx-6 px-6 py-6 border-b border-transparent data-[stuck]:border-zinc-100 transition-colors"
                    >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            {/* A-Z Jump */}
                            <div className="flex flex-wrap gap-4 overflow-x-auto no-scrollbar">
                                {alphabet.map(letter => (
                                    <button
                                        key={letter}
                                        onClick={() => {
                                            const el = document.getElementById(`letter-${letter}`);
                                            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        }}
                                        className="text-[10px] font-black text-zinc-300 hover:text-black transition-colors min-w-[12px]"
                                    >
                                        {letter}
                                    </button>
                                ))}
                            </div>

                            {/* Minimalist Search */}
                            <div className="relative w-full md:w-64 group">
                                <Search className="absolute left-0 w-4 h-4 text-black stroke-[3px]" />
                                <input
                                    type="text"
                                    placeholder="FIND A HOUSE..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-transparent border-none pl-10 pr-4 text-[12px] font-black tracking-[0.15em] focus:outline-none uppercase placeholder:text-zinc-200 transition-all"
                                />
                            </div>
                        </div>
                    </motion.div>
                </header>

                <main className="px-6 pt-12 pb-32">
                    {!loading && (
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.1, ease: [0.19, 1, 0.22, 1] }}
                        >
                            {filteredBrands.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-8 gap-y-16">
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