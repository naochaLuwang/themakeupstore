"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useCart } from "@/components/store/use-cart"
import { lineSubtotal, linePriceLabel } from "@/lib/line-pricing"
import { roundMoney } from "@/lib/promotion-engine"
import { getCheckoutQuote } from "@/app/actions/offer-quote"
import { paidCartKey } from "@/lib/cart-key"
import { cartStockIssue } from "@/lib/cart-stock"
import { placeOrder } from "@/app/actions/orders"
import { validatePromoCode } from "@/app/actions/promo"
import { validateGiftCard } from "@/app/actions/gift-cards"
import { getAvailableBalance } from "@/app/actions/loyalty"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
    Plus, Loader2, Check, ChevronRight,
    MapPin, ShoppingBag, Ticket, X, Sparkles, Gift, Tag, Coins, Info,
} from "lucide-react"
import { checkPromoEligibility } from "@/lib/promo-helper"
import { usePromotions } from "@/hooks/use-promotions"

import { createClient } from "@/utils/supabase/client"
import { AddressForm } from "@/components/store/address-form"
import { Button } from "@/components/ui/button"

const FREE_SHIPPING_THRESHOLD = 3000
import { FREE_SHIPPING_PINCODES } from "@/lib/cart-constants"

interface CheckoutClientProps {
    profile: any
    initialAddresses: any[]
    allPromos?: any[]
}

export default function CheckoutClient({ profile, initialAddresses, allPromos = [] }: CheckoutClientProps) {
    const {checking:checkingOffers,error:offerError,refresh:refreshOffers} = usePromotions()
    const supabase = createClient()
    const router = useRouter()
    const {
        items, shippingPrice, selectedShippingId, shippingLabel, deliveryTimeLabel,
        setShippingMethod, getSubtotal, setShippingPincode,
        appliedPromo, setAppliedPromo, getDiscountAmount, getFinalTotal,
        getGiftItems, getBXGYTotalDiscount, bxgyDiscounts, hasAutomaticOffer, removeItem, updateQuantity,
    } = useCart()

    const [mounted, setMounted] = useState(false)
    const [loading, setLoading] = useState(false)
    const [reviewRequired, setReviewRequired] = useState(() => useCart.getState().items.some(item => !!cartStockIssue(item)))
    const correctionFocus = useRef(false)
    const checkoutItemsRef = useRef<HTMLDivElement>(null)
    const reviewTotalRef = useRef<HTMLButtonElement>(null)
    const continueShoppingRef = useRef<HTMLButtonElement>(null)
    useEffect(() => useCart.subscribe(state => {
        if (state.items.some(item => !!cartStockIssue(item))) setReviewRequired(true)
    }), [])
    const [savedAddresses, setSavedAddresses] = useState(initialAddresses)
    const [selectedAddress, setSelectedAddress] = useState<any | null>(
        initialAddresses.find((a: any) => a.is_default) || initialAddresses[0] || null
    )
    const [showAddressPicker, setShowAddressPicker] = useState(false)
    const [showPromoPicker, setShowPromoPicker] = useState(false)
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)

    const [showBreakup, setShowBreakup] = useState(false)
    const currency = (n: number) =>
        new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)
    const [giftCard, setGiftCard] = useState<any | null>(null)
    const [giftCardCode, setGiftCardCode] = useState("")
    const [applyingGiftCard, setApplyingGiftCard] = useState(false)
    const [giftCardError, setGiftCardError] = useState("")
    const [coinBalance, setCoinBalance] = useState(0)
    const [useCoins, setUseCoins] = useState(false)
    const [showCoinInfo, setShowCoinInfo] = useState(false)
    const [loadingCoins, setLoadingCoins] = useState(false)
    const [pendingPaidOrder, setPendingPaidOrder] = useState<{ userId: string; args: Parameters<typeof placeOrder> } | null>(null)
    useEffect(() => {
        setPendingPaidOrder(null)
        if (!profile?.id) return
        try {
            const raw = sessionStorage.getItem(`checkout-payment-confirmation:${profile.id}`)
            if (raw) {
                const saved = JSON.parse(raw)
                if (saved.userId === profile.id && Array.isArray(saved.args) && saved.args.length === 10) setPendingPaidOrder(saved)
            }
        } catch { /* Confirmation remains retryable in memory when storage is unavailable. */ }
    }, [profile?.id])
    const confirmPaidOrder = async (pending: { userId: string; args: Parameters<typeof placeOrder> }) => {
        if (pending.userId !== profile?.id) return toast.error('Sign in to the account used for this payment')
        setLoading(true)
        try {
            const result = await placeOrder(...pending.args)
            if (!result.success) throw new Error(result.message || 'Order confirmation failed')
            try { sessionStorage.removeItem(`checkout-payment-confirmation:${profile.id}`) } catch { /* The order is already committed. */ }
            setPendingPaidOrder(null)
            router.push(`/checkout/success?orderId=${result.orderId}`)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Could not confirm the paid order. Retry confirmation without paying again.')
        } finally { setLoading(false) }
    }
    const checkoutAttempt = useRef<{ fingerprint: string; key: string } | null>(null)
    const [paymentMethod, setPaymentMethod] = useState<"cod" | "razorpay">("razorpay")

    useEffect(() => { setMounted(true) }, [])

    useEffect(() => {
        if (profile?.id) {
            getAvailableBalance(profile.id).then(setCoinBalance).catch(() => { })
        }
    }, [profile?.id])

    useEffect(() => {
        const script = document.createElement("script")
        script.src = "https://checkout.razorpay.com/v1/checkout.js"
        script.async = true
        document.body.appendChild(script)
        return () => { document.body.removeChild(script) }
    }, [])

    useEffect(() => {
        if (!selectedAddress) {
            setShippingMethod({ id: "", name: "", price: 0, delivery_time_label: "" })
            setShippingPincode("")
            return
        }
        const fetchShippingByPincode = async () => {
            if (!selectedAddress?.pincode) return

            const { data: zones, error } = await supabase
                .from("shipping_zones")
                .select("id, shipping_methods(id, name, price, delivery_time_label)")
                .eq("pincode", selectedAddress.pincode)

            if (error) {
                console.error("Shipping zone lookup failed:", error)
                return
            }

            const zone = zones?.[0]
            const method = zone?.shipping_methods?.[0]

            if (method) {
                setShippingMethod({ id: method.id, name: method.name, price: Number(method.price), delivery_time_label: method.delivery_time_label })
            }
            setShippingPincode(selectedAddress.pincode)
        }
        fetchShippingByPincode()
    }, [selectedAddress, setShippingMethod, setShippingPincode])

    const subtotal = getSubtotal()
    const currentSubtotal = mounted ? subtotal : 0
    const discountAmount = mounted ? getDiscountAmount() : 0
    const bxgyDiscount = mounted ? getBXGYTotalDiscount() : 0
    const discountMap = useMemo(() => {
        const map: Record<string, { amount: number; freeQty: number }> = {}
            ; (bxgyDiscounts || []).forEach((d: any) => {
                const existing = map[d.variant_id] || { amount: 0, freeQty: 0 }
                existing.amount += d.discount_amount
                existing.freeQty += d.free_quantity || 0
                map[d.variant_id] = existing
            })
        return map
    }, [bxgyDiscounts])
    const giftItems = mounted ? getGiftItems() : []
    const total = mounted ? getFinalTotal() : 0
    const giftCardDiscount = giftCard ? Math.min(Number(giftCard.remaining_balance), total) : 0
    const coinDiscount = useCoins && coinBalance > 0 ? Math.min(coinBalance, Math.floor(Math.max(0, total - giftCardDiscount))) : 0
    const adjustedTotal = Math.max(0, roundMoney(total - giftCardDiscount - coinDiscount))
    const hasPaidItems = items.some(item => !item.is_gift && !item.is_bxgy_free)
    const hasStockProblems = items.some(item => !!cartStockIssue(item))
    const checkoutBlocked = !hasPaidItems || hasStockProblems || checkingOffers || !!offerError || reviewRequired
    const stockControlLocked = loading || !!pendingPaidOrder
    useEffect(() => {
        if (!correctionFocus.current || loading) return
        const target = hasStockProblems ? checkoutItemsRef.current?.querySelector<HTMLButtonElement>('[data-stock-correction]:not([disabled])')
            : !hasPaidItems ? continueShoppingRef.current
            : !checkingOffers && !offerError ? reviewTotalRef.current : null
        if (target && !target.disabled) { target.focus(); correctionFocus.current = false }
    }, [items, hasStockProblems, hasPaidItems, checkingOffers, offerError, loading, reviewRequired])
    const isFreeShipping = currentSubtotal >= FREE_SHIPPING_THRESHOLD && selectedShippingId && FREE_SHIPPING_PINCODES.includes(selectedAddress?.pincode)

    const handleAddressAdded = (newAddr: any) => {
        setSavedAddresses((prev: any) => [newAddr, ...prev])
        setSelectedAddress(newAddr)
        setIsAddModalOpen(false)
    }

    const handleSelectAddress = (addr: any) => {
        if(loading)return
        setSelectedAddress(addr)
        setShowAddressPicker(false)
    }

    const handleApplyPromo = async (promo: any) => {
        if(loading)return
        if (hasAutomaticOffer) return toast.error("Coupons cannot be combined with these offers")
        try {
            const result = await validatePromoCode(promo.code, items)
            if (result.success) {
                setAppliedPromo({
                    ...result,
                    allowedProductIds: promo.promo_code_products?.map((p: any) => String(p.product_id)),
                    allowedCategoryIds: promo.promo_code_categories?.map((c: any) => String(c.category_id)),
                })
                setShowPromoPicker(false)
                toast.success(`Coupon ${promo.code} Applied!`)
            } else {
                toast.error(result.message || "Cannot apply this coupon")
            }
        } catch (err: any) {
            toast.error(err?.message || "Failed to apply coupon — check console")
        }
    }

    const handleRemovePromo = () => {
        if(loading)return
        setAppliedPromo(null)
        toast.info("Promo code removed")
    }

    const handleApplyGiftCard = async () => {
        if(loading)return
        if (!giftCardCode.trim()) return
        setApplyingGiftCard(true)
        setGiftCardError("")
        const res = await validateGiftCard(giftCardCode.trim())
        if (res.success) {
            setGiftCard(res.giftCard)
            setGiftCardCode("")
            toast.success("Gift card applied!")
        } else {
            setGiftCardError(res.message || "Invalid gift card")
            toast.error(res.message || "Invalid gift card")
        }
        setApplyingGiftCard(false)
    }

    const handleRemoveGiftCard = () => {
        if(loading)return
        setGiftCard(null)
        toast.info("Gift card removed")
    }

    const handleToggleCoinRedemption = async () => {
        if (stockControlLocked) return
        if (useCoins) {
            setUseCoins(false)
            toast.info("M Coins removed")
            return
        }
        setLoadingCoins(true)
        if (profile?.id) {
            const balance = await getAvailableBalance(profile.id)
            setCoinBalance(balance)
            if (balance <= 0) {
                toast.error("No M Coins available")
                setLoadingCoins(false)
                return
            }
            setUseCoins(true)
            toast.success(`${balance} M Coins applied! −₹${balance}`)
        }
        setLoadingCoins(false)
    }

    const checkCurrentCheckout = async () => {
        const inputKey = paidCartKey(items)
        const quoteRevision = useCart.getState().offerQuoteRevision
        const checked = await getCheckoutQuote(items, {shippingMethodId:selectedShippingId!,pincode:String(selectedAddress.pincode),
            promoCode:appliedPromo?.code,giftCardCode:giftCard?.code,coinAmount:coinDiscount})
        if (paidCartKey(useCart.getState().items) !== inputKey) throw new Error('Your basket changed. Please review it before placing your order.')
        if (useCart.getState().offerQuoteRevision !== quoteRevision) {
            setReviewRequired(true)
            throw new Error('Your basket availability changed. Please review checkout again.')
        }
        if (!checked.success) {
            if (checked.stock) {
                useCart.getState().applyCartStock(checked.stock, checked.message)
                setReviewRequired(true)
                return null
            }
            throw new Error(checked.message)
        }
        const quote = checked.quote
        const oldGiftRules = items.filter(i=>i.is_gift).map(i=>i.gift_rule_id).sort().join(',')
        const newGiftRules = quote.freeItems.map(g=>g.ruleId).sort().join(',')
        useCart.getState().applyOfferQuote(quote)
        setShippingMethod({id:selectedShippingId!,name:quote.shippingLabel,price:quote.shippingBasePrice,delivery_time_label:quote.deliveryTimeLabel})
        const changed = Math.round(adjustedTotal*100)!==Math.round(quote.total*100) || oldGiftRules!==newGiftRules || inputKey!==paidCartKey(quote.items)
        return {...checked, changed}
    }

    const handleStockCorrection = (variantId: string, quantity?: number) => {
        if (stockControlLocked) return
        correctionFocus.current = true
        setReviewRequired(true)
        if (quantity === undefined) removeItem(variantId)
        else updateQuantity(variantId, quantity)
    }

    const handleReviewTotal = async () => {
        if (stockControlLocked || hasStockProblems || !hasPaidItems || !selectedAddress || !selectedShippingId) return
        setLoading(true)
        try {
            const checked = await checkCurrentCheckout()
            if (!checked) return
            if (checked.changed) {
                toast.info('Your total or offers changed. Please review the updated amount.')
                return
            }
            setReviewRequired(false)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Could not verify the updated total')
        } finally { setLoading(false) }
    }

    const handlePlaceOrder = async () => {
        if (loading) return
        if (pendingPaidOrder) { await confirmPaidOrder(pendingPaidOrder); return }
        if (checkoutBlocked || useCart.getState().items.some(item => !!cartStockIssue(item))) return
        if (!selectedAddress) {
            return toast.error("Please select a delivery address")
        }
        if (!selectedShippingId) {
            return toast.error("Sorry, we don't deliver to your pincode yet")
        }
        setLoading(true)
        try {
            const checked = await checkCurrentCheckout()
            if (!checked) { setLoading(false); return }
            const quote = checked.quote
            if (checked.changed) {
                setReviewRequired(true)
                toast.info('Your prices or offers were updated. Please review the basket and place your order again.')
                setLoading(false)
                return
            }
            const canonicalItems=useCart.getState().items
            const commonOrderArgs = [
                selectedAddress, canonicalItems,
                {total:quote.total,price:quote.shippingPrice,methodName:quote.shippingLabel,deliveryTimeLabel:quote.deliveryTimeLabel,
                    shipping_method_id:selectedShippingId,quoteFingerprint:checked.fingerprint},
                appliedPromo?{code:appliedPromo.code,discount:quote.promoDiscount}:undefined,
                undefined,undefined,
                giftCard?{code:giftCard.code,amount:quote.giftCardDiscount}:undefined,
                useCoins&&quote.coinDiscount>0?{amount:quote.coinDiscount}:undefined,
            ] as const
            const fingerprint = JSON.stringify(commonOrderArgs)
            if (checkoutAttempt.current?.fingerprint !== fingerprint) checkoutAttempt.current = { fingerprint, key: crypto.randomUUID() }
            const checkoutKey = checkoutAttempt.current.key
            if (paymentMethod === "cod" || adjustedTotal === 0) {
                try {
                    const res = await placeOrder(...commonOrderArgs, undefined, checkoutKey)
                    if (res.success) {
                        router.push(`/checkout/success?orderId=${res.orderId}`)
                    } else {
                        setReviewRequired(true)
                        refreshOffers()
                        toast.error(res.message || "Order failed")
                    }
                } catch (err) {
                    toast.error("Order submission failed")
                } finally {
                    setLoading(false)
                }
                return
            }

            // Razorpay flow
            try {
                const amountPaise = Math.round(adjustedTotal * 100)
                if (amountPaise < 100) {
                    toast.error("Minimum order amount is ₹1")
                    setLoading(false)
                    return
                }
                const orderRes = await fetch("/api/create-order", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        amount: amountPaise,
                        cartItems: canonicalItems,
                        quoteFingerprint: checked.fingerprint,
                        shippingPrice: isFreeShipping ? 0 : shippingPrice,
                        shippingMethodId: selectedShippingId,
                        pincode: selectedAddress?.pincode || null,
                        promoDiscount: discountAmount,
                        promoCode: appliedPromo?.code || null,
                        bxgyDiscount,
                        giftCardCode: giftCard?.code || null,
                        giftCardDiscount,
                        coinDiscount,
                    }),
                })
                if (!orderRes.ok) {
                    const errData = await orderRes.json()
                    if (errData.stock && paidCartKey(useCart.getState().items) === paidCartKey(canonicalItems)) {
                        useCart.getState().applyCartStock(errData.stock, errData.error)
                        setReviewRequired(true)
                        setLoading(false)
                        return
                    }
                    throw new Error(errData.error || "Failed to create payment order")
                }
                const { order_id, amount } = await orderRes.json()

                if (!(window as any).Razorpay) {
                    toast.error("Payment gateway loading. Please try again.")
                    setLoading(false)
                    return
                }

                const isCapacitor = typeof window !== "undefined" && !!(window as any).Capacitor?.isNativePlatform?.()

                const razorpay = new (window as any).Razorpay({
                    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                    order_id,
                    amount,
                    currency: "INR",
                    name: "THE MAKE UP STORE WANGKHEI",
                    description: `Order ${selectedAddress?.full_name}`,
                    ...(isCapacitor ? { webview_intent: true } : {}),
                    prefill: {
                        name: selectedAddress?.full_name,
                        email: profile?.email,
                        contact: selectedAddress?.phone,
                    },
                    handler: async function (response: any) {
                        const pending = { userId: profile.id, args: [...commonOrderArgs,
                            { method: 'razorpay', payment_id: response.razorpay_payment_id, order_id: response.razorpay_order_id, signature: response.razorpay_signature, status: 'paid' },
                            checkoutKey] as Parameters<typeof placeOrder> }
                        setPendingPaidOrder(pending)
                        try { sessionStorage.setItem(`checkout-payment-confirmation:${profile.id}`, JSON.stringify(pending)) }
                        catch { console.warn('Could not persist payment confirmation; keep this page open to retry') }
                        await confirmPaidOrder(pending)
                    },
                    modal: {
                        ondismiss: function () {
                            setLoading(false)
                            toast.info("Payment cancelled")
                        },
                    },
                })
                razorpay.open()
            } catch (err: any) {
                toast.error(err.message || "Payment initiation failed")
                setLoading(false)
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Process interrupted")
            setLoading(false)
        }
    }

    if (!mounted) return null

    const eligiblePromos = (hasAutomaticOffer ? [] : allPromos).filter((p: any) => {
        try { return checkPromoEligibility(p, items).isEligible } catch { return false }
    })
    const ineligiblePromos = allPromos.filter((p: any) => {
        try { return !checkPromoEligibility(p, items).isEligible } catch { return true }
    })

    return (
        <div className="min-h-screen bg-gray-50/80 pb-24">
            {pendingPaidOrder && (
                <div className="mx-auto mb-4 max-w-5xl rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="status">
                    <p>Your payment is waiting for order confirmation. Retry here without paying again.</p>
                    <Button className="mt-3 bg-pink-600 text-white hover:bg-pink-700" disabled={loading} onClick={() => confirmPaidOrder(pendingPaidOrder)}>
                        {loading ? 'Confirming…' : 'Confirm Paid Order'}
                    </Button>
                </div>
            )}

            {offerError && !hasStockProblems && !pendingPaidOrder && <div className="mx-5 my-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600" role="status">
                {offerError}
                {offerError && <button className="ml-3 font-bold text-pink-600" onClick={refreshOffers}>Try again</button>}
            </div>}
            {hasAutomaticOffer && <p className="mx-5 my-3 text-xs text-slate-500">Automatic offers applied. Coupons cannot be combined with these offers.</p>}
            {/* Spacer */}
            <div className="h-0" />

            {/* Deliver To */}
            {selectedAddress ? (
                <button
                    onClick={() => setShowAddressPicker(true)}
                    className="w-full bg-white border-b border-gray-100 px-5 py-3.5 flex items-center gap-3 text-left"
                >
                    <MapPin className="w-[18px] h-[18px] text-gray-900 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">
                            Deliver to: <span className="font-semibold">{selectedAddress.full_name}</span>
                        </p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                            {selectedAddress.street}{selectedAddress.landmark ? `, ${selectedAddress.landmark}` : ""}, {selectedAddress.city}, {selectedAddress.state} - {selectedAddress.pincode}
                        </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs font-semibold text-gray-900">Change</span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                </button>
            ) : (
                <div className="bg-white px-5 py-8 flex flex-col items-center border-b border-gray-100">
                    <MapPin className="w-9 h-9 text-gray-300 mb-3" />
                    <p className="text-sm font-semibold text-gray-700">No saved addresses</p>
                    <p className="text-xs text-gray-400 mt-1 mb-4">Add a delivery address to continue</p>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="h-10 px-6 bg-pink-600 text-white text-xs font-bold rounded-full flex items-center gap-1.5 hover:bg-pink-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Add New Address
                    </button>
                </div>
            )}

            <div className="px-5 py-5 space-y-6">
                {/* Items */}
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <ShoppingBag className="w-[18px] h-[18px] text-gray-700" />
                        <h2 className="text-sm font-bold text-gray-900">Items ({items.length})</h2>
                    </div>
                    <div ref={checkoutItemsRef} className="bg-white rounded-xl overflow-hidden border border-gray-100">
                        {items.map((item: any, idx: number) => {
                            const dm = discountMap[item.variantId]
                            const bxgyLine = (dm?.amount || 0) > 0
                            const lineTotal = lineSubtotal(item)
                            const payable = roundMoney(lineTotal - (dm?.amount || 0))
                            const freeQty = dm?.freeQty || 0
                            const coversFullUnits = bxgyLine && freeQty > 0 && (dm?.amount || 0) >= item.price * freeQty
                            return (
                                <div
                                    key={item.variantId}
                                    data-checkout-variant={item.variantId}
                                    className={`flex items-center gap-3 p-3 ${idx < items.length - 1 ? "border-b border-gray-50" : ""}`}
                                >
                                    <img
                                        src={item.image || "/placeholder.png"}
                                        alt={item.name}
                                        className="w-14 h-14 rounded-lg object-cover bg-gray-50"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2">{item.name}</p>
                                        {item.variantTitle && (
                                            <p className="text-xs text-gray-400 mt-0.5">{item.variantTitle}</p>
                                        )}
                                        <p className="text-xs text-gray-400 mt-0.5">Qty: {item.quantity}</p>
                                        {cartStockIssue(item) && <div className="mt-2" role="status">
                                            <p className="text-xs font-semibold text-red-600">{item.stock <= 0 ? 'Just sold out' : cartStockIssue(item)}</p>
                                            {!pendingPaidOrder && <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                                                {item.stock > 0 && item.quantity > item.stock && <button type="button" disabled={stockControlLocked} onClick={() => handleStockCorrection(item.variantId, item.stock)} className="min-h-8 text-xs font-semibold text-pink-700 underline underline-offset-2 disabled:opacity-40">Use {item.stock}</button>}
                                                <button type="button" data-stock-correction aria-label={`Remove item: ${item.name}`} disabled={stockControlLocked} onClick={() => handleStockCorrection(item.variantId)} className="min-h-8 text-xs font-semibold text-pink-700 underline underline-offset-2 disabled:opacity-40">Remove item</button>
                                            </div>}
                                        </div>}
                                        {item.priceBreakdown?.some((g: { price: number }) => g.price !== item.price) && (
                                            <p className="text-[10px] text-gray-500 mt-0.5">{linePriceLabel(item)} · Offer units use original prices</p>
                                        )}
                                        {coversFullUnits && item.quantity - freeQty > 0 && (
                                            <p className="text-[10px] font-semibold text-pink-600 mt-0.5">{item.quantity - freeQty} paid + {freeQty} free</p>
                                        )}
                                    </div>
                                    <div className="text-right shrink-0">
                                        {bxgyLine ? (
                                            <div className="flex flex-col items-end gap-0.5">
                                                <p className="text-xs text-gray-400 line-through">₹{lineTotal}</p>
                                                <p className="text-sm font-bold text-gray-900">₹{payable}</p>
                                                <span className="text-[10px] font-bold text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded">
                                                    {coversFullUnits ? `${freeQty} FREE` : `SAVE ₹${Math.round(dm?.amount || 0)}`}
                                                </span>
                                            </div>
                                        ) : item.mrp > item.price ? (
                                            <>
                                                <p className="text-xs text-gray-400 line-through">₹{Math.round(item.mrp * item.quantity)}</p>
                                                <p className="text-sm font-bold text-gray-900">₹{lineTotal}</p>
                                            </>
                                        ) : (
                                            <p className="text-sm font-bold text-gray-900">₹{lineTotal}</p>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </section>

                {/* Offers & Coupons */}
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <Ticket className="w-[18px] h-[18px] text-gray-700" />
                        <h2 className="text-sm font-bold text-gray-900">Offers & Coupons</h2>
                    </div>
                    <div className="space-y-2">
                        {appliedPromo ? (
                            <div className="bg-pink-50 border border-pink-100 rounded-xl p-3 flex items-center gap-3">
                                <div className="w-9 h-9 bg-pink-500 rounded-lg flex items-center justify-center shrink-0">
                                    <Check className="w-[18px] h-[18px] text-white" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-gray-900">{appliedPromo.code}</p>
                                    <p className="text-xs font-semibold text-pink-600">You saved ₹{discountAmount}</p>
                                </div>
                                <button onClick={handleRemovePromo}>
                                    <X className="w-[18px] h-[18px] text-gray-400" />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => {if(!loading&&!hasAutomaticOffer)setShowPromoPicker(true);else if(hasAutomaticOffer)toast.info("Coupons cannot be combined with these offers")}}
                                className="w-full bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3"
                            >
                                <div className="w-9 h-9 bg-pink-50 rounded-lg flex items-center justify-center shrink-0">
                                    <Ticket className="w-4 h-4 text-gray-900" />
                                </div>
                                <span className="flex-1 text-sm font-semibold text-gray-900 text-left">
                                    {eligiblePromos.length > 0
                                        ? `${eligiblePromos.length} coupon${eligiblePromos.length > 1 ? "s" : ""} available`
                                        : "View all coupons"}
                                </span>
                                {eligiblePromos.length > 0 && (
                                    <span className="h-5 min-w-[22px] px-1.5 bg-pink-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center">
                                        {eligiblePromos.length}
                                    </span>
                                )}
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                            </button>
                        )}
                    </div>
                </section>

                {/* Payment Method */}
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <svg className="w-[18px] h-[18px] text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        <h2 className="text-sm font-bold text-gray-900">Payment Method</h2>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        {/* Pay Online — first / default */}
                        <button
                            disabled={loading} onClick={() => setPaymentMethod("razorpay")}
                            className={`w-full flex items-center gap-4 px-4 py-4 transition-colors ${paymentMethod === "razorpay" ? "bg-pink-50/50" : ""
                                } ${paymentMethod === "cod" ? "border-b border-gray-100" : ""}`}
                        >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${paymentMethod === "razorpay" ? "border-pink-500" : "border-gray-300"
                                }`}>
                                {paymentMethod === "razorpay" && (
                                    <div className="w-2.5 h-2.5 rounded-full bg-pink-500" />
                                )}
                            </div>
                            <div className="flex items-center gap-2 flex-1">
                                <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.078.879 4.249 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div className="text-left">
                                    <p className="text-sm font-semibold text-gray-900">Pay Online</p>
                                    <p className="text-[11px] text-gray-400">Credit / Debit card, UPI, Net Banking, Wallet</p>
                                </div>
                            </div>
                            {paymentMethod === "razorpay" && (
                                <div className="flex items-center gap-1">
                                    <img src="https://img.icons8.com/color/24/visa.png" alt="Visa" className="w-5 h-5" />
                                    <img src="https://img.icons8.com/color/24/mastercard.png" alt="Mastercard" className="w-5 h-5" />
                                    <img src="https://img.icons8.com/color/24/rupay.png" alt="RuPay" className="w-5 h-5" />
                                </div>
                            )}
                        </button>

                        {/* COD — second */}
                        <button
                            disabled={loading} onClick={() => setPaymentMethod("cod")}
                            className={`w-full flex items-center gap-4 px-4 py-4 transition-colors ${paymentMethod === "cod" ? "bg-pink-50/50" : ""
                                }`}
                        >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${paymentMethod === "cod" ? "border-pink-500" : "border-gray-300"
                                }`}>
                                {paymentMethod === "cod" && (
                                    <div className="w-2.5 h-2.5 rounded-full bg-pink-500" />
                                )}
                            </div>
                            <div className="flex items-center gap-2 flex-1">
                                <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125V9M2.25 6h18m10.5 0V9" />
                                </svg>
                                <div className="text-left">
                                    <p className="text-sm font-semibold text-gray-900">Cash on Delivery</p>
                                    <p className="text-[11px] text-gray-400">Pay when your order is delivered</p>
                                </div>
                            </div>
                        </button>
                    </div>

                    {/* Gift Card + Reward Coupon collapsibles */}
                    <div className="space-y-2 mt-2">
                        <details className="group bg-white border border-gray-200 rounded-xl overflow-hidden">
                            <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer list-none text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                                <ChevronRight className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-90" />
                                <Gift className="w-4 h-4 text-gray-500" />
                                Gift Card
                                {giftCard && <span className="text-[10px] font-bold text-blue-600 ml-auto">Applied</span>}
                            </summary>
                            <div className="px-4 pb-4">
                                {giftCard ? (
                                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3 mt-2">
                                        <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center shrink-0">
                                            <Gift className="w-[18px] h-[18px] text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-gray-900">{giftCard.code}</p>
                                            <p className="text-xs font-semibold text-blue-600">Balance: {currency(Number(giftCard.remaining_balance))}</p>
                                        </div>
                                        <button onClick={handleRemoveGiftCard}>
                                            <X className="w-[18px] h-[18px] text-gray-400" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="bg-white border border-gray-200 rounded-xl p-3 mt-2">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                placeholder="Enter gift card code"
                                                value={giftCardCode}
                                                onChange={(e) => setGiftCardCode(e.target.value.toUpperCase())}
                                                className="flex-1 h-10 px-3 rounded-lg border border-gray-200 text-sm font-medium text-gray-900 focus:outline-none focus:border-gray-900 transition-colors placeholder:text-gray-300"
                                            />
                                            <button
                                                onClick={handleApplyGiftCard}
                                                disabled={applyingGiftCard || !giftCardCode.trim()}
                                                className="h-10 px-4 bg-pink-600 text-white text-xs font-bold rounded-lg disabled:opacity-40 hover:bg-pink-700 transition-colors shrink-0"
                                            >
                                                {applyingGiftCard ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                                            </button>
                                        </div>
                                        {giftCardError && (
                                            <p className="text-[11px] font-medium text-red-500 mt-2">{giftCardError}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </details>

                        {coinBalance > 0 && (
                            <div className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl">
                                <div className="flex items-center gap-2.5">
                                    <Coins className="w-4 h-4 text-pink-500" />
                                    <span className="text-sm font-semibold text-gray-900">Use M Coins</span>
                                    <span className="text-xs font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full">{coinBalance} coins = ₹{coinBalance}</span>
                                    <button onClick={(e) => { e.stopPropagation(); setShowCoinInfo(true) }} className="ml-0.5">
                                        <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 transition-colors" />
                                    </button>
                                </div>
                                <button
                                    onClick={handleToggleCoinRedemption}
                                    disabled={loadingCoins || stockControlLocked}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${useCoins ? "bg-pink-500" : "bg-gray-200"
                                        }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${useCoins ? "translate-x-6" : "translate-x-1"
                                            }`}
                                    />
                                </button>
                            </div>
                        )}
                    </div>
                </section>

                {/* Price Breakup Accordion */}
                {!hasPaidItems && !pendingPaidOrder && <section className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600" role="status">
                    <p>Your bag is empty. Add a product to continue.</p>
                    <button ref={continueShoppingRef} type="button" onClick={() => router.push('/shop')} className="mt-2 min-h-9 text-sm font-semibold text-pink-700">Continue shopping</button>
                </section>}
                {reviewRequired && !hasStockProblems && hasPaidItems && !pendingPaidOrder && <section className="rounded-xl border border-pink-100 bg-white p-4" aria-label="Review updated checkout">
                    <p className="text-sm font-semibold text-gray-900">Your basket has been updated</p>
                    <p className="mt-1 text-xs text-gray-500">Review your offers and delivery charges before continuing.</p>
                    <button ref={reviewTotalRef} type="button" onClick={handleReviewTotal} disabled={loading || checkingOffers || !!offerError || !selectedAddress || !selectedShippingId} className="mt-3 min-h-10 rounded-lg bg-pink-600 px-4 text-xs font-semibold text-white disabled:opacity-40">
                        {loading ? 'Checking total…' : `Confirm updated total · ${currency(adjustedTotal)}`}
                    </button>
                </section>}
                <section>
                    <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-gray-100 overflow-hidden">
                        <button
                            onClick={() => setShowBreakup(!showBreakup)}
                            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50/50 transition-colors"
                        >
                            <div className="w-9 h-9 rounded-xl bg-pink-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div className="flex-1 text-left">
                                <p className="text-sm font-bold text-gray-900">Price Breakup</p>
                                <p className="text-[11px] text-gray-400">{showBreakup ? "Tap to hide details" : "Tap to view details"}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-base font-extrabold text-gray-900">₹{adjustedTotal.toLocaleString('en-IN',{maximumFractionDigits:2})}</p>
                            </div>
                            <svg
                                className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${showBreakup ? "rotate-180" : ""}`}
                                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        <div className={`transition-all duration-300 ease-in-out ${showBreakup ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"}`}>
                            <div className="border-t border-gray-100">
                                <div className="px-5 py-2 flex justify-between">
                                    <span className="text-sm text-gray-500">MRP Subtotal</span>
                                    <span className="text-sm font-medium text-gray-700">₹{roundMoney(items.filter((i: any) => !i.is_gift && !i.is_bxgy_free).reduce((a: number, i: any) => a + i.mrp * i.quantity, 0))}</span>
                                </div>
                                <div className="h-px bg-gray-50 mx-5" />
                                <div className="px-5 py-2 flex justify-between">
                                    <span className="text-sm text-red-500 font-medium">
                                        Total Discount
                                        {(() => {
                                            const paidItems = items.filter((i: any) => !i.is_gift && !i.is_bxgy_free)
                                            const d = paidItems.reduce((a: number, i: any) => a + Math.max(0, i.mrp * i.quantity - lineSubtotal(i)), 0) + bxgyDiscount
                                            const m = paidItems.reduce((a: number, i: any) => a + i.mrp * i.quantity, 0)
                                            const pct = m > 0 ? Math.round((d / m) * 100) : 0
                                            return pct > 0 ? ` (${pct}% off)` : ""
                                        })()}
                                    </span>
                                    <span className="text-sm font-semibold text-red-500">
                                        −₹{roundMoney(items.filter((i: any) => !i.is_gift && !i.is_bxgy_free).reduce((a: number, i: any) => a + Math.max(0, i.mrp * i.quantity - lineSubtotal(i)), 0) + bxgyDiscount)}
                                    </span>
                                </div>
                                {bxgyDiscount > 0 && (
                                    <p className="px-5 pb-2 -mt-0.5 text-[10px] font-semibold text-pink-600">
                                        incl. {[...new Set((bxgyDiscounts || []).map((d: { rule_name: string }) => d.rule_name).filter(Boolean))].join(", ") || "Buy X Get Y"} −₹{roundMoney(bxgyDiscount)}
                                    </p>
                                )}
                                <div className="h-px bg-gray-50 mx-5" />
                                <div className="px-5 py-3.5 flex justify-between">
                                    <span className="text-sm text-gray-500">Subtotal after discount</span>
                                    <span className="text-sm font-semibold text-gray-900">₹{roundMoney(Math.max(0, currentSubtotal - bxgyDiscount))}</span>
                                </div>
                                <div className="h-px bg-gray-50 mx-5" />
                                <div className="px-5 py-2 flex justify-between">
                                    <div>
                                        <span className="text-sm text-gray-500">
                                            Shipping{shippingLabel !== "Standard" && shippingLabel !== "FREE" ? ` (${shippingLabel})` : ""}
                                        </span>
                                        {shippingPrice > 0 && currentSubtotal < FREE_SHIPPING_THRESHOLD && (
                                            <p className="text-[10px] font-semibold text-pink-500 mt-0.5">
                                                Free shipping on selected pincodes
                                            </p>
                                        )}
                                    </div>
                                    <span className={`text-sm font-semibold ${isFreeShipping ? "text-pink-500" : "text-gray-900"}`}>
                                        {isFreeShipping ? "FREE" : `₹${shippingPrice}`}
                                    </span>
                                </div>
                                {discountAmount > 0 && (
                                    <>
                                        <div className="h-px bg-gray-50 mx-5" />
                                        <div className="px-5 py-3.5 flex justify-between bg-pink-50/50">
                                            <span className="text-sm font-medium text-pink-600">Promo Discount</span>
                                            <span className="text-sm font-bold text-pink-600">−₹{discountAmount}</span>
                                        </div>
                                    </>
                                )}
                                {giftItems.length > 0 && (
                                    <>
                                        <div className="h-px bg-gray-50 mx-5" />
                                        <div className="px-5 py-2 flex justify-between bg-purple-50/50">
                                            <span className="text-sm font-medium text-purple-600">Free Gift{giftItems.length > 1 ? 's' : ''}</span>
                                            <span className="text-sm font-bold text-purple-600">₹0</span>
                                        </div>
                                    </>
                                )}
                                {giftCardDiscount > 0 && (
                                    <>
                                        <div className="h-px bg-gray-50 mx-5" />
                                        <div className="px-5 py-2 flex justify-between bg-blue-50/50">
                                            <span className="text-sm font-medium text-blue-600">Gift Card</span>
                                            <span className="text-sm font-bold text-blue-600">−₹{Math.round(giftCardDiscount)}</span>
                                        </div>
                                    </>
                                )}
                                {coinDiscount > 0 && (
                                    <>
                                        <div className="h-px bg-gray-50 mx-5" />
                                        <div className="px-5 py-2 flex justify-between bg-pink-50/50">
                                            <span className="text-sm font-medium text-pink-600">M Coins</span>
                                            <span className="text-sm font-bold text-pink-600">−₹{Math.round(coinDiscount)}</span>
                                        </div>
                                    </>
                                )}
                                <div className="h-px bg-gray-200 mx-5" />
                                <div className="px-5 py-4 flex justify-between">
                                    <span className="text-sm font-bold text-gray-900">Total</span>
                                    <span className="text-lg font-extrabold text-gray-900">₹{adjustedTotal.toLocaleString('en-IN',{maximumFractionDigits:2})}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            {/* Bottom Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5 py-3 flex items-center gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] z-50">
                <div>
                    <p className="text-[10px] font-black tracking-wider text-gray-400 uppercase">Total</p>
                    <p className="text-xl font-extrabold text-gray-900">₹{adjustedTotal.toLocaleString('en-IN',{maximumFractionDigits:2})}</p>
                    <p className="text-[10px] text-gray-400">incl. taxes & fees</p>
                </div>
                <div className="flex-1">
                    <button
                        onClick={handlePlaceOrder}
                        disabled={loading || (!pendingPaidOrder && (!selectedAddress || !selectedShippingId || checkoutBlocked))}
                        className="w-full h-[46px] bg-pink-600 text-white text-xs font-black tracking-wider rounded-full flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-pink-700 transition-colors"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : pendingPaidOrder ? (
                            <span>Confirm Paid Order</span>
                        ) : !hasPaidItems ? (
                            <span>Add items to continue</span>
                        ) : hasStockProblems ? (
                            <span>Update items to continue</span>
                        ) : checkingOffers || offerError ? (
                            <span>Checking availability</span>
                        ) : reviewRequired ? (
                            <span>Review updated total</span>
                        ) : paymentMethod === "razorpay" && adjustedTotal > 0 ? (
                            <span>Pay ₹{adjustedTotal.toLocaleString('en-IN',{maximumFractionDigits:2})}</span>
                        ) : (
                            <span>Place Order • COD</span>
                        )}
                    </button>
                </div>
            </div>

            {/* Address Picker Modal */}
            {showAddressPicker && (
                <div className="fixed inset-0 z-50">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setShowAddressPicker(false)} />
                    <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[60vh] flex flex-col">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
                            <h3 className="text-base font-bold text-gray-900">Select Delivery Address</h3>
                            <button onClick={() => setShowAddressPicker(false)}>
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5 space-y-3">
                            {savedAddresses.map((addr: any) => (
                                <button
                                    key={addr.id}
                                    onClick={() => handleSelectAddress(addr)}
                                    className={`w-full text-left rounded-xl p-4 border-2 transition-colors ${selectedAddress?.id === addr.id
                                            ? "border-gray-900 bg-gray-50"
                                            : "border-gray-200"
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${selectedAddress?.id === addr.id ? "border-pink-600" : "border-gray-300"
                                            }`}>
                                            {selectedAddress?.id === addr.id && (
                                                <div className="w-2.5 h-2.5 rounded-full bg-pink-600" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-bold text-gray-900 uppercase">{addr.label}</span>
                                                <span className="text-sm font-semibold text-gray-900">{addr.full_name}</span>
                                            </div>
                                            <p className="text-xs text-gray-500 leading-relaxed">
                                                {addr.street}{addr.landmark ? `, ${addr.landmark}` : ""}{addr.area_name ? `, ${addr.area_name}` : ""}, {addr.city}, {addr.state} - {addr.pincode}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">{addr.phone}</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                        <div className="px-5 pb-6 shrink-0">
                            <button
                                onClick={() => { setShowAddressPicker(false); setIsAddModalOpen(true) }}
                                className="w-full h-12 bg-pink-600 text-white text-xs font-bold rounded-full flex items-center justify-center gap-2 hover:bg-pink-700 transition-colors"
                            >
                                <Plus className="w-4 h-4" /> Add New Address
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Promo Picker Modal */}
            {showPromoPicker && (
                <div className="fixed inset-0 z-50">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setShowPromoPicker(false)} />
                    <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[70vh] flex flex-col">
                        <div className="bg-gray-900 px-5 pt-5 pb-6 shrink-0 rounded-t-2xl">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-white">Available Offers</h3>
                                    <p className="text-sm text-gray-400 mt-0.5">
                                        {eligiblePromos.length} coupon{eligiblePromos.length !== 1 ? "s" : ""} can be applied
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowPromoPicker(false)}
                                    className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center"
                                >
                                    <X className="w-5 h-5 text-white" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5 space-y-4">
                            {eligiblePromos.length > 0 && (
                                <div>
                                    <p className="text-xs font-extrabold uppercase tracking-wider text-gray-900 mb-3">Available for you</p>
                                    {eligiblePromos.map((promo: any) => {
                                        const discountLabel = promo.discount_type === "percentage"
                                            ? `${promo.discount_value}% OFF`
                                            : `₹${promo.discount_value} OFF`
                                        return (
                                            <button
                                                key={promo.id}
                                                onClick={() => handleApplyPromo(promo)}
                                                className={`w-full text-left rounded-xl border-2 p-4 mb-3 transition-colors ${appliedPromo?.code === promo.code
                                                        ? "border-green-400 bg-green-50"
                                                        : "border-gray-200"
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                                                        style={{ backgroundColor: appliedPromo?.code === promo.code ? "#22C55E" : "#111" }}
                                                    >
                                                        {promo.discount_type === "percentage"
                                                            ? <Sparkles className="w-4 h-4 text-white" />
                                                            : <span className="text-sm font-bold text-white">₹</span>
                                                        }
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-bold text-gray-900">{promo.code}</span>
                                                            <span className={`text-[10px] font-bold ${appliedPromo?.code === promo.code
                                                                    ? "text-pink-600"
                                                                    : "text-gray-900"
                                                                }`}>
                                                                {discountLabel}
                                                            </span>
                                                        </div>
                                                        {promo.description && (
                                                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{promo.description}</p>
                                                        )}
                                                    </div>
                                                    {appliedPromo?.code === promo.code ? (
                                                        <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center">
                                                            <Check className="w-3.5 h-3.5 text-white" />
                                                        </div>
                                                    ) : (
                                                        <Plus className="w-5 h-5 text-gray-900" />
                                                    )}
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                            {ineligiblePromos.length > 0 && (
                                <div>
                                    <p className="text-xs font-extrabold uppercase tracking-wider text-gray-400 mb-3">Other offers</p>
                                    {ineligiblePromos.map((promo: any) => {
                                        const { reasons } = (() => {
                                            try { return checkPromoEligibility(promo, items) } catch { return { reasons: ["Error checking eligibility"] } }
                                        })()
                                        return (
                                            <div
                                                key={promo.id}
                                                className="w-full rounded-xl border-2 border-gray-100 bg-gray-50/50 p-4 mb-3 opacity-60"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 bg-gray-200 rounded-lg flex items-center justify-center shrink-0">
                                                        {promo.discount_type === "percentage"
                                                            ? <Sparkles className="w-4 h-4 text-gray-400" />
                                                            : <span className="text-sm font-bold text-gray-400">₹</span>
                                                        }
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-bold text-gray-500">{promo.code}</span>
                                                            <span className="text-[10px] font-bold text-gray-400">
                                                                {promo.discount_type === "percentage" ? `${promo.discount_value}% OFF` : `₹${promo.discount_value} OFF`}
                                                            </span>
                                                        </div>
                                                        {reasons[0] && (
                                                            <p className="text-[10px] font-semibold text-pink-600 mt-0.5">· {reasons[0]}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                            {allPromos.length === 0 && (
                                <div className="py-16 flex flex-col items-center">
                                    <Ticket className="w-12 h-12 text-gray-200 mb-3" />
                                    <p className="text-sm font-semibold text-gray-400">No offers available right now</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Add Address Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[60]">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setIsAddModalOpen(false)} />
                    <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
                            <h3 className="text-sm font-black uppercase tracking-wider text-gray-900">New Address</h3>
                            <button onClick={() => setIsAddModalOpen(false)}>
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-5">
                            <AddressForm userId={profile.id} onSuccess={handleAddressAdded} />
                        </div>
                    </div>
                </div>
            )}

            {showCoinInfo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setShowCoinInfo(false)} />
                    <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
                        <button onClick={() => setShowCoinInfo(false)} className="absolute top-4 right-4">
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                        <div className="w-12 h-12 rounded-xl bg-pink-50 flex items-center justify-center mb-4">
                            <Coins className="w-6 h-6 text-pink-500" />
                        </div>
                        <h3 className="text-lg font-black text-gray-900 mb-2">What are M Coins?</h3>
                        <p className="text-sm text-gray-500 leading-relaxed mb-1">
                            M Coins are reward points you earn with every purchase. For every ₹100 spent, you get <span className="font-bold text-gray-700">1 M Coin</span>.
                        </p>
                        <p className="text-sm text-gray-500 leading-relaxed mb-5">
                            Use them at checkout — <span className="font-bold text-pink-600">1 coin = ₹1 off</span>. The more you shop, the more you save.
                        </p>
                        <div className="bg-pink-50 border border-pink-100 rounded-xl p-3 mb-5">
                            <div className="flex items-center gap-2 mb-1">
                                <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                                <span className="text-xs font-bold text-pink-700 uppercase tracking-wider">Your Balance</span>
                            </div>
                            <p className="text-2xl font-black text-pink-600">{coinBalance} M Coins <span className="text-sm font-semibold text-pink-400">= ₹{coinBalance}</span></p>
                        </div>
                        <button
                            onClick={() => { setShowCoinInfo(false); router.push("/rewards") }}
                            className="w-full h-11 rounded-xl bg-pink-600 text-white text-sm font-bold hover:bg-pink-700 transition-colors"
                        >
                            View Full Rewards
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
