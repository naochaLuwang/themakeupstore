"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Heart, ShoppingBag } from "lucide-react"
import { createClient } from "@/utils/supabase/client"

export function ProductCard({ product }: { product: any }) {
    const [isWishlisted, setIsWishlisted] = React.useState(false)
    const [isPending, setIsPending] = React.useState(false)
    const supabase = createClient()
    const router = useRouter()

    // 1. DATA LOGIC
    const variants = product.product_variants || []
    const hasVariantsData = variants.length > 0
    const activeSource = hasVariantsData ? (variants.find((v: any) => v.is_default) || variants[0]) : product

    const originalPrice = Number(activeSource?.price ?? product.base_price ?? 0)
    const dType = activeSource?.discount_type || product.discount_type || 'none'
    const dValue = Number(activeSource?.discount_value || product.discount_value || 0)

    let salePrice = originalPrice
    if (dType === 'percentage' && dValue > 0) salePrice = originalPrice - (originalPrice * (dValue / 100))
    else if (dType === 'amount' && dValue > 0) salePrice = originalPrice - dValue

    const isOutOfStock = hasVariantsData
        ? variants.reduce((acc: number, v: any) => acc + Number(v.stock || 0), 0) <= 0
        : Number(activeSource?.stock || 0) <= 0

    // 2. WISHLIST BACKEND LOGIC
    React.useEffect(() => {
        async function checkWishlistStatus() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data } = await supabase
                .from('wishlist')
                .select('id')
                .eq('user_id', user.id)
                .eq('product_id', product.id)
                .single()

            if (data) setIsWishlisted(true)
        }
        checkWishlistStatus()
    }, [product.id, supabase])

    const toggleWishlist = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (isPending) return
        setIsPending(true)

        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return router.push('/login') // Redirect to your login path
        }

        try {
            if (isWishlisted) {
                await supabase
                    .from('wishlist')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('product_id', product.id)
                setIsWishlisted(false)
            } else {
                await supabase
                    .from('wishlist')
                    .insert({ user_id: user.id, product_id: product.id })
                setIsWishlisted(true)
            }
        } catch (error) {
            console.error("Wishlist error:", error)
        } finally {
            setIsPending(false)
        }
    }

    return (
        <div className="group relative flex flex-col">

            {/* WISHLIST BUTTON: UX-Optimized Top-Right Placement */}
            <button
                onClick={toggleWishlist}
                disabled={isPending}
                aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                className="absolute top-3 right-3 z-30 p-2.5 rounded-full 
                           bg-white/40 backdrop-blur-xl border border-white/20 
                           shadow-[0_4px_12px_rgba(0,0,0,0.05)]
                           transition-all duration-300 hover:bg-white hover:scale-110 active:scale-90"
            >
                <Heart
                    className={`w-4 h-4 transition-all duration-300 ${isWishlisted
                            ? "fill-rose-500 text-rose-500 scale-110"
                            : "text-slate-900/60 group-hover:text-slate-900"
                        } ${isPending ? 'animate-pulse opacity-50' : ''}`}
                />
            </button>

            <Link href={`/products/${product.id}`} className="block group">
                {/* IMAGE AREA: Sophisticated Rounded Canvas */}
                <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-[#F2F2F0] border border-slate-100/50 transition-colors group-hover:bg-[#EBEBE9]">
                    {product.thumbnail_url ? (
                        <Image
                            src={product.thumbnail_url}
                            alt={product.name}
                            fill
                            sizes="(max-width: 768px) 50vw, 25vw"
                            className={`object-cover transition-transform duration-[1s] ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-110 ${isOutOfStock ? 'opacity-30' : 'opacity-100'}`}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-50">
                            <ShoppingBag className="w-8 h-8 text-slate-200 stroke-[1px]" />
                        </div>
                    )}

                    {/* DISCOUNT TAG: High-Contrast Black Label */}
                    {!isOutOfStock && dType !== 'none' && dValue > 0 && (
                        <div className="absolute top-0 left-0 bg-slate-900 px-4 py-2 rounded-br-[1rem] z-20 shadow-sm">
                            <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none">
                                {dType === 'percentage' ? `${dValue}%` : `₹${dValue}`} OFF
                            </span>
                        </div>
                    )}

                    {/* SOLD OUT OVERLAY */}
                    {isOutOfStock && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 bg-white/80 px-4 py-2 backdrop-blur-sm rounded-full">
                                Archive
                            </span>
                        </div>
                    )}
                </div>

                {/* TEXT AREA: Clean & Minimal */}
                <div className="mt-5 px-1 flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-500/70">
                            {product.brand || "Exclusive Edit"}
                        </span>
                        {hasVariantsData && (
                            <span className="text-[8px] text-slate-300 italic uppercase">
                                {variants.length} Edits
                            </span>
                        )}
                    </div>

                    <h3 className="text-[15px] font-medium text-slate-800 leading-tight tracking-tight line-clamp-1 group-hover:text-black transition-colors">
                        {product.name}
                    </h3>

                    {/* PRICE AREA: Bold Contrast */}
                    <div className="flex items-baseline gap-2 pt-0.5">
                        <span className={`text-lg font-black tracking-tighter ${isOutOfStock ? 'text-slate-300' : 'text-slate-900'}`}>
                            ₹{Math.round(salePrice).toLocaleString('en-IN')}
                        </span>

                        {!isOutOfStock && salePrice < originalPrice && (
                            <span className="text-[11px] text-rose-500 font-bold line-through decoration-rose-200">
                                ₹{Math.round(originalPrice).toLocaleString('en-IN')}
                            </span>
                        )}
                    </div>
                </div>
            </Link>
        </div>
    )
}