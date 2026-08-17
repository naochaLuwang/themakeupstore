"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Heart, ShoppingBag, Plus, X, Check, Palette, Star, StarHalf, ThumbsUp } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { useCart } from "@/components/store/use-cart"
import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect, useMemo, useRef } from "react"
import { toast } from "sonner"
import { useProductPromo } from "@/components/store/promotion-badge-context"
import { applyFlashSaleToPrice, type FlashSaleOverride } from "@/lib/flash-sale-helper"

function RatingStars({ rating, size = 10 }: { rating: number; size?: number }) {
    const full = Math.floor(rating)
    const half = rating % 1 >= 0.5
    const empty = 5 - full - (half ? 1 : 0)
    return (
        <div className="flex items-center gap-[1px]">
            {Array.from({ length: full }).map((_, i) => (
                <Star key={`f-${i}`} className="fill-amber-400 text-amber-400" style={{ width: size, height: size }} />
            ))}
            {half && <StarHalf className="fill-amber-400 text-amber-400" style={{ width: size, height: size }} />}
            {Array.from({ length: empty }).map((_, i) => (
                <Star key={`e-${i}`} className="text-slate-200" style={{ width: size, height: size }} />
            ))}
        </div>
    )
}

function getCheapestVariantPrice(product: any, flashSale?: FlashSaleOverride | null) {
    const variants = product.product_variants || []
    if (variants.length > 0) {
        let minSale = Infinity
        let minMrp = Infinity
        let bestDiscPct = 0
        let bestDiscAmount = 0
        let hasDisc = false
        for (const v of variants) {
            const base = Number(v.price) || 0
            const mrpVal = Number(v.mrp || base)
            const dType = v.discount_type || product.discount_type || "none"
            const dVal = Number(v.discount_value || product.discount_value || 0)
            const { salePrice: sale } = applyFlashSaleToPrice(base, flashSale || null, dType, dVal)
            const discAmt = Math.max(0, mrpVal - sale)
            if (discAmt > 0) hasDisc = true
            if (sale < minSale) {
                minSale = sale
                minMrp = mrpVal
            }
            if (discAmt > bestDiscAmount) {
                bestDiscAmount = discAmt
                bestDiscPct = dType !== "none" && dVal > 0 ? (dType === "percentage" ? dVal : (mrpVal > 0 ? Math.round((discAmt / mrpVal) * 100) : 0)) : 0
            }
        }
        if (flashSale && !hasDisc) hasDisc = true
        return { salePrice: minSale, mrp: minMrp, discountPercentage: bestDiscPct, discountAmount: bestDiscAmount, hasDiscount: hasDisc }
    }
    const base = product.base_price || 0
    const mrpVal = product.mrp || base
    const dType = product.discount_type || "none"
    const dVal = Number(product.discount_value || 0)
    const { salePrice: sale, isFlashSale } = applyFlashSaleToPrice(base, flashSale || null, dType, dVal)
    const discountAmount = Math.max(0, mrpVal - sale)
    const discountPercentage = mrpVal > 0 ? Math.round((discountAmount / mrpVal) * 100) : 0
    return { salePrice: sale, mrp: mrpVal, discountPercentage, discountAmount, hasDiscount: discountAmount > 0 || isFlashSale }
}

export function ProductCard({ product, priority, activeFlashSale }: { product: any; priority?: boolean; activeFlashSale?: FlashSaleOverride | null }) {
    const [isWishlisted, setIsWishlisted] = useState(false)
    const [isPending, setIsPending] = useState(false)
    const [showVariantSelector, setShowVariantSelector] = useState(false)
    const [justAdded, setJustAdded] = useState(false)
    const [averageRating, setAverageRating] = useState(0)
    const [mounted, setMounted] = useState(false)

    const productCategoryIds = product.product_categories
        ? [...(product.category_id ? [product.category_id] : []), ...product.product_categories.map((pc: any) => pc.category_id).filter(Boolean)]
        : (product.category_id ? [product.category_id] : [])
    const { activePromo } = useProductPromo(product.id, product.category_id, product.brand, productCategoryIds)

    const supabase = createClient()
    const router = useRouter()
    const addItem = useCart((s) => s.addItem)
    const cartItems = useCart((s) => s.items)

    useEffect(() => {
        setMounted(true)
        fetchAverageRating()
    }, [])

    const fetchAverageRating = async () => {
        try {
            const { data: reviews } = await supabase
                .from("product_reviews")
                .select("rating")
                .eq("product_id", product.id)
                .eq("is_approved", true)
            if (reviews && reviews.length > 0) {
                const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
                setAverageRating(Math.round(avg * 10) / 10)
            }
        } catch {}
    }

    const variants = product.product_variants || []
    const hasVariants = product.has_variants && variants.length > 0
    const pricing = getCheapestVariantPrice(product, activeFlashSale)
    const { salePrice, mrp, discountPercentage, discountAmount, hasDiscount } = pricing

    const productIsOutOfStock = variants.length > 0
        ? variants.every((v: any) => v.stock != null && Number(v.stock) <= 0)
        : (product.stock != null && Number(product.stock) <= 0)

    const inBag = useMemo(() => cartItems.some((i) => i.productId === product.id), [cartItems, product.id])

    const isInWishlist = useMemo(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return false
        const { data } = await supabase.from("wishlist").select("id").eq("user_id", user.id).eq("product_id", product.id).maybeSingle()
        return !!data
    }, [product.id, supabase])

    useEffect(() => {
        isInWishlist.then(setIsWishlisted)
    }, [isInWishlist])

    const handleAddToBag = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (productIsOutOfStock) return
        if (hasVariants) {
            setShowVariantSelector(true)
        } else {
            const result = addItem({
                id: variants[0]?.id || product.id,
                productId: product.id,
                variantId: variants[0]?.id || product.id,
                name: product.name,
                price: salePrice,
                mrp: mrp,
                originalPrice: mrp,
                image: product.thumbnail_url,
                quantity: 1,
                variantTitle: variants.length === 1 ? variants[0].title : "Standard",
                categoryId: product.category_id,
                stock: Number(variants[0]?.stock || product.stock || 0),
            })
            if (result?.capped) {
                toast.info(`Only ${result.maxQty} in stock — quantity capped`)
            }
            setJustAdded(true)
            setTimeout(() => setJustAdded(false), 1500)
        }
    }

    const handleWishlistToggle = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (isPending) return
        setIsPending(true)
        const prev = isWishlisted
        setIsWishlisted(!prev)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setIsWishlisted(prev); setIsPending(false); return router.push("/login") }
        try {
            if (prev) {
                await supabase.from("wishlist").delete().eq("user_id", user.id).eq("product_id", product.id)
            } else {
                await supabase.from("wishlist").insert({ user_id: user.id, product_id: product.id })
            }
            window.dispatchEvent(new CustomEvent("wishlist-updated"))
        } catch {
            setIsWishlisted(prev)
        } finally {
            setIsPending(false)
        }
    }

    return (
        <div className="group relative flex flex-col bg-white border border-black/[0.06] h-full transition-all duration-300 hover:z-10 hover:shadow-[0_0_20px_rgba(0,0,0,0.04)]">

            {/* IMAGE SECTION */}
            <Link href={`/products/${product.id}`} className="block relative aspect-square overflow-hidden bg-[#F8F8F8]">
                {product.thumbnail_url ? (
                    <Image
                        src={product.thumbnail_url}
                        alt={product.name}
                        fill
                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        priority={priority}
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-50">
                        <ShoppingBag className="w-8 h-8 text-slate-200" />
                    </div>
                )}
                <div className="absolute inset-0 bg-black/[0.03]" />

                {/* BADGES */}
                {product.is_new && (
                    <div className="absolute top-2 left-2 z-10 bg-[#fc2779] text-white px-2.5 py-0.5 rounded-full">
                        <span className="text-[8px] font-bold uppercase tracking-wider">NEW</span>
                    </div>
                )}
                {activeFlashSale && (
                    <div className="absolute top-3 left-3 z-10">
                        <div className="bg-amber-500 text-white text-[7px] font-black uppercase tracking-wider px-2 py-1 shadow-sm rounded-sm">
                            {activeFlashSale.label || 'FLASH'}
                        </div>
                    </div>
                )}
                {hasDiscount && !product.is_new && (
                    <div className={`absolute ${activeFlashSale ? 'top-9' : 'top-3'} left-3 z-10 flex items-center`}>
                        <div className="bg-slate-900 text-white text-[8px] font-bold uppercase tracking-wider px-3 py-1.5 shadow-sm"
                             style={{ clipPath: 'polygon(0 0, 100% 0, 92% 50%, 100% 100%, 0 100%)' }}>
                            {discountPercentage > 0 ? `${discountPercentage}% OFF` : `-₹${Math.round(discountAmount).toLocaleString()}`}
                        </div>
                    </div>
                )}
                {product.tag && (() => {
                    let tagTop = 8
                    if (product.is_new) tagTop += 24
                    if (activeFlashSale) tagTop += 28
                    if (hasDiscount && !product.is_new) tagTop += 28
                    const isBestseller = product.tag === "BESTSELLER"
                    return (
                        <div
                            className={`absolute left-2 z-10 px-2 py-[3px] rounded-sm flex items-center gap-1 ${isBestseller ? "bg-gradient-to-r from-[#fce4ec] to-[#f8bbd0]" : "bg-slate-900"}`}
                            style={{ top: tagTop }}
                        >
                            {isBestseller && <ThumbsUp className="w-[8px] h-[8px] text-[#fc2779] fill-[#fc2779]" />}
                            <span className={`text-[7px] font-black uppercase tracking-wider leading-none ${isBestseller ? "text-[#fc2779]" : "text-white"}`}>{product.tag}</span>
                        </div>
                    )
                })()}

                {productIsOutOfStock && (
                    <div className="absolute inset-0 z-20 bg-white/55 flex items-center justify-center">
                        <div className="bg-black/70 px-3.5 py-1.5 rounded-full">
                            <span className="text-[9px] font-bold text-white uppercase tracking-wider">Out of Stock</span>
                        </div>
                    </div>
                )}
            </Link>

            {/* CONTENT */}
            <div className="flex flex-col flex-1 p-3 pt-2 gap-0.5">
                {product.brand && (
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.08em] truncate">
                        {product.brand}
                    </span>
                )}

                <h3 className="text-[13px] font-medium text-slate-800 leading-[18px] h-[38px] overflow-hidden">
                    {product.name}
                </h3>

                {/* VARIANT SWATCHES */}
                {hasVariants && (
                    <div className="flex items-center gap-1.5 mt-1.5 mb-1">
                        {variants.slice(0, 3).map((v: any, idx: number) => (
                            <div
                                key={`${v.id}-${idx}`}
                                className="w-3 h-3 rounded-sm border border-slate-200"
                                style={{ backgroundColor: v.hex_code || "#e2e8f0" }}
                            />
                        ))}
                        {variants.length > 3 && (
                            <div className="px-1 py-0.5 bg-slate-100 rounded">
                                <span className="text-[9px] font-semibold text-slate-500">+{variants.length - 3}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* RATING */}
                {averageRating > 0 && (
                    <div className="flex items-center gap-1.5 mt-1 mb-0.5">
                        <RatingStars rating={averageRating} size={9} />
                        <span className="text-[9px] font-medium text-slate-400">{averageRating.toFixed(1)}</span>
                    </div>
                )}

                {/* PRICE SECTION */}
                <div className="mt-auto pt-2.5 border-t border-slate-50">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[15px] font-bold text-slate-900 tracking-tight">
                            ₹{Math.round(salePrice).toLocaleString()}
                        </span>
                        {hasDiscount && (
                            <>
                                <span className="text-[11px] text-slate-400 line-through font-medium">
                                    ₹{Math.round(mrp).toLocaleString()}
                                </span>
                                <span className="text-[10px] font-semibold text-[#fc2779]">{discountPercentage}% OFF</span>
                            </>
                        )}
                    </div>
                    {hasDiscount && (
                        <div className="mt-0.5">
                            <span className="text-[9px] font-bold text-emerald-600 tracking-tight">
                                ↯ You saved ₹{Math.round(discountAmount).toLocaleString()}
                            </span>
                        </div>
                    )}
                    {activePromo?.type === 'gift' && !hasDiscount && (
                        <div className="mt-0.5">
                            <span className="text-[9px] font-bold text-purple-600 tracking-tight">
                                🎁 Free Gift available
                            </span>
                        </div>
                    )}
                    {activePromo?.type === 'bogo' && !hasDiscount && (
                        <div className="mt-0.5">
                            <span className="text-[9px] font-bold text-[#fc2779] tracking-tight">
                                🏷️ Buy X Get Y
                            </span>
                        </div>
                    )}
                    {activePromo?.type === 'gift' && hasDiscount && (
                        <div className="mt-0.5">
                            <span className="text-[9px] font-medium text-purple-500">
                                + Free Gift
                            </span>
                        </div>
                    )}
                    {activePromo?.type === 'bogo' && hasDiscount && (
                        <div className="mt-0.5">
                            <span className="text-[9px] font-medium text-[#fc2779]">
                                + BOGO
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* ACTIONS ROW */}
            <div className="flex items-center gap-2 px-3 pb-3 pt-1">
                <button
                    onClick={handleWishlistToggle}
                    disabled={isPending}
                    className="w-[38px] h-[38px] rounded-lg border border-slate-200 flex items-center justify-center shrink-0 hover:bg-slate-50 transition-all"
                >
                    <Heart
                        className={`w-[17px] h-[17px] transition-colors ${
                            isWishlisted ? "fill-[#fc2779] text-[#fc2779]" : "text-slate-500"
                        }`}
                    />
                </button>

                {productIsOutOfStock ? (
                    <div className="flex-1 h-[38px] rounded-lg bg-slate-100 flex items-center justify-center">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">OUT OF STOCK</span>
                    </div>
                ) : (
                    <button
                        onClick={handleAddToBag}
                        disabled={justAdded}
                        className={`flex-1 h-[38px] rounded-lg flex items-center justify-center text-[11px] font-semibold tracking-wide transition-all active:scale-[0.97] ${
                            justAdded
                                ? "bg-emerald-600 text-white"
                                : "bg-[#fc2779] text-white shadow-sm shadow-pink-200 hover:bg-[#e0226b]"
                        }`}
                    >
                        {justAdded ? (
                            "ADDED ✓"
                        ) : (
                            hasVariants ? "SELECT" : "ADD TO BAG"
                        )}
                    </button>
                )}
            </div>

            {/* VARIANT BOTTOM SHEET */}
            {mounted && createPortal(
                <AnimatePresence>
                    {showVariantSelector && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowVariantSelector(false)}
                                className="fixed inset-0 z-[9999] bg-black/40"
                            />
                            <motion.div
                                initial={{ y: "100%" }}
                                animate={{ y: 0 }}
                                exit={{ y: "100%" }}
                                transition={{ type: "spring", damping: 28, stiffness: 220 }}
                                className="fixed bottom-0 left-0 right-0 z-[9999] bg-white rounded-t-2xl shadow-2xl max-h-[70vh] flex flex-col"
                            >
                                <div className="flex justify-center pt-3 pb-1">
                                    <div className="w-10 h-1 rounded-full bg-slate-300" />
                                </div>
                                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                                    <h3 className="text-base font-bold text-slate-900">Select Shade</h3>
                                    <button onClick={() => setShowVariantSelector(false)} className="p-1 hover:rotate-90 transition-transform">
                                        <X className="w-5 h-5 text-slate-400" />
                                    </button>
                                </div>
                                <div className="overflow-y-auto flex-1 px-6 py-4 space-y-2">
                                    {variants.map((v: any) => {
                                        const vStock = Number(v.stock || 0)
                                        const isVOut = vStock <= 0
                                        const vBase = Number(v.price)
                                        const vMrp = Number(v.mrp || vBase)
                                        const vSale = v.discount_type === "percentage"
                                            ? vBase - vBase * (v.discount_value / 100)
                                            : v.discount_type === "amount" ? vBase - v.discount_value : vBase

                                        return (
                                            <button
                                                key={v.id}
                                                disabled={isVOut}
                                                onClick={() => {
                                                    addItem({
                                                        id: v.id,
                                                        productId: product.id,
                                                        variantId: v.id,
                                                        name: product.name,
                                                        price: vSale,
                                                        mrp: vMrp,
                                                        originalPrice: vMrp,
                                                        image: v.image_url || product.thumbnail_url,
                                                        quantity: 1,
                                                        variantTitle: v.title,
                                                        categoryId: product.category_id,
                                                        stock: vStock,
                                                    })
                                                    setShowVariantSelector(false)
                                                    setJustAdded(true)
                                                    setTimeout(() => setJustAdded(false), 1500)
                                                }}
                                                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                                                    isVOut
                                                        ? "opacity-40 cursor-not-allowed border-slate-100 bg-slate-50"
                                                        : "border-slate-100 hover:border-[#fc2779]/30 hover:bg-[#fc2779]/5"
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-10 h-10 rounded-lg border border-slate-100"
                                                        style={{ backgroundColor: v.hex_code || "#f1f5f9" }}
                                                    >
                                                        {!v.hex_code && (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <Palette className="w-5 h-5 text-slate-300" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-sm font-medium text-slate-900">{v.title}</p>
                                                        <p className="text-xs font-semibold text-[#fc2779]">₹{Math.round(vSale).toLocaleString()}</p>
                                                    </div>
                                                </div>
                                                {!isVOut && (
                                                    <div className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center">
                                                        <Plus className="w-3.5 h-3.5 text-slate-400" />
                                                    </div>
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    )
}