"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { AlertCircle, ChevronRight } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { ProductCard } from "@/components/store/product-card"

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
                        .select('name, slug')
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
                setLoading(false)
            }
        }

        fetchContent()
    }, [slug, supabase])

    // --- SHARED NAV COMPONENT (Eliminates Flickering) ---
    const StickyNav = ({ isDataLoaded }: { isDataLoaded: boolean }) => (
        <nav className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-slate-100">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center px-4 h-auto sm:h-14 py-3 sm:py-0">

                {/* Breadcrumb Area */}
                <div className="flex items-center gap-2 mb-3 sm:mb-0 sm:mr-8 flex-shrink-0">
                    <Link href="/exclusive" className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-black transition-colors">
                        Hub
                    </Link>
                    <ChevronRight className="w-3 h-3 text-slate-200" />
                    {isDataLoaded ? (
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-900 truncate max-w-[150px]">
                            {category?.name}
                        </span>
                    ) : (
                        <div className="w-16 h-2 bg-slate-100 animate-pulse rounded" />
                    )}
                </div>

                {/* Pill Navigation Area */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0 touch-pan-x">
                    {siblingCategories.length > 0 ? (
                        siblingCategories.map((sib) => {
                            const isActive = sib.slug === slug;
                            return (
                                <Link
                                    key={sib.slug}
                                    href={`/exclusive/${sib.slug}`}
                                    className={`
                                        text-[9px] font-black uppercase tracking-[0.15em] px-4 py-2 rounded-full 
                                        whitespace-nowrap transition-all duration-300 border
                                        ${isActive
                                            ? 'bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-200'
                                            : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-300'}
                                    `}
                                >
                                    {sib.name}
                                </Link>
                            )
                        })
                    ) : (
                        // Skeleton pills for loading state
                        [1, 2, 3, 4].map((i) => (
                            <div key={i} className="w-20 h-8 bg-slate-50 border border-slate-100 rounded-full animate-pulse flex-shrink-0" />
                        ))
                    )}
                </div>
            </div>
        </nav>
    )

    if (loading) return (
        <div className="min-h-screen bg-white">
            <StickyNav isDataLoaded={false} />
            <main className="max-w-7xl mx-auto px-6 pt-12">
                {/* MATCHED 9XL SKELETON HEADER */}
                <header className="mb-20 animate-pulse">
                    <div className="w-full md:w-3/4 h-24 md:h-32 bg-slate-50 rounded-sm mb-4" />
                </header>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-12">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <div key={i} className="space-y-4 animate-pulse">
                            <div className="aspect-[3/4] bg-slate-50 rounded-sm border border-slate-50" />
                            <div className="space-y-3">
                                <div className="w-full h-3 bg-slate-100 rounded" />
                                <div className="w-2/3 h-3 bg-slate-50 rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    )

    return (
        <div className="min-h-screen bg-white text-slate-900 pb-32">
            <StickyNav isDataLoaded={true} />

            <main className="max-w-7xl mx-auto px-6 pt-12">
                {error ? (
                    <div className="p-8 bg-rose-50 rounded-[2rem] border border-rose-100 flex flex-col items-center text-center gap-3">
                        <AlertCircle className="w-8 h-8 text-rose-500 stroke-[1.5]" />
                        <h2 className="text-sm font-black uppercase tracking-tighter text-rose-900">System Error</h2>
                        <p className="text-xs text-rose-600/80 font-medium uppercase tracking-widest leading-relaxed">{error}</p>
                    </div>
                ) : (
                    <>
                        <header className="mb-20">
                            <h1 className="text-6xl md:text-9xl font-black uppercase tracking-tighter leading-none mb-6">
                                {category?.name}<span className="text-slate-100">_</span>
                            </h1>
                        </header>

                        {products.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-12 animate-in fade-in duration-700">
                                {products.map((product) => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        ) : (
                            <div className="py-40 text-center border-2 border-dashed border-slate-100 rounded-[3rem] bg-slate-50/30">
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">
                                    Archive Empty for "{category?.name}"
                                </p>
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* DECORATIVE BOTTOM SCANLINE */}
            <div className="fixed bottom-0 left-0 w-full h-[1px] bg-slate-100 overflow-hidden">
                <div className="w-full h-full bg-slate-900 animate-[scan_2s_linear_infinite]" />
            </div>
        </div>
    )
}