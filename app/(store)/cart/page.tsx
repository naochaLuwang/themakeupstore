// "use client"

// import { useCart } from "@/components/store/use-cart"
// import { Button } from "@/components/ui/button"
// import {
//     Minus, Plus, Trash2, ShoppingBag,
//     Lock, RefreshCcw, Sparkles, Heart, X,
//     ChevronLeft, ChevronRight
// } from "lucide-react"
// import Link from "next/link"
// import Image from "next/image"
// import { useEffect, useState, useMemo } from "react"
// import { createClient } from "@/utils/supabase/client"
// import { toast } from "sonner"
// import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion"
// import { ProductCard } from "@/components/store/product-card"

// export default function CartPage() {
//     const { items, removeItem, updateQuantity } = useCart() as any
//     const [mounted, setMounted] = useState(false)
//     const [recommendations, setRecommendations] = useState<any[]>([])
//     const [pendingItem, setPendingItem] = useState<any | null>(null)

//     const supabase = createClient()

//     useEffect(() => {
//         setMounted(true)
//         const fetchContextualRecommendations = async () => {
//             if (items.length === 0) return

//             try {
//                 // Get the first item's ID to exclude it and find its category
//                 const firstItemInCart = items[0]
//                 const cartProductIds = items.map((i: any) => i.productId)

//                 // 1. Fetch the actual product data for the first item to get its category_id 
//                 // (In case the cart state doesn't store category_id)
//                 const { data: referenceProduct } = await supabase
//                     .from('products')
//                     .select('category_id, brand')
//                     .eq('id', firstItemInCart.productId)
//                     .single()

//                 // 2. Build Recommendation Query
//                 let query = supabase
//                     .from('products')
//                     .select(`*, product_variants (*)`)
//                     .eq('status', 'active')
//                     .limit(4)

//                 if (referenceProduct?.category_id) {
//                     // Match by category
//                     query = query.eq('category_id', referenceProduct.category_id)
//                 } else if (referenceProduct?.brand) {
//                     // Fallback to brand if category is null
//                     query = query.eq('brand', referenceProduct.brand)
//                 }

//                 // 3. Exclude products already in cart
//                 query = query.not('id', 'in', `(${cartProductIds.join(',')})`)

//                 const { data: relatedProducts, error } = await query

//                 if (error) throw error

//                 // 4. Final Fallback: If no related items, just show top products
//                 if (!relatedProducts || relatedProducts.length === 0) {
//                     const { data: fallback } = await supabase
//                         .from('products')
//                         .select(`*, product_variants (*)`)
//                         .eq('status', 'active')
//                         .not('id', 'in', `(${cartProductIds.join(',')})`)
//                         .limit(4)
//                     setRecommendations(fallback || [])
//                 } else {
//                     setRecommendations(relatedProducts)
//                 }
//             } catch (err) {
//                 console.error("Recommendation Error:", err)
//             }
//         }

//         fetchContextualRecommendations()
//     }, [items, supabase])

//     // --- LOGIC CALCS ---
//     const subtotal = useMemo(() => items.reduce((acc: number, i: any) => acc + (i.price * i.quantity), 0), [items])
//     const totalMRP = useMemo(() => items.reduce((acc: number, i: any) => {
//         const original = i.originalPrice || i.compare_at_price || i.mrp || i.price;
//         return acc + (original * i.quantity);
//     }, 0), [items])
//     const totalDiscount = totalMRP - subtotal;

//     const handleWishlist = async (item: any) => {
//         const { data: { user } } = await supabase.auth.getUser();
//         if (!user) return toast.error("Please login to save items");

//         const { error } = await supabase.from('wishlist').upsert({
//             user_id: user.id,
//             product_id: item.productId
//         });

//         if (error) return toast.error("Failed to update wishlist");

//         removeItem(item.variantId);
//         toast.success("Added to Wishlist");
//     }

//     if (!mounted) return null;

//     if (items.length === 0) return (
//         <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
//             <ShoppingBag className="w-12 h-12 text-slate-100 mb-6 mx-auto stroke-[1]" />
//             <h2 className="text-sm font-bold uppercase tracking-[0.2em] mb-8 text-slate-900">Your bag is empty</h2>
//             <Button asChild variant="outline" className="rounded-full px-10 h-12 text-[10px] font-bold uppercase tracking-widest">
//                 <Link href="/shop">Explore Collection</Link>
//             </Button>
//         </div>
//     )

//     return (
//         <div className="bg-[#FBFCFD] min-h-screen pb-64 lg:pb-32 selection:bg-black selection:text-white antialiased">
//             <div className="max-w-5xl mx-auto px-4 py-8 lg:py-20">
//                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

//                     <div className="lg:col-span-7">
//                         <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
//                             <h1 className="text-2xl font-black tracking-tighter uppercase italic text-slate-900">
//                                 My Bag <span className="text-slate-300 ml-2">[{items.length}]</span>
//                             </h1>

//                             <div className="flex items-center gap-4 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">
//                                 <span className="flex items-center gap-1 text-red-400"><ChevronLeft className="w-2.5 h-2.5" /> Swipe Left to Remove</span>
//                                 <div className="w-1 h-1 bg-slate-200 rounded-full" />
//                                 <span className="flex items-center gap-1 text-emerald-500">Wishlist <ChevronRight className="w-2.5 h-2.5" /></span>
//                             </div>
//                         </div>

//                         <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
//                             <AnimatePresence mode="popLayout">
//                                 {items.map((item: any) => (
//                                     <CartItemRow
//                                         key={item.variantId}
//                                         item={item}
//                                         onRemove={() => setPendingItem(item)}
//                                         onWishlist={() => handleWishlist(item)}
//                                         onUpdate={(vId: string, q: number) => updateQuantity(vId, q)}
//                                     />
//                                 ))}
//                             </AnimatePresence>
//                         </div>
//                     </div>

//                     <div className="lg:col-span-5">
//                         <div className="bg-white p-8 lg:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm sticky top-32">
//                             <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-10">Order Summary</h3>

//                             <div className="space-y-6">
//                                 <div className="flex justify-between text-[13px] font-medium">
//                                     <span className="text-slate-400 uppercase tracking-wider">Total MRP</span>
//                                     <span className="text-slate-900">₹{totalMRP.toLocaleString()}</span>
//                                 </div>

//                                 {totalDiscount > 0 && (
//                                     <div className="flex justify-between text-[13px] font-bold">
//                                         <span className="text-slate-400 uppercase tracking-wider">Boutique Discount</span>
//                                         <span className="text-emerald-600">-₹{totalDiscount.toLocaleString()}</span>
//                                     </div>
//                                 )}

//                                 <div className="flex justify-between text-[13px] font-medium border-b border-slate-50 pb-6">
//                                     <span className="text-slate-400 uppercase tracking-wider">Delivery</span>
//                                     <span className="text-emerald-600 text-[10px] uppercase font-black tracking-[0.1em]">Calculated at Checkout</span>
//                                 </div>

//                                 <div className="pt-4 flex justify-between items-center">
//                                     <span className="text-base font-black uppercase tracking-tight text-slate-900">Payable</span>
//                                     <span className="text-3xl font-black tracking-tighter italic text-slate-900 underline decoration-emerald-400/30 decoration-4 underline-offset-8">
//                                         ₹{subtotal.toLocaleString()}
//                                     </span>
//                                 </div>
//                             </div>

//                             <Button className="w-full h-16 bg-black text-white rounded-full text-[11px] font-black uppercase tracking-[0.25em] mt-12 hidden lg:flex shadow-2xl transition-all hover:scale-[1.01] active:scale-[0.98]" asChild>
//                                 <Link href="/checkout">Proceed to Checkout</Link>
//                             </Button>

//                             <div className="mt-10 space-y-4 pt-8 border-t border-slate-50">
//                                 <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-slate-300">
//                                     <Lock className="w-3.5 h-3.5" /> Secure Transactions
//                                 </div>
//                                 <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-slate-300">
//                                     <RefreshCcw className="w-3.5 h-3.5" /> 7-Day Exchange
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>

//             {/* Mobile Bottom Bar */}
//             <div className="fixed bottom-18 left-4 right-4 lg:hidden z-40">
//                 <motion.div
//                     initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
//                     className="bg-black text-white rounded-[2.5rem] p-4 pl-10 flex items-center justify-between shadow-2xl"
//                 >
//                     <div>
//                         <p className="text-[9px] text-white/40 uppercase font-black tracking-[0.2em] mb-1">Payable</p>
//                         <p className="text-2xl font-black tracking-tighter italic">₹{subtotal.toLocaleString()}</p>
//                     </div>
//                     <Button className="h-14 px-10 bg-white text-black rounded-full text-[10px] font-black uppercase tracking-widest" asChild>
//                         <Link href="/checkout">Checkout</Link>
//                     </Button>
//                 </motion.div>
//             </div>

//             {/* CONTEXTUAL RECOMMENDATIONS */}
//             {recommendations.length > 0 && (
//                 <section className="max-w-5xl mx-auto px-6 py-0 border-t border-slate-100 mt-5">
//                     <div className="flex flex-col items-center mb-8 text-center">
//                         <span className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-200 mb-4">You may also love</span>
//                         <h3 className="text-2xl font-black tracking-tight uppercase italic text-slate-900 underline decoration-slate-100 decoration-4 underline-offset-8">Complete the Ritual</h3>
//                     </div>
//                     <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
//                         {recommendations.map((product) => <ProductCard key={product.id} product={product} />)}
//                     </div>
//                 </section>
//             )}

//             {/* Removal Drawer */}
//             <AnimatePresence>
//                 {pendingItem && (
//                     <>
//                         <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPendingItem(null)} className="fixed inset-0 bg-black/40 z-[100] backdrop-blur-[8px]" />
//                         <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed bottom-0 left-0 right-0 bg-white z-[101] rounded-t-[3rem] p-10 pb-16 shadow-2xl border-t border-slate-100 max-w-2xl mx-auto">
//                             <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-10" />
//                             <div className="text-center mb-8">
//                                 <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-2">Refine Selection</h4>
//                                 <p className="text-[11px] text-slate-400 uppercase tracking-widest">Move to wishlist for later or remove from bag?</p>
//                             </div>
//                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-sm mx-auto">
//                                 <button onClick={() => { handleWishlist(pendingItem); setPendingItem(null); }} className="w-full h-14 bg-black text-white rounded-full text-[10px] font-black uppercase tracking-widest">Move to Wishlist</button>
//                                 <button onClick={() => { removeItem(pendingItem.variantId); setPendingItem(null); }} className="w-full h-14 bg-rose-50 text-rose-500 rounded-full text-[10px] font-black uppercase tracking-widest">Remove Product</button>
//                             </div>
//                         </motion.div>
//                     </>
//                 )}
//             </AnimatePresence>
//         </div>
//     )
// }

// function CartItemRow({ item, onRemove, onWishlist, onUpdate }: any) {
//     const x = useMotionValue(0);
//     const background = useTransform(x, [-100, 0, 100], ["#FFF5F5", "#ffffff", "#F0FDF4"]);
//     const opacityRemove = useTransform(x, [-100, -20], [1, 0]);
//     const opacityWishlist = useTransform(x, [20, 100], [0, 1]);

//     const originalPrice = item.originalPrice || item.compare_at_price || item.mrp || item.price;
//     const currentPrice = item.price;
//     const hasDiscount = originalPrice > currentPrice;
//     const discountPercent = hasDiscount ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;
//     const savingsAmount = hasDiscount ? (originalPrice - currentPrice) * item.quantity : 0;

//     return (
//         <div className="relative overflow-hidden group border-b border-slate-50 last:border-0">
//             <motion.div style={{ opacity: opacityRemove }} className="absolute inset-0 bg-red-50 flex items-center justify-end pr-10">
//                 <Trash2 className="w-5 h-5 text-red-500" />
//             </motion.div>
//             <motion.div style={{ opacity: opacityWishlist }} className="absolute inset-0 bg-emerald-50 flex items-center justify-start pl-10">
//                 <Heart className="w-5 h-5 text-emerald-500" />
//             </motion.div>

//             <motion.div
//                 drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.6}
//                 style={{ x, background }}
//                 onDragEnd={(_, info) => {
//                     if (info.offset.x < -140) onRemove();
//                     else if (info.offset.x > 140) onWishlist();
//                 }}
//                 className="relative z-10 p-6 lg:p-10 flex gap-8 cursor-grab active:cursor-grabbing bg-white"
//             >
//                 <div className="relative w-28 h-36 bg-[#F9FAFB] rounded-2xl overflow-hidden flex-shrink-0 border border-slate-50">
//                     <Image src={item.image || "/placeholder.png"} alt={item.name} fill className="object-cover transition-transform group-hover:scale-105" />
//                     {hasDiscount && (
//                         <div className="absolute top-0 left-0 bg-black text-white text-[7px] font-black uppercase px-2 py-1 flex items-center gap-1">
//                             <Sparkles className="w-2.5 h-2.5 text-yellow-400" /> Save ₹{savingsAmount.toLocaleString()}
//                         </div>
//                     )}
//                 </div>

//                 <div className="flex-grow flex flex-col justify-between py-1">
//                     <div className="flex justify-between items-start gap-4">
//                         <div>
//                             <h3 className="text-sm font-bold text-slate-900 line-clamp-2 uppercase tracking-tight">{item.name}</h3>
//                             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">{item.variantTitle}</p>
//                         </div>
//                         {hasDiscount && (
//                             <span className="bg-emerald-50 text-emerald-600 text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest">
//                                 {discountPercent}% OFF
//                             </span>
//                         )}
//                     </div>

//                     <div className="flex items-end justify-between">
//                         <div className="flex items-center gap-3 bg-slate-50 rounded-full p-1.5 border border-slate-100">
//                             <button onClick={(e) => { e.stopPropagation(); onUpdate(item.variantId, Math.max(1, item.quantity - 1)); }} className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400"><Minus className="w-3 h-3" /></button>
//                             <span className="text-[11px] font-black min-w-[15px] text-center">{item.quantity}</span>
//                             <button onClick={(e) => { e.stopPropagation(); onUpdate(item.variantId, item.quantity + 1); }} className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400"><Plus className="w-3 h-3" /></button>
//                         </div>

//                         <div className="text-right">
//                             {hasDiscount && (
//                                 <p className="text-[10px] text-slate-300 line-through mb-0.5 font-bold italic">
//                                     ₹{(originalPrice * item.quantity).toLocaleString()}
//                                 </p>
//                             )}
//                             <p className="text-xl font-black tracking-tighter italic text-slate-900">
//                                 ₹{(currentPrice * item.quantity).toLocaleString()}
//                             </p>
//                         </div>
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
    Minus, Plus, Trash2, ShoppingBag,
    Lock, RefreshCcw, Sparkles, Heart, X,
    ChevronLeft, ChevronRight
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion"
import { ProductCard } from "@/components/store/product-card"

export default function CartPage() {
    const { items, removeItem, updateQuantity, setItems } = useCart() as any
    const [mounted, setMounted] = useState(false)
    const [recommendations, setRecommendations] = useState<any[]>([])
    const [pendingItem, setPendingItem] = useState<any | null>(null)

    const supabase = createClient()

    useEffect(() => {
        setMounted(true)

        const syncCartAndFetchRecs = async () => {
            if (items.length === 0) return

            try {
                // 1. LIVE PRICE & DISCOUNT SYNC
                const variantIds = items.map((i: any) => i.variantId)
                const { data: freshVariants, error: syncError } = await supabase
                    .from('product_variants')
                    .select('id, price, discount_type, discount_value')
                    .in('id', variantIds)

                if (!syncError && freshVariants) {
                    const updatedItems = items.map((cartItem: any) => {
                        const fresh = freshVariants.find(v => v.id === cartItem.variantId)
                        if (fresh) {
                            const msrp = Number(fresh.price)
                            let sellingPrice = msrp

                            // CALCULATE DISCOUNT BEFORE UPDATING STATE
                            if (fresh.discount_type === 'percentage') {
                                sellingPrice = msrp - (msrp * (Number(fresh.discount_value) / 100))
                            } else if (fresh.discount_type === 'amount') {
                                sellingPrice = msrp - Number(fresh.discount_value)
                            }

                            return {
                                ...cartItem,
                                price: Math.round(sellingPrice),
                                originalPrice: Math.round(msrp),
                                discount_type: fresh.discount_type,
                                discount_value: fresh.discount_value
                            }
                        }
                        return cartItem
                    })

                    // Only update if there is a real difference to prevent flicker loops
                    if (JSON.stringify(updatedItems) !== JSON.stringify(items)) {
                        setItems(updatedItems)
                    }
                }

                // 2. RECOMMENDATIONS
                const firstItemInCart = items[0]
                const cartProductIds = items.map((i: any) => i.productId)

                const { data: refProd } = await supabase
                    .from('products')
                    .select('category_id, brand')
                    .eq('id', firstItemInCart.productId)
                    .single()

                let query = supabase
                    .from('products')
                    .select(`*, product_variants (*)`)
                    .eq('status', 'active')
                    .limit(4)

                if (refProd?.category_id) {
                    query = query.eq('category_id', refProd.category_id)
                }

                query = query.not('id', 'in', `(${cartProductIds.join(',')})`)
                const { data: relatedProducts } = await query
                setRecommendations(relatedProducts || [])
            } catch (err) {
                console.error("Cart Sync Error:", err)
            }
        }

        syncCartAndFetchRecs()
    }, [mounted, supabase])

    // --- LOGIC CALCS (Strictly Rounded) ---
    const subtotal = useMemo(() =>
        Math.round(items.reduce((acc: number, i: any) => acc + (i.price * i.quantity), 0))
        , [items])

    const totalMRP = useMemo(() =>
        Math.round(items.reduce((acc: number, i: any) => {
            const original = i.originalPrice || i.price;
            return acc + (original * i.quantity);
        }, 0))
        , [items])

    const totalDiscount = Math.max(0, totalMRP - subtotal);

    const handleWishlist = async (item: any) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return toast.error("Please login to save items");

        await supabase.from('wishlist').upsert({
            user_id: user.id,
            product_id: item.productId
        });

        removeItem(item.variantId);
        toast.success("Added to Wishlist");
    }

    if (!mounted) return null;

    if (items.length === 0) return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
            <ShoppingBag className="w-12 h-12 text-slate-100 mb-6 mx-auto stroke-[1]" />
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] mb-8 text-slate-900">Your bag is empty</h2>
            <Button asChild variant="outline" className="rounded-full px-10 h-12 text-[10px] font-bold uppercase tracking-widest">
                <Link href="/shop">Explore Collection</Link>
            </Button>
        </div>
    )

    return (
        <div className="bg-[#FBFCFD] min-h-screen pb-64 lg:pb-32 selection:bg-black selection:text-white antialiased">
            <div className="max-w-5xl mx-auto px-4 py-8 lg:py-20">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

                    <div className="lg:col-span-7">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                            <h1 className="text-2xl font-black tracking-tighter uppercase italic text-slate-900">
                                My Bag <span className="text-slate-300 ml-2">[{items.length}]</span>
                            </h1>

                            <div className="flex items-center gap-4 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">
                                <span className="flex items-center gap-1 text-red-400"><ChevronLeft className="w-2.5 h-2.5" /> Swipe to Remove</span>
                                <div className="w-1 h-1 bg-slate-200 rounded-full" />
                                <span className="flex items-center gap-1 text-emerald-500">Wishlist <ChevronRight className="w-2.5 h-2.5" /></span>
                            </div>
                        </div>

                        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                            <AnimatePresence mode="popLayout">
                                {items.map((item: any) => (
                                    <CartItemRow
                                        key={item.variantId}
                                        item={item}
                                        onRemove={() => setPendingItem(item)}
                                        onWishlist={() => handleWishlist(item)}
                                        onUpdate={(vId: string, q: number) => updateQuantity(vId, q)}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className="lg:col-span-5">
                        <div className="bg-white p-8 lg:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm sticky top-32">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-10">Order Summary</h3>

                            <div className="space-y-6">
                                <div className="flex justify-between text-[13px] font-medium">
                                    <span className="text-slate-400 uppercase tracking-wider">Total MRP</span>
                                    <span className="text-slate-900">₹{totalMRP.toLocaleString()}</span>
                                </div>

                                {totalDiscount > 0 && (
                                    <div className="flex justify-between text-[13px] font-bold text-emerald-600">
                                        <span className="uppercase tracking-wider"> Discount</span>
                                        <span>-₹{totalDiscount.toLocaleString()}</span>
                                    </div>
                                )}

                                <div className="flex justify-between text-[13px] font-medium border-b border-slate-50 pb-6">
                                    <span className="text-slate-400 uppercase tracking-wider">Delivery</span>
                                    <span className="text-emerald-600 text-[10px] uppercase font-black tracking-[0.1em]">Calculated at Checkout</span>
                                </div>

                                <div className="pt-4 flex justify-between items-center">
                                    <span className="text-base font-black uppercase tracking-tight text-slate-900">Payable</span>
                                    <span className="text-3xl font-black tracking-tighter italic text-slate-900 underline decoration-emerald-400/30 decoration-4 underline-offset-8">
                                        ₹{subtotal.toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            <Button className="w-full h-16 bg-black text-white rounded-full text-[11px] font-black uppercase tracking-[0.25em] mt-12 hidden lg:flex shadow-2xl transition-all" asChild>
                                <Link href="/checkout">Proceed to Checkout</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Bottom Bar */}
            <div className="fixed bottom-18 left-4 right-4 lg:hidden z-40">
                <motion.div
                    initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                    className="bg-black text-white rounded-[2.5rem] p-4 pl-10 flex items-center justify-between shadow-2xl"
                >
                    <div>
                        <p className="text-[9px] text-white/40 uppercase font-black tracking-[0.2em] mb-1">Payable</p>
                        <p className="text-2xl font-black tracking-tighter italic">₹{subtotal.toLocaleString()}</p>
                    </div>
                    <Button className="h-14 px-10 bg-white text-black rounded-full text-[10px] font-black uppercase tracking-widest" asChild>
                        <Link href="/checkout">Checkout</Link>
                    </Button>
                </motion.div>
            </div>

            {/* Removal Drawer */}
            <AnimatePresence>
                {pendingItem && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPendingItem(null)} className="fixed inset-0 bg-black/40 z-[100] backdrop-blur-[8px]" />
                        <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed bottom-0 left-0 right-0 bg-white z-[101] rounded-t-[3rem] p-10 pb-16 max-w-2xl mx-auto">
                            <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-10" />
                            <div className="text-center mb-8">
                                <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-2">Refine Selection</h4>
                                <p className="text-[11px] text-slate-400 uppercase tracking-widest">Move to wishlist for later or remove from bag?</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-sm mx-auto">
                                <button onClick={() => { handleWishlist(pendingItem); setPendingItem(null); }} className="w-full h-14 bg-black text-white rounded-full text-[10px] font-black uppercase tracking-widest">Wishlist</button>
                                <button onClick={() => { removeItem(pendingItem.variantId); setPendingItem(null); }} className="w-full h-14 bg-rose-50 text-rose-500 rounded-full text-[10px] font-black uppercase tracking-widest">Remove</button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}

function CartItemRow({ item, onRemove, onWishlist, onUpdate }: any) {
    const x = useMotionValue(0);
    const background = useTransform(x, [-100, 0, 100], ["#FFF5F5", "#ffffff", "#F0FDF4"]);

    // MATH CLEANUP
    const currentPrice = Math.round(item.price);
    const originalPrice = Math.round(item.originalPrice || item.price);
    const hasDiscount = originalPrice > currentPrice;
    const discountPercent = hasDiscount ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;

    return (
        <div className="relative overflow-hidden group border-b border-slate-50 last:border-0">
            <motion.div
                drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.6}
                style={{ x, background }}
                onDragEnd={(_, info) => {
                    if (info.offset.x < -140) onRemove();
                    else if (info.offset.x > 140) onWishlist();
                }}
                className="relative z-10 p-6 lg:p-10 flex gap-8 cursor-grab active:cursor-grabbing bg-white"
            >
                <div className="relative w-28 h-36 bg-[#F9FAFB] rounded-2xl overflow-hidden flex-shrink-0 border border-slate-50">
                    <Image src={item.image || "/placeholder.png"} alt={item.name} fill className="object-cover" />
                    {hasDiscount && (
                        <div className="absolute top-0 left-0 bg-black text-white text-[7px] font-black uppercase px-2 py-1 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5 text-yellow-400" /> Save ₹{Math.round((originalPrice - currentPrice) * item.quantity).toLocaleString()}
                        </div>
                    )}
                </div>

                <div className="flex-grow flex flex-col justify-between py-1">
                    <div className="flex justify-between items-start gap-4">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 line-clamp-2 uppercase tracking-tight">{item.name}</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">{item.variantTitle}</p>
                        </div>
                        {hasDiscount && (
                            <span className="bg-emerald-50 text-emerald-600 text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest">
                                {discountPercent}% OFF
                            </span>
                        )}
                    </div>

                    <div className="flex items-end justify-between">
                        <div className="flex items-center gap-3 bg-slate-50 rounded-full p-1.5 border border-slate-100">
                            <button onClick={(e) => { e.stopPropagation(); onUpdate(item.variantId, Math.max(1, item.quantity - 1)); }} className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400"><Minus className="w-3 h-3" /></button>
                            <span className="text-[11px] font-black min-w-[15px] text-center">{item.quantity}</span>
                            <button onClick={(e) => { e.stopPropagation(); onUpdate(item.variantId, item.quantity + 1); }} className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400"><Plus className="w-3 h-3" /></button>
                        </div>

                        <div className="text-right">
                            {hasDiscount && (
                                <p className="text-[10px] text-slate-300 line-through mb-0.5 font-bold italic">
                                    ₹{Math.round(originalPrice * item.quantity).toLocaleString()}
                                </p>
                            )}
                            <p className="text-xl font-black tracking-tighter italic text-slate-900">
                                ₹{Math.round(currentPrice * item.quantity).toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}