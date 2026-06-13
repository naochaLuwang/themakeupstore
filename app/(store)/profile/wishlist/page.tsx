"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Trash2, ShoppingBag, Heart, Share2, ChevronLeft } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { ProductCard } from "@/components/store/product-card"
import { useCart } from "@/components/store/use-cart"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function WishlistPage() {
    const [items, setItems] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(true)
    const [user, setUser] = React.useState<any>(null)
    const supabase = createClient()
    const router = useRouter()
    const cartItems = useCart((s) => s.items)

    React.useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    }, [supabase])

    const fetchWishlist = React.useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            setLoading(false)
            return
        }

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

        setTimeout(() => setLoading(false), 600)
    }, [supabase])

    React.useEffect(() => { fetchWishlist() }, [fetchWishlist])

    const handleRemove = async (wishlistId: string) => {
        setItems(prev => prev.filter(item => item.wishlist_id !== wishlistId))
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { error } = await supabase
            .from('wishlist')
            .delete()
            .eq('id', wishlistId)
            .eq('user_id', user.id)

        if (!error) {
            window.dispatchEvent(new CustomEvent("wishlist-sync", {
                detail: { count: items.length - 1 }
            }))
        } else {
            fetchWishlist()
        }
    }

    const isInCart = (productId: string) => cartItems.some(i => i.productId === productId)

    const handleShare = async () => {
        const text = items
            .map((item, i) => `${i + 1}. ${item.name}${item.brand ? ` by ${item.brand}` : ''} — ₹${Math.round(Number(item.base_price || item.product_variants?.[0]?.price || 0))}`)
            .join('\n')

        if (navigator.share) {
            navigator.share({ title: 'My Makeup Store Wishlist', text })
        } else {
            navigator.clipboard.writeText(text)
        }
    }

    return (
        <div className="min-h-screen bg-[#F8F8F8] pb-12">
            {/* LOADER */}
            <AnimatePresence mode="wait">
                {loading && (
                    <motion.div
                        key="loader"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
                        className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center"
                    >
                        <span
                            className="text-[80px] font-daciana leading-none select-none bg-clip-text text-transparent"
                            style={{
                                backgroundImage: "linear-gradient(90deg, #000 0%, #000 30%, #888 50%, #000 70%, #000 100%)",
                                backgroundSize: "200% 100%",
                                animation: "shimmer 2s ease-in-out infinite",
                            }}
                        >
                            M
                        </span>
                        <style>{`
                            @keyframes shimmer {
                                0% { background-position: 200% 0; }
                                100% { background-position: -200% 0; }
                            }
                        `}</style>
                    </motion.div>
                )}
            </AnimatePresence>

            {!loading && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    {/* UNAUTHENTICATED */}
                    {!user && (
                        <div className="flex flex-col items-center justify-center min-h-screen px-8 pb-24">
                            <div className="w-20 h-20 rounded-full bg-[#fc2779]/10 flex items-center justify-center mb-8">
                                <Heart className="w-9 h-9 text-[#fc2779]" />
                            </div>
                            <h1 className="text-2xl font-black tracking-tight text-slate-900 text-center mb-2">
                                Your Wishlist is Private
                            </h1>
                            <p className="text-sm text-slate-400 text-center max-w-[280px] leading-relaxed mb-10">
                                Sign in to view and share your saved beauty items.
                            </p>
                            <Link
                                href="/login"
                                className="bg-slate-900 text-white px-10 py-4 rounded-full text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                            >
                                SIGN IN
                            </Link>
                        </div>
                    )}

                    {/* AUTHENTICATED — EMPTY */}
                    {user && items.length === 0 && (
                        <div className="flex flex-col items-center justify-center min-h-screen px-8 pb-24">
                            <div className="w-20 h-20 rounded-full bg-[#fc2779]/10 flex items-center justify-center mb-8">
                                <Heart className="w-9 h-9 text-[#fc2779]" />
                            </div>
                            <h1 className="text-2xl font-black tracking-tight text-slate-900 text-center mb-2">
                                Nothing saved yet
                            </h1>
                            <p className="text-sm text-slate-400 text-center max-w-[280px] leading-relaxed mb-10">
                                Tap the heart on any product to add it to your wishlist.
                            </p>
                            <Link
                                href="/shop"
                                className="bg-slate-900 text-white px-10 py-4 rounded-full text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                            >
                                DISCOVER BEAUTY
                            </Link>
                        </div>
                    )}

                    {/* AUTHENTICATED — POPULATED */}
                    {user && items.length > 0 && (
                        <div className="max-w-7xl mx-auto px-6 pt-10 pb-8">
                            {/* HEADER */}
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => router.push('/profile')}
                                        className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-100 hover:bg-slate-50 transition-all"
                                    >
                                        <ChevronLeft className="w-5 h-5 text-slate-700" />
                                    </button>
                                    <h1 className="text-2xl font-black tracking-tight text-slate-900">
                                        Saved for later
                                    </h1>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleShare}
                                        className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-100 hover:bg-[#fc2779]/5 hover:border-[#fc2779]/20 transition-all"
                                    >
                                        <Share2 className="w-4 h-4 text-slate-500" />
                                    </button>
                                    <span className="text-sm font-semibold text-slate-400">
                                        {items.length} item{items.length !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            </div>

                            {/* GRID */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-0 gap-y-0">
                                <AnimatePresence mode="popLayout">
                                    {items.map((product) => {
                                        const inBag = isInCart(product.id)
                                        return (
                                            <motion.div
                                                key={product.wishlist_id}
                                                layout
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
                                                className="relative group"
                                            >
                                                <ProductCard product={product} />
                                                {/* X REMOVE BUTTON */}
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault()
                                                        e.stopPropagation()
                                                        handleRemove(product.wishlist_id)
                                                    }}
                                                    className="absolute top-2 right-2 z-30 w-6 h-6 rounded-full bg-black/45 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-black/60"
                                                >
                                                    <Trash2 className="w-3 h-3 text-white" />
                                                </button>
                                                {/* IN BAG BADGE */}
                                                {inBag && (
                                                    <div className="absolute top-2 right-2 z-20 flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#fc2779]">
                                                        <ShoppingBag className="w-2.5 h-2.5 text-white" />
                                                        <span className="text-[7px] font-black text-white uppercase tracking-wider">IN BAG</span>
                                                    </div>
                                                )}
                                            </motion.div>
                                        )
                                    })}
                                </AnimatePresence>
                            </div>
                        </div>
                    )}
                </motion.div>
            )}
        </div>
    )
}
