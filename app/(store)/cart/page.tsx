

// "use client"

// import { useCart } from "@/components/store/use-cart"
// import { Button } from "@/components/ui/button"
// import {
//     Minus, Plus, Trash2, ShoppingBag,
//     ChevronLeft, ChevronRight, Sparkles
// } from "lucide-react"
// import Link from "next/link"
// import Image from "next/image"
// import { useEffect, useState, useMemo, useCallback } from "react"
// import { createClient } from "@/utils/supabase/client"
// import { toast } from "sonner"
// import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion"

// export default function CartPage() {
//     // 1. Hook into your global cart state
//     const { items, removeItem, updateQuantity, setItems } = useCart() as any
//     const [mounted, setMounted] = useState(false)
//     const [pendingItem, setPendingItem] = useState<any | null>(null)
//     const supabase = createClient()

//     // 2. DEDUPLICATION & SYNC LOGIC
//     // We wrap this in useCallback to prevent unnecessary re-renders
//     const syncCartPrices = useCallback(async () => {
//         if (!items || items.length === 0) return

//         try {
//             const variantIds = items.map((i: any) => i.variantId)
//             const { data: freshVariants, error } = await supabase
//                 .from('product_variants')
//                 .select('id, price, discount_type, discount_value')
//                 .in('id', variantIds)

//             if (error) throw error

//             // Use a Map to ensure strictly one entry per variantId
//             const dedupedMap = new Map()

//             items.forEach((cartItem: any) => {
//                 const fresh = freshVariants?.find(v => v.id === cartItem.variantId)
//                 let sellingPrice = cartItem.price
//                 let msrp = cartItem.originalPrice || cartItem.price

//                 if (fresh) {
//                     msrp = Number(fresh.price)
//                     sellingPrice = msrp
//                     if (fresh.discount_type === 'percentage') {
//                         sellingPrice = msrp - (msrp * (Number(fresh.discount_value) / 100))
//                     } else if (fresh.discount_type === 'amount') {
//                         sellingPrice = msrp - Number(fresh.discount_value)
//                     }
//                 }

//                 const processedItem = {
//                     ...cartItem,
//                     price: Math.round(sellingPrice),
//                     originalPrice: Math.round(msrp),
//                 }

//                 if (dedupedMap.has(cartItem.variantId)) {
//                     // SQUASH: Add quantities if duplicate variantId found
//                     const existing = dedupedMap.get(cartItem.variantId)
//                     existing.quantity += cartItem.quantity
//                 } else {
//                     dedupedMap.set(cartItem.variantId, processedItem)
//                 }
//             })

//             const finalArray = Array.from(dedupedMap.values())

//             // Only update global state if the values actually changed
//             // This prevents the "ghost items" coming back after deletion
//             if (JSON.stringify(finalArray) !== JSON.stringify(items)) {
//                 setItems(finalArray)
//             }
//         } catch (err) {
//             console.error("Cart Sync Failed:", err)
//         }
//     }, [items, setItems, supabase])

//     useEffect(() => {
//         setMounted(true)
//         syncCartPrices()
//         // We only run this once on mount and when items change length 
//         // to avoid infinite loops during individual price updates
//     }, [mounted, items.length])

//     // --- MATH CALCULATIONS ---
//     const subtotal = useMemo(() =>
//         Math.round(items.reduce((acc: number, i: any) => acc + (i.price * i.quantity), 0))
//         , [items])

//     const totalMRP = useMemo(() =>
//         Math.round(items.reduce((acc: number, i: any) => {
//             const original = i.originalPrice || i.price
//             return acc + (original * i.quantity)
//         }, 0))
//         , [items])

//     const totalDiscount = Math.max(0, totalMRP - subtotal)

//     const handleWishlist = async (item: any) => {
//         const { data: { user } } = await supabase.auth.getUser()
//         if (!user) return toast.error("Please login to save items")

//         await supabase.from('wishlist').upsert({
//             user_id: user.id,
//             product_id: item.productId
//         })

//         removeItem(item.variantId)
//         toast.success("Moved to Wishlist")
//     }

//     if (!mounted) return null

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

//                     {/* LEFT: CART ITEMS */}
//                     <div className="lg:col-span-7">
//                         <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
//                             <h1 className="text-2xl font-black tracking-tighter uppercase italic text-slate-900">
//                                 My Bag <span className="text-slate-300 ml-2">[{items.length}]</span>
//                             </h1>

//                             <div className="flex items-center gap-4 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">
//                                 <span className="flex items-center gap-1 text-red-400"><ChevronLeft className="w-2.5 h-2.5" /> Swipe to Remove</span>
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

//                     {/* RIGHT: SUMMARY */}
//                     <div className="lg:col-span-5">
//                         <div className="bg-white p-8 lg:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm sticky top-32">
//                             <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-10">Order Summary</h3>

//                             <div className="space-y-6 text-sm">
//                                 <div className="flex justify-between">
//                                     <span className="text-slate-400 uppercase tracking-wider">Total MRP</span>
//                                     <span className="text-slate-900 font-bold">₹{totalMRP.toLocaleString()}</span>
//                                 </div>

//                                 {totalDiscount > 0 && (
//                                     <div className="flex justify-between font-bold text-emerald-600">
//                                         <span className="uppercase tracking-wider">Discount</span>
//                                         <span>-₹{totalDiscount.toLocaleString()}</span>
//                                     </div>
//                                 )}

//                                 <div className="flex justify-between border-b border-slate-50 pb-6">
//                                     <span className="text-slate-400 uppercase tracking-wider">Delivery</span>
//                                     <span className="text-emerald-600 text-[10px] uppercase font-black tracking-[0.1em]">Free</span>
//                                 </div>

//                                 <div className="pt-4 flex justify-between items-center">
//                                     <span className="text-base font-black uppercase tracking-tight text-slate-900">Payable</span>
//                                     <span className="text-3xl font-black tracking-tighter italic text-slate-900">
//                                         ₹{subtotal.toLocaleString()}
//                                     </span>
//                                 </div>
//                             </div>

//                             <Button className="w-full h-16 bg-black text-white rounded-full text-[11px] font-black uppercase tracking-[0.25em] mt-12 hidden lg:flex shadow-2xl" asChild>
//                                 <Link href="/checkout">Proceed to Checkout</Link>
//                             </Button>
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

//             {/* Removal Drawer (Confirmation) */}
//             <AnimatePresence>
//                 {pendingItem && (
//                     <>
//                         <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPendingItem(null)} className="fixed inset-0 bg-black/40 z-[100] backdrop-blur-[8px]" />
//                         <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed bottom-0 left-0 right-0 bg-white z-[101] rounded-t-[3rem] p-10 pb-16 max-w-2xl mx-auto">
//                             <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-10" />
//                             <div className="text-center mb-8">
//                                 <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-2">Modify Selection</h4>
//                                 <p className="text-[11px] text-slate-400 uppercase tracking-widest">Move to wishlist or remove permanently?</p>
//                             </div>
//                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-sm mx-auto">
//                                 <button onClick={() => { handleWishlist(pendingItem); setPendingItem(null); }} className="w-full h-14 bg-black text-white rounded-full text-[10px] font-black uppercase tracking-widest">Wishlist</button>
//                                 <button onClick={() => { removeItem(pendingItem.variantId); setPendingItem(null); }} className="w-full h-14 bg-rose-50 text-rose-500 rounded-full text-[10px] font-black uppercase tracking-widest">Remove</button>
//                             </div>
//                         </motion.div>
//                     </>
//                 )}
//             </AnimatePresence>
//         </div>
//     )
// }

// function CartItemRow({ item, onRemove, onWishlist, onUpdate }: any) {
//     const x = useMotionValue(0)
//     const background = useTransform(x, [-100, 0, 100], ["#FFF5F5", "#ffffff", "#F0FDF4"])

//     const currentPrice = Math.round(item.price)
//     const originalPrice = Math.round(item.originalPrice || item.price)
//     const hasDiscount = originalPrice > currentPrice
//     const discountPercent = hasDiscount ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0

//     return (
//         <div className="relative overflow-hidden group border-b border-slate-50 last:border-0">
//             <motion.div
//                 drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.6}
//                 style={{ x, background }}
//                 onDragEnd={(_, info) => {
//                     if (info.offset.x < -140) onRemove()
//                     else if (info.offset.x > 140) onWishlist()
//                 }}
//                 className="relative z-10 p-6 lg:p-10 flex gap-8 cursor-grab active:cursor-grabbing bg-white"
//             >
//                 <div className="relative w-28 h-36 bg-[#F9FAFB] rounded-2xl overflow-hidden flex-shrink-0 border border-slate-50">
//                     <Image src={item.image || "/placeholder.png"} alt={item.name} fill className="object-cover" />
//                     {hasDiscount && (
//                         <div className="absolute top-0 left-0 bg-black text-white text-[7px] font-black uppercase px-2 py-1 flex items-center gap-1">
//                             <Sparkles className="w-2.5 h-2.5 text-yellow-400" /> Save ₹{Math.round((originalPrice - currentPrice) * item.quantity).toLocaleString()}
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
//                             <button
//                                 onClick={(e) => { e.stopPropagation(); onUpdate(item.variantId, Math.max(1, item.quantity - 1)); }}
//                                 className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400"
//                             >
//                                 <Minus className="w-3 h-3" />
//                             </button>
//                             <span className="text-[11px] font-black min-w-[15px] text-center">{item.quantity}</span>
//                             <button
//                                 onClick={(e) => { e.stopPropagation(); onUpdate(item.variantId, item.quantity + 1); }}
//                                 className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400"
//                             >
//                                 <Plus className="w-3 h-3" />
//                             </button>
//                         </div>

//                         <div className="text-right">
//                             {hasDiscount && (
//                                 <p className="text-[10px] text-slate-300 line-through mb-0.5 font-bold italic">
//                                     ₹{Math.round(originalPrice * item.quantity).toLocaleString()}
//                                 </p>
//                             )}
//                             <p className="text-xl font-black tracking-tighter italic text-slate-900">
//                                 ₹{Math.round(currentPrice * item.quantity).toLocaleString()}
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
    Minus, Plus, ShoppingBag,
    ChevronLeft, ChevronRight, Sparkles
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useEffect, useState, useMemo, useCallback } from "react"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion"
import { Breadcrumbs } from "@/components/store/breadcrumbs"

export default function CartPage() {
    const { items, removeItem, updateQuantity, setItems } = useCart() as any
    const [mounted, setMounted] = useState(false)
    const [pendingItem, setPendingItem] = useState<any | null>(null)
    const [isSyncing, setIsSyncing] = useState(false)
    const supabase = createClient()

    // 1. SYNC & DEDUPLICATION (From DB to UI)
    const syncCartPrices = useCallback(async () => {
        if (!items || items.length === 0 || isSyncing) return

        try {
            const variantIds = items.map((i: any) => i.variantId)
            const { data: freshVariants, error } = await supabase
                .from('product_variants')
                .select('id, price, discount_type, discount_value')
                .in('id', variantIds)

            if (error) throw error

            const dedupedMap = new Map()

            items.forEach((cartItem: any) => {
                const fresh = freshVariants?.find(v => v.id === cartItem.variantId)
                let sellingPrice = cartItem.price
                let msrp = cartItem.originalPrice || cartItem.price

                if (fresh) {
                    msrp = Number(fresh.price)
                    sellingPrice = msrp
                    if (fresh.discount_type === 'percentage') {
                        sellingPrice = msrp - (msrp * (Number(fresh.discount_value) / 100))
                    } else if (fresh.discount_type === 'amount') {
                        sellingPrice = msrp - Number(fresh.discount_value)
                    }
                }

                const processedItem = {
                    ...cartItem,
                    price: Math.round(sellingPrice),
                    originalPrice: Math.round(msrp),
                }

                if (dedupedMap.has(cartItem.variantId)) {
                    const existing = dedupedMap.get(cartItem.variantId)
                    existing.quantity += cartItem.quantity
                } else {
                    dedupedMap.set(cartItem.variantId, processedItem)
                }
            })

            const finalArray = Array.from(dedupedMap.values())
            if (JSON.stringify(finalArray) !== JSON.stringify(items)) {
                setItems(finalArray)
            }
        } catch (err) {
            console.error("Cart Sync Failed:", err)
        }
    }, [items, setItems, supabase, isSyncing])

    useEffect(() => {
        setMounted(true)
        syncCartPrices()
    }, [mounted, items.length, syncCartPrices])

    // 2. HANDLERS (From UI to DB)
    const handleRemove = async (variantId: string) => {
        setIsSyncing(true)
        const { error } = await supabase
            .from('cart_items')
            .delete()
            .eq('product_variant_id', variantId)

        if (error) {
            toast.error("Cloud sync failed")
        } else {
            removeItem(variantId)
            toast.success("Item removed from bag")
        }
        setPendingItem(null)
        setIsSyncing(false)
    }

    const handleUpdateQuantity = async (variantId: string, newQty: number) => {
        if (newQty < 1) return

        // Optimistic UI update
        updateQuantity(variantId, newQty)

        const { error } = await supabase
            .from('cart_items')
            .update({ quantity: newQty })
            .eq('product_variant_id', variantId)

        if (error) toast.error("Quantity sync failed")
    }

    const handleWishlist = async (item: any) => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return toast.error("Please login to save items")

        setIsSyncing(true)
        // 1. Add to wishlist
        await supabase.from('wishlist').upsert({
            user_id: user.id,
            product_id: item.productId
        })

        // 2. Remove from cart_items DB
        await supabase.from('cart_items').delete().eq('product_variant_id', item.variantId)

        removeItem(item.variantId)
        setPendingItem(null)
        setIsSyncing(false)
        toast.success("Moved to Wishlist")
    }

    // --- MATH ---
    const subtotal = useMemo(() => Math.round(items.reduce((acc: number, i: any) => acc + (i.price * i.quantity), 0)), [items])
    const totalMRP = useMemo(() => Math.round(items.reduce((acc: number, i: any) => acc + ((i.originalPrice || i.price) * i.quantity), 0)), [items])
    const totalDiscount = Math.max(0, totalMRP - subtotal)

    if (!mounted) return null
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
                <Breadcrumbs items={[{ label: 'Bag', href: '/cart' }]} />
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
                                        onUpdate={handleUpdateQuantity}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className="lg:col-span-5">
                        <div className="bg-white p-8 lg:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm sticky top-32">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-10">Order Summary</h3>
                            <div className="space-y-6 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-400 uppercase tracking-wider">Total MRP</span>
                                    <span className="text-slate-900 font-bold">₹{totalMRP.toLocaleString()}</span>
                                </div>
                                {totalDiscount > 0 && (
                                    <div className="flex justify-between font-bold text-emerald-600">
                                        <span className="uppercase tracking-wider">Discount</span>
                                        <span>-₹{totalDiscount.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="flex justify-between border-b border-slate-50 pb-6">
                                    <span className="text-slate-400 uppercase tracking-wider">Delivery</span>
                                    <span className="text-slate-400 text-[10px] uppercase font-black tracking-[0.1em]">Calculated at checkout</span>
                                </div>
                                <div className="pt-4 flex justify-between items-center">
                                    <span className="text-base font-black uppercase tracking-tight text-slate-900">Payable</span>
                                    <span className="text-3xl font-black tracking-tighter italic text-slate-900">₹{subtotal.toLocaleString()}</span>
                                </div>
                            </div>
                            <Button className="w-full h-16 bg-black text-white rounded-full text-[11px] font-black uppercase tracking-[0.25em] mt-12 hidden lg:flex shadow-2xl transition-transform active:scale-95" asChild>
                                <Link href="/checkout">Proceed to Checkout</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Bottom Bar */}
            <div className="fixed bottom-18 left-4 right-4 lg:hidden z-40">
                <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-black text-white rounded-[2.5rem] p-4 pl-10 flex items-center justify-between shadow-2xl">
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
                                <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-2">Modify Selection</h4>
                                <p className="text-[11px] text-slate-400 uppercase tracking-widest">Move to wishlist or remove permanently?</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-sm mx-auto">
                                <button disabled={isSyncing} onClick={() => handleWishlist(pendingItem)} className="w-full h-14 bg-black text-white rounded-full text-[10px] font-black uppercase tracking-widest disabled:opacity-50">Wishlist</button>
                                <button disabled={isSyncing} onClick={() => handleRemove(pendingItem.variantId)} className="w-full h-14 bg-rose-50 text-rose-500 rounded-full text-[10px] font-black uppercase tracking-widest disabled:opacity-50">Remove</button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}

function CartItemRow({ item, onRemove, onWishlist, onUpdate }: any) {
    const x = useMotionValue(0)
    const background = useTransform(x, [-100, 0, 100], ["#FFF5F5", "#ffffff", "#F0FDF4"])

    const currentPrice = Math.round(item.price)
    const originalPrice = Math.round(item.originalPrice || item.price)
    const hasDiscount = originalPrice > currentPrice
    const discountPercent = hasDiscount ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0

    return (
        <div className="relative overflow-hidden group border-b border-slate-50 last:border-0">
            <motion.div
                drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.6}
                style={{ x, background }}
                onDragEnd={(_, info) => {
                    if (info.offset.x < -140) onRemove()
                    else if (info.offset.x > 140) onWishlist()
                }}
                className="relative z-10 p-6 lg:p-10 flex gap-8 cursor-grab active:cursor-grabbing bg-white"
            >
                <div className="relative w-28 h-36 bg-[#F9FAFB] rounded-2xl overflow-hidden flex-shrink-0 border border-slate-100">
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
                            <button onClick={(e) => { e.stopPropagation(); onUpdate(item.variantId, item.quantity - 1); }} className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400"><Minus className="w-3 h-3" /></button>
                            <span className="text-[11px] font-black min-w-[15px] text-center">{item.quantity}</span>
                            <button onClick={(e) => { e.stopPropagation(); onUpdate(item.variantId, item.quantity + 1); }} className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400"><Plus className="w-3 h-3" /></button>
                        </div>

                        <div className="text-right">
                            {hasDiscount && <p className="text-[10px] text-slate-300 line-through mb-0.5 font-bold italic">₹{Math.round(originalPrice * item.quantity).toLocaleString()}</p>}
                            <p className="text-xl font-black tracking-tighter italic text-slate-900">₹{Math.round(currentPrice * item.quantity).toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}