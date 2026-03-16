import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import {
    Package, Calendar, Clock, Truck, CheckCircle2, MessageCircle, MapPin, ArrowLeft, Ticket, ShieldCheck, CreditCard
} from "lucide-react"
import { CancelOrderButton } from "@/components/orders/cancel-order-button"
import { InvoiceButton } from "@/components/orders/invoice-button"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

type tParams = Promise<{ id: string }>;

export default async function OrderDetailsPage(props: { params: tParams }) {
    const { id } = await props.params;
    const supabase = await createClient()

    const { data: order, error } = await supabase
        .from("orders")
        .select(`*, order_items (*)`)
        .eq("id", id)
        .single()

    if (error || !order) return notFound()

    const address = order.shipping_address as any
    const whatsappUrl = `https://wa.me/8794833630?text=${encodeURIComponent(`Query regarding Order: ${id}`)}`

    const discount = Number(order.promo_discount_amount) || 0
    const shipping = Number(order.shipping_price) || 0
    const subtotal = (Number(order.total) + discount) - shipping

    const steps = [
        { status: 'pending', label: 'Placed', icon: Clock },
        { status: 'processing', label: 'Processing', icon: Package },
        { status: 'shipped', label: 'In Transit', icon: Truck },
        { status: 'delivered', label: 'Delivered', icon: CheckCircle2 },
    ]
    const currentIndex = steps.findIndex(s => s.status === order.status?.toLowerCase())
    const isCancelled = order.status === 'cancelled'

    return (
        <div className="bg-[#FAFAFA] min-h-screen pb-0">
            {/* TOP UTILITY NAV */}
            <div className="bg-white border-b border-slate-100 sticky top-0 z-30">
                <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/profile/orders" className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-black transition-all">
                        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" /> Back to Archive
                    </Link>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em]">Live Tracking</span>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 py-12">
                {/* HERO HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-8">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <h1 className="text-4xl font-black italic tracking-tighter uppercase">Order</h1>
                            <span className={`text-[9px] px-3 py-1 font-black uppercase tracking-[0.2em] rounded-full ${isCancelled ? 'bg-red-50 text-red-500' : 'bg-slate-900 text-white'
                                }`}>
                                {order.status}
                            </span>
                        </div>
                        <div className="flex items-center gap-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                            <span className="flex items-center gap-1.5 underline decoration-slate-200 underline-offset-4">#{id.slice(0, 8)}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {new Date(order.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <CancelOrderButton orderId={id} currentStatus={order.status} />
                        <InvoiceButton order={order} />
                        <Button asChild variant="secondary" className="bg-white border border-slate-200 rounded-xl h-12 px-6 hover:bg-slate-50 transition-all">
                            <a href={whatsappUrl} target="_blank" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                                <MessageCircle className="w-4 h-4" /> SUPPORT
                            </a>
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* MAIN CONTENT */}
                    <div className="lg:col-span-8 space-y-8">

                        {/* SHIPMENT TRACKER */}
                        <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
                            <div className="flex items-center justify-between mb-10">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Journey</h3>
                                <div className="text-[10px] font-bold text-slate-900 uppercase italic">Estimated Delivery: 1-2 Days</div>
                            </div>

                            <div className="relative flex justify-between">
                                {/* BACKGROUND LINE */}
                                <div className="absolute top-5 left-0 w-full h-[2px] bg-slate-100" />

                                {steps.map((step, idx) => {
                                    const Icon = step.icon
                                    const active = idx <= currentIndex && !isCancelled
                                    const current = idx === currentIndex && !isCancelled

                                    if (isCancelled && idx > 0) return null

                                    return (
                                        <div key={step.status} className="relative z-10 flex flex-col items-center gap-4 bg-white px-2">
                                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-500 border-2 ${active ? 'bg-black border-black text-white shadow-xl shadow-slate-200' : 'bg-white border-slate-100 text-slate-300'
                                                }`}>
                                                <Icon className={`w-5 h-5 ${current ? 'animate-bounce' : ''}`} />
                                            </div>
                                            <div className="text-center">
                                                <p className={`text-[9px] font-black uppercase tracking-widest ${active ? 'text-black' : 'text-slate-300'}`}>{step.label}</p>
                                                {current && <p className="text-[7px] font-bold text-emerald-500 uppercase mt-1">Current</p>}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* PRODUCT LIST */}
                        <div className="bg-white rounded-[2rem] overflow-hidden border border-slate-100">
                            <div className="p-8 border-b border-slate-50">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Items ({order.order_items.length})</h3>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {order.order_items.map((item: any) => (
                                    <div key={item.id} className="p-8 flex items-center gap-6 hover:bg-slate-50/50 transition-colors">
                                        <div className="w-24 h-28 bg-slate-100 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden shrink-0">
                                            <span className="text-[10px] font-black italic text-slate-400 opacity-20 absolute top-2 left-2">ITEM</span>
                                            <p className="text-lg font-black italic text-slate-900">{item.quantity}x</p>
                                        </div>
                                        <div className="flex-grow space-y-1">
                                            <div className="flex justify-between items-start">
                                                <h4 className="text-sm font-black uppercase tracking-tight leading-tight max-w-[200px]">{item.product_name}</h4>
                                                <span className="text-sm font-black italic">₹{item.unit_price.toLocaleString()}</span>
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.variant_title}</p>
                                            <div className="pt-2">
                                                <span className="text-[8px] px-2 py-0.5 border border-slate-200 rounded text-slate-400 font-bold uppercase tracking-widest">SKU: {item.id.slice(-4)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* SIDEBAR */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* SHIPPING BOX */}
                        <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm relative overflow-hidden group">
                            <MapPin className="absolute -right-4 -bottom-4 w-24 h-24 text-slate-50 group-hover:text-slate-100 transition-colors" />
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">Shipping Address</h3>
                            <div className="relative z-10 space-y-1">
                                <p className="text-sm font-black uppercase tracking-tight">{address?.full_name}</p>
                                <p className="text-[11px] font-bold text-slate-500 uppercase leading-relaxed">{address?.street}</p>
                                <p className="text-[11px] font-black text-slate-900 mt-2">{address?.city}, {address?.pincode}</p>
                            </div>
                        </div>

                        {/* PAYMENT SUMMARY */}
                        <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-2xl shadow-slate-200 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4">
                                <ShieldCheck className="w-5 h-5 text-white/20" />
                            </div>

                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-8 flex justify-between items-center">
                                Billing Summary
                                <Badge variant="outline" className="text-[8px] border-white/20 text-white rounded-none uppercase">{order.payment_status}</Badge>
                            </h3>

                            <div className="space-y-4 text-[11px] font-bold uppercase tracking-widest">
                                <div className="flex justify-between text-white/50">
                                    <span>Subtotal</span>
                                    <span>₹{subtotal.toLocaleString()}</span>
                                </div>

                                {order.promo_code && (
                                    <div className="flex justify-between text-emerald-400">
                                        <span className="flex items-center gap-2"><Ticket className="w-3.5 h-3.5" /> {order.promo_code}</span>
                                        <span>- ₹{discount.toLocaleString()}</span>
                                    </div>
                                )}

                                <div className="flex justify-between text-white/50">
                                    <span>Logistics</span>
                                    <span>₹{shipping.toLocaleString()}</span>
                                </div>

                                <div className="pt-6 border-t border-white/10">
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-[10px] font-black opacity-40">Total Amount</span>
                                        <span className="text-4xl font-black italic tracking-tighter">₹{order.total.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="pt-4 flex items-center gap-2 text-[8px] text-white/30 font-black">
                                    <CreditCard className="w-3 h-3" />
                                    SECURE TRANSACTION • {order.id.toUpperCase()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}