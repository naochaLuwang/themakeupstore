"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Loader2, ArrowLeft, AlertCircle, SlidersHorizontal, ChevronRight } from "lucide-react"
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
                // 1. Get the current category
                const { data: catData, error: catError } = await supabase
                    .from('categories')
                    .select('id, name, slug, parent_id')
                    .eq('slug', slug)
                    .single()

                if (catError) throw catError
                setCategory(catData)

                // 2. Fetch "Sibling" categories for the sticky nav
                // This finds all other categories under the same parent "Exclusive"
                if (catData.parent_id) {
                    const { data: siblings } = await supabase
                        .from('categories')
                        .select('name, slug')
                        .eq('parent_id', catData.parent_id)

                    if (siblings) setSiblingCategories(siblings)
                }

                // 3. Junction Table Fetch
                const { data: junctionData } = await supabase
                    .from('product_categories')
                    .select('product_id')
                    .eq('category_id', catData.id)

                const junctionProductIds = junctionData?.map(j => j.product_id) || []

                // 4. Products Query
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

if (loading) return (
    <div className="min-h-screen bg-white">
        {/* SKELETON NAV */}
        <nav className="sticky top-0 z-50 w-full bg-white border-b border-slate-100">
            <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-8 animate-pulse">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-2 bg-slate-100 rounded" />
                    <div className="w-3 h-3 bg-slate-50 rounded" />
                    <div className="w-16 h-2 bg-slate-200 rounded" />
                </div>
                <div className="flex gap-6">
                    <div className="w-12 h-2 bg-slate-100 rounded" />
                    <div className="w-12 h-2 bg-slate-100 rounded" />
                    <div className="w-12 h-2 bg-slate-100 rounded" />
                </div>
            </div>
        </nav>

        <main className="max-w-7xl mx-auto px-6 pt-12">
            {/* SKELETON HEADER */}
            <header className="mb-20 animate-pulse">
                <div className="w-full md:w-3/4 h-16 md:h-24 bg-slate-100 rounded-sm mb-4" />
                <div className="w-1/2 md:w-1/4 h-16 md:h-24 bg-slate-50 rounded-sm" />
            </header>

            {/* SKELETON GRID */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-12">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="space-y-4 animate-pulse">
                        {/* Product Image Area */}
                        <div className="aspect-[3/4] bg-slate-50 rounded-sm border border-slate-50" />
                        
                        {/* Product Meta Area */}
                        <div className="space-y-3">
                            <div className="w-full h-3 bg-slate-100 rounded" />
                            <div className="w-2/3 h-3 bg-slate-50 rounded" />
                            <div className="pt-2 flex justify-between">
                                <div className="w-12 h-2 bg-slate-100 rounded" />
                                <div className="w-8 h-2 bg-slate-50 rounded" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </main>
        
        {/* ULTRA-THIN BOTTOM SCANLINE (DECORATIVE) */}
        <div className="fixed bottom-0 left-0 w-full h-[1px] bg-slate-100 overflow-hidden">
            <div className="w-full h-full bg-slate-900 animate-[scan_2s_linear_infinite]" />
        </div>
    </div>
)

    return (
        <div className="min-h-screen bg-white text-slate-900 pb-32">

            {/* STICKY SUB-NAV */}
            <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between overflow-x-auto no-scrollbar gap-8">
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <Link href="/exclusive" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-black transition-colors">
                            Hub
                        </Link>
                        <ChevronRight className="w-3 h-3 text-slate-200" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">
                            {category?.name}
                        </span>
                    </div>

                    <div className="flex items-center gap-6 pr-4">
                        {siblingCategories.map((sib) => (
                            <Link
                                key={sib.slug}
                                href={`/exclusive/${sib.slug}`}
                                className={`text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap transition-all
                                    ${sib.slug === slug
                                        ? 'text-slate-900 border-b-2 border-slate-900 pb-1'
                                        : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {sib.name}
                            </Link>
                        ))}
                    </div>
                </div>
            </nav>

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
                            {/* <div className="flex items-center gap-6">
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">
                                    Segment Vol. {products.length}
                                </p>
                                <div className="h-px w-20 bg-slate-100" />
                            </div> */}
                        </header>

                        {products.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-12">
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
        </div>
    )
}