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