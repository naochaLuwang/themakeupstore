"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, ShoppingBag } from "lucide-react"
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
            <Loader2 className="w-5 h-5 animate-spin text-slate-200" />
        </div>
    )

    return (
        <div className="min-h-screen bg-white text-slate-900 pb-32">
            <main className="max-w-6xl mx-auto px-6 pt-10 md:pt-10">

                {/* MINIMAL TITLE SECTION */}
                <header className="mb-5 flex flex-col md:flex-row md:items-baseline justify-between gap-4 border-b border-slate-50 pb-10">
                    <div className="space-y-2">
                        <h1 className="text-4xl md:text-5xl font-serif italic tracking-tight">
                            The Wishlist
                        </h1>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
                            Saved Pieces
                        </p>
                    </div>
                    <div className="text-[10px] font-medium text-slate-300 uppercase tracking-widest">
                        Total {items.length} items
                    </div>
                </header>

                {/* PRODUCT GRID */}
                {items.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-16">
                        <AnimatePresence mode="popLayout">
                            {items.map((product) => (
                                <motion.div
                                    key={product.id}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                                >
                                    <ProductCard product={product} />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                ) : (
                    /* CLEAN EMPTY STATE */
                    <div className="py-20 flex flex-col items-start max-w-sm">
                        <p className="text-2xl font-serif italic text-slate-300 leading-relaxed mb-8">
                            Your curated archive is currently empty. Start selecting pieces to build your edit.
                        </p>
                        <Link
                            href="/shop"
                            className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900 border-b border-slate-900 pb-1 hover:text-indigo-600 hover:border-indigo-600 transition-all"
                        >
                            Return to Shop
                        </Link>
                    </div>
                )}
            </main>
        </div>
    )
}