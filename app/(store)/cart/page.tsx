"use client"

import { useCart } from "@/components/store/use-cart"
import { Button } from "@/components/ui/button"
import { Minus, Plus, ShoppingBag, X } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useEffect, useState, useMemo, useCallback } from "react"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import { useRecentlyViewed } from "@/hooks/use-recently-viewed"
import { ProductCard } from "@/components/store/product-card"

export default function CartPage() {
    const { items, removeItem, updateQuantity, setItems } = useCart() as any
    const [mounted, setMounted] = useState(false)
    const [pendingItem, setPendingItem] = useState<any | null>(null)
    const [isSyncing, setIsSyncing] = useState(false)
    const [recommendations, setRecommendations] = useState<any[]>([])
    const supabase = createClient()
    const recentlyViewed = useRecentlyViewed((s) => s.items)
    const clearRecentlyViewed = useRecentlyViewed((s) => s.clear)

    const syncCartPrices = useCallback(async () => {
        if (!items || items.length === 0 || isSyncing) return
        try {
            const variantIds = items.map((i: any) => i.variantId)
            const { data: freshVariants, error } = await supabase
                .from("product_variants")
                .select("id, price, discount_type, discount_value")
                .in("id", variantIds)
            if (error) throw error
            const dedupedMap = new Map()
            items.forEach((cartItem: any) => {
                const fresh = freshVariants?.find((v: any) => v.id === cartItem.variantId)
                let sellingPrice = cartItem.price
                let msrp = cartItem.originalPrice || cartItem.price
                if (fresh) {
                    msrp = Number(fresh.price)
                    sellingPrice = msrp
                    if (fresh.discount_type === "percentage") {
                        sellingPrice = msrp - (msrp * (Number(fresh.discount_value) / 100))
                    } else if (fresh.discount_type === "amount") {
                        sellingPrice = msrp - Number(fresh.discount_value)
                    }
                }
                const processedItem = { ...cartItem, price: Math.round(sellingPrice), originalPrice: Math.round(msrp) }
                if (dedupedMap.has(cartItem.variantId)) {
                    dedupedMap.get(cartItem.variantId).quantity += cartItem.quantity
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

    useEffect(() => { setMounted(true); syncCartPrices() }, [mounted, items.length, syncCartPrices])

    const handleRemove = async (variantId: string) => {
        setIsSyncing(true)
        const { error } = await supabase.from("cart_items").delete().eq("product_variant_id", variantId)
        if (error) toast.error("Cloud sync failed")
        else { removeItem(variantId); toast.success("Item removed from bag") }
        setPendingItem(null)
        setIsSyncing(false)
    }

    const handleUpdateQuantity = async (variantId: string, newQty: number) => {
        if (newQty < 1) return
        updateQuantity(variantId, newQty)
        await supabase.from("cart_items").update({ quantity: newQty }).eq("product_variant_id", variantId)
    }

    const subtotal = useMemo(() => Math.round(items.reduce((acc: number, i: any) => acc + (i.price * i.quantity), 0)), [items])
    const totalMRP = useMemo(() => Math.round(items.reduce((acc: number, i: any) => acc + ((i.originalPrice || i.price) * i.quantity), 0)), [items])
    const totalDiscount = Math.max(0, totalMRP - subtotal)
    const totalSaving = totalDiscount

    useEffect(() => {
        if (items.length > 0) {
            const productIds = [...new Set(items.map((i: any) => i.productId))]
            supabase
                .from("products")
                .select("*, product_variants(*)")
                .in("id", productIds)
                .limit(1)
                .then(({ data }) => {
                    if (data?.length) {
                        const brand = data[0].brand
                        if (brand) {
                            supabase
                                .from("products")
                                .select("*, product_variants(*)")
                                .eq("brand", brand)
                                .not("id", "in", `(${productIds.join(",")})`)
                                .limit(6)
                                .then(({ data: recs }) => setRecommendations(recs || []))
                        }
                    }
                })
        } else {
            setRecommendations([])
        }
    }, [items.length])

    if (!mounted) return null

    if (items.length === 0) {
        return (
            <div className="min-h-screen bg-white">
                <div className="flex flex-col items-center justify-center pt-32 pb-10 px-6">
                    <div className="w-[120px] h-[120px] rounded-full bg-pink-50 flex items-center justify-center mb-8">
                        <ShoppingBag className="w-14 h-14 text-[#fc2779]" strokeWidth={1.2} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 text-center">Your cart is feeling lonely!</h2>
                    <p className="text-sm text-gray-400 text-center mt-2 max-w-xs">Discover our bestsellers and fill it up.</p>
                    <Link
                        href="/shop"
                        className="mt-8 h-12 px-10 bg-gray-900 text-white text-xs font-black uppercase tracking-widest rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors"
                    >
                        SHOP NOW →
                    </Link>
                </div>

                {recentlyViewed.length > 0 && (
                    <div className="px-5 pb-10">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-bold text-gray-900">Recently Viewed</h3>
                            <button onClick={clearRecentlyViewed} className="text-xs font-semibold text-gray-400 hover:text-gray-600">
                                Clear
                            </button>
                        </div>
                        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                            {recentlyViewed.slice(0, 10).map((item: any) => (
                                <div key={item.id} className="w-40 shrink-0">
                                    <ProductCard product={item} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white pb-24">
            {/* Header */}
            <div className="px-5 pt-6 pb-3">
                <h1 className="text-xl font-semibold text-gray-900">
                    Bag Items ({items.reduce((a: number, b: any) => a + b.quantity, 0)})
                </h1>
            </div>

            {/* Cart Items */}
            <div className="px-5 pb-4 space-y-3">
                {items.map((item: any) => {
                    const unitPrice = Math.round(item.price)
                    const unitMrp = Math.round(item.originalPrice || item.price)
                    const hasDiscount = unitMrp > unitPrice
                    const saving = hasDiscount ? Math.round((unitMrp - unitPrice) * item.quantity) : 0

                    return (
                        <div key={item.id || item.variantId} className="border border-gray-200 rounded-xl p-3">
                            <div className="flex gap-3">
                                <div className="w-20 h-[100px] bg-gray-50 rounded-lg overflow-hidden shrink-0">
                                    <Image
                                        src={item.image || "/placeholder.png"}
                                        alt={item.name}
                                        width={80}
                                        height={100}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="flex-1 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between gap-2">
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-gray-900 leading-tight line-clamp-2">{item.name}</p>
                                                {item.variantTitle && (
                                                    <p className="text-[11px] font-medium text-gray-400 mt-0.5">Shade: {item.variantTitle}</p>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (confirm("Remove this item from your bag?")) handleRemove(item.variantId)
                                                }}
                                                className="w-5 h-5 flex items-center justify-center shrink-0"
                                            >
                                                <X className="w-4 h-4 text-gray-400" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 mt-2">
                                        <button
                                            onClick={() => {
                                                if (item.quantity <= 1) {
                                                    if (confirm("Remove this item from your bag?")) handleRemove(item.variantId)
                                                } else {
                                                    handleUpdateQuantity(item.variantId, item.quantity - 1)
                                                }
                                            }}
                                            className="w-[26px] h-[26px] rounded-full bg-gray-100 flex items-center justify-center border border-gray-200/50"
                                        >
                                            <Minus className="w-3 h-3 text-gray-600" />
                                        </button>
                                        <span className="text-sm font-extrabold text-gray-900 min-w-[20px] text-center">{item.quantity}</span>
                                        <button
                                            onClick={() => handleUpdateQuantity(item.variantId, item.quantity + 1)}
                                            className="w-[26px] h-[26px] rounded-full bg-gray-100 flex items-center justify-center border border-gray-200/50"
                                        >
                                            <Plus className="w-3 h-3 text-gray-600" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="border-t border-gray-100 mt-2.5 pt-2 flex items-center justify-between">
                                <span className="text-xs font-medium text-gray-400">You pay</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-bold text-gray-900">₹{Math.round(unitPrice * item.quantity)}</span>
                                    {hasDiscount && (
                                        <>
                                            <span className="text-xs font-medium text-gray-400 line-through">₹{Math.round(unitMrp * item.quantity)}</span>
                                            <span className="text-xs font-bold text-green-500">{saving} off</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Recommendations */}
            {recommendations.length > 0 && (
                <div className="px-5 mb-4">
                    <h3 className="text-sm font-extrabold tracking-wider text-gray-900 mb-3">YOU MIGHT ALSO LIKE</h3>
                    <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-2">
                        {recommendations.map((rec: any) => (
                            <div key={rec.id} className="w-44 shrink-0">
                                <ProductCard product={rec} />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Savings Bar */}
            {totalSaving > 0 && (
                <div className="fixed bottom-[60px] left-0 right-0 bg-green-50 border-t border-gray-100 py-2 flex items-center justify-center z-30">
                    <p className="text-xs font-bold text-gray-800">
                        You're saving <span className="text-green-500">₹{totalSaving.toLocaleString()}</span>
                    </p>
                </div>
            )}

            {/* Fixed Checkout Footer */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5 py-3 z-30">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black tracking-wider text-gray-400">GRAND TOTAL</p>
                        <p className="text-[22px] font-black text-gray-900">₹{subtotal.toLocaleString()}</p>
                    </div>
                    <Link
                        href="/checkout"
                        className="h-[42px] bg-gray-900 text-white text-[11px] font-black tracking-wider rounded-lg flex items-center justify-center gap-1.5 px-6 hover:bg-gray-800 transition-colors"
                    >
                        PROCEED TO CHECKOUT
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                    </Link>
                </div>
            </div>
        </div>
    )
}
