

"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Trash2, ShoppingBag, ArrowRight } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { ProductCard } from "@/components/store/product-card"
import { Breadcrumbs } from "@/components/store/breadcrumbs"
import Link from "next/link"

export default function WishlistPage() {
    const [items, setItems] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(true)
    const supabase = createClient()

    const fetchWishlist = React.useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
            .from('wishlist')
            .select(`id, product:products (*, product_variants (*))`)
            .eq('user_id', user.id)

        if (data) {
            setItems(data.map(item => ({
                ...item.product,
                wishlist_id: item.id
            })))
        }

        // Small delay to match the Profile loading feel
        setTimeout(() => setLoading(false), 800)
    }, [supabase])

    const handleRemove = async (wishlistId: string) => {
        setItems(prev => prev.filter(item => item.wishlist_id !== wishlistId))
        const { error } = await supabase
            .from('wishlist')
            .delete()
            .eq('id', wishlistId)

        if (!error) {
            window.dispatchEvent(new CustomEvent("wishlist-sync", {
                detail: { count: items.length - 1 }
            }))
        } else {
            fetchWishlist()
        }
    }

    React.useEffect(() => { fetchWishlist() }, [fetchWishlist])

    return (
        <div className="relative min-h-screen bg-white">
            {/* 1. EDITORIAL LOADING SCREEN */}
            <AnimatePresence mode="wait">
                {loading && (
                    <motion.div
                        key="loader"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center"
                    >
                        <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-900 mb-2">The Makeup Store</h2>
                        <motion.div
                            animate={{ width: ["0%", "40%", "0%"] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="h-[1px] bg-slate-900"
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 2. MAIN CONTENT */}
            {!loading && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="max-w-7xl mx-auto px-6 pt-8 pb-8"
                >
                    <Breadcrumbs items={[{ label: 'Profile', href: '/profile' }, { label: 'My Wishlist', href: '/profile/wishlist' }]} />
                    <header className="mb-12">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-2">Your Curated List</p>
                        <h1 className="text-3xl font-black  tracking-tighter uppercase text-slate-900 leading-none">Wishlist</h1>
                    </header>

                    {items.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-0 gap-y-0">
                            <AnimatePresence mode="popLayout">
                                {items.map((product) => (
                                    <motion.div
                                        key={product.wishlist_id}
                                        layout
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
                                        className="relative group"
                                    >
                                        <ProductCard product={product} />
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                handleRemove(product.wishlist_id)
                                            }}
                                            className="absolute top-3 right-3 z-30 p-2.5 bg-white/90 backdrop-blur-md rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all border border-zinc-100 text-red-500 hover:bg-red-50"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    ) : (
                        /* 3. EMPTY STATE: EXPLORE COLLECTION */
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center justify-center py-32 text-center"
                        >
                            <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mb-6">
                                <ShoppingBag className="w-8 h-8 text-zinc-200" />
                            </div>
                            <h2 className="text-2xl font-serif italic uppercase tracking-tighter text-slate-900 mb-2">Your collection is empty</h2>
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-10 max-w-[200px] leading-loose">
                                Save your favorite beauty essentials here for later.
                            </p>

                            <Link
                                href="/shop"
                                className="group flex items-center gap-4 bg-slate-900 text-white px-10 py-5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                            >
                                Explore Collection
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </motion.div>
                    )}
                </motion.div>
            )}
        </div>
    )
}
