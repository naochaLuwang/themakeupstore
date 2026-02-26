"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import {
    Minus,
    Sparkles,
    LayoutGrid,
    ChevronRight
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { ProductCard } from "@/components/store/product-card"

export default function ExclusivePage() {
    const [subcategories, setSubcategories] = React.useState<any[]>([])
    const [allProducts, setAllProducts] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(true)

    const supabase = createClient()

    React.useEffect(() => {
        async function getData() {
            try {
                setLoading(true)
                const { data: parent } = await supabase
                    .from('categories')
                    .select('id, name, slug')
                    .eq('slug', 'exclusive')
                    .single()

                if (!parent) return

                const { data: subs } = await supabase
                    .from('categories')
                    .select('id, name, slug, image_url')
                    .eq('parent_id', parent.id)
                    .order('name', { ascending: true })

                if (subs) setSubcategories(subs)

                const categoryIds = [parent.id, ...(subs?.map(s => s.id) || [])]

                const { data: junction } = await supabase
                    .from('product_categories')
                    .select('product_id')
                    .in('category_id', categoryIds)

                const linkedProductIds = junction?.map(j => j.product_id) || []

                let query = supabase
                    .from('products')
                    .select('*, product_variants(*)')
                    .eq('status', 'active')

                if (linkedProductIds.length > 0) {
                    query = query.or(`category_id.in.(${categoryIds.join(',')}),id.in.(${linkedProductIds.join(',')})`)
                } else {
                    query = query.in('category_id', categoryIds)
                }

                const { data: products } = await query
                const processedProducts = products?.map(product => ({
                    ...product,
                    category_id: product.category_id || parent.id
                }))
                setAllProducts(processedProducts || [])
            } catch (e) {
                console.error("Fetch Error:", e)
            } finally {
                setTimeout(() => setLoading(false), 800)
            }
        }
        getData()
    }, [supabase])

    if (loading) return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center">
            <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-[#fc2779] mb-4">
                The Makeup Store
            </h2>
            <div className="w-24 overflow-hidden h-[1.5px] bg-pink-50">
                <motion.div
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    className="h-full bg-[#fc2779] w-full"
                />
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-[#FDFDFD] text-slate-900 pb-20">
            {/* NYKAA PROGRESS BAR */}
            <motion.div
                initial={{ scaleX: 0, originX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1, ease: "easeInOut" }}
                className="fixed top-0 left-0 right-0 h-[2px] bg-[#fc2779] z-50 shadow-[0_0_10px_rgba(252,39,121,0.5)]"
            />

            <main className="max-w-6xl mx-auto px-6 pt-10">

                {/* HERO SECTION */}
                <header className="mb-16 space-y-4">
                    <div className="flex items-center gap-2 text-[#fc2779]">
                        <Sparkles className="w-4 h-4 fill-[#fc2779]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Premium Curation</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-serif italic text-slate-950 leading-tight">
                        The <span className="text-[#fc2779]">Exclusive</span> Edit
                    </h1>
                    <div className="h-1.5 w-20 bg-[#fc2779] rounded-full opacity-80" />
                </header>

                {/* CATEGORY STORY CIRCLES (NYKAA STYLE) */}
                <section className="mb-5">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Discover Houses</h2>
                        <span className="text-[10px] font-bold text-[#fc2779] uppercase">Luxury Brands</span>
                    </div>

                    <div className="flex overflow-x-auto gap-8 md:gap-12 no-scrollbar pb-4 -mx-6 px-6">
                        {subcategories.map((cat) => (
                            <Link key={cat.id} href={`/exclusive/${cat.slug}`} className="group flex flex-col items-center gap-4 shrink-0">
                                <div className="relative w-20 h-20 md:w-28 md:h-28 rounded-full p-[2px] bg-gradient-to-tr from-[#fc2779] via-pink-400 to-yellow-200 group-hover:rotate-12 transition-all duration-500">
                                    <div className="w-full h-full rounded-full border-[3px] border-white overflow-hidden relative shadow-lg bg-white">
                                        <Image
                                            src={cat.image_url || '/placeholder.png'}
                                            fill
                                            className="object-cover group-hover:scale-110 transition-transform duration-700"
                                            alt={cat.name}
                                        />
                                    </div>
                                </div>
                                <div className="text-center">
                                    <span className="text-[10px] md:text-[11px] font-black uppercase tracking-tighter text-slate-800 block">{cat.name}</span>
                                    <span className="text-[9px] font-bold text-[#fc2779] uppercase italic opacity-0 group-hover:opacity-100 transition-opacity">Explore</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>

                {/* PRODUCT GALLERY */}
                <section className="pt-10">
                    {/* 1. HEADER SECTION (Clean Boutique Style) */}
                    <div className="flex items-center justify-between mb-0 border-t border-x border-pink-50 bg-white p-6">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-[#fc2779]" /> {/* Nykaa Accent Bar */}
                            <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900">
                                High-End Selection
                            </h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-[#fc2779] uppercase tracking-widest">
                                {allProducts.length} Results
                            </span>
                        </div>
                    </div>

                    {/* 2. THE ZERO-GAP GRID SYSTEM */}
                    {/* gap-0 removes all spacing; border-t/border-l on parent + border-b/border-r on children creates the perfect 1px grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-0 border-t border-l border-pink-50 bg-white overflow-hidden">
                        {allProducts.map((product) => (
                            <motion.div
                                key={product.id}
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                viewport={{ once: true }}
                                className="relative bg-white transition-colors duration-300 hover:bg-pink-50/5"
                            >
                                {/* Note: Ensure your ProductCard inside has:
                    - rounded-none
                    - border-r border-b border-pink-50 
                */}
                                <ProductCard product={product} />
                            </motion.div>
                        ))}
                    </div>

                    {/* 3. OPTIONAL: DECORATIVE SCANLINE (Nykaa Boutique Detail) */}
                    <div className="w-full h-[1px] bg-pink-50 mt-12 opacity-50" />
                </section>
            </main>
        </div>
    )
}