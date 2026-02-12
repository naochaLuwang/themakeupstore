

"use client"

import * as React from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
    Loader2,
    Minus,
    Smartphone,
    Download,
    CheckCircle2,
    Copy,
    Check
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { ProductCard } from "@/components/store/product-card"
import { toast } from "sonner"

export default function ExclusivePage() {
    const [subcategories, setSubcategories] = React.useState<any[]>([])
    const [allProducts, setAllProducts] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(true)



    const supabase = createClient()




    // 2. DATA FETCHING
    React.useEffect(() => {
        async function getData() {
            try {
                setLoading(true)

                // Fetch Parent
                const { data: parent } = await supabase
                    .from('categories')
                    .select('id, name, slug')
                    .eq('slug', 'exclusive')
                    .single()

                if (!parent) return

                // Fetch Subs
                const { data: subs } = await supabase
                    .from('categories')
                    .select('id, name, slug, image_url')
                    .eq('parent_id', parent.id)
                    .order('name', { ascending: true })

                if (subs) setSubcategories(subs)

                const categoryIds = [parent.id, ...(subs?.map(s => s.id) || [])]

                // Fetch Junction Links
                const { data: junction } = await supabase
                    .from('product_categories')
                    .select('product_id')
                    .in('category_id', categoryIds)

                const linkedProductIds = junction?.map(j => j.product_id) || []

                // Fetch Products with Variants
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
                    // If the direct category_id is null, we assign the parent category ID 
                    // to ensure promos recognize it as part of this collection
                    category_id: product.category_id || parent.id
                }))
                setAllProducts(processedProducts || [])
            } catch (e) {
                console.error("Fetch Error:", e)
            } finally {
                setLoading(false)
            }
        }
        getData()
    }, [supabase])

    if (loading) return (
        <div className="min-h-screen bg-white">
            <main className="max-w-6xl mx-auto px-6 pt-6 md:pt-16">
                <header className="mb-10 animate-pulse">
                    <div className="w-24 h-2 bg-slate-100 rounded mb-4" />
                    <div className="w-64 h-12 bg-slate-50 rounded" />
                </header>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-24">
                    {[1, 2, 3, 4, 5].map(i => <div key={i} className="aspect-square bg-slate-50 animate-pulse" />)}
                </div>
            </main>
        </div>
    )

    return (
        <div className="min-h-screen bg-white text-slate-900 pb-20">
            <main className="max-w-6xl mx-auto px-6 pt-6 md:pt-16">

                {/* HERO */}
                <header className="mb-10">
                    <div className="flex items-center gap-2 mb-3">
                        <Minus className="w-4 h-4 text-slate-300" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">
                            Collection
                        </span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-light tracking-tight text-slate-900">
                        <span className="font-serif text-black">Exclusive</span> Selection
                    </h1>
                </header>

                {/* CATEGORIES */}
                <section className="mb-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {subcategories.map((cat) => (
                            <Link key={cat.id} href={`/exclusive/${cat.slug}`} className="group block">
                                <div className="relative aspect-square overflow-hidden bg-slate-50 border border-slate-100 transition-all duration-500 group-hover:border-slate-300">
                                    <div
                                        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                                        style={{ backgroundImage: `url(${cat.image_url || '/api/placeholder/400/400'})` }}
                                    />
                                </div>
                                <div className="mt-3 flex items-center justify-between">
                                    <span className="text-[10px] text-slate-300 group-hover:translate-x-1 transition-transform">→</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>


                {/* GALLERY */}
                <section>
                    <div className="flex items-center justify-between mb-10 border-b border-slate-100 pb-4">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
                            The Exclusive Collections
                        </h2>
                        <span className="text-[10px] font-medium text-slate-600">
                            {allProducts.length} Items
                        </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10">
                        {allProducts.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                </section>
            </main>
        </div>
    )
}
