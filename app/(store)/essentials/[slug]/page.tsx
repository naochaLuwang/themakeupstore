// "use client"

// import * as React from "react"
// import { useParams } from "next/navigation"
// import Link from "next/link"
// import { AlertCircle, ChevronRight } from "lucide-react"
// import { createClient } from "@/utils/supabase/client"
// import { ProductCard } from "@/components/store/product-card"

// export default function EssentialCategoryPage() {
//     const { slug } = useParams()
//     const [category, setCategory] = React.useState<any>(null)
//     const [siblingCategories, setSiblingCategories] = React.useState<any[]>([])
//     const [products, setProducts] = React.useState<any[]>([])
//     const [loading, setLoading] = React.useState(true)
//     const [error, setError] = React.useState<string | null>(null)

//     const supabase = createClient()

//     React.useEffect(() => {
//         async function fetchContent() {
//             if (!slug) return
//             setLoading(true)
//             setError(null)

//             try {
//                 const { data: catData, error: catError } = await supabase
//                     .from('categories')
//                     .select('id, name, slug, parent_id')
//                     .eq('slug', slug)
//                     .single()

//                 if (catError) throw catError
//                 setCategory(catData)

//                 if (catData.parent_id) {
//                     const { data: siblings } = await supabase
//                         .from('categories')
//                         .select('name, slug')
//                         .eq('parent_id', catData.parent_id)

//                     if (siblings) setSiblingCategories(siblings)
//                 }

//                 const { data: junctionData } = await supabase
//                     .from('product_categories')
//                     .select('product_id')
//                     .eq('category_id', catData.id)

//                 const junctionProductIds = junctionData?.map(j => j.product_id) || []

//                 let query = supabase
//                     .from('products')
//                     .select('*, product_variants(*)')
//                     .eq('status', 'active')

//                 if (junctionProductIds.length > 0) {
//                     query = query.or(`category_id.eq.${catData.id},id.in.(${junctionProductIds.join(',')})`)
//                 } else {
//                     query = query.eq('category_id', catData.id)
//                 }

//                 const { data: prodData, error: prodError } = await query.order('created_at', { ascending: false })
//                 if (prodError) throw prodError
//                 setProducts(prodData || [])

//             } catch (e: any) {
//                 setError(e.message)
//             } finally {
//                 setLoading(false)
//             }
//         }

//         fetchContent()
//     }, [slug, supabase])

//     // --- SHARED NAV COMPONENT (Eliminates Flickering) ---
//     const StickyNav = ({ isDataLoaded }: { isDataLoaded: boolean }) => (
//         <nav className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-slate-100">
//             <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center px-4 h-auto sm:h-14 py-3 sm:py-0">

//                 {/* Breadcrumb Area */}
//                 <div className="flex items-center gap-2 mb-3 sm:mb-0 sm:mr-8 flex-shrink-0">
//                     <Link href="/exclusive" className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-black transition-colors">
//                         Hub
//                     </Link>
//                     <ChevronRight className="w-3 h-3 text-slate-200" />
//                     {isDataLoaded ? (
//                         <span className="text-[9px] font-black uppercase tracking-widest text-slate-900 truncate max-w-[150px]">
//                             {category?.name}
//                         </span>
//                     ) : (
//                         <div className="w-16 h-2 bg-slate-100 animate-pulse rounded" />
//                     )}
//                 </div>

//                 {/* Pill Navigation Area */}
//                 <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0 touch-pan-x">
//                     {siblingCategories.length > 0 ? (
//                         siblingCategories.map((sib) => {
//                             const isActive = sib.slug === slug;
//                             return (
//                                 <Link
//                                     key={sib.slug}
//                                     href={`/exclusive/${sib.slug}`}
//                                     className={`
//                                         text-[9px] font-black uppercase tracking-[0.15em] px-4 py-2 rounded-full 
//                                         whitespace-nowrap transition-all duration-300 border
//                                         ${isActive
//                                             ? 'bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-200'
//                                             : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-300'}
//                                     `}
//                                 >
//                                     {sib.name}
//                                 </Link>
//                             )
//                         })
//                     ) : (
//                         // Skeleton pills for loading state
//                         [1, 2, 3, 4].map((i) => (
//                             <div key={i} className="w-20 h-8 bg-slate-50 border border-slate-100 rounded-full animate-pulse flex-shrink-0" />
//                         ))
//                     )}
//                 </div>
//             </div>
//         </nav>
//     )

//     if (loading) return (
//         <div className="min-h-screen bg-white">
//             <StickyNav isDataLoaded={false} />
//             <main className="max-w-7xl mx-auto px-6 pt-12">
//                 {/* MATCHED 9XL SKELETON HEADER */}
//                 <header className="mb-20 animate-pulse">
//                     <div className="w-full md:w-3/4 h-24 md:h-32 bg-slate-50 rounded-sm mb-4" />
//                 </header>

//                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-12">
//                     {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
//                         <div key={i} className="space-y-4 animate-pulse">
//                             <div className="aspect-[3/4] bg-slate-50 rounded-sm border border-slate-50" />
//                             <div className="space-y-3">
//                                 <div className="w-full h-3 bg-slate-100 rounded" />
//                                 <div className="w-2/3 h-3 bg-slate-50 rounded" />
//                             </div>
//                         </div>
//                     ))}
//                 </div>
//             </main>
//         </div>
//     )

//     return (
//         <div className="min-h-screen bg-white text-slate-900 pb-32">
//             <StickyNav isDataLoaded={true} />

//             <main className="max-w-7xl mx-auto px-6 pt-12">
//                 {error ? (
//                     <div className="p-8 bg-rose-50 rounded-[2rem] border border-rose-100 flex flex-col items-center text-center gap-3">
//                         <AlertCircle className="w-8 h-8 text-rose-500 stroke-[1.5]" />
//                         <h2 className="text-sm font-black uppercase tracking-tighter text-rose-900">System Error</h2>
//                         <p className="text-xs text-rose-600/80 font-medium uppercase tracking-widest leading-relaxed">{error}</p>
//                     </div>
//                 ) : (
//                     <>
//                         <header className="mb-20">
//                             <h1 className="text-6xl md:text-9xl font-black uppercase tracking-tighter leading-none mb-6">
//                                 {category?.name}<span className="text-slate-100">_</span>
//                             </h1>
//                         </header>

//                         {products.length > 0 ? (
//                             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-12 animate-in fade-in duration-700">
//                                 {products.map((product) => (
//                                     <ProductCard key={product.id} product={product} />
//                                 ))}
//                             </div>
//                         ) : (
//                             <div className="py-40 text-center border-2 border-dashed border-slate-100 rounded-[3rem] bg-slate-50/30">
//                                 <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">
//                                     Archive Empty for "{category?.name}"
//                                 </p>
//                             </div>
//                         )}
//                     </>
//                 )}
//             </main>

//             {/* DECORATIVE BOTTOM SCANLINE */}
//             <div className="fixed bottom-0 left-0 w-full h-[1px] bg-slate-100 overflow-hidden">
//                 <div className="w-full h-full bg-slate-900 animate-[scan_2s_linear_infinite]" />
//             </div>
//         </div>
//     )
// }

"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { AlertCircle, ChevronRight, Sparkles, LayoutGrid } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { ProductCard } from "@/components/store/product-card"
import { motion, AnimatePresence } from "framer-motion"

export default function EssentialCategoryPage() {
    const { slug } = useParams()
    const [category, setCategory] = React.useState<any>(null)
    const [siblingCategories, setSiblingCategories] = React.useState<any[]>([])
    const [products, setProducts] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState<string | null>(null)

    const supabase = createClient()

    React.useEffect(() => {
        async function fetchContent() {
            if (!slug) return
            setLoading(true)
            setError(null)

            try {
                const { data: catData, error: catError } = await supabase
                    .from('categories')
                    .select('id, name, slug, parent_id')
                    .eq('slug', slug)
                    .single()

                if (catError) throw catError
                setCategory(catData)

                if (catData.parent_id) {
                    const { data: siblings } = await supabase
                        .from('categories')
                        .select('name, slug, image_url')
                        .eq('parent_id', catData.parent_id)

                    if (siblings) setSiblingCategories(siblings)
                }

                const { data: junctionData } = await supabase
                    .from('product_categories')
                    .select('product_id')
                    .eq('category_id', catData.id)

                const junctionProductIds = junctionData?.map(j => j.product_id) || []

                let query = supabase
                    .from('products')
                    .select('*, product_variants(*)')
                    .eq('status', 'active')

                if (junctionProductIds.length > 0) {
                    query = query.or(`category_id.eq.${catData.id},id.in.(${junctionProductIds.join(',')})`)
                } else {
                    query = query.eq('category_id', catData.id)
                }

                const { data: prodData, error: prodError } = await query.order('created_at', { ascending: false })
                if (prodError) throw prodError
                setProducts(prodData || [])

            } catch (e: any) {
                setError(e.message)
            } finally {
                // Keep your specific loading timing
                setTimeout(() => setLoading(false), 100)
            }
        }

        fetchContent()
    }, [slug, supabase])

    // --- NYKAA STYLE STORY NAV ---
    const StickyNav = ({ isDataLoaded }: { isDataLoaded: boolean }) => (
        <nav className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-xl border-b border-pink-50">
            <div className="max-w-7xl mx-auto px-4 py-4">
                <div className="flex items-center gap-2 mb-4">
                    <Link href="/essentials" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-[#fc2779]">
                        Essentials
                    </Link>
                    <ChevronRight className="w-3 h-3 text-slate-300" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#fc2779]">
                        {isDataLoaded ? category?.name : '...'}
                    </span>
                </div>

                <div className="flex items-center gap-6 overflow-x-auto no-scrollbar touch-pan-x pb-2">
                    {isDataLoaded ? (
                        siblingCategories.map((sib) => {
                            const isActive = sib.slug === slug;
                            return (
                                <Link
                                    key={sib.slug}
                                    href={`/essentials/${sib.slug}`}
                                    className="flex flex-col items-center gap-2 shrink-0 group"
                                >
                                    <div className={`w-14 h-14 rounded-full p-[2px] transition-all duration-500 ${isActive ? 'bg-[#fc2779]' : 'bg-slate-100 group-hover:bg-pink-200'}`}>
                                        <div className="w-full h-full rounded-full border-2 border-white bg-white overflow-hidden flex items-center justify-center">
                                            {sib.image_url ? (
                                                <img src={sib.image_url} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                                <span className="text-[10px] font-black text-slate-300 uppercase">{sib.name[0]}</span>
                                            )}
                                        </div>
                                    </div>
                                    <span className={`text-[9px] font-bold uppercase tracking-tighter transition-colors ${isActive ? 'text-[#fc2779]' : 'text-slate-500'}`}>
                                        {sib.name}
                                    </span>
                                </Link>
                            )
                        })
                    ) : (
                        // Navigation Skeletons
                        [1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex flex-col items-center gap-2 animate-pulse">
                                <div className="w-14 h-14 rounded-full bg-slate-100" />
                                <div className="w-10 h-2 bg-slate-50 rounded" />
                            </div>
                        ))
                    )}
                </div>
            </div>
        </nav>
    )

    return (
        <div className="min-h-screen bg-[#FDFDFD] text-slate-900 pb-20">
            {/* 1. YOUR ORIGINAL LOADING OVERLAY (Nykaa Pink Edition) */}
            <AnimatePresence mode="wait">
                {loading && (
                    <motion.div
                        key="loader"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center"
                    >
                        <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-[#fc2779] mb-2">
                            The Makeup Store
                        </h2>
                        <motion.div
                            animate={{ width: ["0%", "40%", "0%"] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="h-[1.5px] bg-[#fc2779]"
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {!loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <StickyNav isDataLoaded={true} />

                    <main className="max-w-7xl mx-auto px-6 pt-12">
                        {error ? (
                            <div className="p-10 bg-pink-50 rounded-[3rem] border border-pink-100 flex flex-col items-center text-center gap-4">
                                <AlertCircle className="w-10 h-10 text-[#fc2779]" />
                                <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">Connection Error</h2>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{error}</p>
                            </div>
                        ) : (
                            <>
                                <header className="mb-16">
                                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-[#fc2779]">
                                                <Sparkles className="w-4 h-4 fill-[#fc2779]" />
                                                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Essential Selection</span>
                                            </div>
                                            <h1 className="text-5xl md:text-7xl font-serif italic text-slate-950 leading-none tracking-tighter">
                                                {category?.name}
                                            </h1>
                                        </div>
                                        <div className="flex items-center gap-3 bg-white px-5 py-2.5 rounded-full border border-slate-100 shadow-sm">
                                            <LayoutGrid className="w-4 h-4 text-slate-300" />
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                {products.length} Products
                                            </span>
                                        </div>
                                    </div>
                                    <div className="h-1.5 w-24 bg-[#fc2779] rounded-full mt-8 opacity-80" />
                                </header>

                                {products.length > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-12">
                                        {products.map((product) => (
                                            <div key={product.id} className="hover:-translate-y-1 transition-all duration-500">
                                                <ProductCard product={product} />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-40 text-center border-2 border-dashed border-pink-100 rounded-[3.5rem] bg-white shadow-inner">
                                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">
                                            Catalogue Restocking Soon
                                        </p>
                                    </div>
                                )}
                            </>
                        )}
                    </main>
                </motion.div>
            )}
        </div>
    )
}