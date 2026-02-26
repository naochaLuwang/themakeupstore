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
import { Heart, ShoppingBag, Plus, X, Check, Palette, Handbag, Sparkles, Star } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { useCart } from "@/components/store/use-cart"
import { motion, AnimatePresence } from "framer-motion"

export function ProductCard({ product }: { product: any }) {
    const [isWishlisted, setIsWishlisted] = React.useState(false)
    const [isPending, setIsPending] = React.useState(false)
    const [showVariantSelector, setShowVariantSelector] = React.useState(false)
    const [justAdded, setJustAdded] = React.useState(false)
    const [mounted, setMounted] = React.useState(false)

    const supabase = createClient()
    const router = useRouter()
    const addItem = useCart((state) => state.addItem)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    // DATA LOGIC
    const variants = product.product_variants || []
    const hasMultipleVariants = variants.length > 1
    const activeSource = variants.length > 0
        ? (variants.find((v: any) => v.is_default) || variants[0])
        : product

    const originalPrice = Number(activeSource?.price ?? product.base_price ?? 0)
    const mrp = Number(activeSource?.mrp || product.mrp || originalPrice)
    const dType = activeSource?.discount_type || product.discount_type || 'none'
    const dValue = Number(activeSource?.discount_value || product.discount_value || 0)

    let salePrice = originalPrice
    if (dType === 'percentage' && dValue > 0) salePrice = originalPrice - (originalPrice * (dValue / 100))
    else if (dType === 'amount' && dValue > 0) salePrice = originalPrice - dValue

    const discountPercentage = Math.round(((mrp - salePrice) / mrp) * 100)
    const isOutOfStock = (variants.length > 0 ? variants.reduce((acc: number, v: any) => acc + Number(v.stock || 0), 0) : Number(activeSource?.stock || 0)) <= 0

    const handleQuickAdd = (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation()
        if (isOutOfStock) return
        if (hasMultipleVariants) {
            setShowVariantSelector(true)
        } else {
            addItem({
                id: activeSource.id || product.id,
                productId: product.id,
                variantId: activeSource.id || product.id,
                name: product.name,
                price: salePrice,
                mrp: mrp,
                image: product.thumbnail_url,
                quantity: 1,
                variantTitle: variants.length === 1 ? activeSource.title : "Standard",
                categoryId: product.category_id,
                stock: Number(activeSource.stock || 0)
            })
            setJustAdded(true)
            setTimeout(() => setJustAdded(false), 2000)
        }
    }

    const toggleWishlist = async (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation()
        if (isPending) return
        setIsPending(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return router.push('/login')
        try {
            if (isWishlisted) {
                await supabase.from('wishlist').delete().eq('user_id', user.id).eq('product_id', product.id)
                setIsWishlisted(false)
            } else {
                await supabase.from('wishlist').insert({ user_id: user.id, product_id: product.id })
                setIsWishlisted(true)
            }
        } finally { setIsPending(false) }
    }

    return (
        <div className="group relative flex flex-col bg-white rounded-3xl p-2 transition-all duration-500 hover:shadow-[0_20px_40px_rgba(252,39,121,0.08)]">

            {/* WISHLIST BUTTON (Nykaa Style) */}
            <button
                onClick={toggleWishlist}
                disabled={isPending}
                className="absolute top-4 right-4 z-30 p-2.5 rounded-full bg-white/90 backdrop-blur-md shadow-md transition-all active:scale-75 group/heart"
            >
                <Heart className={`w-4 h-4 transition-all ${isWishlisted ? "fill-[#fc2779] text-[#fc2779]" : "text-slate-300 group-hover/heart:text-[#fc2779]"}`} />
            </button>

            {/* IMAGE SECTION */}
            <Link href={`/products/${product.id}`} className="block relative aspect-[3/4] overflow-hidden rounded-2xl bg-[#F9F9F9]">
                {product.thumbnail_url ? (
                    <Image
                        src={product.thumbnail_url}
                        alt={product.name}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-pink-50/30">
                        <ShoppingBag className="w-8 h-8 text-pink-100" />
                    </div>
                )}

                {/* BESTSELLER TAG */}
                {!isOutOfStock && product.is_bestseller && (
                    <div className="absolute top-3 left-3 z-10 flex items-center gap-1 bg-[#fc2779] px-2 py-1 rounded-md shadow-lg shadow-pink-500/20">
                        <Sparkles className="w-2.5 h-2.5 text-white fill-white" />
                        <span className="text-[8px] font-black text-white uppercase tracking-widest">Bestseller</span>
                    </div>
                )}

                {/* OUT OF STOCK OVERLAY */}
                {isOutOfStock && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
                        <span className="text-[10px] font-black text-slate-900 bg-white px-4 py-2 rounded-full border border-slate-100 shadow-xl uppercase tracking-widest">
                            Restocking Soon
                        </span>
                    </div>
                )}
            </Link>

            {/* PRODUCT DETAILS */}
            <div className="mt-3 px-2 pb-2 space-y-2">
                <div className="space-y-0.5">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-[#fc2779] uppercase tracking-widest leading-none">
                            {product.brand || "Exclusive"}
                        </span>
                        {/* Rating Mockup for Nykaa Feel */}
                        <div className="flex items-center gap-0.5 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                            <span className="text-[9px] font-black text-emerald-700 leading-none">4.5</span>
                            <Star className="w-2 h-2 text-emerald-700 fill-emerald-700" />
                        </div>
                    </div>
                    <h3 className="text-[13px] font-bold text-slate-800 line-clamp-1 group-hover:text-[#fc2779] transition-colors">{product.name}</h3>
                </div>

                {/* PRICE SECTION (Nykaa Style MRP vs SALE) */}
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900">₹{Math.round(salePrice).toLocaleString()}</span>
                        {salePrice < mrp && (
                            <>
                                <span className="text-[11px] text-slate-400 line-through font-medium">₹{Math.round(mrp).toLocaleString()}</span>
                                <span className="text-[11px] font-black text-[#fc2779]">{discountPercentage}% Off</span>
                            </>
                        )}
                    </div>

                    {/* ADD TO BAG BUTTON (Integrated into Card Bottom) */}
                    {!isOutOfStock && (
                        <button
                            onClick={handleQuickAdd}
                            className={`w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                                ${justAdded
                                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                                    : 'bg-white border-2 border-[#fc2779] text-[#fc2779] hover:bg-[#fc2779] hover:text-white active:scale-95'}`}
                        >
                            {justAdded ? (
                                <><Check className="w-3.5 h-3.5 stroke-[4]" /> Added</>
                            ) : (
                                <><Handbag className="w-3.5 h-3.5 stroke-[3]" /> Add to Bag</>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* VARIANT SELECTOR PORTAL (Nykaa Sheet Style) */}
            {mounted && createPortal(
                <AnimatePresence>
                    {showVariantSelector && (
                        <div className="fixed inset-0 z-[9999] flex items-end justify-center">
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                onClick={() => setShowVariantSelector(false)}
                                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                            />
                            <motion.div
                                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                className="relative w-full max-w-lg bg-white rounded-t-[3rem] p-8 pb-10 shadow-2xl"
                            >
                                <div className="flex justify-between items-center mb-8">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-1 bg-[#fc2779] rounded-full" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#fc2779]">Pick Your Shade</span>
                                        </div>
                                        <h4 className="text-2xl font-black text-slate-900 leading-none">Choose Variant</h4>
                                    </div>
                                    <button onClick={() => setShowVariantSelector(false)} className="h-10 w-10 flex items-center justify-center bg-slate-50 rounded-full transition-transform active:rotate-90">
                                        <X className="w-5 h-5 text-slate-400" />
                                    </button>
                                </div>

                                <div className="space-y-3 max-h-[50vh] overflow-y-auto no-scrollbar">
                                    {variants.map((v: any) => {
                                        const vStock = Number(v.stock || 0)
                                        const isVOut = vStock <= 0
                                        const vBase = Number(v.price)
                                        const vMRP = Number(v.mrp || vBase)
                                        const vSale = (v.discount_type === 'percentage')
                                            ? vBase - (vBase * (v.discount_value / 100))
                                            : (v.discount_type === 'amount') ? vBase - v.discount_value : vBase
                                        const vDisc = Math.round(((vMRP - vSale) / vMRP) * 100)

                                        return (
                                            <button
                                                key={v.id}
                                                disabled={isVOut}
                                                onClick={() => {
                                                    addItem({
                                                        id: v.id, productId: product.id, variantId: v.id,
                                                        name: product.name, price: vSale, mrp: vMRP,
                                                        image: v.image_url || product.thumbnail_url,
                                                        quantity: 1, variantTitle: v.title,
                                                        categoryId: product.category_id, stock: vStock
                                                    })
                                                    setShowVariantSelector(false)
                                                    setJustAdded(true)
                                                    setTimeout(() => setJustAdded(false), 2000)
                                                }}
                                                className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all active:scale-[0.98]
                                                    ${isVOut ? 'opacity-40 bg-slate-50 cursor-not-allowed' : 'border-slate-50 hover:border-[#fc2779] hover:bg-pink-50/30'}`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 rounded-xl border border-white shadow-md flex items-center justify-center" style={{ backgroundColor: v.hex_code || '#F1F5F9' }}>
                                                        {!v.hex_code && <Palette className="w-5 h-5 text-slate-300" />}
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-[12px] font-black text-slate-900 uppercase tracking-wide leading-none">{v.title}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-sm font-bold text-[#fc2779]">₹{Math.round(vSale).toLocaleString()}</span>
                                                            {vDisc > 0 && <span className="text-[10px] text-slate-400 line-through">₹{Math.round(vMRP).toLocaleString()}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                {!isVOut && <div className="h-8 w-8 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100"><Plus className="w-4 h-4 text-[#fc2779]" /></div>}
                                            </button>
                                        )
                                    })}
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    )
}