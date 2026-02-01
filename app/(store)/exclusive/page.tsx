"use client"

import * as React from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Loader2, Minus } from "lucide-react"
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
                console.log("🛠️ DEBUG START: Fetching Exclusive Edit")

                // 1. Check Parent Category
                const { data: parent, error: pError } = await supabase
                    .from('categories')
                    .select('id, name, slug')
                    .eq('slug', 'exclusive')
                    .single()


                if (pError) {
                    console.error("❌ Step 1 Error (Parent):", pError.message)
                    return
                }
                console.log("✅ Step 1: Found Parent Category:", parent)

                // 2. Check Subcategories
                const { data: subs, error: sError } = await supabase
                    .from('categories')
                    .select('id, name, slug, image_url')
                    .eq('parent_id', parent.id)
                    .order('name', { ascending: true })

                if (sError) console.error("❌ Step 2 Error (Subs):", sError.message)
                console.log(`✅ Step 2: Found ${subs?.length || 0} Subcategories`)
                if (subs) setSubcategories(subs)

                const categoryIds = [parent.id, ...(subs?.map(s => s.id) || [])]
                console.log("🔍 Looking for Products in Category IDs:", categoryIds)

                // 3. Check Junction Table
                const { data: junction, error: jError } = await supabase
                    .from('product_categories')
                    .select('*')
                    .in('category_id', categoryIds)

                if (jError) console.error("❌ Step 3 Error (Junction):", jError.message)
                console.log(`✅ Step 3: Junction Table returned ${junction?.length || 0} links`)

                const linkedProductIds = junction?.map(j => j.product_id) || []

                // 4. Final Product Fetch
                let query = supabase
                    .from('products')
                    .select('*, product_variants(*)')
                    .eq('status', 'active')

                if (linkedProductIds.length > 0) {
                    query = query.or(`category_id.in.(${categoryIds.join(',')}),id.in.(${linkedProductIds.join(',')})`)
                } else {
                    query = query.in('category_id', categoryIds)
                }

                const { data: products, error: prodError } = await query

                if (prodError) {
                    console.error("❌ Step 4 Error (Products):", prodError.message)
                } else {
                    console.log("📦 FINAL DATA FOUND:", products?.length, "products")
                    console.table(products?.map(p => ({ name: p.name, id: p.id, cat_id: p.category_id })))
                    setAllProducts(products || [])
                }

            } catch (e) {
                console.error("🚨 Unexpected Crash:", e)
            } finally {
                setLoading(false)
            }
        }
        getData()
    }, [supabase])

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <Loader2 className="w-5 h-5 animate-spin text-slate-200" />
        </div>
    )

    return (
        <div className="min-h-screen bg-white text-slate-900 pb-20">
            <main className="max-w-6xl mx-auto px-6 pt-6 md:pt-16">

                {/* MINIMAL HERO */}
                <header className="mb-10">
                    <div className="flex items-center gap-2 mb-3">
                        <Minus className="w-4 h-4 text-slate-300" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">
                            Collection
                        </span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-light tracking-tight text-slate-900">
                        The <span className="font-serif italic">Exclusive</span> Edit
                    </h1>
                </header>

                {/* SECTION 1: COMPACT CATEGORIES */}
                <section className="mb-24">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {subcategories.map((cat) => (
                            <Link key={cat.id} href={`/exclusive/${cat.slug}`} className="group block">
                                <div className="relative aspect-square overflow-hidden bg-slate-50 border border-slate-100 transition-all duration-500 group-hover:border-slate-300">
                                    <div
                                        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                                        style={{ backgroundImage: `url(${cat.image_url || '/api/placeholder/400/400'})` }}
                                    />
                                </div>
                                <div className="mt-3 flex items-center justify-between">
                                    {/* <h3 className="text-[13px] font-medium text-slate-700 group-hover:text-black transition-colors">
                                        {cat.name}
                                    </h3> */}
                                    <span className="text-[10px] text-slate-300 group-hover:translate-x-1 transition-transform">→</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>

                {/* SECTION 2: THE GALLERY */}
                <section>
                    <div className="flex items-center justify-between mb-10 border-b border-slate-100 pb-4">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                            The Full Archive
                        </h2>
                        <span className="text-[10px] font-medium text-slate-300">
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


