"use client"

import { useState, useEffect, useMemo } from "react"
import { useCart } from "@/components/store/use-cart"
import { placeOrder } from "@/app/actions/orders"
import { validatePromoCode } from "@/app/actions/promo"
import { validateGiftCard } from "@/app/actions/gift-cards"
import { applyRewardCoupon } from "@/app/actions/loyalty"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
    Plus, Loader2, Check, ChevronRight,
    MapPin, ShoppingBag, Ticket, X, Sparkles, Gift, Tag,
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
    usePromotions()
    const supabase = createClient()
    const router = useRouter()
    const {
        items, shippingPrice, selectedShippingId, shippingLabel, deliveryTimeLabel,
        setShippingMethod, getSubtotal, setShippingPincode,
        appliedPromo, setAppliedPromo, getDiscountAmount, getFinalTotal,
        getGiftItems, getBXGYTotalDiscount, bxgyDiscounts,
    } = useCart()

    const [mounted, setMounted] = useState(false)
    const [loading, setLoading] = useState(false)
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
    const [rewardCoupon, setRewardCoupon] = useState<any | null>(null)
    const [rewardCouponCode, setRewardCouponCode] = useState("")
    const [applyingRewardCoupon, setApplyingRewardCoupon] = useState(false)
    const [rewardCouponError, setRewardCouponError] = useState("")
    const [paymentMethod, setPaymentMethod] = useState<"cod" | "razorpay">("razorpay")

    useEffect(() => { setMounted(true) }, [])

    // Load Razorpay checkout script
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
        ;(bxgyDiscounts || []).forEach((d: any) => {
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
    const rewardCouponDiscount = rewardCoupon ? Math.min(Number(rewardCoupon.discount_amount), total) : 0
    const adjustedTotal = Math.max(0, total - giftCardDiscount - rewardCouponDiscount)
    const isFreeShipping = currentSubtotal >= FREE_SHIPPING_THRESHOLD && selectedShippingId && FREE_SHIPPING_PINCODES.includes(selectedAddress?.pincode)

    const handleAddressAdded = (newAddr: any) => {
        setSavedAddresses((prev: any) => [newAddr, ...prev])
        setSelectedAddress(newAddr)
        setIsAddModalOpen(false)
    }

    const handleSelectAddress = (addr: any) => {
        setSelectedAddress(addr)
        setShowAddressPicker(false)
    }

    const handleApplyPromo = async (promo: any) => {
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
        setAppliedPromo(null)
        toast.info("Promo code removed")
    }

    const handleApplyGiftCard = async () => {
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
        setGiftCard(null)
        toast.info("Gift card removed")
    }

    const handleApplyRewardCoupon = async () => {
        if (!rewardCouponCode.trim()) return
        setApplyingRewardCoupon(true)
        setRewardCouponError("")
        const res = await applyRewardCoupon(rewardCouponCode.trim())
        if (res.success) {
            setRewardCoupon(res.coupon)
            setRewardCouponCode("")
            toast.success("Reward coupon applied!")
        } else {
            setRewardCouponError(res.message || "Invalid coupon")
            toast.error(res.message || "Invalid reward coupon")
        }
        setApplyingRewardCoupon(false)
    }

    const handleRemoveRewardCoupon = () => {
        setRewardCoupon(null)
        toast.info("Reward coupon removed")
    }

    const handlePlaceOrder = async () => {
        if (!selectedAddress || !selectedShippingId) {
            return toast.error("Please select a delivery address")
        }
        setLoading(true)
        try {
            const promoDetails = appliedPromo ? {
                code: appliedPromo.code,
                discount: discountAmount,
                id: appliedPromo.id
            } : undefined

            const bxgyDetails = bxgyDiscount > 0 ? {
                discount: bxgyDiscount,
                freeItems: items.filter((i: any) => i.is_bxgy_free).map((i: any) => ({
                    variantId: i.variantId,
                    productId: i.productId,
                    ruleId: i.bxgy_rule_id,
                    quantity: i.quantity,
                })),
            } : undefined

            const giftDetails = giftItems.length > 0 ? giftItems.map((i: any) => ({
                variantId: i.variantId,
                productId: i.productId,
                ruleId: i.gift_rule_id,
                quantity: i.quantity,
            })) : undefined

            const commonOrderArgs = [
                selectedAddress,
                items,
                { total, price: shippingPrice, methodName: shippingLabel, deliveryTimeLabel, shipping_method_id: selectedShippingId },
                promoDetails,
                bxgyDetails,
                giftDetails,
                giftCard ? { code: giftCard.code, amount: giftCardDiscount } : undefined,
                rewardCoupon ? { id: rewardCoupon.id, discount: rewardCouponDiscount } : undefined,
            ] as const

            if (paymentMethod === "cod") {
                try {
                    const res = await placeOrder(...commonOrderArgs, undefined)
                    if (res.success) {
                        router.push(`/checkout/success?orderId=${res.orderId}`)
                    } else {
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
                if (!(window as any).Razorpay) {
                    toast.error("Payment gateway loading. Please try again.")
                    setLoading(false)
                    return
                }

                const amountPaise = Math.round(adjustedTotal * 100)
                if (amountPaise < 100) {
                    toast.error("Minimum order amount is ₹1")
                    setLoading(false)
                    return
                }
                const orderRes = await fetch("/api/create-order", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ amount: amountPaise, cartItems: items }),
                })
                if (!orderRes.ok) {
                    const errData = await orderRes.json()
                    throw new Error(errData.error || "Failed to create payment order")
                }
                const { order_id, amount } = await orderRes.json()

                const razorpay = new (window as any).Razorpay({
                    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                    order_id,
                    amount,
                    currency: "INR",
                    name: "THE MAKE UP STORE WANGKHEI",
                    description: `Order ${selectedAddress?.full_name}`,
                    prefill: {
                        name: selectedAddress?.full_name,
                        email: profile?.email,
                        contact: selectedAddress?.phone,
                    },
                    handler: async function (response: any) {
                        try {
                            const verifyRes = await fetch("/api/verify-payment", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    razorpay_order_id: response.razorpay_order_id,
                                    razorpay_payment_id: response.razorpay_payment_id,
                                    razorpay_signature: response.razorpay_signature,
                                }),
                            })
                            if (!verifyRes.ok) {
                                toast.error("Payment verification failed")
                                setLoading(false)
                                return
                            }

                            const res = await placeOrder(...commonOrderArgs, { method: "razorpay", payment_id: response.razorpay_payment_id, status: "paid" })
                            if (res.success) {
                                router.push(`/checkout/success?orderId=${res.orderId}`)
                            } else {
                                toast.error(res.message || "Order failed")
                            }
                        } catch (err) {
                            toast.error("Payment verified but order submission failed")
                        } finally {
                            setLoading(false)
                        }
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
            toast.error("Process interrupted")
            setLoading(false)
        }
    }

    if (!mounted) return null

    const eligiblePromos = allPromos.filter((p: any) => {
        try { return checkPromoEligibility(p, items).isEligible } catch { return false }
    })
    const ineligiblePromos = allPromos.filter((p: any) => {
        try { return !checkPromoEligibility(p, items).isEligible } catch { return true }
    })

    return (
        <div className="min-h-screen bg-gray-50/80 pb-24">
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
                            {selectedAddress.street}, {selectedAddress.city}, {selectedAddress.state} - {selectedAddress.pincode}
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
                        className="h-10 px-6 bg-gray-900 text-white text-xs font-bold rounded-full flex items-center gap-1.5"
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
                    <div className="bg-white rounded-xl overflow-hidden border border-gray-100">
                        {items.map((item: any, idx: number) => (
                            <div
                                key={item.variantId}
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
                                </div>
                                <div className="text-right shrink-0">
                                    {discountMap[item.variantId]?.amount > 0 ? (
                                        <>
                                            <p className="text-xs text-gray-400 line-through">₹{Math.round(item.price * item.quantity)}</p>
                                            <p className="text-xs font-bold text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded inline-block mt-0.5">FREE</p>
                                        </>
                                    ) : item.mrp > item.price ? (
                                        <>
                                            <p className="text-xs text-gray-400 line-through">₹{Math.round(item.mrp * item.quantity)}</p>
                                            <p className="text-sm font-bold text-gray-900">₹{Math.round(item.price * item.quantity)}</p>
                                        </>
                                    ) : (
                                        <p className="text-sm font-bold text-gray-900">₹{Math.round(item.price * item.quantity)}</p>
                                    )}
                                </div>
                            </div>
                        ))}
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
                            <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-3">
                                <div className="w-9 h-9 bg-green-500 rounded-lg flex items-center justify-center shrink-0">
                                    <Check className="w-[18px] h-[18px] text-white" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-gray-900">{appliedPromo.code}</p>
                                    <p className="text-xs font-semibold text-green-600">You saved ₹{discountAmount}</p>
                                </div>
                                <button onClick={handleRemovePromo}>
                                    <X className="w-[18px] h-[18px] text-gray-400" />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowPromoPicker(true)}
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
                                    <span className="h-5 min-w-[22px] px-1.5 bg-gray-900 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center">
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
                            onClick={() => setPaymentMethod("razorpay")}
                            className={`w-full flex items-center gap-4 px-4 py-4 transition-colors ${
                                paymentMethod === "razorpay" ? "bg-pink-50/50" : ""
                            } ${paymentMethod === "cod" ? "border-b border-gray-100" : ""}`}
                        >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                paymentMethod === "razorpay" ? "border-pink-500" : "border-gray-300"
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
                            onClick={() => setPaymentMethod("cod")}
                            className={`w-full flex items-center gap-4 px-4 py-4 transition-colors ${
                                paymentMethod === "cod" ? "bg-pink-50/50" : ""
                            }`}
                        >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                paymentMethod === "cod" ? "border-pink-500" : "border-gray-300"
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
                                                className="h-10 px-4 bg-gray-900 text-white text-xs font-bold rounded-lg disabled:opacity-40 hover:bg-gray-800 transition-colors shrink-0"
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

                        <details className="group bg-white border border-gray-200 rounded-xl overflow-hidden">
                            <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer list-none text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                                <ChevronRight className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-90" />
                                <Tag className="w-4 h-4 text-emerald-500" />
                                Reward Coupon
                                {rewardCoupon && <span className="text-[10px] font-bold text-emerald-600 ml-auto">Applied</span>}
                            </summary>
                            <div className="px-4 pb-4">
                                {rewardCoupon ? (
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3 mt-2">
                                        <div className="w-9 h-9 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0">
                                            <Tag className="w-[18px] h-[18px] text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-gray-900">{rewardCoupon.code}</p>
                                            <p className="text-xs font-semibold text-emerald-600">{currency(rewardCoupon.discount_amount)} OFF</p>
                                        </div>
                                        <button onClick={handleRemoveRewardCoupon}>
                                            <X className="w-[18px] h-[18px] text-gray-400" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="bg-white border border-gray-200 rounded-xl p-3 mt-2">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                placeholder="Enter reward coupon code"
                                                value={rewardCouponCode}
                                                onChange={(e) => setRewardCouponCode(e.target.value.toUpperCase())}
                                                className="flex-1 h-10 px-3 rounded-lg border border-gray-200 text-sm font-medium text-gray-900 focus:outline-none focus:border-gray-900 transition-colors placeholder:text-gray-300"
                                            />
                                            <button
                                                onClick={handleApplyRewardCoupon}
                                                disabled={applyingRewardCoupon || !rewardCouponCode.trim()}
                                                className="h-10 px-4 bg-emerald-600 text-white text-xs font-bold rounded-lg disabled:opacity-40 hover:bg-emerald-700 transition-colors shrink-0"
                                            >
                                                {applyingRewardCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                                            </button>
                                        </div>
                                        {rewardCouponError && (
                                            <p className="text-[11px] font-medium text-red-500 mt-2">{rewardCouponError}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </details>
                    </div>
                </section>

                {/* Price Breakup Accordion */}
                <section>
                    <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-gray-100 overflow-hidden">
                        <button
                            onClick={() => setShowBreakup(!showBreakup)}
                            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50/50 transition-colors"
                        >
                            <div className="w-9 h-9 rounded-xl bg-gray-900 text-white flex items-center justify-center shrink-0 shadow-sm">
                                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div className="flex-1 text-left">
                                <p className="text-sm font-bold text-gray-900">Price Breakup</p>
                                <p className="text-[11px] text-gray-400">{showBreakup ? "Tap to hide details" : "Tap to view details"}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-base font-extrabold text-gray-900">₹{Math.round(adjustedTotal)}</p>
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
                                <div className="px-5 py-3.5 flex justify-between">
                                    <span className="text-sm text-gray-500">MRP Subtotal</span>
                                    <span className="text-sm font-medium text-gray-700">₹{Math.round(items.filter((i: any) => !i.is_gift && !i.is_bxgy_free).reduce((a: number, i: any) => a + i.mrp * i.quantity, 0))}</span>
                                </div>
                                <div className="h-px bg-gray-50 mx-5" />
                                <div className="px-5 py-3.5 flex justify-between">
                                    <span className="text-sm text-red-500 font-medium">
                                        Total Discount
                                        {(() => {
                                            const paidItems = items.filter((i: any) => !i.is_gift && !i.is_bxgy_free)
                                            const d = paidItems.reduce((a: number, i: any) => a + (i.mrp - i.price) * i.quantity, 0)
                                            const m = paidItems.reduce((a: number, i: any) => a + i.mrp * i.quantity, 0)
                                            const pct = m > 0 ? Math.round((d / m) * 100) : 0
                                            return pct > 0 ? ` (${pct}% off)` : ""
                                        })()}
                                    </span>
                                    <span className="text-sm font-semibold text-red-500">
                                        −₹{Math.round(items.filter((i: any) => !i.is_gift && !i.is_bxgy_free).reduce((a: number, i: any) => a + (i.mrp - i.price) * i.quantity, 0))}
                                    </span>
                                </div>
                                <div className="h-px bg-gray-50 mx-5" />
                                <div className="px-5 py-3.5 flex justify-between">
                                    <span className="text-sm text-gray-500">Subtotal after discount</span>
                                    <span className="text-sm font-semibold text-gray-900">₹{Math.round(currentSubtotal)}</span>
                                </div>
                                <div className="h-px bg-gray-50 mx-5" />
                                <div className="px-5 py-3.5 flex justify-between">
                                    <div>
                                        <span className="text-sm text-gray-500">
                                            Shipping{shippingLabel !== "Standard" && shippingLabel !== "FREE" ? ` (${shippingLabel})` : ""}
                                        </span>
                                        {shippingPrice > 0 && currentSubtotal < FREE_SHIPPING_THRESHOLD && (
                                            <p className="text-[10px] font-semibold text-green-500 mt-0.5">
                                                Free shipping on selected pincodes
                                            </p>
                                        )}
                                    </div>
                                    <span className={`text-sm font-semibold ${isFreeShipping ? "text-green-500" : "text-gray-900"}`}>
                                        {isFreeShipping ? "FREE" : `₹${shippingPrice}`}
                                    </span>
                                </div>
                                {discountAmount > 0 && (
                                    <>
                                        <div className="h-px bg-gray-50 mx-5" />
                                        <div className="px-5 py-3.5 flex justify-between bg-green-50/50">
                                            <span className="text-sm font-medium text-green-600">Promo Discount</span>
                                            <span className="text-sm font-bold text-green-600">−₹{discountAmount}</span>
                                        </div>
                                    </>
                                )}
                                {bxgyDiscount > 0 && (
                                    <>
                                        <div className="h-px bg-gray-50 mx-5" />
                                        <div className="px-5 py-3.5 flex justify-between bg-pink-50/50">
                                            <span className="text-sm font-medium text-pink-600">Buy X Get Y Discount</span>
                                            <span className="text-sm font-bold text-pink-600">−₹{bxgyDiscount}</span>
                                        </div>
                                    </>
                                )}
                                {giftItems.length > 0 && (
                                    <>
                                        <div className="h-px bg-gray-50 mx-5" />
                                        <div className="px-5 py-3.5 flex justify-between bg-purple-50/50">
                                            <span className="text-sm font-medium text-purple-600">Free Gift{giftItems.length > 1 ? 's' : ''}</span>
                                            <span className="text-sm font-bold text-purple-600">₹0</span>
                                        </div>
                                    </>
                                )}
                                {giftCardDiscount > 0 && (
                                    <>
                                        <div className="h-px bg-gray-50 mx-5" />
                                        <div className="px-5 py-3.5 flex justify-between bg-blue-50/50">
                                            <span className="text-sm font-medium text-blue-600">Gift Card</span>
                                            <span className="text-sm font-bold text-blue-600">−₹{Math.round(giftCardDiscount)}</span>
                                        </div>
                                    </>
                                )}
                                {rewardCouponDiscount > 0 && (
                                    <>
                                        <div className="h-px bg-gray-50 mx-5" />
                                        <div className="px-5 py-3.5 flex justify-between bg-emerald-50/50">
                                            <span className="text-sm font-medium text-emerald-600">Reward Coupon</span>
                                            <span className="text-sm font-bold text-emerald-600">−₹{Math.round(rewardCouponDiscount)}</span>
                                        </div>
                                    </>
                                )}
                                <div className="h-px bg-gray-200 mx-5" />
                                <div className="px-5 py-4 flex justify-between">
                                    <span className="text-sm font-bold text-gray-900">Total</span>
                                    <span className="text-lg font-extrabold text-gray-900">₹{Math.round(adjustedTotal)}</span>
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
                    <p className="text-xl font-extrabold text-gray-900">₹{Math.round(adjustedTotal)}</p>
                    <p className="text-[10px] text-gray-400">incl. taxes & fees</p>
                </div>
                <div className="flex-1">
                    <button
                        onClick={handlePlaceOrder}
                        disabled={loading || !selectedAddress}
                        className="w-full h-[46px] bg-gray-900 text-white text-xs font-black tracking-wider rounded-full flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-gray-800 transition-colors"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : paymentMethod === "razorpay" ? (
                            <span>Pay ₹{Math.round(adjustedTotal).toLocaleString()}</span>
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
                                    className={`w-full text-left rounded-xl p-4 border-2 transition-colors ${
                                        selectedAddress?.id === addr.id
                                            ? "border-gray-900 bg-gray-50"
                                            : "border-gray-200"
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                                            selectedAddress?.id === addr.id ? "border-gray-900" : "border-gray-300"
                                        }`}>
                                            {selectedAddress?.id === addr.id && (
                                                <div className="w-2.5 h-2.5 rounded-full bg-gray-900" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-bold text-gray-900 uppercase">{addr.label}</span>
                                                <span className="text-sm font-semibold text-gray-900">{addr.full_name}</span>
                                            </div>
                                            <p className="text-xs text-gray-500 leading-relaxed">
                                                {addr.street}{addr.area_name ? `, ${addr.area_name}` : ""}, {addr.city}, {addr.state} - {addr.pincode}
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
                                className="w-full h-12 bg-gray-900 text-white text-xs font-bold rounded-full flex items-center justify-center gap-2"
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
                                                className={`w-full text-left rounded-xl border-2 p-4 mb-3 transition-colors ${
                                                    appliedPromo?.code === promo.code
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
                                                            <span className={`text-[10px] font-bold ${
                                                                appliedPromo?.code === promo.code
                                                                    ? "text-green-600"
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
                                                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
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
                                                            <p className="text-[10px] font-semibold text-amber-600 mt-0.5">· {reasons[0]}</p>
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
        </div>
    )
}
