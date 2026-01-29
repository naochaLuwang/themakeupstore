


"use client"

import { useState, useEffect } from "react"
import { useCart } from "@/components/store/use-cart"
import { CheckoutShipping } from "@/components/store/checkout-shipping"
import { placeOrder } from "@/app/actions/orders"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, ChevronRight, Ticket, MapPin, Check, Plus, ShoppingBag } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"

export default function CheckoutClient({ profile }: { profile: any }) {
    const supabase = createClient()
    const { items, shippingPrice, selectedShippingId, shippingLabel, clearCart, appliedPromo } = useCart()
    const router = useRouter()

    const [loading, setLoading] = useState(false)
    const [savedAddresses, setSavedAddresses] = useState<any[]>([])
    const [selectedAddress, setSelectedAddress] = useState<any | null>(null)

    useEffect(() => {
        async function loadAddresses() {
            const { data } = await supabase
                .from("user_addresses")
                .select("*")
                .order("is_default", { ascending: false })

            if (data && data.length > 0) {
                setSavedAddresses(data)
                const defaultAddr = data.find(a => a.is_default) || data[0]
                setSelectedAddress(defaultAddr)
            }
        }
        if (profile?.id) loadAddresses()
    }, [profile?.id])

    const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0)
    const total = Math.max(0, subtotal + shippingPrice - (appliedPromo?.discount || 0))

    const handlePlaceOrder = async () => {
        if (!selectedAddress || !selectedShippingId) {
            return toast.error("Selection Required", { description: "Select destination & shipping method." })
        }
        setLoading(true)
        try {
            const sanitizedItems = items.map(item => ({ ...item, id: item.productId }))

            // FIX: Separate the shipping metadata from the promo metadata
            const res = await placeOrder(
                selectedAddress,
                sanitizedItems,
                {
                    total,
                    price: shippingPrice,
                    methodName: shippingLabel
                },
                // This is the 4th argument your Server Action expects
                appliedPromo ? { code: appliedPromo.code, discount: appliedPromo.discount } : undefined
            )

            if (res.success) {
                clearCart();
                router.push(`/checkout/success?orderId=${res.orderId}`)
            } else {
                toast.error(res.message || "Order failed")
            }
        } catch (err) {
            toast.error("Order process interrupted")
        } finally {
            setLoading(false)
        }
    }
    return (
        <div className="min-h-screen bg-white text-slate-900 pb-40 lg:pb-20">
            <nav className="max-w-5xl mx-auto px-6 py-10 flex justify-between items-center">
                <Link href="/cart" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-black transition-all">
                    <ArrowLeft className="w-3 h-3" /> Back
                </Link>
                <h1 className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-900 ml-4">Checkout</h1>
                <div className="w-10" />
            </nav>

            <main className="max-w-5xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12">

                {/* LEFT: SELECTION FLOW */}
                <div className="lg:col-span-7 space-y-12">

                    {/* DESTINATION SECTION */}
                    <section>
                        <div className="flex items-center justify-between mb-8 border-b border-slate-50 pb-4">
                            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">01. Destination</h2>
                            <Link href="/profile/addresses" className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-900 hover:opacity-50 transition-opacity">
                                <Plus className="w-3 h-3" /> New
                            </Link>
                        </div>

                        <div className="space-y-4">
                            {savedAddresses.map((addr) => (
                                <button
                                    key={addr.id}
                                    onClick={() => setSelectedAddress(addr)}
                                    className={`w-full relative flex flex-col p-6 rounded-[1.5rem] border-2 transition-all duration-300 text-left ${selectedAddress?.id === addr.id
                                        ? "border-slate-900 bg-white"
                                        : "border-slate-50 bg-slate-50/30 text-slate-400 hover:border-slate-100"
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${selectedAddress?.id === addr.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400"}`}>
                                                {addr.label}
                                            </span>
                                            {addr.is_default && <span className="text-[7px] font-black uppercase text-slate-300">Default</span>}
                                        </div>
                                        {selectedAddress?.id === addr.id && <div className="w-4 h-4 bg-slate-900 rounded-full flex items-center justify-center"><Check className="w-2.5 h-2.5 text-white" /></div>}
                                    </div>

                                    <p className="text-xs font-black uppercase tracking-tight text-slate-900 mb-1">{addr.full_name}</p>
                                    <p className="text-[11px] font-medium leading-relaxed text-slate-500 uppercase tracking-tight">
                                        {addr.street}, {addr.city}, {addr.state} — {addr.pincode}
                                    </p>
                                    <p className="text-[10px] font-bold mt-2 text-slate-400">{addr.phone}</p>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* LOGISTICS SECTION */}
                    {selectedAddress && (
                        <section className="animate-in fade-in slide-in-from-bottom duration-500">
                            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-8 border-b border-slate-50 pb-4">02. Logistics</h2>
                            <CheckoutShipping pincode={selectedAddress.pincode} />
                        </section>
                    )}
                </div>

                {/* RIGHT: SUMMARY */}
                <div className="lg:col-span-5">
                    <div className="lg:sticky lg:top-10 space-y-6">
                        <div className="bg-slate-50/50 border border-slate-100 rounded-[2rem] p-8">
                            <div className="flex items-center gap-2 mb-8 text-slate-400">
                                <ShoppingBag className="w-3 h-3" />
                                <h3 className="text-[9px] font-black uppercase tracking-[0.3em]">Your Selection</h3>
                            </div>

                            <div className="space-y-4 mb-8">
                                {items.map((item) => (
                                    <div key={item.id} className="flex justify-between items-center text-[10px] font-bold uppercase tracking-tight">
                                        <span className="text-slate-500">{item.quantity}x <span className="text-slate-900">{item.name}</span></span>
                                        <span className="font-black italic">₹{(item.price * item.quantity).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-3 pt-6 border-t border-slate-200/50">
                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                    <span>Subtotal</span>
                                    <span className="text-slate-900">₹{subtotal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                    <span>Logistics</span>
                                    <span className="text-slate-900">{shippingPrice === 0 ? "FREE" : `₹${shippingPrice}`}</span>
                                </div>
                                {appliedPromo && (
                                    <div className="flex justify-between text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                                        <span className="flex items-center gap-1"><Ticket className="w-3 h-3" /> {appliedPromo.code}</span>
                                        <span>- ₹{appliedPromo.discount.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-200 flex justify-between items-end">
                                <div>
                                    <p className="text-[7px] font-black uppercase tracking-[0.4em] text-slate-400 mb-1">Grand Total</p>
                                    <p className="text-3xl font-black italic tracking-tighter text-slate-900 leading-none">₹{total.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handlePlaceOrder}
                            disabled={loading || !selectedShippingId}
                            className="hidden lg:flex w-full bg-slate-900 text-white py-6 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] hover:bg-black active:scale-[0.98] transition-all disabled:opacity-20 items-center justify-center gap-4"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Complete Registry"}
                        </button>
                    </div>
                </div>
            </main>

            {/* MOBILE FLOATING HUD */}
            <div className="lg:hidden fixed bottom-[90px] left-0 right-0 z-50 px-6 pointer-events-none">
                <div className="bg-slate-900/95 backdrop-blur-xl rounded-[2rem] p-4 flex items-center justify-between border border-white/10 shadow-2xl pointer-events-auto max-w-md mx-auto">
                    <div className="pl-4">
                        <p className="text-[7px] font-black text-white/40 uppercase tracking-[0.4em] mb-0.5">Payable</p>
                        <p className="text-lg font-black italic text-white leading-none">₹{total.toLocaleString()}</p>
                    </div>
                    <button
                        onClick={handlePlaceOrder}
                        disabled={loading || !selectedShippingId}
                        className="bg-white text-slate-900 px-8 py-3.5 rounded-xl font-black text-[9px] uppercase tracking-widest active:scale-[0.95] disabled:opacity-30 transition-all flex items-center gap-2"
                    >
                        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Pay Now"}
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}