"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, Trash2 } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { ProductCard } from "@/components/store/product-card"

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
        setLoading(false)
    }, [supabase])

    const handleRemove = async (wishlistId: string) => {
        // Step 1: Remove from UI immediately
        setItems(prev => prev.filter(item => item.wishlist_id !== wishlistId))

        // Step 2: Delete from Database
        const { error } = await supabase
            .from('wishlist')
            .delete()
            .eq('id', wishlistId)

        if (!error) {
            // Step 3: Tell Navbar to DECREASE. 
            // We pass the new count directly so the Navbar doesn't have to guess.
            window.dispatchEvent(new CustomEvent("wishlist-sync", {
                detail: { count: items.length - 1 }
            }))
        } else {
            fetchWishlist() // Rollback on error
        }
    }

    React.useEffect(() => { fetchWishlist() }, [fetchWishlist])

    if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto" /></div>

    return (
        <div className="max-w-7xl mx-auto px-6 pt-12">
            <h1 className="text-5xl font-black mb-12 uppercase tracking-tighter">Wishlist</h1>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <AnimatePresence mode="popLayout">
                    {items.map((product) => (
                        <motion.div
                            key={product.wishlist_id}
                            layout
                            exit={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
                            className="relative group"
                        >
                            <ProductCard product={product} />
                            {/* We use the Trash button here, but styled to fit your UI */}
                            <button
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    handleRemove(product.wishlist_id)
                                }}
                                className="absolute top-4 right-4 z-50 p-2 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:bg-red-50"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    )
}