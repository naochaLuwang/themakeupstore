// "use client"

// import { useCart } from "@/components/store/use-cart"
// import { Button } from "@/components/ui/button"
// import {
//     Minus, Plus, Loader2, ArrowRight, Ticket, RotateCcw, Tag, Trash2, ShoppingBag, ChevronRight
// } from "lucide-react"
// import Link from "next/link"
// import Image from "next/image"
// import { useEffect, useState, useCallback } from "react"
// import { validatePromoCode, getActivePromos } from "@/app/actions/promo"
// import { toast } from "sonner"
// import confetti from "canvas-confetti"
// import { motion, AnimatePresence } from "framer-motion"

// export default function CartPage() {
//     const { items, removeItem, updateQuantity, appliedPromo, setAppliedPromo, shippingPrice } = useCart()
//     const [mounted, setMounted] = useState(false)
//     const [promoInput, setPromoInput] = useState("")
//     const [isLoading, setIsLoading] = useState(false)
//     const [dbPromos, setDbPromos] = useState<any[]>([])
//     const [showOffers, setShowOffers] = useState(false)

//     const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0)
//     const discountAmount = appliedPromo?.discount || 0
//     const finalTotal = Math.max(0, subtotal + (shippingPrice || 0) - discountAmount)

//     useEffect(() => { setMounted(true) }, [])

//     // Side-burst Gold and Silver Confetti
//     const fireLuxuryConfetti = () => {
//         const end = Date.now() + (2 * 1000);
//         const colors = ['#D4AF37', '#C0C0C0', '#FFFFFF', '#FFDF00']; // Gold, Silver, White, Bright Gold

//         (function frame() {
//             confetti({
//                 particleCount: 3,
//                 angle: 60,
//                 spread: 55,
//                 origin: { x: 0, y: 0.6 },
//                 colors: colors
//             });
//             confetti({
//                 particleCount: 3,
//                 angle: 120,
//                 spread: 55,
//                 origin: { x: 1, y: 0.6 },
//                 colors: colors
//             });

//             if (Date.now() < end) {
//                 requestAnimationFrame(frame);
//             }
//         }());
//     };

//     useEffect(() => {
//         if (!mounted || !appliedPromo || items.length === 0) return;
//         const sync = async () => {
//             const res = await validatePromoCode(appliedPromo.code, items);
//             if (!res.success) {
//                 setAppliedPromo(null);
//                 toast.error("Cart conditions no longer meet promo requirements");
//             } else if (res.discount !== appliedPromo.discount) {
//                 setAppliedPromo({ code: appliedPromo.code, discount: res.discount ?? 0 });
//             }
//         };
//         const timer = setTimeout(sync, 500);
//         return () => clearTimeout(timer);
//     }, [items, appliedPromo, mounted]);

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

//     const handleApplyPromo = async (code: string) => {
//         setIsLoading(true)
//         try {
//             const res = await validatePromoCode(code.toUpperCase(), items)
//             if (res.success) {
//                 setAppliedPromo({ code: code.toUpperCase(), discount: res.discount ?? 0 })
//                 fireLuxuryConfetti();
//                 setShowOffers(false);
//                 toast.success("Promo applied successfully!");
//             } else { toast.error(res.message) }
//         } finally { setIsLoading(false) }
//     }

//     if (!mounted) return null
//     if (items.length === 0) return (
//         <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
//             <ShoppingBag className="w-12 h-12 text-slate-200 mb-4 stroke-[1]" />
//             <h1 className="text-xl font-medium tracking-tight mb-2">Your bag is empty</h1>
//             <Button asChild variant="link" className="text-slate-500 underline underline-offset-4 font-bold uppercase text-[10px] tracking-widest">
//                 <Link href="/shop">Continue Shopping</Link>
//             </Button>
//         </div>
//     )

//     return (
//         <div className="bg-white min-h-screen text-slate-900 pb-20">
//             <div className="max-w-5xl mx-auto px-6 py-12 lg:py-20">
//                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">

//                     {/* ITEMS COLUMN */}
//                     <div className="lg:col-span-7">
//                         <h1 className="text-2xl font-bold mb-10 tracking-tight">Shopping Bag ({items.length})</h1>
//                         <div className="space-y-6">
//                             <AnimatePresence mode="popLayout">
//                                 {items.map((item) => (
//                                     <motion.div key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex gap-6 p-4 border border-slate-100 rounded-sm">
//                                         <div className="relative w-20 h-28 bg-slate-50 flex-shrink-0">
//                                             <Image src={item.image || "/placeholder.png"} alt={item.name} fill className="object-cover" />
//                                         </div>
//                                         <div className="flex-grow flex flex-col justify-between">
//                                             <div className="flex justify-between items-start">
//                                                 <div>
//                                                     <h3 className="text-[11px] font-bold uppercase tracking-tight">{item.name}</h3>
//                                                     <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">{item.variantTitle}</p>
//                                                 </div>
//                                                 <button onClick={() => removeItem(item.variantId)} className="text-slate-300 hover:text-red-500 transition-colors">
//                                                     <Trash2 className="w-4 h-4" />
//                                                 </button>
//                                             </div>
//                                             <div className="flex items-center justify-between mt-4">
//                                                 <div className="flex items-center border border-slate-100 rounded-sm overflow-hidden bg-slate-50">
//                                                     <button onClick={() => updateQuantity(item.variantId, item.quantity - 1)} className="px-2 py-1 hover:bg-white transition-colors"><Minus className="w-3 h-3" /></button>
//                                                     <span className="text-[10px] font-bold px-2 tabular-nums">{item.quantity}</span>
//                                                     <button onClick={() => updateQuantity(item.variantId, item.quantity + 1)} className="px-2 py-1 hover:bg-white transition-colors"><Plus className="w-3 h-3" /></button>
//                                                 </div>
//                                                 <p className="text-sm font-bold">₹{(item.price * item.quantity).toLocaleString()}</p>
//                                             </div>
//                                         </div>
//                                     </motion.div>
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
//                                                         {p.isEligible ? (
//                                                             <button onClick={() => handleApplyPromo(p.code)} className="text-[9px] font-bold uppercase text-black border-b border-black">Apply</button>
//                                                         ) : (
//                                                             <span className="text-[8px] font-bold uppercase text-slate-400">Not Eligible</span>
//                                                         )}
//                                                     </div>
//                                                     {/* Description: No truncate, high readability */}
//                                                     <p className="text-[10px] text-slate-500 leading-relaxed italic">
//                                                         {p.description}
//                                                     </p>
//                                                 </div>
//                                             ))}
//                                         </div>
//                                     )}
//                                     <div className="flex gap-2">
//                                         <input
//                                             value={promoInput}
//                                             onChange={e => setPromoInput(e.target.value.toUpperCase())}
//                                             placeholder="ENTER PROMO CODE"
//                                             className="flex-grow border border-slate-200 px-4 py-3 text-[10px] uppercase outline-none focus:border-black transition-colors tracking-widest font-medium"
//                                         />
//                                         <button
//                                             onClick={() => handleApplyPromo(promoInput)}
//                                             disabled={isLoading || !promoInput}
//                                             className="bg-black text-white px-6 py-2 text-[10px] font-bold uppercase disabled:opacity-30 transition-all active:scale-95"
//                                         >
//                                             {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Apply"}
//                                         </button>
//                                     </div>
//                                 </div>
//                             )}

//                             <div className="space-y-3 pt-4 border-t border-slate-50">
//                                 <div className="flex justify-between text-[11px] uppercase tracking-widest text-slate-400"><span>Subtotal</span><span className="text-black font-medium">₹{subtotal.toLocaleString()}</span></div>
//                                 {appliedPromo && <div className="flex justify-between text-[11px] font-bold text-emerald-600 uppercase tracking-widest"><span>Discount</span><span>- ₹{discountAmount.toLocaleString()}</span></div>}
//                                 <div className="flex justify-between text-[11px] uppercase tracking-widest text-slate-400"><span>Shipping</span><span className="text-black italic">{shippingPrice === 0 ? "FREE" : `₹${shippingPrice}`}</span></div>
//                                 <div className="pt-6 border-t flex justify-between items-baseline">
//                                     <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Order Total</span>
//                                     <span className="text-3xl font-light tracking-tighter italic">₹{finalTotal.toLocaleString()}</span>
//                                 </div>
//                             </div>
//                             <Button className="w-full h-14 bg-black text-white rounded-none text-[11px] font-bold uppercase tracking-[0.3em] hover:bg-zinc-800 transition-all shadow-xl shadow-slate-100" asChild>
//                                 <Link href="/checkout">Proceed to Checkout <ArrowRight className="w-4 h-4 ml-2" /></Link>
//                             </Button>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     )
// }


"use client"

import { useCart } from "@/components/store/use-cart"
import { Button } from "@/components/ui/button"
import {
    Minus, Plus, Loader2, ArrowRight, Ticket, RotateCcw, Tag, Trash2, ShoppingBag
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useEffect, useState, useCallback } from "react"
import { validatePromoCode, getActivePromos } from "@/app/actions/promo"
import { toast } from "sonner"
import confetti from "canvas-confetti"
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion"

export default function CartPage() {
    const { items, removeItem, updateQuantity, appliedPromo, setAppliedPromo, shippingPrice } = useCart()
    const [mounted, setMounted] = useState(false)
    const [promoInput, setPromoInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [dbPromos, setDbPromos] = useState<any[]>([])
    const [showOffers, setShowOffers] = useState(false)
    const [showSwipeHint, setShowSwipeHint] = useState(true)

    const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0)
    const discountAmount = appliedPromo?.discount || 0
    const finalTotal = Math.max(0, subtotal + (shippingPrice || 0) - discountAmount)

    useEffect(() => {
        setMounted(true)
        // Hide hint after 5 seconds
        const timer = setTimeout(() => setShowSwipeHint(false), 5000)
        return () => clearTimeout(timer)
    }, [])

    const fireLuxuryConfetti = () => {
        const end = Date.now() + (2 * 1000);
        const colors = ['#D4AF37', '#C0C0C0', '#FFFFFF', '#FFDF00'];
        (function frame() {
            confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.6 }, colors: colors });
            confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, colors: colors });
            if (Date.now() < end) requestAnimationFrame(frame);
        }());
    };

    useEffect(() => {
        if (!mounted || !appliedPromo || items.length === 0) return;
        const sync = async () => {
            const res = await validatePromoCode(appliedPromo.code, items);
            if (!res.success) {
                setAppliedPromo(null);
                toast.error("Cart conditions no longer meet promo requirements");
            } else if (res.discount !== appliedPromo.discount) {
                setAppliedPromo({ code: appliedPromo.code, discount: res.discount ?? 0 });
            }
        };
        const timer = setTimeout(sync, 500);
        return () => clearTimeout(timer);
    }, [items, appliedPromo, mounted, setAppliedPromo]);

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

    const handleApplyPromo = async (code: string) => {
        setIsLoading(true)
        try {
            const res = await validatePromoCode(code.toUpperCase(), items)
            if (res.success) {
                setAppliedPromo({ code: code.toUpperCase(), discount: res.discount ?? 0 })
                fireLuxuryConfetti();
                setShowOffers(false);
                toast.success("Promo applied successfully!");
            } else { toast.error(res.message) }
        } finally { setIsLoading(false) }
    }

    if (!mounted) return null
    if (items.length === 0) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
            <ShoppingBag className="w-12 h-12 text-slate-200 mb-4 stroke-[1]" />
            <h1 className="text-xl font-medium tracking-tight mb-2">Your bag is empty</h1>
            <Button asChild variant="link" className="text-slate-500 underline underline-offset-4 font-bold uppercase text-[10px] tracking-widest">
                <Link href="/shop">Continue Shopping</Link>
            </Button>
        </div>
    )

    return (
        <div className="bg-white min-h-screen text-slate-900 pb-20 overflow-x-hidden">
            <div className="max-w-5xl mx-auto px-6 py-12 lg:py-20">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">

                    {/* ITEMS COLUMN */}
                    <div className="lg:col-span-7">
                        <div className="flex items-center justify-between mb-10">
                            <h1 className="text-2xl font-bold tracking-tight">Shopping Bag ({items.length})</h1>

                            {/* MOBILE SWIPE HINT */}
                            <AnimatePresence>
                                {showSwipeHint && (
                                    <motion.div
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="md:hidden flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full"
                                    >
                                        <span className="text-[9px] font-bold uppercase tracking-widest italic">Swipe to remove</span>
                                        <motion.div animate={{ x: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                                            <ArrowRight className="w-3 h-3 rotate-180" />
                                        </motion.div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="space-y-6" onTouchStart={() => setShowSwipeHint(false)}>
                            <AnimatePresence mode="popLayout">
                                {items.map((item) => (
                                    <CartItemRow
                                        key={item.variantId}
                                        item={item}
                                        onRemove={() => removeItem(item.variantId)}
                                        onUpdate={updateQuantity}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* SUMMARY COLUMN */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="border border-slate-100 p-6 rounded-sm bg-[#fcfcfc] space-y-6">
                            <div className="flex items-center justify-between border-b pb-4">
                                <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2"><Tag className="w-3 h-3" /> Exclusive Rewards</h2>
                                {!appliedPromo && (
                                    <button onClick={() => setShowOffers(!showOffers)} className="text-[9px] font-bold uppercase border-b border-black">
                                        {showOffers ? "Hide All" : "View All"}
                                    </button>
                                )}
                            </div>

                            {appliedPromo ? (
                                <div className="bg-black p-4 text-white flex justify-between items-center rounded-sm">
                                    <div className="flex items-center gap-2">
                                        <Ticket className="w-4 h-4" />
                                        <span className="text-[11px] font-bold tracking-widest uppercase">{appliedPromo.code}</span>
                                    </div>
                                    <button onClick={() => setAppliedPromo(null)} className="flex items-center gap-1.5 hover:opacity-70 transition-opacity">
                                        <RotateCcw className="w-3 h-3" />
                                        <span className="text-[9px] uppercase font-bold">Remove</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {showOffers && (
                                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                            {dbPromos.map((p) => (
                                                <div key={p.code} className={`p-4 border flex flex-col gap-2 rounded-sm transition-all ${p.isEligible ? 'bg-white border-slate-200' : 'opacity-50 bg-slate-50 border-transparent'}`}>
                                                    <div className="flex justify-between items-center">
                                                        <p className="text-[10px] font-black uppercase tracking-widest">{p.code}</p>
                                                        {p.isEligible ? (
                                                            <button onClick={() => handleApplyPromo(p.code)} className="text-[9px] font-bold uppercase text-black border-b border-black">Apply</button>
                                                        ) : (
                                                            <span className="text-[8px] font-bold uppercase text-slate-400">Not Eligible</span>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-slate-500 leading-relaxed italic">{p.description}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div className="flex gap-2">
                                        <input
                                            value={promoInput}
                                            onChange={e => setPromoInput(e.target.value.toUpperCase())}
                                            placeholder="ENTER PROMO CODE"
                                            className="flex-grow border border-slate-200 px-4 py-3 text-[10px] uppercase outline-none focus:border-black transition-colors tracking-widest font-medium"
                                        />
                                        <button
                                            onClick={() => handleApplyPromo(promoInput)}
                                            disabled={isLoading || !promoInput}
                                            className="bg-black text-white px-6 py-2 text-[10px] font-bold uppercase disabled:opacity-30 transition-all active:scale-95"
                                        >
                                            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Apply"}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3 pt-4 border-t border-slate-50">
                                <div className="flex justify-between text-[11px] uppercase tracking-widest text-slate-400"><span>Subtotal</span><span className="text-black font-medium">₹{subtotal.toLocaleString()}</span></div>
                                {appliedPromo && <div className="flex justify-between text-[11px] font-bold text-emerald-600 uppercase tracking-widest"><span>Discount</span><span>- ₹{discountAmount.toLocaleString()}</span></div>}
                                <div className="flex justify-between text-[11px] uppercase tracking-widest text-slate-400"><span>Shipping</span><span className="text-black italic">{shippingPrice === 0 ? "FREE" : `₹${shippingPrice}`}</span></div>
                                <div className="pt-6 border-t flex justify-between items-baseline">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Order Total</span>
                                    <span className="text-3xl font-light tracking-tighter italic">₹{finalTotal.toLocaleString()}</span>
                                </div>
                            </div>
                            <Button className="w-full h-14 bg-black text-white rounded-none text-[11px] font-bold uppercase tracking-[0.3em] hover:bg-zinc-800 transition-all shadow-xl shadow-slate-100" asChild>
                                <Link href="/checkout">Proceed to Checkout <ArrowRight className="w-4 h-4 ml-2" /></Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

/**
 * SUB-COMPONENT: CartItemRow
 * Handles Swipe-to-Left logic
 */
function CartItemRow({ item, onRemove, onUpdate }: { item: any, onRemove: () => void, onUpdate: any }) {
    const x = useMotionValue(0)

    // UI mapping for the red delete background
    const opacity = useTransform(x, [-100, -60, 0], [1, 1, 0])
    const scale = useTransform(x, [-100, -60, 0], [1, 0.9, 0.5])

    const handleDragEnd = (_: any, info: any) => {
        // If swiped more than 100px left, remove it
        if (info.offset.x < -100) {
            onRemove()
        }
    }

    return (
        <div className="relative overflow-hidden rounded-sm group">
            {/* UNDERLAY: Red background revealed on swipe */}
            <motion.div
                style={{ opacity, scale }}
                className="absolute inset-0 bg-red-500 flex items-center justify-end px-8 text-white pointer-events-none"
            >
                <div className="flex flex-col items-center gap-1">
                    <Trash2 className="w-5 h-5" />
                    <span className="text-[8px] font-bold uppercase tracking-widest">Remove</span>
                </div>
            </motion.div>

            {/* DRAGGABLE FOREGROUND */}
            <motion.div
                drag="x"
                dragConstraints={{ left: -120, right: 0 }}
                dragElastic={0.05}
                onDragEnd={handleDragEnd}
                style={{ x }}
                layout
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100, transition: { duration: 0.2 } }}
                className="relative bg-white flex gap-6 p-4 border border-slate-100 rounded-sm touch-pan-y z-10"
            >
                <div className="relative w-20 h-28 bg-slate-50 flex-shrink-0">
                    <Image src={item.image || "/placeholder.png"} alt={item.name} fill className="object-cover" />
                </div>
                <div className="flex-grow flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div className="max-w-[180px]">
                            <h3 className="text-[11px] font-bold uppercase tracking-tight truncate">{item.name}</h3>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">{item.variantTitle}</p>
                        </div>
                        {/* Desktop Remove Button */}
                        <button onClick={onRemove} className="hidden md:block text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center border border-slate-100 rounded-sm overflow-hidden bg-slate-50">
                            <button onClick={() => onUpdate(item.variantId, item.quantity - 1)} className="px-2 py-1 hover:bg-white transition-colors"><Minus className="w-3 h-3" /></button>
                            <span className="text-[10px] font-bold px-2 tabular-nums">{item.quantity}</span>
                            <button onClick={() => onUpdate(item.variantId, item.quantity + 1)} className="px-2 py-1 hover:bg-white transition-colors"><Plus className="w-3 h-3" /></button>
                        </div>
                        <p className="text-sm font-bold">₹{(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}