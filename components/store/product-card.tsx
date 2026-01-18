

"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Heart, ShoppingBag, Plus, X, Check, AlertCircle } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { useCart } from "@/components/store/use-cart"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"

export function ProductCard({ product }: { product: any }) {
    const [isWishlisted, setIsWishlisted] = React.useState(false)
    const [isPending, setIsPending] = React.useState(false)
    const [showVariantSelector, setShowVariantSelector] = React.useState(false)
    const [justAdded, setJustAdded] = React.useState(false)

    const supabase = createClient()
    const router = useRouter()
    const addItem = useCart((state) => state.addItem)

    // 1. TOP-LEVEL DATA LOGIC
    const variants = product.product_variants || []
    const hasVariants = variants.length > 0
    const activeSource = hasVariants ? (variants.find((v: any) => v.is_default) || variants[0]) : product

    const originalPrice = Number(activeSource?.price ?? product.base_price ?? 0)
    const dType = activeSource?.discount_type || product.discount_type || 'none'
    const dValue = Number(activeSource?.discount_value || product.discount_value || 0)

    let salePrice = originalPrice
    if (dType === 'percentage' && dValue > 0) salePrice = originalPrice - (originalPrice * (dValue / 100))
    else if (dType === 'amount' && dValue > 0) salePrice = originalPrice - dValue

    const totalStock = hasVariants
        ? variants.reduce((acc: number, v: any) => acc + Number(v.stock || 0), 0)
        : Number(activeSource?.stock || 0)

    const isOutOfStock = totalStock <= 0

    // 2. ADD TO CART HANDLER
    const handleQuickAdd = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (isOutOfStock) return

        if (hasVariants) {
            setShowVariantSelector(true)
        } else {
            addItem({
                id: activeSource.id || product.id,
                productId: product.id,
                variantId: activeSource.id || product.id,
                name: product.name,
                price: salePrice,
                mrp: Number(activeSource.mrp || originalPrice),
                image: product.thumbnail_url,
                quantity: 1,
                variantTitle: "Standard",
                categoryId: product.category_id,
                stock: Number(activeSource.stock || 0)
            })

            // Visual Feedback State
            setJustAdded(true)
            setTimeout(() => setJustAdded(false), 2000)
            // toast.success(`${product.name} added to bag`)
        }
    }

    // 3. WISHLIST LOGIC
    React.useEffect(() => {
        async function checkWishlistStatus() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data } = await supabase.from('wishlist').select('id').eq('user_id', user.id).eq('product_id', product.id).single()
            if (data) setIsWishlisted(true)
        }
        checkWishlistStatus()
    }, [product.id, supabase])

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
        <div className="group relative flex flex-col">

            {/* WISHLIST BUTTON */}
            <button
                onClick={toggleWishlist}
                disabled={isPending}
                className="absolute top-3 right-3 z-30 p-2.5 rounded-full bg-white/40 backdrop-blur-xl border border-white/20 shadow-sm transition-all hover:bg-white active:scale-90"
            >
                <Heart className={`w-3.5 h-3.5 transition-colors ${isWishlisted ? "fill-rose-500 text-rose-500" : "text-slate-900/60"}`} />
            </button>

            {/* QUICK ADD BUTTON (DESKTOP) */}
            {!isOutOfStock && (
                <button
                    onClick={handleQuickAdd}
                    className={`absolute bottom-[120px] right-4 z-30 p-3.5 rounded-full shadow-2xl transition-all duration-300 md:flex hidden hover:scale-110 active:scale-95
                        ${justAdded ? 'bg-emerald-500 text-white opacity-100 translate-y-0' : 'bg-black text-white opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-4'}`}
                >
                    {justAdded ? <Check className="w-5 h-5 stroke-[3]" /> : <Plus className="w-5 h-5 stroke-[2.5]" />}
                </button>
            )}

            {/* PRODUCT CONTENT */}
            <Link href={`/products/${product.id}`} className="block">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-[#F8F8F6] border border-slate-100/50">
                    {product.thumbnail_url ? (
                        <Image
                            src={product.thumbnail_url}
                            alt={product.name}
                            fill
                            sizes="(max-width: 768px) 50vw, 33vw"
                            className={`object-cover transition-transform duration-1000 group-hover:scale-110 ${isOutOfStock ? 'opacity-40 grayscale-[0.5]' : ''}`}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-50">
                            <ShoppingBag className="w-8 h-8 text-slate-200 stroke-[1]" />
                        </div>
                    )}

                    {!isOutOfStock && dType !== 'none' && dValue > 0 && (
                        <div className="absolute top-0 left-0 bg-slate-900 px-3.5 py-2 rounded-br-2xl z-20">
                            <span className="text-[9px] font-black text-white uppercase tracking-[0.2em]">
                                {dType === 'percentage' ? `${dValue}%` : `₹${dValue}`} OFF
                            </span>
                        </div>
                    )}

                    {isOutOfStock && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/20 backdrop-blur-[1px]">
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 border border-slate-200 px-5 py-2.5 rounded-full bg-white/90">Sold Out</span>
                        </div>
                    )}
                </div>

                <div className="mt-5 px-1 space-y-1.5">
                    <div className="flex justify-between items-center">
                        <span className="text-[8px] font-black uppercase tracking-[0.35em] text-slate-400">
                            {product.brand || "Daciana Edit"}
                        </span>
                        {totalStock < 10 && totalStock > 0 && (
                            <span className="text-[7px] font-bold text-orange-500 uppercase tracking-widest flex items-center gap-1">
                                <AlertCircle className="w-2 h-2" /> Low Stock
                            </span>
                        )}
                    </div>

                    <h3 className="text-[15px] font-medium text-slate-800 tracking-tight line-clamp-1 group-hover:text-black transition-colors">
                        {product.name}
                    </h3>

                    <div className="flex items-baseline gap-2.5">
                        <span className="text-lg font-black text-slate-900 tracking-tighter">
                            ₹{Math.round(salePrice).toLocaleString('en-IN')}
                        </span>
                        {salePrice < originalPrice && (
                            <span className="text-[11px] text-slate-400 font-medium line-through">
                                ₹{Math.round(originalPrice).toLocaleString('en-IN')}
                            </span>
                        )}
                    </div>
                </div>
            </Link>

            {!isOutOfStock && (
                <button
                    onClick={handleQuickAdd}
                    className={`md:hidden mt-4 w-full py-4 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl active:scale-[0.97] transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-2
                        ${justAdded ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white'}`}
                >
                    {justAdded ? (
                        <><Check className="w-3.5 h-3.5 stroke-[3]" /> Added</>
                    ) : (
                        'Add to Bag'
                    )}
                </button>
            )}

            {/* VARIANT SELECTOR MODAL */}
            <AnimatePresence>
                {showVariantSelector && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowVariantSelector(false)}
                            className="fixed inset-0 bg-black/40 backdrop-blur-md z-[110]"
                        />
                        <motion.div
                            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[3rem] z-[111] p-8 pb-12 shadow-2xl md:max-w-md md:mx-auto md:bottom-8 md:rounded-[2.5rem]"
                        >
                            <div className="flex justify-between items-start mb-8">
                                <div className="space-y-1">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Select Shade</h4>
                                    <p className="text-xl font-bold text-slate-900 tracking-tight">{product.name}</p>
                                </div>
                                <button onClick={() => setShowVariantSelector(false)} className="p-2.5 bg-slate-50 rounded-full hover:bg-slate-100 transition-colors">
                                    <X className="w-4 h-4 text-slate-400" />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {variants.map((v: any) => {
                                    const vStock = Number(v.stock || 0)
                                    const isVOut = vStock <= 0

                                    const vBasePrice = Number(v.price)
                                    const vDType = v.discount_type || 'none'
                                    const vDValue = Number(v.discount_value || 0)

                                    let vSalePrice = vBasePrice
                                    if (vDType === 'percentage' && vDValue > 0) vSalePrice = vBasePrice - (vBasePrice * (vDValue / 100))
                                    else if (vDType === 'amount' && vDValue > 0) vSalePrice = vBasePrice - vDValue

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
                                                    price: vSalePrice,
                                                    mrp: Number(v.mrp || vBasePrice),
                                                    image: v.image_url || product.thumbnail_url,
                                                    quantity: 1,
                                                    variantTitle: v.title,
                                                    categoryId: product.category_id,
                                                    stock: vStock
                                                })
                                                toast.success(`Added ${v.title} to bag`)
                                                setShowVariantSelector(false)
                                                // Update card level success state
                                                setJustAdded(true)
                                                setTimeout(() => setJustAdded(false), 2000)
                                            }}
                                            className={`flex items-center justify-between p-4 rounded-2xl border transition-all group/item
                                                ${isVOut
                                                    ? 'opacity-40 cursor-not-allowed border-slate-50 bg-slate-50/30'
                                                    : 'border-slate-100 hover:border-black hover:bg-slate-50/50 hover:shadow-sm'}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="relative">
                                                    <div className="w-14 h-14 relative rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                                                        <Image src={v.image_url || product.thumbnail_url} fill alt={v.title} className="object-cover" />
                                                    </div>
                                                    {v.hex_code && (
                                                        <div
                                                            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white shadow-md"
                                                            style={{ backgroundColor: v.hex_code }}
                                                        />
                                                    )}
                                                </div>

                                                <div className="text-left space-y-0.5">
                                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-900">{v.title}</p>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-[10px] text-slate-900 font-bold">₹{vSalePrice.toLocaleString()}</p>
                                                        {vSalePrice < vBasePrice && (
                                                            <p className="text-[9px] text-slate-400 line-through">₹{vBasePrice.toLocaleString()}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {isVOut ? (
                                                <span className="text-[8px] font-black uppercase text-slate-300">Out</span>
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-all scale-75 group-hover/item:scale-100">
                                                    <Plus className="w-4 h-4" />
                                                </div>
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}