"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Trash2, ShoppingBag, Heart, Share2 } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { ProductCard } from "@/components/store/product-card"
import { useCart } from "@/components/store/use-cart"
import Link from "next/link"
import { Capacitor } from "@capacitor/core"
import { Share } from "@capacitor/share"

export default function WishlistPage() {
    const [items, setItems] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(true)
    const [user, setUser] = React.useState<any>(null)
    const supabase = createClient()
    const cartItems = useCart((s) => s.items)

    React.useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }: any) => setUser(user))
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
            setItems(data.map((item: any) => ({
                ...item.product,
                wishlist_id: item.id
            })))
        }

        setLoading(false)
    }, [supabase])

    React.useEffect(() => { fetchWishlist() }, [fetchWishlist])

    React.useEffect(() => {
        const handler = () => fetchWishlist()
        window.addEventListener("wishlist-updated", handler)
        return () => window.removeEventListener("wishlist-updated", handler)
    }, [fetchWishlist])

    const handleRemove = async (wishlistId: string) => {
        setItems(prev => prev.filter(item => item.wishlist_id !== wishlistId))
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        await supabase
            .from('wishlist')
            .delete()
            .eq('id', wishlistId)
            .eq('user_id', user.id)
        window.dispatchEvent(new CustomEvent("wishlist-updated"))
    }

    const isInCart = (productId: string) => cartItems.some(i => i.productId === productId)

    const handleShare = async () => {
        const text = items
            .map((item, i) => `${i + 1}. ${item.name}${item.brand ? ` by ${item.brand}` : ''} — ₹${Math.round(Number(item.base_price || item.product_variants?.[0]?.price || 0))}`)
            .join('\n')

        if (Capacitor.isNativePlatform()) {
            await Share.share({ title: 'My Makeup Store Wishlist', text })
        } else if (navigator.share) {
            navigator.share({ title: 'My Makeup Store Wishlist', text })
        } else {
            navigator.clipboard.writeText(text)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-white">
                <div className="max-w-7xl mx-auto px-4 pt-6 pb-8">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse" />
                        <div className="h-6 w-28 bg-gray-100 rounded animate-pulse" />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="aspect-[3/4] bg-gray-50 rounded-xl animate-pulse" />
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center px-8 pb-24">
                <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mb-6">
                    <Heart className="w-7 h-7 text-rose-400" />
                </div>
                <h1 className="text-xl font-bold text-gray-900 mb-2">Your Wishlist is Private</h1>
                <p className="text-sm text-gray-400 text-center max-w-[260px] mb-8 leading-relaxed">
                    Sign in to view and share your saved items.
                </p>
                <Link
                    href="/login"
                    className="bg-gray-900 text-white px-10 py-3.5 rounded-full text-[11px] font-bold uppercase tracking-widest hover:bg-gray-800 transition-all"
                >
                    SIGN IN
                </Link>
            </div>
        )
    }

    if (items.length === 0) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center px-8 pb-24">
                <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mb-6">
                    <Heart className="w-7 h-7 text-rose-400" />
                </div>
                <h1 className="text-xl font-bold text-gray-900 mb-2">Nothing saved yet</h1>
                <p className="text-sm text-gray-400 text-center max-w-[260px] mb-8 leading-relaxed">
                    Tap the heart on any product to save it here.
                </p>
                <Link
                    href="/shop"
                    className="bg-gray-900 text-white px-10 py-3.5 rounded-full text-[11px] font-bold uppercase tracking-widest hover:bg-gray-800 transition-all"
                >
                    DISCOVER BEAUTY
                </Link>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white pb-12">
            <div className="max-w-7xl mx-auto px-4 pt-4 pb-8">
                {/* HEADER */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-lg font-bold text-gray-900">Wishlist</h1>
                        <p className="text-xs text-gray-400">{items.length} item{items.length !== 1 ? 's' : ''}</p>
                    </div>
                    <button
                        onClick={handleShare}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                        <Share2 className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-xs font-medium text-gray-600">Share</span>
                    </button>
                </div>

                {/* GRID */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <AnimatePresence mode="popLayout">
                        {items.map((product) => {
                            const inBag = isInCart(product.id)
                            return (
                                <motion.div
                                    key={product.wishlist_id}
                                    layout
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="relative group"
                                >
                                    <ProductCard product={product} />
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            handleRemove(product.wishlist_id)
                                        }}
                                        className="absolute top-2 right-2 z-30 w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-white shadow-sm border border-gray-200"
                                    >
                                        <Trash2 className="w-3.5 h-3.5 text-gray-500" />
                                    </button>
                                    {inBag && (
                                        <div className="absolute top-2 left-2 z-20 flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500">
                                            <ShoppingBag className="w-2.5 h-2.5 text-white" />
                                            <span className="text-[7px] font-bold text-white uppercase tracking-wider">IN BAG</span>
                                        </div>
                                    )}
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}
