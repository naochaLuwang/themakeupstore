"use client"

import { useState } from "react"
import { useCart } from "@/components/store/use-cart"
import { CheckoutShipping } from "@/components/store/checkout-shipping"
import { placeOrder } from "@/app/actions/orders"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, ChevronRight, Ticket, TrendingDown } from "lucide-react"
import Link from "next/link"

export default function CheckoutClient({ profile }: { profile: any }) {
    const { items, shippingPrice, selectedShippingId, shippingLabel, clearCart, appliedPromo } = useCart()
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const [address, setAddress] = useState({
        full_name: profile?.full_name || "",
        phone: profile?.phone || "",
        pincode: profile?.pincode || "",
        street: profile?.street || ""
    })

    const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0)
    const discountAmount = appliedPromo?.discount || 0
    const total = Math.max(0, subtotal + shippingPrice - discountAmount)
    const savingsPercentage = appliedPromo ? Math.round((discountAmount / subtotal) * 100) : 0

    // const handlePlaceOrder = async () => {
    //     if (!address.full_name || !address.phone || !address.pincode || !address.street || !selectedShippingId) {
    //         return toast.error("Please complete delivery details")
    //     }
    //     setLoading(true)
    //     try {
    //         const res = await placeOrder(address, items, {
    //             total, price: shippingPrice, methodName: shippingLabel,
    //             promoCode: appliedPromo?.code, discountAmount
    //         })
    //         if (res.success) {
    //             clearCart();
    //             router.push(`/checkout/success?orderId=${res.orderId}`)
    //         }
    //     } catch (err) {
    //         toast.error("Order failed")
    //     } finally {
    //         setLoading(false)
    //     }
    // }

    // Inside CheckoutClient.tsx

    const handlePlaceOrder = async () => {
        if (!address.full_name || !address.phone || !address.pincode || !address.street || !selectedShippingId) {
            return toast.error("Please complete delivery details")
        }
        setLoading(true)

        try {
            // SANITIZE ITEMS HERE
            const sanitizedItems = items.map(item => ({
                ...item,
                // Ensure the 'id' we send is just the productId UUID
                id: item.productId
            }))

            const res = await placeOrder(address, sanitizedItems, {
                total,
                price: shippingPrice,
                methodName: shippingLabel,
                promoCode: appliedPromo?.code,
                discountAmount
            })

            if (res.success) {
                clearCart();
                router.push(`/checkout/success?orderId=${res.orderId}`)
            } else {
                // Add this to see the actual error message from the server in a toast
                toast.error(res.message || "Order failed")
            }
        } catch (err) {
            toast.error("An unexpected error occurred")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-6xl mx-auto px-6 py-12 relative pb-32 lg:pb-12">
            <Link href="/cart" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 mb-12 transition-all">
                <ArrowLeft className="w-3 h-3" /> Back to Bag
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-20">
                {/* LEFT: DELIVERY DETAILS */}
                <div className="lg:col-span-7 space-y-12">
                    <section>
                        <h2 className="text-[11px] font-black uppercase tracking-[0.3em] mb-10 border-b pb-4 text-slate-900">01. Destination</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                            <input placeholder="Full Name" className="w-full py-2 bg-transparent border-b outline-none text-sm font-medium focus:border-indigo-500 transition-colors" value={address.full_name} onChange={e => setAddress({ ...address, full_name: e.target.value })} />
                            <input placeholder="Phone" className="w-full py-2 bg-transparent border-b outline-none text-sm font-medium focus:border-indigo-500 transition-colors" value={address.phone} onChange={e => setAddress({ ...address, phone: e.target.value })} />
                            <input placeholder="Street Address" className="md:col-span-2 w-full py-2 bg-transparent border-b outline-none text-sm font-medium focus:border-indigo-500 transition-colors" value={address.street} onChange={e => setAddress({ ...address, street: e.target.value })} />
                            <input placeholder="Pincode" maxLength={6} className="w-full py-2 bg-transparent border-b outline-none text-sm font-medium focus:border-indigo-500 transition-colors" value={address.pincode} onChange={e => setAddress({ ...address, pincode: e.target.value.replace(/\D/g, '') })} />
                        </div>
                    </section>

                    <section className="pt-10 border-t">
                        <CheckoutShipping pincode={address.pincode} />
                    </section>
                </div>

                {/* RIGHT: FINAL SUMMARY */}
                <div className="lg:col-span-5">
                    <div className="p-8 bg-white border-2 border-slate-900 rounded-[2.5rem] shadow-[8px_8px_0px_0px_rgba(15,23,42,0.05)] relative overflow-hidden">

                        {/* SAVINGS BADGE */}
                        {appliedPromo && (
                            <div className="absolute top-0 right-0 bg-emerald-500 text-white px-5 py-1.5 rounded-bl-2xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 animate-in slide-in-from-top duration-500">
                                <TrendingDown className="w-3.5 h-3.5" /> {savingsPercentage}% Saved
                            </div>
                        )}

                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-8">Order Summary</h3>

                        <div className="space-y-4 mb-10 text-[11px] font-bold uppercase tracking-tight">
                            <div className="flex justify-between text-slate-400">
                                <span>Subtotal</span>
                                <span className="text-slate-900">₹{subtotal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                                <span>Shipping</span>
                                <span className="text-slate-900">{shippingPrice === 0 ? "FREE" : `₹${shippingPrice}`}</span>
                            </div>

                            {appliedPromo && (
                                <div className="flex justify-between text-emerald-600 font-black bg-emerald-50/50 p-3 -mx-3 rounded-xl animate-in fade-in slide-in-from-right duration-500">
                                    <span className="flex items-center gap-2"><Ticket className="w-3 h-3" /> {appliedPromo.code}</span>
                                    <span>- ₹{discountAmount.toLocaleString()}</span>
                                </div>
                            )}
                        </div>

                        <div className="border-t pt-8 mb-10">
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2 leading-none">Net Payable</p>
                            <div className="flex items-baseline gap-3">
                                <p className="text-5xl font-black italic tracking-tighter text-slate-900 leading-none">
                                    ₹{total.toLocaleString()}
                                </p>
                                {appliedPromo && (
                                    <span className="text-sm text-slate-300 line-through font-bold decoration-slate-300">
                                        ₹{(subtotal + shippingPrice).toLocaleString()}
                                    </span>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={handlePlaceOrder}
                            disabled={loading || !selectedShippingId}
                            className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black text-xs uppercase tracking-[0.2em] hover:bg-black active:scale-95 disabled:opacity-20 flex items-center justify-center gap-3 transition-all"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Complete Purchase"}
                        </button>

                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest text-center mt-6">
                            Secure Encrypted Checkout
                        </p>
                    </div>
                </div>
            </div>

            {/* MOBILE STICKY BAR */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 p-4 bg-white/80 backdrop-blur-xl border-t border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                <div className="max-w-md mx-auto flex items-center justify-between gap-4">
                    <div className="flex flex-col">
                        <p className="text-[10px] font-black text-slate-400 uppercase leading-none">Total</p>
                        <p className="text-xl font-black italic text-slate-900 leading-none mt-1">₹{total.toLocaleString()}</p>
                    </div>
                    <button
                        onClick={handlePlaceOrder}
                        disabled={loading || !selectedShippingId}
                        className="flex-grow bg-slate-900 text-white py-4 px-8 rounded-2xl font-black text-[11px] uppercase tracking-widest active:scale-95 disabled:opacity-30 flex items-center justify-center gap-3"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Pay Now"}
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}