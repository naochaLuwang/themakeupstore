"use client"

import { useState, useEffect } from "react"
import { useCart } from "@/components/store/use-cart"
import { placeOrder } from "@/app/actions/orders"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
    ArrowLeft,
    Loader2,
    Plus,
    ShoppingBag,
    Truck,
    Check,
    ChevronRight,
    MapPin,
    Sparkles,
} from "lucide-react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger
} from "@/components/ui/sheet"
import { AddressForm } from "@/components/store/address-form"
import { Button } from "@/components/ui/button"
import { AddressCard } from "./address-card"

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
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)
    const [addressToEdit, setAddressToEdit] = useState<any | null>(null)

    useEffect(() => { setMounted(true) }, [])

    // Sync shipping method whenever selected address changes
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
        setAddressToEdit(null)
    }

    const handleDeleteAddress = async (id: string) => {
        const confirmDelete = window.confirm("Permanently remove this destination?")
        if (!confirmDelete) return

        const { error } = await supabase.from("user_addresses").delete().eq("id", id)

        if (error) {
            toast.error("Delete failed")
        } else {
            const updated = savedAddresses.filter(a => a.id !== id)
            setSavedAddresses(updated)
            if (selectedAddress?.id === id) {
                setSelectedAddress(updated[0] || null)
            }
            toast.success("Destination removed")
        }
    }

    const handleOpenEdit = (addr: any) => {
        setAddressToEdit(addr)
        setIsEditModalOpen(true)
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
        <div className="min-h-screen bg-[#FDFDFD] text-slate-900 pb-0 lg:pb-12">
            {/* NAVIGATION */}
            <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 h-16 flex items-center">
                <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
                    <Link href="/cart" className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-black">
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Back
                    </Link>
                    <span className="text-[11px] font-black uppercase tracking-[0.4em]">Checkout</span>
                    <div className="w-12" />
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 py-8 lg:py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-7 space-y-10">

                    {/* 01. COMPACT ADDRESS SECTION */}
                    <section className="space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                            <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Deliver To</h2>
                        </div>

                        {selectedAddress ? (
                            <div className="bg-white border border-slate-100 rounded-2xl p-4 transition-all hover:bg-slate-50/30">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3">
                                        <div className="shrink-0 w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center mt-0.5">
                                            <MapPin className="w-4 h-4 text-white" />
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-[11px] font-black uppercase tracking-tight text-slate-900">
                                                    {selectedAddress.full_name}
                                                </p>
                                                <span className="text-[7px] font-bold uppercase px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-md">
                                                    {selectedAddress.label}
                                                </span>
                                            </div>

                                            <div className="text-[10px] text-slate-500 uppercase tracking-tight leading-normal">
                                                <p>{selectedAddress.street}</p>
                                                <p>{selectedAddress.area_name}</p>
                                                <p className="font-bold text-slate-700">{selectedAddress.city} — {selectedAddress.pincode}</p>
                                            </div>

                                            <div className="flex items-center gap-1.5 pt-1">
                                                <Truck className="w-3 h-3 text-[#D4AF37]" />
                                                <span className="text-[9px] font-black text-[#D4AF37] uppercase tracking-tighter">
                                                    {shippingLabel || 'Standard'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                                        <SheetTrigger asChild>
                                            <button className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-black border-b border-slate-200 pb-0.5 transition-all active:scale-95">
                                                Change
                                            </button>
                                        </SheetTrigger>

                                        <SheetContent
                                            side="bottom"
                                            className="z-[100] w-full sm:max-w-md mx-auto h-[85vh] rounded-t-[2.5rem] border-none bg-white p-0 flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.1)] outline-none"
                                        >
                                            {/* Visual Affordance: Grab Handle */}
                                            <div className="flex justify-center pt-4 shrink-0">
                                                <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
                                            </div>

                                            {/* Header */}
                                            <div className="px-8 pt-6 pb-4 shrink-0">
                                                <SheetHeader className="text-left">
                                                    <SheetTitle className="text-lg font-bold text-slate-900 tracking-tight">
                                                        Select Address
                                                    </SheetTitle>
                                                    <SheetDescription className="text-xs text-slate-500 font-medium">
                                                        Choose a delivery destination or manage your entries below.
                                                    </SheetDescription>
                                                </SheetHeader>
                                            </div>

                                            {/* Address List */}
                                            <div className="flex-1 overflow-y-auto px-6 py-2 custom-scrollbar pb-10">
                                                <div className="space-y-3">
                                                    {savedAddresses.map((addr) => (
                                                        <AddressCard
                                                            key={addr.id}
                                                            addr={addr}
                                                            isSelected={selectedAddress?.id === addr.id}
                                                            onSelect={(a) => {
                                                                setSelectedAddress(a);
                                                                setIsDrawerOpen(false);
                                                            }}
                                                            onEdit={handleOpenEdit}
                                                            onDelete={handleDeleteAddress}
                                                        />
                                                    ))}

                                                    <button
                                                        onClick={() => {
                                                            setIsDrawerOpen(false);
                                                            setIsAddModalOpen(true);
                                                        }}
                                                        className="w-full h-16 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center gap-3 text-slate-500 hover:bg-slate-50 hover:border-slate-900 hover:text-slate-900 transition-all active:scale-[0.98] mt-2"
                                                    >
                                                        <Plus className="w-5 h-5" />
                                                        <span className="text-sm font-bold uppercase tracking-tight">Add New Address</span>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Footer */}
                                            <div className="p-6 bg-white border-t border-slate-50 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
                                                <Button
                                                    variant="secondary"
                                                    onClick={() => setIsDrawerOpen(false)}
                                                    className="w-full h-12 rounded-xl bg-slate-100 text-slate-900 font-bold uppercase tracking-widest text-[10px] hover:bg-slate-200 border-none"
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                        </SheetContent>
                                    </Sheet>
                                </div>
                            </div>
                        ) : (
                            <Button onClick={() => setIsAddModalOpen(true)} variant="outline" className="w-full h-12 border-dashed rounded-xl bg-slate-50/20 text-slate-400 font-black uppercase tracking-widest text-[9px]">
                                <Plus className="w-3.5 h-3.5 mr-2" /> Add Address
                            </Button>
                        )}
                    </section>

                    {/* 02. SHIPPING PROGRESS */}
                    <section className="animate-in fade-in duration-500">
                        {currentSubtotal < threshold ? (
                            <div className="space-y-4 py-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Logistics Milestone</span>
                                    <span className="text-[10px] font-bold text-slate-900">₹{currentSubtotal.toLocaleString()} / ₹{threshold.toLocaleString()}</span>
                                </div>
                                <div className="relative h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div className="absolute h-full bg-[#D4AF37] transition-all duration-700 ease-out" style={{ width: `${(currentSubtotal / threshold) * 100}%` }} />
                                </div>
                                <div className="flex items-start justify-between gap-4">
                                    <p className="text-[11px] text-slate-600 leading-relaxed uppercase tracking-tighter">
                                        You are <span className="text-slate-900 font-bold">₹{(threshold - currentSubtotal).toLocaleString()}</span> away from <span className="text-[#D4AF37] font-bold">Free Delivery</span>.
                                    </p>
                                    <Link href="/shop" className="shrink-0 text-[10px] font-black uppercase tracking-widest text-slate-900 underline underline-offset-4 hover:text-[#D4AF37]">Add Items</Link>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-50 rounded-[1.5rem] p-5 flex items-center justify-between border border-[#D4AF37]/20">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#D4AF37]/10"><Check className="w-5 h-5 text-[#D4AF37]" /></div>
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37]">Threshold Unlocked</p>
                                        <p className="text-[11px] font-bold text-slate-900 uppercase tracking-tight">Complimentary shipping applied</p>
                                    </div>
                                </div>
                                <Sparkles className="w-4 h-4 text-[#D4AF37] opacity-40 animate-pulse" />
                            </div>
                        )}
                    </section>
                </div>

                {/* SIDEBAR: ORDER SUMMARY */}
                <div className="lg:col-span-5">
                    <div className="lg:sticky lg:top-28 space-y-6">
                        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 lg:p-10 shadow-sm">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-8 flex items-center gap-2">
                                <ShoppingBag className="w-3 h-3" /> Order Summary
                            </h3>

                            <div className="space-y-4 mb-8 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
                                {items.map((item) => (
                                    <div key={item.variantId} className="flex justify-between text-[11px] font-bold uppercase">
                                        <span className="text-slate-500">{item.quantity}x <span className="text-slate-900">{item.name}</span></span>
                                        <span>₹{(item.price * item.quantity).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-6 border-t border-slate-100 space-y-3">
                                <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400"><span>Subtotal</span><span className="text-slate-900">₹{currentSubtotal.toLocaleString()}</span></div>
                                <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400"><span>Shipping</span><span className={isFreeShipping ? "text-[#D4AF37] font-black" : "text-slate-900"}>{isFreeShipping ? "FREE" : `₹${shippingPrice}`}</span></div>
                                <div className="pt-6 border-t border-slate-100">
                                    <p className="text-[7px] font-black uppercase tracking-[0.4em] text-slate-400 mb-1">Grand Total</p>
                                    <p className="text-4xl font-black italic tracking-tighter">₹{total.toLocaleString()}</p>
                                </div>
                            </div>

                            <Button onClick={handlePlaceOrder} disabled={loading || !selectedShippingId} className="hidden lg:flex w-full mt-10 h-16 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-transform">
                                {loading ? <Loader2 className="animate-spin" /> : "Authorize Order"}
                            </Button>
                        </div>
                    </div>
                </div>
            </main>

            {/* MOBILE ACTION DOCK */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
                <div className="absolute inset-0 bg-white/80 backdrop-blur-2xl border-t border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.04)]" />

                <div className="relative px-6 py-5 flex items-center gap-6">
                    <div className="flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <div className="w-1 h-1 rounded-full bg-[#D4AF37]" />
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Payable</p>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">₹</span>
                            <p className="text-2xl font-black tracking-tighter text-slate-900">
                                {total.toLocaleString()}
                            </p>
                        </div>
                    </div>

                    <Button
                        onClick={handlePlaceOrder}
                        disabled={loading || !selectedShippingId}
                        className={`
        relative h-14 px-8 
        min-w-[180px] flex items-center justify-center /* Fixes the shrinking issue */
        rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all duration-300
        ${!selectedShippingId
                                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                : "bg-slate-900 text-white shadow-[0_15px_30px_-10px_rgba(0,0,0,0.3)] active:scale-95"}
    `}
                    >
                        {loading ? (
                            <Loader2 className="animate-spin w-5 h-5" />
                        ) : (
                            <div className="flex items-center gap-3">
                                <span>Place Order</span>
                                <ChevronRight className="w-4 h-4 opacity-50 transition-transform group-hover:translate-x-1" />
                            </div>
                        )}
                    </Button>
                </div>
                <div className="h-[env(safe-area-inset-bottom)] bg-white/80" />
            </div>

            {/* MODALS */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                {/* z-[110] ensures it sits above the Sheet */}
                <DialogContent className="z-[110] max-w-[95vw] md:max-w-[440px] rounded-[3rem] p-10 border-none shadow-2xl">
                    <DialogHeader><DialogTitle className="text-[11px] font-black uppercase tracking-[0.3em]">New Destination</DialogTitle></DialogHeader>
                    <AddressForm userId={profile.id} onSuccess={handleAddressAdded} />
                </DialogContent>
            </Dialog>

            <Dialog open={isEditModalOpen} onOpenChange={(open) => {
                setIsEditModalOpen(open)
                if (!open) setAddressToEdit(null)
            }}>
                <DialogContent className="z-[110] max-w-[95vw] md:max-w-[440px] rounded-[3rem] p-10 border-none shadow-2xl">
                    <DialogHeader><DialogTitle className="text-[11px] font-black uppercase tracking-[0.3em]">Update Destination</DialogTitle></DialogHeader>
                    {/* Only render form when data is ready to avoid "hidden" or stale form inputs */}
                    {addressToEdit ? (
                        <AddressForm
                            userId={profile.id}
                            initialData={addressToEdit}
                            onSuccess={handleEditSuccess}
                        />
                    ) : (
                        <div className="flex justify-center py-10">
                            <Loader2 className="animate-spin text-slate-300" />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}