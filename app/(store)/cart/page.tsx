"use client"

import { useCart } from "@/components/store/use-cart"
import { Button } from "@/components/ui/button"
import { Minus, Plus, ShoppingBag, X, Gift, Tag, Zap } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useEffect, useState, useMemo, useCallback } from "react"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import { useRecentlyViewed } from "@/hooks/use-recently-viewed"
import { ProductCard } from "@/components/store/product-card"
import { FREE_SHIPPING_THRESHOLD } from "@/lib/cart-constants"

export default function CartPage() {
    const { items, removeItem, updateQuantity, setItems, removeGift, bxgyDiscounts, giftProgress, bxgyProgress } = useCart() as any
    const [mounted, setMounted] = useState(false)
    const [pendingItem, setPendingItem] = useState<any | null>(null)
    const [isSyncing, setIsSyncing] = useState(false)
    const [recommendations, setRecommendations] = useState<any[]>([])
    const supabase = createClient()
    const recentlyViewed = useRecentlyViewed((s) => s.items)
    const clearRecentlyViewed = useRecentlyViewed((s) => s.clear)

    useEffect(() => { document.title = "Shopping Cart | THE MAKEUP STORE WANGKHEI" }, [])

    const syncCartPrices = useCallback(async () => {
        if (!items || items.length === 0 || isSyncing) return
        try {
            const variantIds = items.map((i: any) => i.variantId)
            const { data: freshVariants, error } = await supabase
                .from("product_variants")
                .select("id, price, discount_type, discount_value, stock, image_url")
                .in("id", variantIds)
            if (error) throw error
            const dedupedMap = new Map()
            items.forEach((cartItem: any) => {
                // Skip gift/BXGY free items — their price must stay at 0
                if (cartItem.is_gift || cartItem.is_bxgy_free) {
                    dedupedMap.set(cartItem.variantId, { ...cartItem, price: 0 })
                    return
                }
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
                const processedItem = { ...cartItem, price: Math.round(sellingPrice), originalPrice: Math.round(msrp), stock: fresh?.stock ?? cartItem.stock ?? 0 }
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
        removeItem(variantId)
        toast.success("Item removed from bag")
        setPendingItem(null)
        // DB sync handled by CartSync's debounced push
    }

    const handleUpdateQuantity = async (variantId: string, newQty: number) => {
        if (newQty < 1) return
        updateQuantity(variantId, newQty)
        // DB sync handled by CartSync's debounced push
    }

    const subtotal = useMemo(() => Math.round(items.filter((i: any) => !i.is_gift && !i.is_bxgy_free).reduce((acc: number, i: any) => acc + (i.price * i.quantity), 0)), [items])
    const totalMRP = useMemo(() => Math.round(items.filter((i: any) => !i.is_gift && !i.is_bxgy_free).reduce((acc: number, i: any) => acc + ((i.originalPrice || i.price) * i.quantity), 0)), [items])
    const totalDiscount = Math.max(0, totalMRP - subtotal)
    const totalSaving = totalDiscount
    const outOfStockVariants = useMemo(() => items.filter((i: any) => (i.stock ?? 1) <= 0 && !i.is_gift && !i.is_bxgy_free), [items])
    const hasOutOfStock = outOfStockVariants.length > 0
    const giftItems = useMemo(() => items.filter((i: any) => i.is_gift), [items])
    const bxgyFreeItems = useMemo(() => items.filter((i: any) => i.is_bxgy_free), [items])
    const totalBXGYDiscount = useMemo(() => (bxgyDiscounts || []).reduce((sum: number, d: any) => sum + d.discount_amount, 0), [bxgyDiscounts])
    const discountMap = useMemo(() => {
        const map: Record<string, { amount: number; freeQty: number }> = {}
        ;(bxgyDiscounts || []).forEach((d: any) => {
            const existing = map[d.variant_id] || { amount: 0, freeQty: 0 }
            existing.amount += d.discount_amount
            existing.freeQty += d.free_quantity || 0
            map[d.variant_id] = existing
        })
        return map
    }, [bxgyDiscounts])

    useEffect(() => {
        if (items.length > 0) {
            const productIds = [...new Set(items.map((i: any) => i.productId))]
            supabase
                .from("products")
                .select("*, product_variants(id, price, stock, title, image_url)")
                .in("id", productIds)
                .limit(1)
                .then(({ data }) => {
                    if (data?.length) {
                        const brand = data[0].brand
                        if (brand) {
                            supabase
                                .from("products")
                                .select("*, product_variants(id, price, stock, title, image_url)")
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

    const totalQty = items.filter((i: any) => !i.is_gift && !i.is_bxgy_free).reduce((a: number, b: any) => a + b.quantity, 0)

    // Desktop layout
    const freeShippingRemaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal)

    const desktop = (
        <div className="hidden lg:block min-h-screen bg-white">
            <div className="max-w-7xl mx-auto px-8 py-10">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-6">
                    <Link href="/" className="hover:text-slate-600 transition-colors">Home</Link>
                    <span>/</span>
                    <span className="text-slate-900 font-medium">Cart</span>
                </div>

                {/* Header */}
                <div className="flex items-end justify-between mb-8">
                    <div>
                        <h1 className="text-[28px] font-light text-slate-900 tracking-tight">
                            Shopping Cart
                        </h1>
                        <p className="text-sm text-slate-400 mt-1.5">
                            {totalQty} item{totalQty !== 1 ? "s" : ""}
                        </p>
                    </div>
                    <Link href="/shop" className="text-sm text-slate-400 hover:text-slate-900 transition-colors border-b border-slate-200 hover:border-slate-900 pb-0.5">
                        Continue Shopping &rarr;
                    </Link>
                </div>

                {/* Free shipping bar */}
                {freeShippingRemaining > 0 && (
                    <div className="mb-4 bg-slate-50 border border-slate-100 rounded-lg p-4">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500">
                                Add <span className="font-semibold text-slate-900">₹{freeShippingRemaining.toLocaleString()}</span> more for <span className="font-semibold text-emerald-600">free shipping</span>
                            </span>
                            <span className="text-xs text-slate-400">₹{FREE_SHIPPING_THRESHOLD.toLocaleString()}</span>
                        </div>
                        <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 rounded-full transition-all"
                                style={{ width: `${Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100)}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Gift progress banners - desktop */}
                {(giftProgress || []).filter((gp: any) => !gp.qualifies && gp.neededAmount > 0 && gp.qualifyingVariantIds.length > 0).length > 0 && (
                    <div className="mb-6 space-y-3">
                        {(giftProgress || []).filter((gp: any) => !gp.qualifies && gp.neededAmount > 0 && gp.qualifyingVariantIds.length > 0).map((gp: any) => {
                            const totalForProgress = gp.currentSubtotal + gp.neededAmount
                            const progressPct = totalForProgress > 0 ? Math.min(100, (gp.currentSubtotal / totalForProgress) * 100) : 0
                            return (
                                <div key={gp.ruleId} className="bg-white border border-amber-200 rounded-xl overflow-hidden shadow-sm">
                                    <div className="flex items-center gap-4 p-4">
                                        {gp.giftProductImage ? (
                                            <Image src={gp.giftProductImage} alt={gp.giftProductName} width={64} height={64} className="w-16 h-16 rounded-xl object-cover border border-slate-100 shrink-0" />
                                        ) : (
                                            <div className="w-16 h-16 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                                                <Gift className="w-6 h-6 text-amber-500" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-900">
                                                Free Gift: {gp.giftProductName}
                                            </p>
                                            <p className="text-xs text-amber-700 mt-0.5">
                                                Add <strong>₹{gp.neededAmount.toLocaleString()}</strong>{gp.triggerType !== 'cart_total' ? <> from <strong>{gp.qualifyingLabel}</strong></> : null} more to get it free
                                            </p>
                                            <div className="mt-2.5 h-1.5 bg-amber-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* BXGY progress banners - desktop */}
                {(bxgyProgress || []).filter((bp: any) => !bp.qualifies && bp.neededQty > 0 && bp.qualifyingVariantIds.length > 0).length > 0 && (
                    <div className="mb-6 space-y-3">
                        {(bxgyProgress || []).filter((bp: any) => !bp.qualifies && bp.neededQty > 0 && bp.qualifyingVariantIds.length > 0).map((bp: any) => {
                            const totalForProgress = bp.currentQty + bp.neededQty
                            const progressPct = totalForProgress > 0 ? Math.min(100, (bp.currentQty / totalForProgress) * 100) : 0
                            return (
                                <div key={bp.ruleId} className="bg-white border border-pink-200 rounded-xl overflow-hidden shadow-sm">
                                    <div className="flex items-center gap-4 p-4">
                                        <div className="w-16 h-16 rounded-xl bg-pink-100 flex items-center justify-center shrink-0">
                                            <Zap className="w-6 h-6 text-pink-500" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-900">
                                                FREE: {bp.getLabel}
                                            </p>
                                            <p className="text-xs text-pink-700 mt-0.5">
                                                Add <strong>{bp.neededQty} more</strong>{bp.neededQty > 0 && bp.qualifyingLabel ? <> from <strong>{bp.qualifyingLabel}</strong></> : null} to get it free
                                            </p>
                                            <div className="mt-2.5 h-1.5 bg-pink-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-pink-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                <div className="flex gap-10 items-start">
                    {/* Items Column */}
                    <div className="flex-1 min-w-0">
                        {/* Table header */}
                        <div className="hidden lg:grid grid-cols-[1fr_120px_140px_100px] gap-4 pb-3 border-b border-slate-100 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                            <span>Product</span>
                            <span className="text-center">Price</span>
                            <span className="text-center">Quantity</span>
                            <span className="text-right">Subtotal</span>
                        </div>

                        <div className="divide-y divide-slate-50">
                            {items.map((item: any) => {
                                const unitPrice = Math.round(item.price)
                                const unitMrp = Math.round(item.originalPrice || item.price)
                                const hasDiscount = unitMrp > unitPrice

                                return (
                                    <div key={item.variantId} className="py-6 lg:grid lg:grid-cols-[1fr_120px_140px_100px] lg:gap-4 flex gap-4">
                                        {/* Product info */}
                                        <div className="flex gap-4 min-w-0">
                                            <div className="w-24 h-28 bg-slate-50 rounded-lg overflow-hidden shrink-0">
                                                <Image
                                                    src={item.image || "/placeholder.png"}
                                                    alt={item.name}
                                                    width={96}
                                                    height={112}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div className="min-w-0 flex flex-col justify-between py-1">
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2">{item.name}</p>
                                                    {item.variantTitle && (
                                                        <p className="text-xs text-slate-400 mt-0.5">{item.variantTitle}</p>
                                                    )}
                                                    {(item.stock ?? 1) <= 0 && (
                                                        <span className="mt-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-red-50 text-red-600 border border-red-100">
                                                            Out of Stock
                                                        </span>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        if (item.is_gift || item.is_bxgy_free) return;
                                                        if (confirm("Remove this item from your bag?")) handleRemove(item.variantId)
                                                    }}
                                                    className={`text-xs transition-colors w-fit ${item.is_gift || item.is_bxgy_free ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-red-500'}`}
                                                >
                                                    {item.is_gift || item.is_bxgy_free ? 'Free Gift' : 'Remove'}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Price - desktop */}
                                        <div className="hidden lg:flex flex-col items-center justify-center">
                                            {item.is_gift || item.is_bxgy_free ? (
                                                <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">FREE</span>
                                            ) : discountMap[item.variantId]?.amount > 0 ? (
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="text-xs font-bold text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded">FREE</span>
                                                    <p className="text-xs text-slate-400 line-through">{'₹' + unitPrice.toLocaleString()}</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <p className="text-sm font-semibold text-slate-900">{'₹' + unitPrice.toLocaleString()}</p>
                                                    {hasDiscount && (
                                                        <p className="text-xs text-slate-400 line-through">{'₹' + unitMrp.toLocaleString()}</p>
                                                    )}
                                                </>
                                            )}
                                        </div>

                                        {/* Quantity - desktop */}
                                        <div className="hidden lg:flex items-center justify-center">
                                            {item.is_gift || item.is_bxgy_free ? (
                                                <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-3 py-1 rounded-full">Qty: 1</span>
                                            ) : (
                                            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                                                <button
                                                    onClick={() => {
                                                        if (item.quantity <= 1) {
                                                            if (confirm("Remove this item from your bag?")) handleRemove(item.variantId)
                                                        } else {
                                                            handleUpdateQuantity(item.variantId, item.quantity - 1)
                                                        }
                                                    }}
                                                    className="w-9 h-9 flex items-center justify-center hover:bg-slate-50 transition-colors"
                                                >
                                                    <Minus className="w-3 h-3 text-slate-500" />
                                                </button>
                                                <span className="w-9 text-center text-sm font-semibold text-slate-900 select-none">{item.quantity}</span>
                                                <button
                                                    onClick={() => handleUpdateQuantity(item.variantId, item.quantity + 1)}
                                                    className="w-9 h-9 flex items-center justify-center hover:bg-slate-50 transition-colors"
                                                >
                                                    <Plus className="w-3 h-3 text-slate-500" />
                                                </button>
                                            </div>
                                            )}
                                        </div>

                                        {/* Subtotal - desktop */}
                                        <div className="hidden lg:flex flex-col items-end justify-center">
                                            {item.is_gift || item.is_bxgy_free ? (
                                                <span className="text-xs font-bold text-purple-600">₹0</span>
                                            ) : discountMap[item.variantId]?.amount > 0 ? (
                                                <div className="flex flex-col items-end gap-0.5">
                                                    <span className="text-xs text-slate-400 line-through">₹{Math.round(unitPrice * item.quantity).toLocaleString()}</span>
                                                    <span className="text-xs font-semibold text-pink-600">₹{Math.round(unitPrice * (item.quantity - (discountMap[item.variantId]?.freeQty || 0))).toLocaleString()}</span>
                                                </div>
                                            ) : (
                                                <p className="text-sm font-semibold text-slate-900">₹{Math.round(unitPrice * item.quantity).toLocaleString()}</p>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Coupon */}
                        <div className="mt-6 pt-6 border-t border-slate-100">
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    placeholder="Enter coupon code"
                                    className="flex-1 max-w-xs h-10 px-4 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300"
                                />
                                <button className="h-10 px-5 text-xs font-semibold uppercase tracking-wider text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors">
                                    Apply
                                </button>
                            </div>
                        </div>

                        {/* Recommendations */}
                        {recommendations.length > 0 && (
                            <div className="mt-10 pt-8 border-t border-slate-100">
                                <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-5">You Might Also Like</h3>
                                <div className="flex gap-5 overflow-x-auto no-scrollbar pb-2">
                                    {recommendations.map((rec: any) => (
                                        <div key={rec.id} className="w-48 shrink-0">
                                            <ProductCard product={rec} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Summary Column */}
                    <div className="w-[340px] shrink-0">
                        <div className="bg-slate-50 rounded-xl p-6 sticky top-6">
                            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-6">Order Summary</h2>
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Total MRP ({totalQty} item{totalQty !== 1 ? 's' : ''})</span>
                                    <span className="font-medium text-slate-900">₹{totalMRP.toLocaleString()}</span>
                                </div>
                                {totalDiscount > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-emerald-600">Discount</span>
                                        <span className="font-medium text-emerald-600">-₹{totalDiscount.toLocaleString()}</span>
                                    </div>
                                )}
                                {totalBXGYDiscount > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-[#fc2779] flex items-center gap-1.5">
                                            <Tag className="w-3.5 h-3.5" />
                                            Buy X Get Y
                                        </span>
                                        <span className="font-medium text-[#fc2779]">-₹{totalBXGYDiscount.toLocaleString()}</span>
                                    </div>
                                )}
                                {giftItems.length > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-purple-600 flex items-center gap-1.5">
                                            <Gift className="w-3.5 h-3.5" />
                                            Free Gift{giftItems.length > 1 ? 's' : ''}
                                        </span>
                                        <span className="font-medium text-purple-600">FREE</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Shipping</span>
                                    <span className="font-medium text-slate-500">Calculated at checkout</span>
                                </div>
                                <div className="border-t border-slate-200 pt-3 flex justify-between items-baseline">
                                    <span className="text-sm font-semibold text-slate-900">Total</span>
                                    <span className="text-xl font-light text-slate-900">₹{Math.max(0, subtotal - totalBXGYDiscount).toLocaleString()}</span>
                                </div>
                                {(totalDiscount > 0 || totalBXGYDiscount > 0) && (
                                    <div className="flex justify-between items-center pt-1">
                                        <span className="text-[11px] font-semibold text-emerald-600">You will save ₹{(totalDiscount + totalBXGYDiscount).toLocaleString()} on this order</span>
                                    </div>
                                )}
                            </div>
                            {hasOutOfStock ? (
                                <div className="mt-6 w-full h-12 bg-slate-300 text-white text-sm font-medium tracking-wide rounded-lg flex items-center justify-center gap-2 cursor-not-allowed">
                                    Some items are out of stock
                                </div>
                            ) : (
                                <Link
                                    href="/checkout"
                                    className="mt-6 w-full h-12 bg-slate-900 text-white text-sm font-medium tracking-wide rounded-lg flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
                                >
                                    Checkout
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                                    </svg>
                                </Link>
                            )}
                            <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-slate-400">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                Secure checkout
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )

    if (items.length === 0) {
        return (
            <>
                {/* Desktop empty state */}
                <div className="hidden lg:block min-h-screen bg-white">
                    <div className="max-w-7xl mx-auto px-8 py-24">
                        <div className="max-w-md mx-auto text-center">
                            <div className="w-20 h-20 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-6">
                                <ShoppingBag className="w-10 h-10 text-slate-300" strokeWidth={1} />
                            </div>
                            <h2 className="text-2xl font-light text-slate-900 mb-2">Your cart is empty</h2>
                            <p className="text-sm text-slate-400 mb-8">Looks like you haven't added anything yet.</p>
                            <Link
                                href="/shop"
                                className="inline-flex h-11 px-7 bg-slate-900 text-white text-xs font-semibold uppercase tracking-wider rounded-lg items-center justify-center hover:bg-slate-800 transition-colors"
                            >
                                Start Shopping
                            </Link>
                        </div>
                        {recentlyViewed.length > 0 && (
                            <div className="mt-20">
                                <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-5">Recently Viewed</h3>
                                <div className="grid grid-cols-5 gap-5">
                                    {recentlyViewed.slice(0, 10).map((item: any) => (
                                        <ProductCard key={item.id} product={item} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                {/* Mobile empty state */}
                <div className="lg:hidden min-h-screen bg-white">
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
                                <button onClick={clearRecentlyViewed} className="text-xs font-semibold text-gray-400 hover:text-gray-600">Clear</button>
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
            </>
        )
    }

    return (
        <>
            {desktop}

            {/* MOBILE — untouched */}
                <div className="lg:hidden min-h-screen bg-white pb-24">
                <div className="px-5 pt-6 pb-3">
                    <h1 className="text-xl font-semibold text-gray-900">
                        Bag Items ({totalQty})
                    </h1>
                </div>
                {/* Gift progress banners - mobile */}
                {(giftProgress || []).filter((gp: any) => !gp.qualifies && gp.neededAmount > 0 && gp.qualifyingVariantIds.length > 0).length > 0 && (
                    <div className="px-5 mb-3 space-y-2">
                        {(giftProgress || []).filter((gp: any) => !gp.qualifies && gp.neededAmount > 0 && gp.qualifyingVariantIds.length > 0).map((gp: any) => {
                            const totalForProgress = gp.currentSubtotal + gp.neededAmount
                            const progressPct = totalForProgress > 0 ? Math.min(100, (gp.currentSubtotal / totalForProgress) * 100) : 0
                            return (
                                <div key={gp.ruleId} className="bg-white border border-amber-200 rounded-xl overflow-hidden shadow-sm">
                                    <div className="flex items-center gap-3 p-3">
                                        {gp.giftProductImage ? (
                                            <Image src={gp.giftProductImage} alt={gp.giftProductName} width={48} height={48} className="w-12 h-12 rounded-lg object-cover border border-slate-100 shrink-0" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                                                <Gift className="w-5 h-5 text-amber-500" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-slate-900 leading-tight">
                                                Free: {gp.giftProductName}
                                            </p>
                                            <p className="text-[11px] text-amber-700 mt-0.5">
                                                Add <strong>₹{gp.neededAmount.toLocaleString()}</strong>{gp.triggerType !== 'cart_total' ? <> from <strong>{gp.qualifyingLabel}</strong></> : null} more
                                            </p>
                                            <div className="mt-1.5 h-1 bg-amber-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
                {/* BXGY progress banners - mobile */}
                {(bxgyProgress || []).filter((bp: any) => !bp.qualifies && bp.neededQty > 0 && bp.qualifyingVariantIds.length > 0).length > 0 && (
                    <div className="px-5 mb-3 space-y-2">
                        {(bxgyProgress || []).filter((bp: any) => !bp.qualifies && bp.neededQty > 0 && bp.qualifyingVariantIds.length > 0).map((bp: any) => {
                            const totalForProgress = bp.currentQty + bp.neededQty
                            const progressPct = totalForProgress > 0 ? Math.min(100, (bp.currentQty / totalForProgress) * 100) : 0
                            return (
                                <div key={bp.ruleId} className="bg-white border border-pink-200 rounded-xl overflow-hidden shadow-sm">
                                    <div className="flex items-center gap-3 p-3">
                                        <div className="w-12 h-12 rounded-lg bg-pink-100 flex items-center justify-center shrink-0">
                                            <Zap className="w-5 h-5 text-pink-500" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-slate-900 leading-tight">
                                                FREE: {bp.getLabel}
                                            </p>
                                            <p className="text-[11px] text-pink-700 mt-0.5">
                                                Add <strong>{bp.neededQty} more</strong>{bp.qualifyingLabel ? <> from <strong>{bp.qualifyingLabel}</strong></> : null}
                                            </p>
                                            <div className="mt-1.5 h-1 bg-pink-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-pink-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
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
                                                    {(item.stock ?? 1) <= 0 && (
                                                        <span className="mt-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-red-50 text-red-600 border border-red-100">
                                                            Out of Stock
                                                        </span>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        if (item.is_gift || item.is_bxgy_free) return;
                                                        if (confirm("Remove this item from your bag?")) handleRemove(item.variantId)
                                                    }}
                                                    className={`w-5 h-5 flex items-center justify-center shrink-0 ${item.is_gift || item.is_bxgy_free ? 'cursor-default' : ''}`}
                                                >
                                                    {item.is_gift || item.is_bxgy_free ? (
                                                        <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">FREE</span>
                                                    ) : (
                                                        <X className="w-4 h-4 text-gray-400" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 mt-2">
                                            {item.is_gift || item.is_bxgy_free ? (
                                                <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-3 py-1 rounded-full">Qty: 1</span>
                                            ) : (
                                            <>
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
                                            </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="border-t border-gray-100 mt-2.5 pt-2 flex items-center justify-between">
                                    <span className="text-xs font-medium text-gray-400">
                                        {item.is_gift || item.is_bxgy_free ? 'Free Gift' : 'You pay'}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        {item.is_gift || item.is_bxgy_free ? (
                                            <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">FREE</span>
                                        ) : discountMap[item.variantId]?.amount > 0 ? (
                                            <>
                                                <span className="text-xs font-bold text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded">FREE</span>
                                                <span className="text-xs font-medium text-gray-400 line-through">₹{Math.round(unitPrice * item.quantity)}</span>
                                                <span className="text-xs font-bold text-pink-600">₹{Math.round(unitPrice * (item.quantity - (discountMap[item.variantId]?.freeQty || 0)))}</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-sm font-bold text-gray-900">₹{Math.round(unitPrice * item.quantity)}</span>
                                                {hasDiscount && (
                                                    <>
                                                        <span className="text-xs font-medium text-gray-400 line-through">₹{Math.round(unitMrp * item.quantity)}</span>
                                                        <span className="text-xs font-bold text-green-500">{saving} off</span>
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
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
                {totalSaving > 0 && (
                    <div className="fixed bottom-[73px] left-0 right-0 bg-green-50 border-t border-gray-100 py-2 flex items-center justify-center z-30">
                        <p className="text-xs font-bold text-gray-800">
                            You're saving <span className="text-green-500">₹{totalSaving.toLocaleString()}</span>
                        </p>
                    </div>
                )}
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5 py-3 z-30">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black tracking-wider text-gray-400">GRAND TOTAL</p>
                            <p className="text-[22px] font-black text-gray-900">₹{subtotal.toLocaleString()}</p>
                        </div>
                        {hasOutOfStock ? (
                            <div className="h-[42px] bg-gray-300 text-white text-[11px] font-black tracking-wider rounded-lg flex items-center justify-center gap-1.5 px-6 cursor-not-allowed">
                                SOME ITEMS OUT OF STOCK
                            </div>
                        ) : (
                            <Link
                                href="/checkout"
                                className="h-[42px] bg-gray-900 text-white text-[11px] font-black tracking-wider rounded-lg flex items-center justify-center gap-1.5 px-6 hover:bg-gray-800 transition-colors"
                            >
                                PROCEED TO CHECKOUT
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}
