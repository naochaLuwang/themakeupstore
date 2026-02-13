
"use client"

import { useState, useEffect } from "react"
import { useCart } from "@/components/store/use-cart"
import { placeOrder } from "@/app/actions/orders"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Plus, ShoppingBag, Pencil, Trash2, Truck, Check, ChevronRight, MapPin, Sparkles, ShoppingCart } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AddressForm } from "@/components/store/address-form"
import { Button } from "@/components/ui/button"

export default function CheckoutClient({ profile, initialAddresses }: { profile: any, initialAddresses: any[] }) {
    const supabase = createClient()
    const router = useRouter()
    const {
        items,
        shippingPrice,
        selectedShippingId,
        shippingLabel,
        clearCart,
        setShippingMethod,
        getSubtotal
    } = useCart()

    const [mounted, setMounted] = useState(false)
    const [loading, setLoading] = useState(false)
    const [savedAddresses, setSavedAddresses] = useState(initialAddresses)
    const [selectedAddress, setSelectedAddress] = useState<any | null>(
        initialAddresses.find(a => a.is_default) || initialAddresses[0] || null
    )

    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [addressToEdit, setAddressToEdit] = useState<any | null>(null)

    useEffect(() => { setMounted(true) }, [])

    useEffect(() => {
        if (selectedAddress?.shipping_methods) {
            const method = selectedAddress.shipping_methods
            setShippingMethod({ id: method.id, name: method.name, price: Number(method.price) })
        }
    }, [selectedAddress, setShippingMethod])

    const subtotal = getSubtotal()
    const currentSubtotal = mounted ? subtotal : 0
    const threshold = 5000
    const total = currentSubtotal + shippingPrice
    const isFreeShipping = currentSubtotal >= threshold && selectedShippingId

    const handleAddressAdded = (newAddr: any) => {
        setSavedAddresses(prev => [newAddr, ...prev])
        setSelectedAddress(newAddr)
        setIsAddModalOpen(false)
    }

    const handleEditSuccess = (updatedAddr: any) => {
        setSavedAddresses(prev => prev.map(a => a.id === updatedAddr.id ? updatedAddr : a))
        if (selectedAddress?.id === updatedAddr.id) setSelectedAddress(updatedAddr)
        setIsEditModalOpen(false)
    }

    const deleteAddress = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        if (!confirm("Remove address?")) return
        const { error } = await supabase.from("user_addresses").delete().eq("id", id)
        if (!error) {
            const updated = savedAddresses.filter(a => a.id !== id)
            setSavedAddresses(updated)
            if (selectedAddress?.id === id) setSelectedAddress(updated[0] || null)
        }
    }

    const handlePlaceOrder = async () => {
        if (!selectedAddress || !selectedShippingId) {
            return toast.error("Logistics Missing", { description: "Ensure an address and method are selected." })
        }
        setLoading(true)
        try {
            const res = await placeOrder(selectedAddress, items, { total, price: shippingPrice, methodName: shippingLabel })
            if (res.success) {
                clearCart()
                router.push(`/checkout/success?orderId=${res.orderId}`)
            } else {
                toast.error(res.message || "Order failed")
            }
        } catch (err) {
            toast.error("Process interrupted")
        } finally {
            setLoading(false)
        }
    }

    if (!mounted) return null

    return (
        <div className="min-h-screen bg-[#FDFDFD] text-slate-900 pb-24 lg:pb-12">
            {/* TOP NAVIGATION */}
            <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/cart" className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-black transition-colors">
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Back
                    </Link>
                    <span className="text-[11px] font-black uppercase tracking-[0.4em]">Checkout</span>
                    <div className="w-12" />
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 py-8 lg:py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">

                {/* LEFT COLUMN: LOGIC FLOW */}
                <div className="lg:col-span-7 space-y-12">



                    {/* 02. ADDRESS SELECTION (MOVED TO TOP) */}
                    <section className="space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">01. Destination</h2>
                            <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:opacity-60 transition-opacity">
                                <Plus className="w-3 h-3" /> New
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {savedAddresses.map((addr) => (
                                <button
                                    key={addr.id}
                                    onClick={() => setSelectedAddress(addr)}
                                    className={`relative p-6 rounded-[2rem] border-2 transition-all duration-500 text-left ${selectedAddress?.id === addr.id
                                        ? "border-slate-900 bg-white shadow-2xl shadow-slate-200"
                                        : "border-slate-50 bg-slate-50/30 text-slate-400 hover:border-slate-200"
                                        }`}
                                >
                                    <div className="flex justify-between mb-4">
                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${selectedAddress?.id === addr.id ? "bg-slate-900 text-white" : "bg-slate-200"}`}>
                                            {addr.label}
                                        </span>
                                        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                            <Pencil className="w-3.5 h-3.5 hover:text-black" onClick={() => { setAddressToEdit(addr); setIsEditModalOpen(true); }} />
                                            <Trash2 className="w-3.5 h-3.5 text-red-400 hover:text-red-600" onClick={(e) => deleteAddress(e as any, addr.id)} />
                                        </div>
                                    </div>
                                    <p className="text-xs font-black uppercase text-slate-900 mb-1">{addr.full_name}</p>
                                    <p className="text-[10px] font-medium leading-relaxed uppercase tracking-tight">{addr.street}, {addr.area_name}, {addr.city} — {addr.pincode}</p>

                                    {selectedAddress?.id === addr.id && (
                                        <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between animate-in fade-in">
                                            <div className="flex items-center gap-1.5">
                                                <Truck className="w-3 h-3 text-slate-900" />
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-900">{shippingLabel || 'Standard'}</span>
                                            </div>
                                            <Check className="w-4 h-4 text-slate-900" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                        {savedAddresses.length === 0 && (
                            <div className="py-20 border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center text-center bg-slate-50/20">
                                <MapPin className="w-8 h-8 text-slate-200 mb-4" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No destinations saved</p>
                                <Button onClick={() => setIsAddModalOpen(true)} className="mt-4 h-10 px-6 rounded-full bg-slate-900 text-white text-[9px] uppercase font-black">Add First Address</Button>
                            </div>
                        )}
                    </section>


                    {/* 01. SHIPPING GOAL (GOLD HIGHLIGHT) */}
                    <section className="animate-in fade-in slide-in-from-top-4 duration-700">
                        {currentSubtotal < threshold ? (
                            <div className="bg-slate-50 rounded-[2.5rem] p-6 lg:p-8 border border-slate-100">
                                <div className="flex justify-between items-end mb-4">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Logistics Privilege</p>
                                        <p className="text-sm font-bold text-slate-900">
                                            Add <span className="text-[#D4AF37]">₹{(threshold - currentSubtotal).toLocaleString()}</span> for <span className="italic">Free Delivery</span>
                                        </p>
                                    </div>
                                    <Link href="/shop" className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] border-b border-[#D4AF37]/30 pb-1 hover:border-[#D4AF37] transition-all">
                                        Shop More
                                    </Link>
                                </div>
                                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-[#D4AF37] transition-all duration-1000"
                                        style={{ width: `${(currentSubtotal / threshold) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="bg-[#D4AF37] rounded-[2.5rem] p-6 lg:p-8 text-white shadow-xl shadow-gold/20 flex items-center justify-between overflow-hidden relative group">
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Sparkles className="w-4 h-4" />
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Privilege Unlocked</p>
                                    </div>
                                    <p className="text-xl font-black italic tracking-tight">Free Shipping Applicable</p>
                                </div>
                                <ShoppingCart className="w-20 h-20 absolute -right-4 -bottom-4 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-700" />
                            </div>
                        )}
                    </section>
                </div>

                {/* RIGHT COLUMN: SIDEBAR SUMMARY (WEB) */}
                <div className="lg:col-span-5">
                    <div className="lg:sticky lg:top-28 space-y-6">
                        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 lg:p-10 shadow-sm">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-8 flex items-center gap-2">
                                <ShoppingBag className="w-3 h-3" /> Your Selection
                            </h3>

                            <div className="space-y-4 mb-8">
                                {items.map((item) => (
                                    <div key={item.variantId} className="flex justify-between text-[11px] font-bold uppercase">
                                        <span className="text-slate-500">{item.quantity}x <span className="text-slate-900">{item.name}</span></span>
                                        <span>₹{(item.price * item.quantity).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-6 border-t border-slate-100 space-y-3">
                                <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400">
                                    <span>Subtotal</span>
                                    <span className="text-slate-900">₹{currentSubtotal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400">
                                    <span>Logistics</span>
                                    <span className={isFreeShipping ? "text-[#D4AF37] font-black" : "text-slate-900"}>
                                        {isFreeShipping ? "FREE" : `₹${shippingPrice}`}
                                    </span>
                                </div>
                                <div className="pt-6 border-t border-slate-100">
                                    <p className="text-[7px] font-black uppercase tracking-[0.4em] text-slate-400 mb-1">Grand Total</p>
                                    <p className="text-4xl font-black italic tracking-tighter">₹{total.toLocaleString()}</p>
                                </div>
                            </div>

                            <Button
                                onClick={handlePlaceOrder}
                                disabled={loading || !selectedShippingId}
                                className="hidden lg:flex w-full mt-10 h-16 bg-slate-900 hover:bg-black text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-slate-200"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : "Complete Registry"}
                            </Button>
                        </div>
                    </div>
                </div>
            </main>

            {/* MOBILE ACTION BAR */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 p-6 bg-white/80 backdrop-blur-xl border-t border-slate-100">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Payable Amount</p>
                        <p className="text-2xl font-black italic">₹{total.toLocaleString()}</p>
                    </div>
                    <Button
                        onClick={handlePlaceOrder}
                        disabled={loading || !selectedShippingId}
                        className="h-14 px-8 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl"
                    >
                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : (
                            <span className="flex items-center gap-2">Pay Now <ChevronRight className="w-4 h-4" /></span>
                        )}
                    </Button>
                </div>
            </div>

            {/* MODALS */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="max-w-[95vw] md:max-w-[440px] rounded-[2.5rem] p-10 border-none">
                    <DialogHeader><DialogTitle className="text-[11px] font-black uppercase tracking-[0.3em]">New Destination</DialogTitle></DialogHeader>
                    <AddressForm userId={profile.id} onSuccess={handleAddressAdded} />
                </DialogContent>
            </Dialog>

            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="max-w-[95vw] md:max-w-[440px] rounded-[2.5rem] p-10 border-none">
                    <DialogHeader><DialogTitle className="text-[11px] font-black uppercase tracking-[0.3em]">Edit Destination</DialogTitle></DialogHeader>
                    {addressToEdit && <AddressForm userId={profile.id} initialData={addressToEdit} onSuccess={handleEditSuccess} />}
                </DialogContent>
            </Dialog>
        </div>
    )
}