
// "use client"

// import * as React from "react"
// import Link from "next/link"
// import { createClient } from "@/utils/supabase/client"
// import { Search, ChevronDown, ArrowRight, SearchX } from "lucide-react"
// import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion"

// export default function CategoriesPage() {
//     const [allCategories, setAllCategories] = React.useState<any[]>([])
//     const [openId, setOpenId] = React.useState<string | null>(null)
//     const [searchQuery, setSearchQuery] = React.useState("")
//     const [loading, setLoading] = React.useState(true)
//     const supabase = createClient()

//     // PARALLAX SETUP
//     const { scrollY } = useScroll()
//     const titleY = useTransform(scrollY, [0, 300], [0, -40])
//     const titleOpacity = useTransform(scrollY, [0, 200], [1, 0])

//     // Header background opacity on scroll
//     const headerBg = useTransform(scrollY, [0, 100], ["rgba(255, 255, 255, 0)", "rgba(255, 255, 255, 0.8)"])
//     const headerBlur = useTransform(scrollY, [0, 100], ["blur(0px)", "blur(12px)"])

//     React.useEffect(() => {
//         async function fetchCategories() {
//             try {
//                 const { data, error } = await supabase
//                     .from('categories')
//                     .select('id, name, slug, parent_id')
//                     .order('name', { ascending: true })
//                 if (error) throw error
//                 setAllCategories(data || [])
//             } catch (e) {
//                 console.error(e)
//             } finally {
//                 setTimeout(() => setLoading(false), 1200)
//             }
//         }
//         fetchCategories()
//     }, [supabase])

//     const filteredParents = React.useMemo(() => {
//         const query = searchQuery.toLowerCase()
//         const excludedSlugs = ['exclusive', 'essentials', 'new-arrivals']
//         const parents = allCategories.filter(c => !c.parent_id && !excludedSlugs.includes(c.slug))

//         if (!query) return parents

//         return parents.filter(parent => {
//             const parentMatches = parent.name.toLowerCase().includes(query)
//             const childrenMatches = allCategories.some(child =>
//                 child.parent_id === parent.id && child.name.toLowerCase().includes(query)
//             )
//             return parentMatches || childrenMatches
//         })
//     }, [allCategories, searchQuery])

//     React.useEffect(() => {
//         if (searchQuery.length > 1 && filteredParents.length > 0) {
//             setOpenId(filteredParents[0].id)
//         }
//     }, [searchQuery, filteredParents])

//     const getChildren = (parentId: string) => {
//         const query = searchQuery.toLowerCase()
//         const children = allCategories.filter(c => c.parent_id === parentId)
//         if (query) return children.filter(c => c.name.toLowerCase().includes(query))
//         return children
//     }

//     return (
//         <div className="min-h-screen bg-white text-black antialiased">
//             {/* 1. INITIAL LOADING OVERLAY */}
//             <AnimatePresence mode="wait">
//                 {loading && (
//                     <motion.div
//                         key="loader"
//                         initial={{ opacity: 1 }}
//                         exit={{ opacity: 0, y: -20 }}
//                         transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
//                         className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center"
//                     >
//                         <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-900 mb-4">
//                             The Makeup Store
//                         </h2>
//                         <div className="w-24 overflow-hidden">
//                             <motion.div
//                                 animate={{ x: ["-100%", "100%"] }}
//                                 transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
//                                 className="h-[1px] bg-slate-900 w-full"
//                             />
//                         </div>
//                     </motion.div>
//                 )}
//             </AnimatePresence>

//             {/* 2. PAGE CONTENT */}
//             <div className="max-w-2xl mx-auto">
//                 <header className="px-6">
//                     {/* Parallax Title (Non-sticky) */}
//                     <motion.div
//                         style={{ y: titleY, opacity: titleOpacity }}
//                         className="pt-8 pb-4 space-y-2 will-change-transform"
//                     >
//                         <h1 className="text-3xl font-black uppercase tracking-tighter leading-none">
//                             Categories
//                         </h1>
//                         <p className="text-[11px] font-black uppercase tracking-[0.5em] text-zinc-400">
//                             Index System / {filteredParents.length} Results
//                         </p>
//                     </motion.div>

//                     {/* Sticky Search Bar */}
//                     <motion.div
//                         style={{ backgroundColor: headerBg, backdropFilter: headerBlur }}
//                         className="sticky top-0 z-50 -mx-6 px-6 py-4 transition-colors"
//                     >
//                         <div className="relative flex items-center group">
//                             <Search className="absolute left-0 w-5 h-5 text-black stroke-[3px]" />
//                             <input
//                                 type="text"
//                                 placeholder="SEARCH BY COLLECTION OR SUB-TYPE..."
//                                 value={searchQuery}
//                                 onChange={(e) => setSearchQuery(e.target.value)}
//                                 className="w-full bg-transparent border-none py-1 pl-10 pr-4 text-[12px] font-black tracking-[0.15em] focus:outline-none uppercase placeholder:text-zinc-300 transition-all"
//                             />
//                         </div>
//                     </motion.div>
//                 </header>

//                 <main className="px-6 pb-20">
//                     {!loading && (
//                         <motion.div
//                             initial={{ opacity: 0, y: 15 }}
//                             animate={{ opacity: 1, y: 0 }}
//                             transition={{ duration: 0.8, delay: 0.1, ease: [0.19, 1, 0.22, 1] }}
//                         >
//                             <div className="flex flex-col border-t border-black/10">
//                                 {filteredParents.length > 0 ? (
//                                     filteredParents.map((parent) => {
//                                         const isOpen = openId === parent.id;
//                                         const children = getChildren(parent.id);

//                                         return (
//                                             <div
//                                                 key={parent.id}
//                                                 className={`border-b transition-all duration-300 ${isOpen ? 'bg-zinc-50 border-black' : 'bg-white border-black/10 hover:bg-zinc-50/50'
//                                                     }`}
//                                             >
//                                                 <button
//                                                     onClick={() => setOpenId(isOpen ? null : parent.id)}
//                                                     className="w-full flex items-center justify-between py-8 outline-none group text-left"
//                                                 >
//                                                     <div className="flex items-center gap-8">
//                                                         <span className={`text-xs font-black transition-colors ${isOpen ? 'text-black' : 'text-zinc-300'}`}>
//                                                             {parent.name[0]}
//                                                         </span>
//                                                         <h3 className={`text-base font-black uppercase tracking-tight transition-all ${isOpen ? 'text-black translate-x-2' : 'text-zinc-800'
//                                                             }`}>
//                                                             {parent.name}
//                                                         </h3>
//                                                     </div>
//                                                     <div className="flex items-center gap-6">
//                                                         <span className="text-[11px] font-black tabular-nums text-zinc-400 bg-zinc-100 px-2 py-1 rounded">
//                                                             {children.length.toString().padStart(2, '0')}
//                                                         </span>
//                                                         <ChevronDown className={`w-5 h-5 text-black stroke-[3px] transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} />
//                                                     </div>
//                                                 </button>

//                                                 <AnimatePresence>
//                                                     {isOpen && (
//                                                         <motion.div
//                                                             initial={{ height: 0, opacity: 0 }}
//                                                             animate={{ height: "auto", opacity: 1 }}
//                                                             exit={{ height: 0, opacity: 0 }}
//                                                             className="overflow-hidden bg-white"
//                                                         >
//                                                             <div className="grid grid-cols-1 divide-y-2 divide-zinc-50 pb-8">
//                                                                 {children.map((child) => (
//                                                                     <Link
//                                                                         key={child.id}
//                                                                         href={`/categories/${child.slug}`}
//                                                                         className="flex items-center justify-between py-5 pl-16 pr-6 hover:bg-black hover:text-white transition-all group/item"
//                                                                     >
//                                                                         <span className="text-[12px] font-black uppercase tracking-widest">
//                                                                             {child.name}
//                                                                         </span>
//                                                                         <ArrowRight className="w-4 h-4 opacity-0 group-hover/item:opacity-100 group-hover/item:translate-x-0 -translate-x-4 transition-all" />
//                                                                     </Link>
//                                                                 ))}
//                                                             </div>
//                                                         </motion.div>
//                                                     )}
//                                                 </AnimatePresence>
//                                             </div>
//                                         )
//                                     })
//                                 ) : (
//                                     <motion.div
//                                         initial={{ opacity: 0 }}
//                                         animate={{ opacity: 1 }}
//                                         className="py-20 flex flex-col items-center justify-center text-center space-y-4"
//                                     >
//                                         <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center">
//                                             <SearchX className="w-6 h-6 text-zinc-300" />
//                                         </div>
//                                         <div className="space-y-1">
//                                             <h3 className="text-sm font-black uppercase tracking-widest text-black">No Results Found</h3>
//                                             <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-[0.2em]">
//                                                 No collections match &quot;{searchQuery}&quot;
//                                             </p>
//                                         </div>
//                                         <button
//                                             onClick={() => setSearchQuery("")}
//                                             className="text-[10px] font-black uppercase tracking-widest border-b-2 border-black pb-1 hover:text-zinc-400 hover:border-zinc-200 transition-all"
//                                         >
//                                             Clear Search
//                                         </button>
//                                     </motion.div>
//                                 )}
//                             </div>
//                         </motion.div>
//                     )}
//                 </main>
//             </div>
//         </div>
//     )
// }

"use client"

import * as React from "react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { Search, ChevronDown, ArrowRight, SearchX, Sparkles } from "lucide-react"
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion"
import { SignatureLoader } from "@/components/store/signature-loader"
import { Breadcrumbs } from "@/components/store/breadcrumbs"

export default function CategoriesPage() {
    const [allCategories, setAllCategories] = React.useState<any[]>([])
    const [openId, setOpenId] = React.useState<string | null>(null)
    const [searchQuery, setSearchQuery] = React.useState("")
    const [loading, setLoading] = React.useState(true)
    const supabase = createClient()

    const { scrollY } = useScroll()
    const headerBg = useTransform(scrollY, [0, 50], ["rgba(255, 255, 255, 0)", "rgba(255, 255, 255, 1)"])
    const headerShadow = useTransform(scrollY, [0, 50], ["none", "0 4px 20px rgba(0, 0, 0, 0.05)"])

    React.useEffect(() => {
        async function fetchCategories() {
            try {
                const { data, error } = await supabase
                    .from('categories')
                    .select('id, name, slug, parent_id, image_url')
                    .order('name', { ascending: true })
                if (error) throw error
                setAllCategories(data || [])
            } catch (e) {
                console.error(e)
            } finally {
                // Keep your original loading delay
                setTimeout(() => setLoading(false), 1200)
            }
        }
        fetchCategories()
    }, [supabase])

    const filteredParents = React.useMemo(() => {
        const query = searchQuery.toLowerCase()
        const excludedSlugs = ['exclusive', 'essentials', 'new-arrivals']
        const parents = allCategories.filter(c => !c.parent_id && !excludedSlugs.includes(c.slug))

        if (!query) return parents
        return parents.filter(parent =>
            parent.name.toLowerCase().includes(query) ||
            allCategories.some(child => child.parent_id === parent.id && child.name.toLowerCase().includes(query))
        )
    }, [allCategories, searchQuery])

    const getChildren = (parentId: string) => {
        const query = searchQuery.toLowerCase()
        const children = allCategories.filter(c => c.parent_id === parentId)
        return query ? children.filter(c => c.name.toLowerCase().includes(query)) : children
    }

    return (
        <div className="min-h-screen bg-[#F9F9F9] text-slate-900 pb-20">
            {/* 1. SIGNATURE LOADER */}
            <SignatureLoader loading={loading} text="The Makeup Store / Categories" />

            {!loading && (
                <>
                    {/* 2. STICKY NYKAA HEADER */}
                    <motion.header
                        style={{ backgroundColor: headerBg, boxShadow: headerShadow }}
                        className="sticky top-0 z-50 px-6 py-4 transition-all"
                    >
                        <div className="max-w-2xl mx-auto space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-[#fc2779] flex items-center justify-center shadow-lg shadow-pink-200">
                                        <Sparkles className="w-4 h-4 text-white fill-white" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#fc2779]">Catalogue</span>
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{filteredParents.length} Collections</span>
                            </div>

                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#fc2779]" />
                                <input
                                    type="text"
                                    placeholder="Search brands or categories..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-slate-100 border-none py-3.5 pl-11 pr-4 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-[#fc2779]/20 transition-all outline-none placeholder:text-slate-400"
                                />
                            </div>
                        </div>
                    </motion.header>

                    <main className="max-w-2xl mx-auto px-5 mt-6 pb-20">
                        <Breadcrumbs items={[{ label: 'Categories', href: '/categories' }]} />
                        <div className="space-y-4">
                            {filteredParents.length > 0 ? (
                                filteredParents.map((parent) => {
                                    const isOpen = openId === parent.id;
                                    const children = getChildren(parent.id);

                                    return (
                                        <div key={parent.id} className="overflow-hidden bg-white rounded-[2rem] border border-slate-100 shadow-sm transition-all duration-300">
                                            <button
                                                onClick={() => setOpenId(isOpen ? null : parent.id)}
                                                className="w-full flex items-center justify-between p-6 text-left group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isOpen ? 'bg-[#fc2779] text-white' : 'bg-slate-50 text-slate-400'}`}>
                                                        <span className="text-sm font-black uppercase">{parent.name[0]}</span>
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-black uppercase tracking-tight text-slate-800">{parent.name}</h3>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{children.length} Sub-Categories</p>
                                                    </div>
                                                </div>
                                                <div className={`p-2 rounded-full transition-all ${isOpen ? 'bg-pink-50 text-[#fc2779] rotate-180' : 'text-slate-300'}`}>
                                                    <ChevronDown className="w-5 h-5" />
                                                </div>
                                            </button>

                                            <AnimatePresence>
                                                {isOpen && (
                                                    <motion.div
                                                        initial={{ height: 0 }}
                                                        animate={{ height: "auto" }}
                                                        exit={{ height: 0 }}
                                                        className="overflow-hidden bg-white border-t border-slate-50"
                                                    >
                                                        <div className="grid grid-cols-1 divide-y divide-slate-50 px-2 pb-4">
                                                            {children.map((child) => (
                                                                <Link
                                                                    key={child.id}
                                                                    href={`/categories/${child.slug}`}
                                                                    className="flex items-center justify-between py-4 px-6 hover:bg-pink-50 rounded-2xl transition-all group/item"
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover/item:bg-[#fc2779] transition-colors" />
                                                                        <span className="text-[12px] font-bold text-slate-600 group-hover/item:text-[#fc2779] uppercase tracking-wide transition-colors">
                                                                            {child.name}
                                                                        </span>
                                                                    </div>
                                                                    <ArrowRight className="w-4 h-4 text-[#fc2779] opacity-0 -translate-x-2 group-hover/item:opacity-100 group-hover/item:translate-x-0 transition-all" />
                                                                </Link>
                                                            ))}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="py-20 flex flex-col items-center text-center space-y-4">
                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-inner">
                                        <SearchX className="w-8 h-8 text-slate-200" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-sm font-black text-slate-800 uppercase">No Matches Found</h3>
                                        <p className="text-[11px] font-medium text-slate-400 px-10 leading-relaxed uppercase tracking-widest">We couldn't find any collection for "{searchQuery}"</p>
                                    </div>
                                    <button onClick={() => setSearchQuery("")} className="text-[10px] font-black uppercase text-[#fc2779] border-b-2 border-[#fc2779] pb-0.5">Clear Filters</button>
                                </div>
                            )}
                        </div>
                    </main>
                </>
            )}
        </div>
    )
}