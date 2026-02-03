

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
                setAllProducts(products || [])
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
                        The <span className="font-serif italic">Exclusive</span> Edit
                    </h1>
                </header>

                {/* CATEGORIES */}
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
                                    <span className="text-[10px] text-slate-300 group-hover:translate-x-1 transition-transform">→</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>


                {/* <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mb-24"
                >
                    <div className="relative overflow-hidden bg-slate-900 rounded-2xl p-8 md:p-12 text-white shadow-2xl shadow-slate-200">
                        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl" />

                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
                            <div className="space-y-6 text-center md:text-left">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full backdrop-blur-md">
                                    <Smartphone className="w-3 h-3 text-slate-300" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-200">
                                        {isInstalled ? "Premium Access" : "App Exclusive"}
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    <h2 className="text-3xl md:text-4xl font-light tracking-tight leading-tight">
                                        Get <span className="font-serif italic text-slate-300">10% OFF</span> your first
                                        <br className="hidden md:block" /> in-app purchase
                                    </h2>
                                    <p className="text-slate-400 text-sm font-light max-w-sm">
                                        {isInstalled
                                            ? "Thank you for using our app. Enjoy your exclusive rewards."
                                            : "Experience faster checkout and early access to limited collections."}
                                    </p>
                                </div>

                           
                                <button
                                    onClick={() => copyToClipboard("APP10")}
                                    className="group flex items-center gap-4 bg-white/5 border border-white/10 p-2 pr-6 rounded-full hover:bg-white/10 transition-all active:scale-95"
                                >
                                    <div className="bg-white text-slate-900 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                        APP10
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-white">
                                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                        {copied ? "Copied" : "Copy Code"}
                                    </div>
                                </button>
                            </div>

                         
                            <div className="flex-shrink-0">
                                {isInstalled ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20 mb-2">
                                            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400/80">
                                            App Active
                                        </span>
                                    </div>
                                ) : deferredPrompt ? (
                                    <button
                                        onClick={handleInstallClick}
                                        className="flex items-center gap-3 px-10 py-5 bg-white text-slate-900 text-[11px] font-black uppercase tracking-[0.2em] hover:bg-slate-100 transition-all rounded-full shadow-xl active:scale-95"
                                    >
                                        <Download className="w-4 h-4" />
                                        Install Now
                                    </button>
                                ) : (
                                    <div className="text-center md:text-right space-y-1 opacity-40">
                                        <p className="text-[9px] uppercase tracking-widest font-bold">Add to Home Screen</p>
                                        <p className="text-[8px] italic font-light">Available on Chrome & Safari</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.section> */}

                {/* GALLERY */}
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