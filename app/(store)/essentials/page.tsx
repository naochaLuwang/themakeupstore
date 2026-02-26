// "use client"

// import * as React from "react"
// import Link from "next/link"
// import { motion } from "framer-motion"
// import { Loader2, Minus } from "lucide-react"
// import { createClient } from "@/utils/supabase/client"
// import { ProductCard } from "@/components/store/product-card"

// export default function EssentialPage() {
//     const [subcategories, setSubcategories] = React.useState<any[]>([])
//     const [allProducts, setAllProducts] = React.useState<any[]>([])
//     const [loading, setLoading] = React.useState(true)
//     const supabase = createClient()
//     React.useEffect(() => {
//         async function getData() {
//             try {
//                 setLoading(true)
//                 console.log("🛠️ DEBUG START: Fetching Exclusive Edit")

//                 // 1. Check Parent Category
//                 const { data: parent, error: pError } = await supabase
//                     .from('categories')
//                     .select('id, name, slug')
//                     .eq('slug', 'essentials')
//                     .single()

//                 if (pError) {
//                     console.error("❌ Step 1 Error (Parent):", pError.message)
//                     return
//                 }
//                 console.log("✅ Step 1: Found Parent Category:", parent)

//                 // 2. Check Subcategories
//                 const { data: subs, error: sError } = await supabase
//                     .from('categories')
//                     .select('id, name, slug, image_url')
//                     .eq('parent_id', parent.id)
//                     .order('name', { ascending: true })

//                 if (sError) console.error("❌ Step 2 Error (Subs):", sError.message)
//                 console.log(`✅ Step 2: Found ${subs?.length || 0} Subcategories`)
//                 if (subs) setSubcategories(subs)

//                 const categoryIds = [parent.id, ...(subs?.map(s => s.id) || [])]
//                 console.log("🔍 Looking for Products in Category IDs:", categoryIds)

//                 // 3. Check Junction Table
//                 const { data: junction, error: jError } = await supabase
//                     .from('product_categories')
//                     .select('*')
//                     .in('category_id', categoryIds)

//                 if (jError) console.error("❌ Step 3 Error (Junction):", jError.message)
//                 console.log(`✅ Step 3: Junction Table returned ${junction?.length || 0} links`)

//                 const linkedProductIds = junction?.map(j => j.product_id) || []

//                 // 4. Final Product Fetch
//                 let query = supabase
//                     .from('products')
//                     .select('*, product_variants(*)')
//                     .eq('status', 'active')

//                 if (linkedProductIds.length > 0) {
//                     query = query.or(`category_id.in.(${categoryIds.join(',')}),id.in.(${linkedProductIds.join(',')})`)
//                 } else {
//                     query = query.in('category_id', categoryIds)
//                 }

//                 const { data: products, error: prodError } = await query

//                 if (prodError) {
//                     console.error("❌ Step 4 Error (Products):", prodError.message)
//                 } else {
//                     console.log("📦 FINAL DATA FOUND:", products?.length, "products")
//                     console.table(products?.map(p => ({ name: p.name, id: p.id, cat_id: p.category_id })))
//                     setAllProducts(products || [])
//                 }

//             } catch (e) {
//                 console.error("🚨 Unexpected Crash:", e)
//             } finally {
//                 setLoading(false)
//             }
//         }
//         getData()
//     }, [supabase])


//     if (loading) return (
//         <div className="min-h-screen bg-white">
//             <main className="max-w-6xl mx-auto px-6 pt-6 md:pt-16">

//                 {/* HERO SKELETON */}
//                 <header className="mb-10 animate-pulse">
//                     <div className="flex items-center gap-2 mb-3">
//                         <div className="w-4 h-[1px] bg-slate-200" />
//                         <div className="w-20 h-2 bg-slate-100 rounded-full" />
//                     </div>
//                     <div className="w-3/4 md:w-1/2 h-10 bg-slate-50 rounded-lg" />
//                 </header>

//                 {/* CATEGORY GRID SKELETON */}
//                 <section className="mb-24">
//                     <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
//                         {[1, 2, 3, 4, 5].map((i) => (
//                             <div key={i} className="animate-pulse">
//                                 <div className="aspect-square bg-slate-50 border border-slate-100 rounded-sm" />
//                                 <div className="mt-3 flex justify-between items-center">
//                                     <div className="w-12 h-2 bg-slate-100 rounded-full" />
//                                     <div className="w-3 h-3 bg-slate-50 rounded-full" />
//                                 </div>
//                             </div>
//                         ))}
//                     </div>
//                 </section>

//                 {/* PRODUCT GALLERY SKELETON */}
//                 <section>
//                     <div className="flex items-center justify-between mb-10 border-b border-slate-100 pb-4 animate-pulse">
//                         <div className="w-24 h-2 bg-slate-100 rounded-full" />
//                         <div className="w-10 h-2 bg-slate-50 rounded-full" />
//                     </div>

//                     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10">
//                         {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
//                             <div key={i} className="space-y-4 animate-pulse">
//                                 {/* Image Area */}
//                                 <div className="aspect-[3/4] bg-slate-50 rounded-sm" />
//                                 {/* Text Area */}
//                                 <div className="space-y-2 px-1">
//                                     <div className="w-full h-2.5 bg-slate-100 rounded-full" />
//                                     <div className="w-2/3 h-2.5 bg-slate-50 rounded-full" />
//                                     <div className="pt-2 w-1/3 h-2 bg-slate-100 rounded-full" />
//                                 </div>
//                             </div>
//                         ))}
//                     </div>
//                 </section>

//             </main>

//             {/* TOP PROGRESS LINE (SUBTLE) */}
//             <motion.div
//                 initial={{ scaleX: 0, originX: 0 }}
//                 animate={{ scaleX: 1 }}
//                 transition={{ duration: 2, ease: "easeInOut" }}
//                 className="fixed top-0 left-0 right-0 h-[1px] bg-slate-200 z-50"
//             />
//         </div>
//     )

//     return (
//         <div className="min-h-screen bg-white text-slate-900 pb-20">
//             <main className="max-w-6xl mx-auto px-6 pt-6 md:pt-16">

//                 {/* MINIMAL HERO */}
//                 <header className="mb-10">
//                     <div className="flex items-center gap-2 mb-3">
//                         <Minus className="w-4 h-4 text-slate-300" />
//                         <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">
//                             Collection
//                         </span>
//                     </div>
//                     <h1 className="text-3xl md:text-5xl font-light tracking-tight text-slate-900">
//                         The <span className="font-serif ">Everyday Essentials Collection</span>
//                     </h1>
//                 </header>

//                 {/* SECTION 1: COMPACT CATEGORIES */}
//                 <section className="mb-24">
//                     <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
//                         {subcategories.map((cat) => (
//                             <Link key={cat.id} href={`/essentials/${cat.slug}`} className="group block">
//                                 <div className="relative aspect-square overflow-hidden bg-slate-50 border border-slate-100 transition-all duration-500 group-hover:border-slate-300">
//                                     <div
//                                         className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
//                                         style={{ backgroundImage: `url(${cat.image_url || '/api/placeholder/400/400'})` }}
//                                     />
//                                 </div>
//                                 <div className="mt-3 flex items-center justify-between">
//                                     {/* <h3 className="text-[13px] font-medium text-slate-700 group-hover:text-black transition-colors">
//                                         {cat.name}
//                                     </h3> */}
//                                     <span className="text-[10px] text-slate-300 group-hover:translate-x-1 transition-transform">→</span>
//                                 </div>
//                             </Link>
//                         ))}
//                     </div>
//                 </section>

//                 {/* SECTION 2: THE GALLERY */}
//                 <section>
//                     <div className="flex items-center justify-between mb-10 border-b border-slate-100 pb-4">
//                         <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
//                             The Full Archive
//                         </h2>
//                         <span className="text-[10px] font-medium text-slate-300">
//                             {allProducts.length} Items
//                         </span>
//                     </div>

//                     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10">
//                         {allProducts.map((product) => (
//                             <ProductCard key={product.id} product={product} />
//                         ))}
//                     </div>
//                 </section>


//             </main>
//         </div>
//     )
// }



"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, LayoutGrid, ChevronRight, Zap } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { ProductCard } from "@/components/store/product-card"

export default function EssentialPage() {
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
                    .select('id')
                    .eq('slug', 'essentials')
                    .single()

                if (!parent) return

                const { data: subs } = await supabase
                    .from('categories')
                    .select('*')
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
                setAllProducts(products || [])
            } catch (e) {
                console.error(e)
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
            {/* TOP PROGRESS LINE - NYKAA PINK */}
            <motion.div
                initial={{ scaleX: 0, originX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1, ease: "easeInOut" }}
                className="fixed top-0 left-0 right-0 h-[2px] bg-[#fc2779] z-50 shadow-[0_0_10px_rgba(252,39,121,0.5)]"
            />

            <main className="max-w-6xl mx-auto px-6 pt-10">
                {/* 1. BRANDED HERO */}
                <header className="mb-16 space-y-4">
                    <div className="flex items-center gap-2 text-[#fc2779]">
                        <Sparkles className="w-4 h-4 fill-[#fc2779]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">The Daily Edit</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-serif italic text-slate-950 leading-tight">
                        Beauty <span className="text-[#fc2779]">Essentials</span>
                    </h1>
                    <div className="h-1.5 w-20 bg-[#fc2779] rounded-full opacity-80" />
                </header>

                {/* 2. NYKAA-STYLE STORY BUBBLES */}
                <section className="mb-5">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Discover Rituals</h2>
                        <span className="text-[10px] font-bold text-[#fc2779] uppercase">Upto 30% Off</span>
                    </div>

                    <div className="flex overflow-x-auto gap-8 md:gap-12 no-scrollbar pb-4 -mx-6 px-6">
                        {subcategories.map((cat) => (
                            <Link key={cat.id} href={`/essentials/${cat.slug}`} className="group flex flex-col items-center gap-4 shrink-0">
                                <div className="relative w-20 h-20 md:w-28 md:h-28 rounded-full p-[2px] bg-gradient-to-tr from-[#fc2779] via-pink-400 to-orange-200 group-hover:rotate-12 transition-all duration-500">
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
                                    <span className="text-[9px] font-bold text-[#fc2779] uppercase italic opacity-0 group-hover:opacity-100 transition-opacity">View All</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>

                {/* 3. PRODUCT GRID */}
                <section className="pt-10">
                    {/* 1. HEADER SECTION (Clean Boutique Style) */}
                    <div className="flex items-center justify-between mb-0 border-t border-x border-pink-50 bg-white p-6">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-[#fc2779]" /> {/* Nykaa Accent Bar */}
                            <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900">
                                Hand Picked Selection
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