"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, ShoppingBag, Plus, ArrowRight, Trash2 } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { ProductCard } from "@/components/store/product-card"
import Link from "next/link"

export default function WishlistPage() {
    const [items, setItems] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(true)
    const supabase = createClient()

    const fetchWishlist = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data } = await supabase
                .from('wishlist')
                .select(`
                    id,
                    product:products (
                        *,
                        product_variants (*)
                    )
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            if (data) {
                setItems(data.map(item => item.product))
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        fetchWishlist()
    }, [])

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-6 h-6 animate-spin text-slate-900 stroke-[1.5]" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Loading Archive</span>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-white text-slate-900 pb-32">
            <main className="max-w-7xl mx-auto px-6 pt-12">

                {/* 1. SYSTEM HEADER */}
                <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="h-[2px] w-6 bg-slate-900" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Personal Archive</span>
                        </div>
                        <h1 className="text-5xl font-black tracking-tighter uppercase leading-none">
                            Wishlist<span className="text-slate-200">.</span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-8 border-t md:border-t-0 border-slate-100 pt-6 md:pt-0">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Volume</span>
                            <span className="text-xl font-bold leading-none">{items.length.toString().padStart(2, '0')}</span>
                        </div>

                    </div>
                </header>

                {/* 2. PRODUCT GRID */}
                {items.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-12">
                        <AnimatePresence mode="popLayout">
                            {items.map((product) => (
                                <motion.div
                                    key={product.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.3, ease: "circOut" }}
                                    className="group relative"
                                >
                                    <ProductCard product={product} />
                                    {/* Minimal Quick Action Overlay */}
                                    <button className="absolute top-3 right-3 p-2 bg-white rounded-lg shadow-sm border border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity active:scale-90">
                                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                    </button>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                ) : (
                    /* 3. UTILITARIAN EMPTY STATE */
                    <div className="py-32 border-2 border-dashed border-slate-100 rounded-[2rem] flex flex-col items-center text-center">
                        <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                            <ShoppingBag className="w-6 h-6 text-slate-300 stroke-[1.5]" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2 uppercase tracking-tight">Zero Items Saved</h3>
                        <p className="text-sm text-slate-500 max-w-xs mb-8">
                            Your curation is empty. Start adding pieces from our latest collection.
                        </p>
                        <Link
                            href="/shop"
                            className="flex items-center gap-3 py-4 px-8 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:shadow-xl hover:shadow-slate-200 transition-all active:scale-95"
                        >
                            Explore Shop
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                )}
            </main>
        </div>
    )
}