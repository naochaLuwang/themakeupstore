// import { createClient } from "@/utils/supabase/server"
// import { notFound } from "next/navigation"
// import { Badge } from "@/components/ui/badge"
// import { Separator } from "@/components/ui/separator"
// import {
//     Package, Home, Phone, Calendar, CreditCard,
//     ShieldCheck, Clock, AlertCircle, XCircle,
//     Truck, CheckCircle2, MessageCircle, MapPin
// } from "lucide-react"
// import { CancelOrderButton } from "@/components/orders/cancel-order-button"
// import { Button } from "@/components/ui/button"

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

//     // WhatsApp Support Logic
//     const whatsappNumber = "916909013764" // Replace with your actual WhatsApp number
//     const supportMessage = encodeURIComponent(`Hi Daciana Support, I have a query regarding my Order ID: ${id}. Current status is ${order.status}.`)
//     const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${supportMessage}`

//     const steps = [
//         { status: 'pending', label: 'Order Placed', desc: 'Received and awaiting processing.', icon: Clock },
//         { status: 'processing', label: 'Processing', desc: 'Items are being quality checked.', icon: Package },
//         { status: 'shipped', label: 'Shipped', desc: 'Handed over to delivery partner.', icon: Truck },
//         { status: 'delivered', label: 'Delivered', desc: 'Package arrived at destination.', icon: CheckCircle2 },
//     ]
//     const currentIndex = steps.findIndex(s => s.status === order.status?.toLowerCase())

//     const getPaymentStatusStyles = (status: string) => {
//         switch (status?.toLowerCase()) {
//             case 'paid': return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: <ShieldCheck className="w-3 h-3" />, label: 'Paid' }
//             case 'refunded': return { bg: 'bg-amber-50 text-amber-700 border-amber-100', icon: <AlertCircle className="w-3 h-3" />, label: 'Refunded' }
//             default: return { bg: 'bg-slate-100 text-slate-600 border-slate-200', icon: <Clock className="w-3 h-3" />, label: 'Unpaid' }
//         }
//     }

//     const payMeta = getPaymentStatusStyles(order.payment_status)

//     return (
//         <div className="container mx-auto px-4 py-12 max-w-5xl">
//             {/* TOP NAVIGATION / STATUS */}
//             <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
//                 <div>
//                     <div className="flex items-center gap-3 mb-2">
//                         <h1 className="text-4xl font-black tracking-tighter text-slate-900">Order Details</h1>
//                         <Badge className={`px-3 py-1 rounded-full uppercase font-black text-[10px] ${order.status === 'delivered' ? 'bg-emerald-500' :
//                                 order.status === 'cancelled' ? 'bg-red-500' : 'bg-blue-600'
//                             }`}>
//                             {order.status}
//                         </Badge>
//                     </div>
//                     <p className="text-slate-400 font-medium flex items-center gap-2 text-sm">
//                         <Calendar className="w-4 h-4" />
//                         Ordered on {new Date(order.created_at).toLocaleDateString('en-IN', { dateStyle: 'long' })}
//                     </p>
//                 </div>

//                 <div className="flex items-center gap-3">
//                     <CancelOrderButton orderId={id} currentStatus={order.status} />
//                     <Button asChild className="rounded-2xl bg-[#25D366] hover:bg-[#128C7E] text-white font-bold shadow-lg shadow-emerald-100 border-none">
//                         <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
//                             <MessageCircle className="w-4 h-4 mr-2" /> Help
//                         </a>
//                     </Button>
//                 </div>
//             </div>

//             <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
//                 {/* LEFT: TIMELINE & ITEMS (8 COLS) */}
//                 <div className="lg:col-span-8 space-y-10">

//                     {/* TRACKING CARD */}
//                     <div className="bg-white border-2 border-slate-50 rounded-[2.5rem] p-10 shadow-sm">
//                         <div className="flex justify-between items-center mb-10">
//                             <h2 className="font-black text-slate-900 uppercase tracking-widest text-xs">Live Tracking</h2>
//                             <span className="text-[10px] font-mono text-slate-300 uppercase">Ref: {id.slice(0, 8)}</span>
//                         </div>

//                         <div className="relative">
//                             {steps.map((step, idx) => {
//                                 const Icon = step.icon
//                                 const isCompleted = idx <= currentIndex
//                                 const isCurrent = idx === currentIndex
//                                 const isCancelled = order.status === 'cancelled'

//                                 if (isCancelled && idx > 0) return null

//                                 return (
//                                     <div key={step.status} className="relative flex gap-8 pb-12 last:pb-0">
//                                         {idx !== steps.length - 1 && !isCancelled && (
//                                             <div className={`absolute left-6 top-12 w-[3px] h-full rounded-full ${idx < currentIndex ? 'bg-slate-900' : 'bg-slate-50'
//                                                 }`} />
//                                         )}
//                                         <div className={`relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-700 ${isCompleted ? 'bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-200' : 'bg-white border-slate-100 text-slate-200'
//                                             } ${isCurrent && !isCancelled ? 'ring-8 ring-slate-50' : ''}`}>
//                                             <Icon className="w-6 h-6" />
//                                         </div>
//                                         <div className="pt-1">
//                                             <h3 className={`font-black uppercase text-sm tracking-tight ${isCompleted ? 'text-slate-900' : 'text-slate-200'}`}>
//                                                 {step.label}
//                                             </h3>
//                                             <p className="text-xs text-slate-400 font-medium mt-1">{step.desc}</p>
//                                         </div>
//                                     </div>
//                                 )
//                             })}
//                             {order.status === 'cancelled' && (
//                                 <div className="flex gap-8 items-start">
//                                     <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center border-2 border-red-100">
//                                         <XCircle className="w-6 h-6" />
//                                     </div>
//                                     <div className="pt-1">
//                                         <h3 className="font-black uppercase text-sm text-red-600">Order Cancelled</h3>
//                                         <p className="text-xs text-red-400 font-medium mt-1">Inventory has been updated.</p>
//                                     </div>
//                                 </div>
//                             )}
//                         </div>
//                     </div>

//                     {/* ITEMS CARD */}
//                     <div className="bg-white border-2 border-slate-50 rounded-[2.5rem] overflow-hidden shadow-sm">
//                         <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
//                             <h2 className="font-black text-slate-900 uppercase tracking-widest text-[10px]">Parcel Contents</h2>
//                             <Badge variant="outline" className="rounded-full font-black text-[10px]">{order.order_items?.length} Items</Badge>
//                         </div>
//                         <div className="divide-y divide-slate-50">
//                             {order.order_items.map((item: any) => (
//                                 <div key={item.id} className="p-8 flex items-center gap-6 hover:bg-slate-50/20 transition-all">
//                                     <div className="w-16 h-16 bg-slate-50 rounded-[1.25rem] flex items-center justify-center font-black text-slate-300 text-xs border border-slate-100">
//                                         {item.quantity}x
//                                     </div>
//                                     <div className="flex-grow">
//                                         <div className="flex justify-between items-center">
//                                             <h4 className="font-bold text-slate-900 uppercase tracking-tight text-sm">{item.product_name}</h4>
//                                             <span className="font-black text-slate-900">₹{Number(item.unit_price).toLocaleString('en-IN')}</span>
//                                         </div>
//                                         <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">{item.variant_title || 'Default'}</p>
//                                     </div>
//                                 </div>
//                             ))}
//                         </div>
//                     </div>
//                 </div>

//                 {/* RIGHT: ADDRESS & SUMMARY (4 COLS) */}
//                 <div className="lg:col-span-4 space-y-8">
//                     {/* SHIPPING */}
//                     <div className="bg-white border-2 border-slate-50 rounded-[2.5rem] p-8 shadow-sm">
//                         <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
//                             <MapPin className="w-3 h-3" /> Delivery Point
//                         </h3>
//                         <div className="space-y-1">
//                             <p className="font-black text-slate-900 text-xl tracking-tighter">{address?.full_name}</p>
//                             <p className="text-slate-500 font-medium text-sm leading-relaxed pt-2">{address?.street}</p>
//                             <p className="font-black text-slate-900 text-sm mt-2">{address?.pincode}</p>
//                             <div className="pt-6 mt-6 border-t border-slate-50 flex items-center justify-between">
//                                 <span className="text-[10px] font-black uppercase text-slate-300">Contact</span>
//                                 <span className="text-slate-900 font-bold text-sm">{address?.phone}</span>
//                             </div>
//                         </div>
//                     </div>

//                     {/* SUMMARY */}
//                     <div className="bg-slate-900 text-white rounded-[3rem] p-10 shadow-2xl shadow-blue-100">
//                         <div className="flex justify-between items-center mb-10">
//                             <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Billing</h3>
//                             <Badge variant="outline" className={`h-5 text-[8px] border-white/10 uppercase text-white/50 ${payMeta.bg}`}>
//                                 {payMeta.label}
//                             </Badge>
//                         </div>
//                         <div className="space-y-5 text-sm">
//                             <div className="flex justify-between text-slate-400 font-medium">
//                                 <span>Cart Total</span>
//                                 <span>₹{(order.total - order.shipping_price).toLocaleString('en-IN')}</span>
//                             </div>
//                             <div className="flex justify-between text-slate-400 font-medium">
//                                 <span className="flex flex-col">
//                                     Shipping Fee
//                                     <span className="text-[9px] text-blue-400 font-black uppercase tracking-widest">{order.shipping_label}</span>
//                                 </span>
//                                 <span>₹{order.shipping_price.toLocaleString('en-IN')}</span>
//                             </div>
//                             <Separator className="bg-white/10 my-6" />
//                             <div className="flex justify-between items-end">
//                                 <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest pb-1">Total Paid</span>
//                                 <span className="text-4xl font-black italic tracking-tighter">₹{order.total.toLocaleString('en-IN')}</span>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     )
// }


import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
    Package, Calendar, ShieldCheck, Clock, AlertCircle, XCircle,
    Truck, CheckCircle2, MessageCircle, MapPin, ArrowLeft, Tag
} from "lucide-react"
import { CancelOrderButton } from "@/components/orders/cancel-order-button"
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
    const whatsappNumber = "916909013764"
    const supportMessage = encodeURIComponent(`Hi Daciana Support, I have a query regarding my Order ID: ${id}.`)
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${supportMessage}`

    const steps = [
        { status: 'pending', label: 'Placed', icon: Clock },
        { status: 'processing', label: 'Processing', icon: Package },
        { status: 'shipped', label: 'In Transit', icon: Truck },
        { status: 'delivered', label: 'Delivered', icon: CheckCircle2 },
    ]
    const currentIndex = steps.findIndex(s => s.status === order.status?.toLowerCase())

    return (
        <div className="bg-white min-h-screen text-slate-900 selection:bg-black selection:text-white">
            <div className="max-w-5xl mx-auto px-6 py-12 lg:py-20">

                {/* HEADER SECTION */}
                <div className="flex flex-col space-y-8 mb-16 border-b border-slate-100 pb-12">
                    <Link href="/profile/orders" className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-black transition-colors w-fit">
                        <ArrowLeft className="w-3 h-3" /> Back to Orders
                    </Link>

                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-4 mb-2">
                                <h1 className="text-3xl font-medium tracking-tight">Order #{id.slice(0, 8).toUpperCase()}</h1>
                                <span className={`text-[10px] px-3 py-1 font-bold uppercase tracking-widest border ${order.status === 'delivered' ? 'border-emerald-500 text-emerald-600' :
                                    order.status === 'cancelled' ? 'border-red-200 text-red-400' : 'border-black text-black'
                                    }`}>
                                    {order.status}
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-widest flex items-center gap-2">
                                <Calendar className="w-3 h-3" />
                                {new Date(order.created_at).toLocaleDateString('en-IN', { dateStyle: 'long' })}
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <CancelOrderButton orderId={id} currentStatus={order.status} />
                            <Button asChild variant="outline" className="rounded-none border-black hover:bg-black hover:text-white text-[10px] font-bold uppercase tracking-widest h-10 px-6">
                                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                                    <MessageCircle className="w-3.5 h-3.5 mr-2" /> Support
                                </a>
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">

                    {/* LEFT COLUMN: TRACKING & ITEMS */}
                    <div className="lg:col-span-7 space-y-16">

                        {/* MINIMAL TIMELINE */}
                        <div className="space-y-8">
                            <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                                <Truck className="w-3 h-3" /> Shipment Progress
                            </h2>
                            <div className="flex justify-between items-start relative max-w-lg">
                                {steps.map((step, idx) => {
                                    const Icon = step.icon
                                    const isCompleted = idx <= currentIndex
                                    const isCancelled = order.status === 'cancelled'

                                    if (isCancelled && idx > 0) return null

                                    return (
                                        <div key={step.status} className="flex flex-col items-center gap-3 z-10 bg-white group">
                                            <div className={`w-10 h-10 flex items-center justify-center transition-all duration-500 border rounded-full ${isCompleted ? 'bg-black border-black text-white' : 'bg-white border-slate-100 text-slate-200'
                                                }`}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <span className={`text-[9px] font-bold uppercase tracking-tighter ${isCompleted ? 'text-black' : 'text-slate-300'}`}>
                                                {step.label}
                                            </span>
                                        </div>
                                    )
                                })}
                                {/* Connector Line */}
                                <div className="absolute top-5 left-0 w-full h-[1px] bg-slate-100 -z-0" />
                            </div>
                        </div>

                        {/* ITEMS LIST */}
                        <div className="space-y-8">
                            <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                                <Package className="w-3 h-3" /> Order Contents
                            </h2>
                            <div className="space-y-6">
                                {order.order_items.map((item: any) => (
                                    <div key={item.id} className="flex items-center gap-6 group">
                                        <div className="w-20 h-28 bg-slate-50 relative flex-shrink-0 overflow-hidden">
                                            {/* If you have item images, use <Image /> here */}
                                            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-300 uppercase italic tracking-tighter">
                                                {item.quantity}x Units
                                            </div>
                                        </div>
                                        <div className="flex-grow">
                                            <div className="flex justify-between items-start">
                                                <h4 className="text-[12px] font-medium uppercase tracking-tight leading-snug max-w-[200px]">{item.product_name}</h4>
                                                <span className="text-[12px] font-light italic">₹{Number(item.unit_price).toLocaleString('en-IN')}</span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">
                                                {item.variant_title || 'Signature Edition'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: LOGISTICS & BILLING */}
                    <div className="lg:col-span-5 space-y-12">

                        {/* DELIVERY DETAILS */}
                        <div className="space-y-6 border border-slate-100 p-8 rounded-sm bg-[#FCFCFC]">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                <MapPin className="w-3 h-3" /> Shipping To
                            </h3>
                            <div className="space-y-1">
                                <p className="text-sm font-bold uppercase tracking-tight">{address?.full_name}</p>
                                <p className="text-[12px] text-slate-500 leading-relaxed font-light italic">{address?.street}</p>
                                <p className="text-[12px] font-medium text-slate-900">{address?.pincode}</p>
                            </div>
                            <div className="pt-4 border-t border-slate-200/50">
                                <p className="text-[10px] uppercase text-slate-400 tracking-widest font-bold">Contact</p>
                                <p className="text-[11px] font-medium">{address?.phone}</p>
                            </div>
                        </div>

                        {/* FINANCIAL SUMMARY */}
                        <div className="space-y-6 border border-black p-8 bg-white">
                            <h3 className="text-[10px] font-bold text-black uppercase tracking-[0.3em] flex items-center justify-between">
                                Summary
                                <span className={`text-[8px] tracking-[0.1em] border px-2 py-0.5 ${order.payment_status === 'paid' ? 'border-emerald-200 text-emerald-600' : 'border-slate-200 text-slate-400'
                                    }`}>
                                    {order.payment_status?.toUpperCase()}
                                </span>
                            </h3>

                            <div className="space-y-4 text-[11px] uppercase tracking-widest">
                                <div className="flex justify-between text-slate-400">
                                    <span>Subtotal</span>
                                    <span className="text-black font-medium">₹{(order.total - order.shipping_price).toLocaleString('en-IN')}</span>
                                </div>
                                <div className="flex justify-between text-slate-400">
                                    <span className="flex items-center gap-1">Logistics <span className="text-[8px] italic text-slate-300 lowercase">({order.shipping_label})</span></span>
                                    <span className="text-black font-medium">₹{order.shipping_price.toLocaleString('en-IN')}</span>
                                </div>

                                <Separator className="bg-slate-100" />

                                <div className="flex justify-between items-baseline pt-4">
                                    <span className="text-[10px] font-bold text-black">Total Amount</span>
                                    <span className="text-3xl font-light tracking-tighter italic">₹{order.total.toLocaleString('en-IN')}</span>
                                </div>
                            </div>
                        </div>

                        {/* RETURN/POLICY NOTE */}
                        <div className="p-4 bg-slate-50 rounded-sm">
                            <p className="text-[9px] text-slate-400 leading-relaxed uppercase tracking-widest text-center">
                                Items can be returned within 7 days of delivery. <br /> Visit our <Link href="/policy" className="text-black border-b border-black/20">Returns Policy</Link> for details.
                            </p>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    )
}