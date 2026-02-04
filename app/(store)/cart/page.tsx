// "use client"

// import { useCart } from "@/components/store/use-cart"
// import { Button } from "@/components/ui/button"
// import {
//     Minus, Plus, Loader2, ArrowRight, Ticket, RotateCcw, Tag, Trash2, ShoppingBag,
//     ArrowUpRight, Heart
// } from "lucide-react"
// import Link from "next/link"
// import Image from "next/image"
// import { useEffect, useState, useCallback } from "react"
// import { validatePromoCode, getActivePromos } from "@/app/actions/promo"
// import { createClient } from "@/utils/supabase/client"
// import { toast } from "sonner"
// import confetti from "canvas-confetti"
// import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion"

// export default function CartPage() {
//     const { items, removeItem, updateQuantity, appliedPromo, setAppliedPromo, shippingPrice } = useCart()
//     const [mounted, setMounted] = useState(false)
//     const [promoInput, setPromoInput] = useState("")
//     const [isLoading, setIsLoading] = useState(false)
//     const [dbPromos, setDbPromos] = useState<any[]>([])
//     const [showOffers, setShowOffers] = useState(false)
//     const [showSwipeHint, setShowSwipeHint] = useState(true)

//     // State for the Mobile Confirmation Drawer
//     const [pendingItem, setPendingItem] = useState<any | null>(null)
//     const [isWishlisting, setIsWishlisting] = useState(false)

//     const supabase = createClient()

//     const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0)
//     const discountAmount = appliedPromo?.discount || 0
//     const finalTotal = Math.max(0, subtotal + (shippingPrice || 0) - discountAmount)

//     useEffect(() => {
//         setMounted(true)
//         const timer = setTimeout(() => setShowSwipeHint(false), 5000)
//         return () => clearTimeout(timer)
//     }, [])

//     // --- PROMO LOGIC ---
//     const fireLuxuryConfetti = () => {
//         const end = Date.now() + (2 * 1000);
//         const colors = ['#D4AF37', '#C0C0C0', '#FFFFFF', '#FFDF00'];
//         (function frame() {
//             confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.6 }, colors: colors });
//             confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, colors: colors });
//             if (Date.now() < end) requestAnimationFrame(frame);
//         }());
//     };

//     const handleApplyPromo = async (code: string) => {
//         setIsLoading(true)
//         try {
//             const res = await validatePromoCode(code.toUpperCase(), items)
//             if (res.success) {
//                 setAppliedPromo({ code: code.toUpperCase(), discount: res.discount ?? 0 })
//                 fireLuxuryConfetti()
//                 setShowOffers(false)

//             } else { toast.error(res.message) }
//         } finally { setIsLoading(false) }
//     }

//     const loadOffers = useCallback(async () => {
//         try {
//             const data = await getActivePromos()
//             if (!data) return
//             const evaluated = data.map((promo: any) => {
//                 const isGlobal = (!promo.categories?.length) && (!promo.product_ids?.length);
//                 const qItems = items.filter(item => isGlobal || promo.categories?.includes(item.categoryId) || promo.product_ids?.includes(item.productId));
//                 const qSubtotal = qItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
//                 return { ...promo, isEligible: qSubtotal >= (promo.min_order_amount || 0) }
//             });
//             setDbPromos(evaluated);
//         } catch (err) { console.error(err) }
//     }, [items])

//     useEffect(() => { if (mounted) loadOffers() }, [mounted, loadOffers])

//     // --- REMOVAL & WISHLIST LOGIC ---
//     const handleRemoveRequest = (item: any) => {
//         if (window.innerWidth < 768) {
//             setPendingItem(item)
//         } else {
//             removeItem(item.variantId)

//         }
//     }

//     const moveToWishlist = async () => {
//         if (!pendingItem) return
//         setIsWishlisting(true)
//         try {
//             const { data: { user } } = await supabase.auth.getUser()
//             if (!user) {

//                 return
//             }

//             const { error } = await supabase
//                 .from('wishlist')
//                 .insert({
//                     user_id: user.id,
//                     product_id: pendingItem.productId
//                 })

//             if (error) {
//                 if (error.code === '23505') toast.info("Item already in wishlist")
//                 else throw error
//             }

//             removeItem(pendingItem.variantId)
//             setPendingItem(null)

//         } catch (err) {
//             toast.error("Failed to update wishlist")
//         } finally {
//             setIsWishlisting(false)
//         }
//     }

//     if (!mounted) return null

//     if (items.length === 0) return (
//         <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
//             <ShoppingBag className="w-16 h-16 text-zinc-100 mb-6 stroke-[1]" />
//             <h2 className="text-2xl font-serif italic mb-2">Your bag is empty</h2>
//             <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-8">Curate your collection with our latest arrivals</p>
//             <Button asChild className="h-14 bg-zinc-900 text-white rounded-none px-8 text-[10px] font-bold uppercase tracking-[0.3em]">
//                 <Link href="/shop">Start Shopping</Link>
//             </Button>
//         </div>
//     )

//     return (
//         <div className="bg-white min-h-screen text-slate-900 pb-20 overflow-x-hidden">
//             <div className="max-w-5xl mx-auto px-6 py-12 lg:py-20">
//                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">

//                     {/* ITEMS COLUMN */}
//                     <div className="lg:col-span-7">
//                         <div className="flex items-center justify-between mb-10">
//                             <h1 className="text-2xl font-bold tracking-tight uppercase tracking-tighter">Bag ({items.length})</h1>
//                             <AnimatePresence>
//                                 {showSwipeHint && (
//                                     <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="md:hidden flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
//                                         <span className="text-[9px] font-bold uppercase tracking-widest italic">Swipe to remove</span>
//                                         <ArrowRight className="w-3 h-3 rotate-180 animate-pulse" />
//                                     </motion.div>
//                                 )}
//                             </AnimatePresence>
//                         </div>

//                         <div className="space-y-6" onTouchStart={() => setShowSwipeHint(false)}>
//                             <AnimatePresence mode="popLayout">
//                                 {items.map((item) => (
//                                     <CartItemRow
//                                         key={item.variantId}
//                                         item={item}
//                                         onRemove={() => handleRemoveRequest(item)}
//                                         onUpdate={updateQuantity}
//                                     />
//                                 ))}
//                             </AnimatePresence>
//                         </div>
//                     </div>

//                     {/* SUMMARY COLUMN */}
//                     <div className="lg:col-span-5 space-y-6">
//                         <div className="border border-slate-100 p-6 rounded-sm bg-[#fcfcfc] space-y-6">
//                             <div className="flex items-center justify-between border-b pb-4">
//                                 <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2"><Tag className="w-3 h-3" /> Exclusive Rewards</h2>
//                                 {!appliedPromo && (
//                                     <button onClick={() => setShowOffers(!showOffers)} className="text-[9px] font-bold uppercase border-b border-black">
//                                         {showOffers ? "Hide All" : "View All"}
//                                     </button>
//                                 )}
//                             </div>

//                             {appliedPromo ? (
//                                 <div className="bg-black p-4 text-white flex justify-between items-center rounded-sm">
//                                     <div className="flex items-center gap-2">
//                                         <Ticket className="w-4 h-4" />
//                                         <span className="text-[11px] font-bold tracking-widest uppercase">{appliedPromo.code}</span>
//                                     </div>
//                                     <button onClick={() => setAppliedPromo(null)} className="flex items-center gap-1.5 hover:opacity-70 transition-opacity">
//                                         <RotateCcw className="w-3 h-3" />
//                                         <span className="text-[9px] uppercase font-bold">Remove</span>
//                                     </button>
//                                 </div>
//                             ) : (
//                                 <div className="space-y-4">
//                                     {showOffers && (
//                                         <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
//                                             {dbPromos.map((p) => (
//                                                 <div key={p.code} className={`p-4 border flex flex-col gap-2 rounded-sm transition-all ${p.isEligible ? 'bg-white border-slate-200' : 'opacity-50 bg-slate-50 border-transparent'}`}>
//                                                     <div className="flex justify-between items-center">
//                                                         <p className="text-[10px] font-black uppercase tracking-widest">{p.code}</p>
//                                                         {p.isEligible && (
//                                                             <button onClick={() => handleApplyPromo(p.code)} className="text-[9px] font-bold uppercase text-black border-b border-black">Apply</button>
//                                                         )}
//                                                     </div>
//                                                     <p className="text-[10px] text-slate-500 leading-relaxed italic">{p.description}</p>
//                                                 </div>
//                                             ))}
//                                         </div>
//                                     )}
//                                     <div className="flex gap-2">
//                                         <input value={promoInput} onChange={e => setPromoInput(e.target.value.toUpperCase())} placeholder="PROMO CODE" className="flex-grow border border-slate-200 px-4 py-3 text-[10px] uppercase outline-none focus:border-black tracking-widest" />
//                                         <button onClick={() => handleApplyPromo(promoInput)} disabled={isLoading || !promoInput} className="bg-black text-white px-6 py-2 text-[10px] font-bold uppercase disabled:opacity-30">
//                                             {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Apply"}
//                                         </button>
//                                     </div>
//                                 </div>
//                             )}

//                             <div className="space-y-3 pt-4 border-t border-slate-50">
//                                 <div className="flex justify-between text-[11px] uppercase tracking-widest text-slate-400"><span>Subtotal</span><span className="text-black">₹{subtotal.toLocaleString()}</span></div>
//                                 {appliedPromo && <div className="flex justify-between text-[11px] font-bold text-emerald-600 uppercase tracking-widest"><span>Discount</span><span>- ₹{discountAmount.toLocaleString()}</span></div>}
//                                 <div className="flex justify-between text-[11px] uppercase tracking-widest text-slate-400"><span>Shipping</span><span className="text-black italic">{shippingPrice === 0 ? "FREE" : `₹${shippingPrice}`}</span></div>
//                                 <div className="pt-6 border-t flex justify-between items-baseline">
//                                     <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Order Total</span>
//                                     <span className="text-3xl font-light italic">₹{finalTotal.toLocaleString()}</span>
//                                 </div>
//                             </div>
//                             <Button className="w-full h-14 bg-black text-white rounded-none text-[11px] font-bold uppercase tracking-[0.3em] hover:bg-zinc-800 transition-all shadow-xl shadow-slate-100" asChild>
//                                 <Link href="/checkout">Proceed to Checkout <ArrowRight className="w-4 h-4 ml-2" /></Link>
//                             </Button>
//                         </div>
//                     </div>
//                 </div>
//             </div>

//             {/* MOBILE REMOVE/WISHLIST DRAWER */}
//             <AnimatePresence>
//                 {pendingItem && (
//                     <>
//                         <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPendingItem(null)} className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-[4px]" />
//                         <motion.div
//                             initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
//                             transition={{ type: "spring", damping: 25, stiffness: 200 }}
//                             className="fixed bottom-0 left-0 right-0 bg-white z-[101] rounded-t-[40px] p-8 pb-12 shadow-2xl md:hidden"
//                         >
//                             <div className="w-12 h-1.5 bg-zinc-200 rounded-full mx-auto mb-10" />
//                             <div className="flex gap-6 mb-10">
//                                 <div className="relative w-24 h-32 bg-zinc-50 flex-shrink-0 rounded-2xl overflow-hidden border border-zinc-100">
//                                     <Image src={pendingItem.image || "/placeholder.png"} alt={pendingItem.name} fill className="object-cover" />
//                                 </div>
//                                 <div className="flex flex-col justify-center text-left">
//                                     <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-2">Remove from bag?</p>
//                                     <h3 className="text-lg font-bold tracking-tight leading-tight">{pendingItem.name}</h3>
//                                     <p className="text-[11px] text-zinc-500 mt-1 uppercase tracking-widest italic">{pendingItem.variantTitle}</p>
//                                 </div>
//                             </div>

//                             <div className="grid grid-cols-1 gap-4">
//                                 <button
//                                     onClick={moveToWishlist}
//                                     disabled={isWishlisting}
//                                     className="w-full h-16 border border-zinc-200 flex items-center justify-center gap-3 text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl active:scale-[0.98] transition-all"
//                                 >
//                                     {isWishlisting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" />}
//                                     Move to Wishlist
//                                 </button>
//                                 <button
//                                     onClick={() => { removeItem(pendingItem.variantId); setPendingItem(null); toast.success("Removed"); }}
//                                     className="w-full h-16 bg-red-50 text-red-600 flex items-center justify-center gap-3 text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl active:scale-[0.98] transition-all"
//                                 >
//                                     <Trash2 className="w-4 h-4" />
//                                     Remove Item
//                                 </button>
//                                 <button onClick={() => setPendingItem(null)} className="w-full py-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Cancel</button>
//                             </div>
//                         </motion.div>
//                     </>
//                 )}
//             </AnimatePresence>
//         </div>
//     )
// }

// function CartItemRow({ item, onRemove, onUpdate }: { item: any, onRemove: () => void, onUpdate: any }) {
//     const x = useMotionValue(0)
//     const opacity = useTransform(x, [-100, -60, 0], [1, 1, 0])
//     const scale = useTransform(x, [-100, -60, 0], [1, 0.9, 0.5])

//     const handleDragEnd = (_: any, info: any) => {
//         if (info.offset.x < -100) {
//             onRemove()
//             x.set(0) // Snap back for reuse
//         } else {
//             x.set(0)
//         }
//     }

//     return (
//         <div className="relative overflow-hidden rounded-sm group">
//             <motion.div style={{ opacity, scale }} className="absolute inset-0 bg-red-500 flex items-center justify-end px-10 text-white pointer-events-none">
//                 <Trash2 className="w-6 h-6" />
//             </motion.div>

//             <motion.div
//                 drag="x" dragConstraints={{ left: -120, right: 0 }} dragElastic={0.05}
//                 onDragEnd={handleDragEnd} style={{ x }} layout
//                 className="relative bg-white flex gap-6 p-4 border border-slate-100 rounded-sm touch-pan-y z-10"
//             >
//                 <div className="relative w-24 h-32 bg-slate-50 flex-shrink-0">
//                     <Image src={item.image || "/placeholder.png"} alt={item.name} fill className="object-cover" />
//                 </div>
//                 <div className="flex-grow flex flex-col justify-between text-left">
//                     <div className="flex justify-between items-start">
//                         <div className="max-w-[200px]">
//                             <h3 className="text-xs font-bold uppercase tracking-tight truncate">{item.name}</h3>
//                             <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">{item.variantTitle}</p>
//                         </div>
//                         <button onClick={onRemove} className="hidden md:block text-slate-300 hover:text-red-500 transition-colors">
//                             <Trash2 className="w-4 h-4" />
//                         </button>
//                     </div>
//                     <div className="flex items-center justify-between mt-4">
//                         <div className="flex items-center border border-slate-100 rounded-full overflow-hidden bg-slate-50">
//                             <button onClick={() => onUpdate(item.variantId, item.quantity - 1)} className="px-3 py-1.5 hover:bg-white transition-colors"><Minus className="w-3 h-3" /></button>
//                             <span className="text-[11px] font-bold px-2 tabular-nums">{item.quantity}</span>
//                             <button onClick={() => onUpdate(item.variantId, item.quantity + 1)} className="px-3 py-1.5 hover:bg-white transition-colors"><Plus className="w-3 h-3" /></button>
//                         </div>
//                         <p className="text-sm font-bold tracking-tight">₹{(item.price * item.quantity).toLocaleString()}</p>
//                     </div>
//                 </div>
//             </motion.div>
//         </div>
//     )
// }

"use client"

import { useCart } from "@/components/store/use-cart"
import { Button } from "@/components/ui/button"
import {
    Minus, Plus, Loader2, ArrowRight, Ticket, RotateCcw, Tag, Trash2, ShoppingBag,
    Heart, Sparkles
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useEffect, useState, useCallback } from "react"
import { validatePromoCode, getActivePromos } from "@/app/actions/promo"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import confetti from "canvas-confetti"
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion"
import { ProductCard } from "@/components/store/product-card" // Ensure this path is correct

export default function CartPage() {
    const { items, removeItem, updateQuantity, appliedPromo, setAppliedPromo, shippingPrice } = useCart()
    const [mounted, setMounted] = useState(false)
    const [promoInput, setPromoInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [dbPromos, setDbPromos] = useState<any[]>([])
    const [showOffers, setShowOffers] = useState(false)
    const [showSwipeHint, setShowSwipeHint] = useState(true)
    const [recommendations, setRecommendations] = useState<any[]>([])

    // State for the Mobile Confirmation Drawer
    const [pendingItem, setPendingItem] = useState<any | null>(null)
    const [isWishlisting, setIsWishlisting] = useState(false)

    const supabase = createClient()

    const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0)
    const discountAmount = appliedPromo?.discount || 0
    const finalTotal = Math.max(0, subtotal + (shippingPrice || 0) - discountAmount)

    useEffect(() => {
        setMounted(true)
        const timer = setTimeout(() => setShowSwipeHint(false), 5000)
        fetchRecommendations()
        return () => clearTimeout(timer)
    }, [])

    const fetchRecommendations = async () => {
        // Fetching products including their variants to satisfy ProductCard requirements
        const { data, error } = await supabase
            .from('products')
            .select(`
                *,
                product_variants (*)
            `)
            .eq('status', 'active')
            .limit(4)

        if (!error && data) setRecommendations(data)
    }

    const fireLuxuryConfetti = () => {
        const end = Date.now() + (2 * 1000);
        const colors = ['#D4AF37', '#C0C0C0', '#FFFFFF', '#FFDF00'];
        (function frame() {
            confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.6 }, colors: colors });
            confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, colors: colors });
            if (Date.now() < end) requestAnimationFrame(frame);
        }());
    };

    const handleApplyPromo = async (code: string) => {
        setIsLoading(true)
        try {
            const res = await validatePromoCode(code.toUpperCase(), items)
            if (res.success) {
                setAppliedPromo({ code: code.toUpperCase(), discount: res.discount ?? 0 })
                fireLuxuryConfetti()
                setShowOffers(false)
                toast.success("Promo applied!")
            } else { toast.error(res.message) }
        } finally { setIsLoading(false) }
    }

    const loadOffers = useCallback(async () => {
        try {
            const data = await getActivePromos()
            if (!data) return
            const evaluated = data.map((promo: any) => {
                const isGlobal = (!promo.categories?.length) && (!promo.product_ids?.length);
                const qItems = items.filter(item => isGlobal || promo.categories?.includes(item.categoryId) || promo.product_ids?.includes(item.productId));
                const qSubtotal = qItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
                return { ...promo, isEligible: qSubtotal >= (promo.min_order_amount || 0) }
            });
            setDbPromos(evaluated);
        } catch (err) { console.error(err) }
    }, [items])

    useEffect(() => { if (mounted) loadOffers() }, [mounted, loadOffers])

    const handleRemoveRequest = (item: any) => {
        if (window.innerWidth < 768) {
            setPendingItem(item)
        } else {
            removeItem(item.variantId)
            toast.success("Removed from bag")
        }
    }

    const moveToWishlist = async () => {
        if (!pendingItem) return
        setIsWishlisting(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                toast.error("Please login to save to wishlist")
                return
            }
            const { error } = await supabase
                .from('wishlist')
                .insert({ user_id: user.id, product_id: pendingItem.productId })

            if (error) {
                if (error.code === '23505') toast.info("Item already in wishlist")
                else throw error
            }
            removeItem(pendingItem.variantId)
            setPendingItem(null)
            toast.success("Moved to wishlist")
        } catch (err) {
            toast.error("Failed to update wishlist")
        } finally {
            setIsWishlisting(false)
        }
    }

    if (!mounted) return null

    // --- EMPTY STATE ---
    if (items.length === 0) return (
        <div className="min-h-screen bg-white">
            <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
                <div className="relative mb-8">
                    <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8 text-slate-200 stroke-[1]" />
                    </div>
                    <motion.div
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="absolute -top-1 -right-1 text-slate-900"
                    >
                        <Sparkles className="w-5 h-5 fill-current" />
                    </motion.div>
                </div>
                <h2 className="text-3xl font-bold tracking-tight mb-2 uppercase">Your bag is empty</h2>
                <p className="text-[11px] text-slate-400 uppercase tracking-[0.2em] mb-10 max-w-[280px] leading-relaxed">
                    Elevate your collection with our curated essentials.
                </p>
                <Button asChild className="h-14 bg-black text-white rounded-none px-12 text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-slate-800 transition-all">
                    <Link href="/shop">Explore Collections</Link>
                </Button>
            </div>

            {/* Popular Items via ProductCard */}
            {recommendations.length > 0 && (
                <div className="max-w-6xl mx-auto px-6 pb-24">
                    <div className="flex items-center justify-between mb-10 border-b border-slate-100 pb-5">
                        <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Handpicked</span>
                            <h3 className="text-xl font-bold uppercase tracking-tight text-slate-900">Popular Additions</h3>
                        </div>
                        <Link href="/shop" className="text-[10px] font-black uppercase tracking-widest text-slate-900 border-b-2 border-black pb-1">View All</Link>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-10">
                        {recommendations.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )

    return (
        <div className="bg-white min-h-screen text-slate-900 pb-20 overflow-x-hidden">
            <div className="max-w-5xl mx-auto px-6 py-12 lg:py-20">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                    {/* ITEMS COLUMN */}
                    <div className="lg:col-span-7">
                        <div className="flex items-center justify-between mb-10">
                            <h1 className="text-2xl font-black tracking-tighter uppercase">Shopping Bag ({items.length})</h1>
                            <AnimatePresence>
                                {showSwipeHint && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="md:hidden flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
                                        <span className="text-[9px] font-bold uppercase tracking-widest italic">Swipe to remove</span>
                                        <ArrowRight className="w-3 h-3 rotate-180 animate-pulse" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        <div className="space-y-6" onTouchStart={() => setShowSwipeHint(false)}>
                            <AnimatePresence mode="popLayout">
                                {items.map((item) => (
                                    <CartItemRow key={item.variantId} item={item} onRemove={() => handleRemoveRequest(item)} onUpdate={updateQuantity} />
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* SUMMARY COLUMN */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="border border-slate-100 p-8 rounded-xl bg-slate-50/30 space-y-6">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                                <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><Tag className="w-3.5 h-3.5" /> Rewards</h2>
                                {!appliedPromo && <button onClick={() => setShowOffers(!showOffers)} className="text-[10px] font-black uppercase border-b-2 border-slate-900">{showOffers ? "Close" : "Offers"}</button>}
                            </div>

                            {appliedPromo ? (
                                <div className="bg-slate-900 p-4 text-white flex justify-between items-center rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <Ticket className="w-4 h-4 text-emerald-400" />
                                        <span className="text-[11px] font-black tracking-widest uppercase">{appliedPromo.code}</span>
                                    </div>
                                    <button onClick={() => setAppliedPromo(null)} className="flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        <span className="text-[9px] uppercase font-black">Reset</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {showOffers && (
                                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                            {dbPromos.map((p) => (
                                                <div key={p.code} className={`p-4 border-2 transition-all rounded-xl ${p.isEligible ? 'bg-white border-slate-100' : 'opacity-40 bg-slate-100 border-transparent'}`}>
                                                    <div className="flex justify-between items-center mb-1">
                                                        <p className="text-[11px] font-black uppercase tracking-widest">{p.code}</p>
                                                        {p.isEligible && <button onClick={() => handleApplyPromo(p.code)} className="text-[9px] font-black uppercase text-emerald-600">Apply</button>}
                                                    </div>
                                                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{p.description}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div className="flex gap-2">
                                        <input value={promoInput} onChange={e => setPromoInput(e.target.value.toUpperCase())} placeholder="CODE" className="flex-grow bg-white border border-slate-200 px-5 py-3.5 text-[11px] font-bold uppercase rounded-xl outline-none focus:border-black transition-all" />
                                        <button onClick={() => handleApplyPromo(promoInput)} disabled={isLoading || !promoInput} className="bg-black text-white px-8 py-2 text-[10px] font-black uppercase rounded-xl disabled:opacity-20">
                                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4 pt-4">
                                <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-slate-400"><span>Subtotal</span><span className="text-slate-900">₹{subtotal.toLocaleString()}</span></div>
                                {appliedPromo && <div className="flex justify-between text-[11px] font-black text-emerald-600 uppercase tracking-widest"><span>Discount</span><span>- ₹{discountAmount.toLocaleString()}</span></div>}
                                <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-slate-400"><span>Shipping</span><span className="text-slate-900 italic font-black">{shippingPrice === 0 ? "COMPLIMENTARY" : `₹${shippingPrice}`}</span></div>
                                <div className="pt-8 border-t border-slate-100 flex justify-between items-center">
                                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900">Total</span>
                                    <span className="text-3xl font-black tracking-tighter italic">₹{finalTotal.toLocaleString()}</span>
                                </div>
                            </div>
                            <Button className="w-full h-16 bg-black text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-slate-200" asChild>
                                <Link href="/checkout">Checkout <ArrowRight className="w-4 h-4 ml-2" /></Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* MOBILE REMOVE/WISHLIST DRAWER */}
            <AnimatePresence>
                {pendingItem && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPendingItem(null)} className="fixed inset-0 bg-slate-900/60 z-[100] backdrop-blur-md" />
                        <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed bottom-0 left-0 right-0 bg-white z-[101] rounded-t-[3rem] p-8 pb-12 shadow-2xl md:hidden">
                            <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-10" />
                            <div className="flex gap-6 mb-12">
                                <div className="relative w-24 h-32 bg-slate-50 flex-shrink-0 rounded-2xl overflow-hidden border border-slate-100">
                                    <Image src={pendingItem.image || "/placeholder.png"} alt={pendingItem.name} fill className="object-cover" />
                                </div>
                                <div className="flex flex-col justify-center text-left">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Remove item?</p>
                                    <h3 className="text-xl font-bold tracking-tight leading-tight">{pendingItem.name}</h3>
                                    <p className="text-[11px] text-slate-500 mt-1 uppercase tracking-widest font-bold">{pendingItem.variantTitle}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                <button onClick={moveToWishlist} disabled={isWishlisting} className="w-full h-16 border-2 border-slate-100 flex items-center justify-center gap-3 text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl active:scale-95 transition-all">
                                    {isWishlisting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" />} Save to Wishlist
                                </button>
                                <button onClick={() => { removeItem(pendingItem.variantId); setPendingItem(null); toast.success("Removed"); }} className="w-full h-16 bg-red-50 text-red-600 flex items-center justify-center gap-3 text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl active:scale-95 transition-all">
                                    <Trash2 className="w-4 h-4" /> Remove Item
                                </button>
                                <button onClick={() => setPendingItem(null)} className="w-full py-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-300">Keep it</button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}

function CartItemRow({ item, onRemove, onUpdate }: { item: any, onRemove: () => void, onUpdate: any }) {
    const x = useMotionValue(0)
    const opacity = useTransform(x, [-100, -60, 0], [1, 1, 0])
    const scale = useTransform(x, [-100, -60, 0], [1, 0.9, 0.5])
    const handleDragEnd = (_: any, info: any) => { if (info.offset.x < -100) { onRemove(); x.set(0); } else { x.set(0); } }

    return (
        <div className="relative overflow-hidden rounded-2xl group">
            <motion.div style={{ opacity, scale }} className="absolute inset-0 bg-red-500 flex items-center justify-end px-12 text-white pointer-events-none">
                <Trash2 className="w-7 h-7" />
            </motion.div>
            <motion.div drag="x" dragConstraints={{ left: -120, right: 0 }} dragElastic={0.05} onDragEnd={handleDragEnd} style={{ x }} layout className="relative bg-white flex gap-6 p-5 border border-slate-100 rounded-2xl touch-pan-y z-10">
                <div className="relative w-24 h-32 bg-slate-50 flex-shrink-0 rounded-xl overflow-hidden">
                    <Image src={item.image || "/placeholder.png"} alt={item.name} fill className="object-cover" />
                </div>
                <div className="flex-grow flex flex-col justify-between text-left">
                    <div className="flex justify-between items-start">
                        <div className="max-w-[220px]">
                            <h3 className="text-sm font-bold uppercase tracking-tight truncate">{item.name}</h3>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">{item.variantTitle}</p>
                        </div>
                        <button onClick={onRemove} className="hidden md:block text-slate-200 hover:text-red-500 transition-colors">
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center border border-slate-100 rounded-xl overflow-hidden bg-slate-50">
                            <button onClick={() => onUpdate(item.variantId, item.quantity - 1)} className="px-4 py-2 hover:bg-white transition-colors"><Minus className="w-3 h-3" /></button>
                            <span className="text-[12px] font-black px-2 tabular-nums">{item.quantity}</span>
                            <button onClick={() => onUpdate(item.variantId, item.quantity + 1)} className="px-4 py-2 hover:bg-white transition-colors"><Plus className="w-3 h-3" /></button>
                        </div>
                        <p className="text-base font-black tracking-tight">₹{(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}