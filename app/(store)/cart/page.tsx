"use client"

import { useCart } from "@/components/store/use-cart"
import { Button } from "@/components/ui/button"
import {
    Minus, Plus, Trash2, ShoppingBag,
    Lock, RefreshCcw, Info, Sparkles, Heart, X
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion"
import { ProductCard } from "@/components/store/product-card"

export default function CartPage() {
    const { items, removeItem, updateQuantity } = useCart() as any
    const [mounted, setMounted] = useState(false)
    const [recommendations, setRecommendations] = useState<any[]>([])
    const [pendingItem, setPendingItem] = useState<any | null>(null)

    const supabase = createClient()

    useEffect(() => {
        setMounted(true)
        const fetchRecommendations = async () => {
            const { data } = await supabase.from('products').select(`*, product_variants (*)`).eq('status', 'active').limit(4)
            if (data) setRecommendations(data)
        }
        fetchRecommendations()
    }, [supabase])

    // --- YOUR LOGIC START ---
    const subtotal = useMemo(() => items.reduce((acc: number, i: any) => acc + (i.price * i.quantity), 0), [items])

    // Derived MRP logic based on your item row logic
    const totalMRP = useMemo(() => items.reduce((acc: number, i: any) => {
        const original = i.originalPrice || i.compare_at_price || i.mrp || i.price;
        return acc + (original * i.quantity);
    }, 0), [items])

    const totalDiscount = totalMRP - subtotal;
    // --- YOUR LOGIC END ---

    const handleWishlist = async (item: any) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return toast.error("Please login to save items");
        await supabase.from('wishlist').upsert({ user_id: user.id, product_id: item.productId });
        removeItem(item.variantId);
        toast.success("Added to Wishlist");
    }

    if (!mounted) return null;

    if (items.length === 0) return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
            <ShoppingBag className="w-12 h-12 text-slate-200 mb-6 mx-auto stroke-[1]" />
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] mb-8">Your bag is empty</h2>
            <Button asChild variant="outline" className="rounded-full px-10 h-12 text-[10px] font-bold uppercase tracking-widest">
                <Link href="/shop">Explore Collection</Link>
            </Button>
        </div>
    )

    return (
        <div className="bg-[#FBFCFD] min-h-screen pb-64 lg:pb-32">
            <div className="max-w-5xl mx-auto px-4 py-8 lg:py-20">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    <div className="lg:col-span-7">
                        <h1 className="text-xl font-bold tracking-tight mb-8">Shopping Bag ({items.length})</h1>

                        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
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
                        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm sticky top-32">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-8">Price Details</h3>

                            <div className="space-y-5">
                                <div className="flex justify-between text-[13px]">
                                    <span className="text-slate-500 font-medium">Total MRP</span>
                                    <span className="font-medium text-slate-900">₹{totalMRP.toLocaleString()}</span>
                                </div>

                                {totalDiscount > 0 && (
                                    <div className="flex justify-between text-[13px]">
                                        <span className="text-slate-500 font-medium">Discount on MRP</span>
                                        <span className="font-bold text-emerald-600">-₹{totalDiscount.toLocaleString()}</span>
                                    </div>
                                )}

                                <div className="flex justify-between text-[13px] items-center">
                                    <span className="text-slate-500 font-medium">Shipping</span>
                                    <div className="flex gap-2 items-center">

                                        <span className="font-bold text-emerald-600 text-[10px] uppercase tracking-tighter">Calculated at Checkout</span>
                                    </div>
                                </div>

                                <div className="pt-6 mt-6 border-t border-slate-50 flex justify-between items-center">
                                    <span className="text-base font-bold uppercase tracking-tight">Total Payable</span>
                                    <span className="text-2xl font-black tracking-tighter italic">₹{subtotal.toLocaleString()}</span>
                                </div>
                            </div>

                            <Button className="w-full h-14 bg-black text-white rounded-full text-[10px] font-bold uppercase tracking-[0.2em] mt-10 hidden lg:flex shadow-lg" asChild>
                                <Link href="/checkout">Continue to Checkout</Link>
                            </Button>

                            <div className="mt-8 space-y-3 pt-6 border-t border-slate-50">
                                <div className="flex items-center gap-3 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                                    <Lock className="w-3 h-3" /> Secure Checkout
                                </div>
                                <div className="flex items-center gap-3 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                                    <RefreshCcw className="w-3 h-3" /> 7-Day Boutique Exchange
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Mobile Bar */}
            <div className="fixed bottom-18 left-4 right-4 lg:hidden z-40">
                <motion.div
                    initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                    className="bg-black text-white rounded-[2.5rem] p-3 pl-8 flex items-center justify-between shadow-2xl"
                >
                    <div>
                        <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-0.5">Payable</p>
                        <p className="text-xl font-bold tracking-tight italic">₹{subtotal.toLocaleString()}</p>
                    </div>
                    <Button className="h-12 px-10 bg-white text-black rounded-full text-[10px] font-black uppercase tracking-widest" asChild>
                        <Link href="/checkout">Checkout</Link>
                    </Button>
                </motion.div>
            </div>

            {/* Recommendations */}
            {recommendations.length > 0 && (
                <section className="max-w-5xl mx-auto px-6 py-24 border-t border-slate-100 mt-20">
                    <h3 className="text-[9px] font-bold uppercase tracking-[0.5em] text-slate-300 mb-16 text-center">You might also love</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                        {recommendations.map((product) => <ProductCard key={product.id} product={product} />)}
                    </div>
                </section>
            )}

            {/* Removal Drawer */}
            <AnimatePresence>
                {pendingItem && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPendingItem(null)} className="fixed inset-0 bg-black/40 z-[100] backdrop-blur-[4px]" />
                        <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed bottom-0 left-0 right-0 bg-white z-[101] rounded-t-[3rem] p-8 pb-12 shadow-2xl border-t">
                            <div className="w-12 h-1 bg-slate-100 rounded-full mx-auto mb-8" />
                            <div className="max-w-sm mx-auto space-y-3 text-center">
                                <button onClick={() => { handleWishlist(pendingItem); setPendingItem(null); }} className="w-full h-14 bg-black text-white rounded-full text-[10px] font-bold uppercase tracking-widest">Move to Wishlist</button>
                                <button onClick={() => { removeItem(pendingItem.variantId); setPendingItem(null); }} className="w-full h-14 bg-red-50 text-red-500 rounded-full text-[10px] font-bold uppercase tracking-widest">Remove Product</button>
                                <button onClick={() => setPendingItem(null)} className="pt-4 text-[9px] font-bold text-slate-300 uppercase tracking-widest">Cancel</button>
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
    const opacityRemove = useTransform(x, [-100, -20], [1, 0]);
    const opacityWishlist = useTransform(x, [20, 100], [0, 1]);

    // --- YOUR LOGIC START ---
    const originalPrice = item.originalPrice || item.compare_at_price || item.mrp || item.price;
    const currentPrice = item.price;
    const hasDiscount = originalPrice > currentPrice;
    const discountPercent = hasDiscount ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;
    const savingsAmount = hasDiscount ? (originalPrice - currentPrice) * item.quantity : 0;
    // --- YOUR LOGIC END ---

    return (
        <div className="relative overflow-hidden group border-b border-slate-50 last:border-0">
            <motion.div style={{ opacity: opacityRemove }} className="absolute inset-0 bg-red-50 flex items-center justify-end pr-10"><Trash2 className="w-5 h-5 text-red-500" /></motion.div>
            <motion.div style={{ opacity: opacityWishlist }} className="absolute inset-0 bg-emerald-50 flex items-center justify-start pl-10"><Heart className="w-5 h-5 text-emerald-500" /></motion.div>

            <motion.div
                drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.7}
                style={{ x, background }}
                onDragEnd={(_, info) => {
                    if (info.offset.x < -120) onRemove();
                    else if (info.offset.x > 120) onWishlist();
                }}
                className="relative z-10 p-5 lg:p-8 flex gap-6 cursor-grab active:cursor-grabbing bg-white"
            >
                <div className="relative w-24 h-32 bg-[#F9FAFB] rounded-2xl overflow-hidden flex-shrink-0 border border-slate-50">
                    <Image src={item.image || "/placeholder.png"} alt={item.name} fill className="object-cover" />
                    {hasDiscount && (
                        <div className="absolute top-0 left-0 bg-black text-white text-[7px] font-black uppercase px-2 py-1 flex items-center gap-1">
                            <Sparkles className="w-2 h-2 text-yellow-400" />
                            SAVE ₹{savingsAmount.toLocaleString()}
                        </div>
                    )}
                </div>

                <div className="flex-grow flex flex-col justify-between py-1">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-[13px] font-bold text-slate-900 leading-snug line-clamp-2 max-w-[200px]">{item.name}</h3>
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-1">{item.variantTitle}</p>
                        </div>
                        {hasDiscount && (
                            <span className="bg-emerald-50 text-emerald-600 text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest whitespace-nowrap">
                                {discountPercent}% OFF
                            </span>
                        )}
                    </div>

                    <div className="flex items-end justify-between">
                        <div className="flex items-center gap-2.5 bg-slate-50 rounded-full p-1">
                            <button onClick={(e) => { e.stopPropagation(); onUpdate(item.variantId, Math.max(1, item.quantity - 1)); }} className="w-7 h-7 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400"><Minus className="w-3 h-3" /></button>
                            <span className="text-[11px] font-bold min-w-[15px] text-center">{item.quantity}</span>
                            <button onClick={(e) => { e.stopPropagation(); onUpdate(item.variantId, item.quantity + 1); }} className="w-7 h-7 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400"><Plus className="w-3 h-3" /></button>
                        </div>

                        <div className="text-right">
                            {hasDiscount && (
                                <p className="text-[10px] text-slate-300 line-through mb-0.5 font-medium italic">
                                    ₹{(originalPrice * item.quantity).toLocaleString()}
                                </p>
                            )}
                            <p className="text-lg font-black tracking-tight italic">
                                ₹{(currentPrice * item.quantity).toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}