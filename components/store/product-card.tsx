// "use client"

// import * as React from "react"
// import { createPortal } from "react-dom"
// import Link from "next/link"
// import Image from "next/image"
// import { useRouter } from "next/navigation"
// import { Heart, ShoppingBag, Plus, X, Check, Palette, Handbag, ArrowDown } from "lucide-react"
// import { createClient } from "@/utils/supabase/client"
// import { useCart } from "@/components/store/use-cart"
// import { motion, AnimatePresence } from "framer-motion"

// export function ProductCard({ product }: { product: any }) {
//     const [isWishlisted, setIsWishlisted] = React.useState(false)
//     const [isPending, setIsPending] = React.useState(false)
//     const [showVariantSelector, setShowVariantSelector] = React.useState(false)
//     const [justAdded, setJustAdded] = React.useState(false)
//     const [mounted, setMounted] = React.useState(false)

//     const supabase = createClient()
//     const router = useRouter()
//     const addItem = useCart((state) => state.addItem)

//     React.useEffect(() => {
//         setMounted(true)
//     }, [])

//     // DATA LOGIC
//     const variants = product.product_variants || []
//     const hasMultipleVariants = variants.length > 1
//     const activeSource = variants.length > 0
//         ? (variants.find((v: any) => v.is_default) || variants[0])
//         : product

//     const originalPrice = Number(activeSource?.price ?? product.base_price ?? 0)
//     const dType = activeSource?.discount_type || product.discount_type || 'none'
//     const dValue = Number(activeSource?.discount_value || product.discount_value || 0)

//     let salePrice = originalPrice
//     if (dType === 'percentage' && dValue > 0) salePrice = originalPrice - (originalPrice * (dValue / 100))
//     else if (dType === 'amount' && dValue > 0) salePrice = originalPrice - dValue

//     // Savings Calculation logic
//     const absoluteSavings = originalPrice - salePrice

//     const totalStock = variants.length > 0
//         ? variants.reduce((acc: number, v: any) => acc + Number(v.stock || 0), 0)
//         : Number(activeSource?.stock || 0)

//     const isOutOfStock = totalStock <= 0

//     const handleQuickAdd = (e: React.MouseEvent) => {
//         e.preventDefault()
//         e.stopPropagation()
//         const catId = product.category_id || product.product_categories?.[0]?.category_id || product.categories?.id;
//         if (isOutOfStock) return
//         if (hasMultipleVariants) {
//             setShowVariantSelector(true)
//         } else {
//             addItem({
//                 id: activeSource.id || product.id,
//                 productId: product.id,
//                 variantId: activeSource.id || product.id,
//                 name: product.name,
//                 price: salePrice,
//                 mrp: Number(activeSource.mrp || originalPrice),
//                 image: product.thumbnail_url,
//                 quantity: 1,
//                 variantTitle: variants.length === 1 ? activeSource.title : "Standard",
//                 categoryId: catId,
//                 stock: Number(activeSource.stock || 0)
//             })
//             setJustAdded(true)
//             setTimeout(() => setJustAdded(false), 2000)
//         }
//     }

//     React.useEffect(() => {
//         async function checkWishlistStatus() {
//             const { data: { user } } = await supabase.auth.getUser()
//             if (!user) return
//             const { data } = await supabase.from('wishlist').select('id').eq('user_id', user.id).eq('product_id', product.id).single()
//             if (data) setIsWishlisted(true)
//         }
//         checkWishlistStatus()
//     }, [product.id, supabase])

//     const toggleWishlist = async (e: React.MouseEvent) => {
//         e.preventDefault(); e.stopPropagation()
//         if (isPending) return
//         setIsPending(true)
//         const { data: { user } } = await supabase.auth.getUser()
//         if (!user) return router.push('/login')
//         try {
//             if (isWishlisted) {
//                 await supabase.from('wishlist').delete().eq('user_id', user.id).eq('product_id', product.id)
//                 setIsWishlisted(false)
//             } else {
//                 await supabase.from('wishlist').insert({ user_id: user.id, product_id: product.id })
//                 setIsWishlisted(true)
//             }
//         } finally { setIsPending(false) }
//     }

//     return (
//         <div className="group relative flex flex-col bg-white">
//             {/* WISHLIST BUTTON */}
//             <button
//                 onClick={toggleWishlist}
//                 disabled={isPending}
//                 className="absolute top-3 right-3 z-30 p-2 rounded-full bg-white/90 backdrop-blur-md border border-slate-100 shadow-sm transition-all hover:bg-white active:scale-90"
//             >
//                 <Heart className={`w-3.5 h-3.5 transition-colors ${isWishlisted ? "fill-red-500 text-red-500" : "text-slate-400"}`} />
//             </button>

//             {/* PRODUCT IMAGE SECTION */}
//             <Link href={`/products/${product.id}`} className="block relative aspect-[4/5] overflow-hidden rounded-xl bg-slate-50 border border-slate-100">
//                 {product.thumbnail_url ? (
//                     <Image
//                         src={product.thumbnail_url}
//                         alt={product.name}
//                         fill
//                         className="object-cover transition-transform duration-700 group-hover:scale-105"
//                     />
//                 ) : (
//                     <div className="w-full h-full flex items-center justify-center">
//                         <ShoppingBag className="w-6 h-6 text-slate-200" />
//                     </div>
//                 )}

//                 {/* OUT OF STOCK LABEL */}
//                 {isOutOfStock ? (
//                     <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/10 backdrop-blur-[2px]">
//                         <div className="bg-white px-4 py-2 shadow-xl border border-slate-100">
//                             <span className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">
//                                 Out of Stock
//                             </span>
//                         </div>
//                     </div>
//                 ) : (
//                     /* DISCOUNT BADGE (Only show if in stock) */
//                     dType !== 'none' && dValue > 0 && (
//                         <div className="absolute top-0 left-0 z-10 bg-slate-900 px-2.5 py-1.5 rounded-br-lg">
//                             <span className="text-[9px] font-black text-white uppercase tracking-widest">
//                                 {dType === 'percentage' ? `${dValue}% Off` : `₹${dValue} Off`}
//                             </span>
//                         </div>
//                     )
//                 )}
//             </Link>

//             {/* PRODUCT INFO */}
//             <div className="mt-4 px-1 space-y-2">
//                 <div className="flex flex-col gap-0.5">
//                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{product.brand || "Daciana"}</span>
//                     <h3 className="text-sm font-bold text-slate-900 tracking-tight">{product.name}</h3>
//                 </div>

//                 {/* PRICE DROPPED INDICATOR - Only visible when savings exist */}
//                 {!isOutOfStock && absoluteSavings > 0 && (
//                     <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100/50 w-fit">
//                         <ArrowDown className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" />
//                         <span className="text-[9px] font-black text-emerald-700 uppercase tracking-wider">
//                             Price dropped by ₹{Math.round(absoluteSavings).toLocaleString()}
//                         </span>
//                     </div>
//                 )}

//                 <div className="flex items-center justify-between">
//                     <div className="flex items-baseline gap-2">
//                         <span className="text-base font-black text-slate-900 tracking-tighter">₹{Math.round(salePrice).toLocaleString()}</span>
//                         {salePrice < originalPrice && (
//                             <span className="text-[10px] text-slate-400 line-through">₹{Math.round(originalPrice).toLocaleString()}</span>
//                         )}
//                     </div>
//                     {!isOutOfStock && (
//                         <button
//                             onClick={handleQuickAdd}
//                             className={`p-2 rounded-lg transition-all active:scale-90 border
//                                 ${justAdded ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-slate-50 border-slate-100 text-slate-900 hover:bg-slate-900 hover:text-white'}`}
//                         >
//                             {justAdded ? <Check className="w-4 h-4 stroke-[3]" /> : <Handbag className="w-4 h-4 stroke-[2.5]" />}
//                         </button>
//                     )}
//                 </div>
//             </div>

//             {/* PORTAL FOR VARIANT SELECTOR */}
//             {mounted && createPortal(
//                 <AnimatePresence>
//                     {showVariantSelector && (
//                         <div className="fixed inset-0 z-[9999]">
//                             <motion.div
//                                 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
//                                 onClick={() => setShowVariantSelector(false)}
//                                 className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
//                             />
//                             <motion.div
//                                 initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
//                                 transition={{ type: "spring", damping: 25, stiffness: 300 }}
//                                 className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[2.5rem] p-6 pb-10 shadow-2xl max-w-lg mx-auto"
//                             >
//                                 <div className="flex justify-between items-center mb-8 px-2">
//                                     <div className="space-y-1">
//                                         <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Curated Shades</span>
//                                         <h4 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Select Variation</h4>
//                                     </div>
//                                     <button onClick={() => setShowVariantSelector(false)} className="h-10 w-10 flex items-center justify-center bg-slate-50 rounded-full">
//                                         <X className="w-5 h-5 text-slate-400" />
//                                     </button>
//                                 </div>

//                                 <div className="space-y-3 max-h-[55vh] overflow-y-auto no-scrollbar px-1">
//                                     {variants.map((v: any) => {
//                                         const vStock = Number(v.stock || 0)
//                                         const isVOut = vStock <= 0
//                                         const vBase = Number(v.price)
//                                         const vSale = (v.discount_type === 'percentage')
//                                             ? vBase - (vBase * (v.discount_value / 100))
//                                             : (v.discount_type === 'amount') ? vBase - v.discount_value : vBase

//                                         return (
//                                             <button
//                                                 key={v.id}
//                                                 disabled={isVOut}
//                                                 onClick={() => {
//                                                     addItem({
//                                                         id: v.id,
//                                                         productId: product.id,
//                                                         variantId: v.id,
//                                                         name: product.name,
//                                                         price: vSale,
//                                                         mrp: Number(v.mrp || vBase),
//                                                         image: v.image_url || product.thumbnail_url,
//                                                         quantity: 1,
//                                                         variantTitle: v.title,
//                                                         categoryId: product.category_id,
//                                                         stock: vStock
//                                                     })
//                                                     setShowVariantSelector(false)
//                                                     setJustAdded(true)
//                                                     setTimeout(() => setJustAdded(false), 2000)
//                                                 }}
//                                                 className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all group/item
//                                                     ${isVOut ? 'opacity-40 border-slate-50 cursor-not-allowed bg-slate-50/50' : 'border-slate-100 hover:border-slate-900 hover:bg-slate-50/50 hover:shadow-sm'}`}
//                                             >
//                                                 <div className="flex items-center gap-5">
//                                                     <div className="h-8 w-8 rounded-lg border border-slate-100 flex items-center justify-center shadow-inner overflow-hidden" style={{ backgroundColor: v.hex_code || '#F1F5F9' }}>
//                                                         {!v.hex_code && <Palette className="w-5 h-5 text-slate-300" />}
//                                                     </div>
//                                                     <div className="text-left space-y-0.5">
//                                                         <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest leading-none">{v.title}</p>
//                                                         <div className="flex items-center gap-2">
//                                                             <span className="text-[12px] font-bold text-slate-900">₹{Math.round(vSale).toLocaleString()}</span>
//                                                             {vSale < vBase && <span className="text-[10px] text-slate-400 line-through">₹{Math.round(vBase).toLocaleString()}</span>}
//                                                         </div>
//                                                     </div>
//                                                 </div>
//                                                 {isVOut ? <span className="text-[9px] font-bold text-slate-300 uppercase">Archive</span> : <Plus className="w-5 h-5 text-slate-900" />}
//                                             </button>
//                                         )
//                                     })}
//                                 </div>
//                             </motion.div>
//                         </div>
//                     )}
//                 </AnimatePresence>,
//                 document.body
//             )}
//         </div>
//     )
// }

"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Heart, ShoppingBag, Plus, X, Check, Palette, Star, StarHalf } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { useCart } from "@/components/store/use-cart"
import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect, useMemo, useRef } from "react"

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

function getCheapestVariantPrice(product: any) {
    const variants = product.product_variants || []
    if (variants.length > 0) {
        let minSale = Infinity
        let minMrp = Infinity
        let minDiscount = 0
        let minDiscountAmount = 0
        let hasDisc = false
        for (const v of variants) {
            const base = Number(v.price) || 0
            const mrpVal = Number(v.mrp || base)
            const dType = v.discount_type || product.discount_type || "none"
            const dVal = Number(v.discount_value || product.discount_value || 0)
            let sale = base
            if (dType === "percentage" && dVal > 0) sale = base - base * (dVal / 100)
            else if ((dType === "fixed" || dType === "amount") && dVal > 0) sale = Math.max(0, base - dVal)
            if (sale < minSale) {
                minSale = sale
                minMrp = mrpVal
                minDiscount = dType !== "none" && dVal > 0 ? (dType === "percentage" ? dVal : Math.round(((mrpVal - sale) / mrpVal) * 100)) : 0
                minDiscountAmount = Math.max(0, mrpVal - sale)
                hasDisc = minDiscountAmount > 0
            }
        }
        return { salePrice: minSale, mrp: minMrp, discountPercentage: minDiscount, discountAmount: minDiscountAmount, hasDiscount: hasDisc }
    }
    const base = product.base_price || 0
    const mrpVal = product.mrp || base
    const dType = product.discount_type || "none"
    const dVal = Number(product.discount_value || 0)
    let sale = base
    if (dType === "percentage" && dVal > 0) sale = base - base * (dVal / 100)
    else if ((dType === "fixed" || dType === "amount") && dVal > 0) sale = Math.max(0, base - dVal)
    const discountAmount = Math.max(0, mrpVal - sale)
    const discountPercentage = mrpVal > 0 ? Math.round((discountAmount / mrpVal) * 100) : 0
    return { salePrice: sale, mrp: mrpVal, discountPercentage, discountAmount, hasDiscount: discountAmount > 0 }
}

export function ProductCard({ product }: { product: any }) {
    const [isWishlisted, setIsWishlisted] = useState(false)
    const [isPending, setIsPending] = useState(false)
    const [showVariantSelector, setShowVariantSelector] = useState(false)
    const [justAdded, setJustAdded] = useState(false)
    const [averageRating, setAverageRating] = useState(0)
    const [mounted, setMounted] = useState(false)

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
    const pricing = getCheapestVariantPrice(product)
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
            addItem({
                id: variants[0]?.id || product.id,
                productId: product.id,
                variantId: variants[0]?.id || product.id,
                name: product.name,
                price: salePrice,
                mrp: mrp,
                image: product.thumbnail_url,
                quantity: 1,
                variantTitle: variants.length === 1 ? variants[0].title : "Standard",
                categoryId: product.category_id,
                stock: Number(variants[0]?.stock || product.stock || 0),
            })
            setJustAdded(true)
            setTimeout(() => setJustAdded(false), 1500)
        }
    }

    const handleWishlistToggle = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (isPending) return
        setIsPending(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return router.push("/login")
        try {
            if (isWishlisted) {
                await supabase.from("wishlist").delete().eq("user_id", user.id).eq("product_id", product.id)
                setIsWishlisted(false)
            } else {
                await supabase.from("wishlist").insert({ user_id: user.id, product_id: product.id })
                setIsWishlisted(true)
            }
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
                {hasDiscount && !product.is_new && (
                    <div className="absolute top-2 left-2 z-10 bg-[#DAA520] text-white px-2.5 py-0.5 rounded-full">
                        <span className="text-[8px] font-bold uppercase tracking-wider">
                            {discountPercentage > 0 ? `${discountPercentage}% OFF` : `-₹${Math.round(discountAmount).toLocaleString()}`}
                        </span>
                    </div>
                )}

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