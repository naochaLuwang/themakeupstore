

// import { createClient } from "@/utils/supabase/server"
// import { notFound } from "next/navigation"
// import { Badge } from "@/components/ui/badge"
// import { Separator } from "@/components/ui/separator"
// import {
//     Package, Calendar, ShieldCheck, Clock, AlertCircle, XCircle,
//     Truck, CheckCircle2, MessageCircle, MapPin, ArrowLeft, Tag
// } from "lucide-react"
// import { CancelOrderButton } from "@/components/orders/cancel-order-button"
// import { Button } from "@/components/ui/button"
// import Link from "next/link"

// type tParams = Promise<{ id: string }>;

// export default async function OrderDetailsPage(props: { params: tParams }) {
//     const { id } = await props.params;
//     const supabase = await createClient()

//     const { data: order, error } = await supabase
//         .from("orders")
//         .select(`*, order_items (*)`)
//         .eq("id", id)
//         .single()

//     if (error || !order) return notFound()

//     const address = order.shipping_address as any
//     const whatsappNumber = "916909013764"
//     const supportMessage = encodeURIComponent(`Hi Daciana Support, I have a query regarding my Order ID: ${id}.`)
//     const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${supportMessage}`

//     const steps = [
//         { status: 'pending', label: 'Placed', icon: Clock },
//         { status: 'processing', label: 'Processing', icon: Package },
//         { status: 'shipped', label: 'In Transit', icon: Truck },
//         { status: 'delivered', label: 'Delivered', icon: CheckCircle2 },
//     ]
//     const currentIndex = steps.findIndex(s => s.status === order.status?.toLowerCase())

//     return (
//         <div className="bg-white min-h-screen text-slate-900 selection:bg-black selection:text-white">
//             <div className="max-w-5xl mx-auto px-6 py-12 lg:py-20">

//                 {/* HEADER SECTION */}
//                 <div className="flex flex-col space-y-8 mb-16 border-b border-slate-100 pb-12">
//                     <Link href="/profile/orders" className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-black transition-colors w-fit">
//                         <ArrowLeft className="w-3 h-3" /> Back to Orders
//                     </Link>

//                     <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
//                         <div>
//                             <div className="flex items-center gap-4 mb-2">
//                                 <h1 className="text-3xl font-medium tracking-tight">Order #{id.slice(0, 8).toUpperCase()}</h1>
//                                 <span className={`text-[10px] px-3 py-1 font-bold uppercase tracking-widest border ${order.status === 'delivered' ? 'border-emerald-500 text-emerald-600' :
//                                     order.status === 'cancelled' ? 'border-red-200 text-red-400' : 'border-black text-black'
//                                     }`}>
//                                     {order.status}
//                                 </span>
//                             </div>
//                             <p className="text-[11px] text-slate-400 font-medium uppercase tracking-widest flex items-center gap-2">
//                                 <Calendar className="w-3 h-3" />
//                                 {new Date(order.created_at).toLocaleDateString('en-IN', { dateStyle: 'long' })}
//                             </p>
//                         </div>

//                         <div className="flex items-center gap-3">
//                             <CancelOrderButton orderId={id} currentStatus={order.status} />
//                             <Button asChild variant="outline" className="rounded-none border-black hover:bg-black hover:text-white text-[10px] font-bold uppercase tracking-widest h-10 px-6">
//                                 <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
//                                     <MessageCircle className="w-3.5 h-3.5 mr-2" /> Support
//                                 </a>
//                             </Button>
//                         </div>
//                     </div>
//                 </div>

//                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">

//                     {/* LEFT COLUMN: TRACKING & ITEMS */}
//                     <div className="lg:col-span-7 space-y-16">

//                         {/* MINIMAL TIMELINE */}
//                         <div className="space-y-8">
//                             <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
//                                 <Truck className="w-3 h-3" /> Shipment Progress
//                             </h2>
//                             <div className="flex justify-between items-start relative max-w-lg">
//                                 {steps.map((step, idx) => {
//                                     const Icon = step.icon
//                                     const isCompleted = idx <= currentIndex
//                                     const isCancelled = order.status === 'cancelled'

//                                     if (isCancelled && idx > 0) return null

//                                     return (
//                                         <div key={step.status} className="flex flex-col items-center gap-3 z-10 bg-white group">
//                                             <div className={`w-10 h-10 flex items-center justify-center transition-all duration-500 border rounded-full ${isCompleted ? 'bg-black border-black text-white' : 'bg-white border-slate-100 text-slate-200'
//                                                 }`}>
//                                                 <Icon className="w-4 h-4" />
//                                             </div>
//                                             <span className={`text-[9px] font-bold uppercase tracking-tighter ${isCompleted ? 'text-black' : 'text-slate-300'}`}>
//                                                 {step.label}
//                                             </span>
//                                         </div>
//                                     )
//                                 })}
//                                 {/* Connector Line */}
//                                 <div className="absolute top-5 left-0 w-full h-[1px] bg-slate-100 -z-0" />
//                             </div>
//                         </div>

//                         {/* ITEMS LIST */}
//                         <div className="space-y-8">
//                             <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
//                                 <Package className="w-3 h-3" /> Order Contents
//                             </h2>
//                             <div className="space-y-6">
//                                 {order.order_items.map((item: any) => (
//                                     <div key={item.id} className="flex items-center gap-6 group">
//                                         <div className="w-20 h-28 bg-slate-50 relative flex-shrink-0 overflow-hidden">
//                                             {/* If you have item images, use <Image /> here */}
//                                             <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-300 uppercase italic tracking-tighter">
//                                                 {item.quantity}x Units
//                                             </div>
//                                         </div>
//                                         <div className="flex-grow">
//                                             <div className="flex justify-between items-start">
//                                                 <h4 className="text-[12px] font-medium uppercase tracking-tight leading-snug max-w-[200px]">{item.product_name}</h4>
//                                                 <span className="text-[12px] font-light italic">₹{Number(item.unit_price).toLocaleString('en-IN')}</span>
//                                             </div>
//                                             <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">
//                                                 {item.variant_title || 'Signature Edition'}
//                                             </p>
//                                         </div>
//                                     </div>
//                                 ))}
//                             </div>
//                         </div>
//                     </div>

//                     {/* RIGHT COLUMN: LOGISTICS & BILLING */}
//                     <div className="lg:col-span-5 space-y-12">

//                         {/* DELIVERY DETAILS */}
//                         <div className="space-y-6 border border-slate-100 p-8 rounded-sm bg-[#FCFCFC]">
//                             <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
//                                 <MapPin className="w-3 h-3" /> Shipping To
//                             </h3>
//                             <div className="space-y-1">
//                                 <p className="text-sm font-bold uppercase tracking-tight">{address?.full_name}</p>
//                                 <p className="text-[12px] text-slate-500 leading-relaxed font-light italic">{address?.street}</p>
//                                 <p className="text-[12px] font-medium text-slate-900">{address?.pincode}</p>
//                             </div>
//                             <div className="pt-4 border-t border-slate-200/50">
//                                 <p className="text-[10px] uppercase text-slate-400 tracking-widest font-bold">Contact</p>
//                                 <p className="text-[11px] font-medium">{address?.phone}</p>
//                             </div>
//                         </div>

//                         {/* FINANCIAL SUMMARY */}
//                         <div className="space-y-6 border border-black p-8 bg-white">
//                             <h3 className="text-[10px] font-bold text-black uppercase tracking-[0.3em] flex items-center justify-between">
//                                 Summary
//                                 <span className={`text-[8px] tracking-[0.1em] border px-2 py-0.5 ${order.payment_status === 'paid' ? 'border-emerald-200 text-emerald-600' : 'border-slate-200 text-slate-400'
//                                     }`}>
//                                     {order.payment_status?.toUpperCase()}
//                                 </span>
//                             </h3>

//                             <div className="space-y-4 text-[11px] uppercase tracking-widest">
//                                 <div className="flex justify-between text-slate-400">
//                                     <span>Subtotal</span>
//                                     <span className="text-black font-medium">₹{(order.total - order.shipping_price).toLocaleString('en-IN')}</span>
//                                 </div>
//                                 <div className="flex justify-between text-slate-400">
//                                     <span className="flex items-center gap-1">Logistics <span className="text-[8px] italic text-slate-300 lowercase">({order.shipping_label})</span></span>
//                                     <span className="text-black font-medium">₹{order.shipping_price.toLocaleString('en-IN')}</span>
//                                 </div>

//                                 <Separator className="bg-slate-100" />

//                                 <div className="flex justify-between items-baseline pt-4">
//                                     <span className="text-[10px] font-bold text-black">Total Amount</span>
//                                     <span className="text-3xl font-light tracking-tighter italic">₹{order.total.toLocaleString('en-IN')}</span>
//                                 </div>
//                             </div>
//                         </div>

//                         {/* RETURN/POLICY NOTE */}
//                         <div className="p-4 bg-slate-50 rounded-sm">
//                             <p className="text-[9px] text-slate-400 leading-relaxed uppercase tracking-widest text-center">
//                                 Items can be returned within 7 days of delivery. <br /> Visit our <Link href="/policy" className="text-black border-b border-black/20">Returns Policy</Link> for details.
//                             </p>
//                         </div>

//                     </div>
//                 </div>
//             </div>
//         </div>
//     )
// }



import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import {
    Package, Calendar, Clock, Truck, CheckCircle2, MessageCircle, MapPin, ArrowLeft, Ticket
} from "lucide-react"
import { CancelOrderButton } from "@/components/orders/cancel-order-button"
import { InvoiceButton } from "@/components/orders/invoice-button"
import { Button } from "@/components/ui/button"
import Link from "next/link"

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
    const whatsappUrl = `https://wa.me/916909013764?text=${encodeURIComponent(`Query regarding Order: ${id}`)}`

    // Math Adjustments for Promo
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

    return (
        <div className="bg-white min-h-screen text-slate-900">
            <div className="max-w-5xl mx-auto px-6 py-12 lg:py-20">

                {/* HEADER */}
                <div className="flex flex-col space-y-8 mb-16 border-b border-slate-100 pb-12">
                    <Link href="/profile/orders" className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-black transition-colors w-fit">
                        <ArrowLeft className="w-3 h-3" /> Back
                    </Link>

                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-4 mb-2">
                                <h1 className="text-3xl font-medium tracking-tight">Order #{id.slice(0, 8).toUpperCase()}</h1>
                                <span className={`text-[10px] px-3 py-1 font-bold uppercase tracking-widest border ${order.status === 'delivered' ? 'border-emerald-500 text-emerald-600' : 'border-black'}`}>
                                    {order.status}
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-widest flex items-center gap-2">
                                <Calendar className="w-3 h-3" /> {new Date(order.created_at).toLocaleDateString('en-IN', { dateStyle: 'long' })}
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <CancelOrderButton orderId={id} currentStatus={order.status} />
                            <InvoiceButton order={order} />
                            <Button asChild variant="outline" className="rounded-none border-black hover:bg-black hover:text-white text-[10px] font-bold uppercase tracking-widest h-10 px-6">
                                <a href={whatsappUrl} target="_blank">
                                    <MessageCircle className="w-3.5 h-3.5 mr-2" /> Support
                                </a>
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                    <div className="lg:col-span-7 space-y-16">
                        {/* TIMELINE */}
                        <div className="space-y-8">
                            <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Shipment Progress</h2>
                            <div className="flex justify-between items-start relative max-w-lg">
                                {steps.map((step, idx) => {
                                    const Icon = step.icon
                                    const isCompleted = idx <= currentIndex
                                    if (order.status === 'cancelled' && idx > 0) return null
                                    return (
                                        <div key={step.status} className="flex flex-col items-center gap-3 z-10 bg-white">
                                            <div className={`w-10 h-10 flex items-center justify-center border rounded-full ${isCompleted ? 'bg-black text-white' : 'text-slate-200'}`}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <span className="text-[9px] font-bold uppercase">{step.label}</span>
                                        </div>
                                    )
                                })}
                                <div className="absolute top-5 left-0 w-full h-[1px] bg-slate-100 -z-0" />
                            </div>
                        </div>

                        {/* ITEMS */}
                        <div className="space-y-8">
                            <div className="space-y-6">
                                {order.order_items.map((item: any) => (
                                    <div key={item.id} className="flex items-center gap-6">
                                        <div className="w-20 h-24 bg-slate-50 flex items-center justify-center text-[10px] text-slate-300 font-bold uppercase italic">
                                            {item.quantity}x
                                        </div>
                                        <div className="flex-grow">
                                            <div className="flex justify-between">
                                                <h4 className="text-[12px] font-medium uppercase">{item.product_name}</h4>
                                                <span className="text-[12px]">₹{item.unit_price}</span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 uppercase mt-1">{item.variant_title}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="lg:col-span-5 space-y-12">
                        <div className="border border-slate-100 p-8 bg-[#FCFCFC]">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-4">Shipping To</h3>
                            <p className="text-sm font-bold uppercase">{address?.full_name}</p>
                            <p className="text-[12px] text-slate-500 italic">{address?.street}</p>
                            <p className="text-[12px] font-medium">{address?.pincode}</p>
                        </div>

                        <div className="border border-black p-8 bg-white shadow-sm">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] mb-6 flex justify-between">
                                Billing Summary
                                <span className="text-[8px] border px-2 py-0.5">{order.payment_status}</span>
                            </h3>

                            <div className="space-y-4 text-[11px] uppercase tracking-widest">
                                <div className="flex justify-between text-slate-400">
                                    <span>Subtotal</span>
                                    <span>₹{subtotal.toLocaleString()}</span>
                                </div>

                                {order.promo_code && (
                                    <div className="flex justify-between text-emerald-600 font-bold">
                                        <span className="flex items-center gap-1"><Ticket className="w-3 h-3" /> {order.promo_code}</span>
                                        <span>- ₹{discount.toLocaleString()}</span>
                                    </div>
                                )}

                                <div className="flex justify-between text-slate-400">
                                    <span>Logistics</span>
                                    <span>₹{shipping.toLocaleString()}</span>
                                </div>

                                <Separator />

                                <div className="flex justify-between items-baseline pt-4">
                                    <span className="text-[10px] font-bold">Total</span>
                                    <span className="text-3xl italic font-light">₹{order.total.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}