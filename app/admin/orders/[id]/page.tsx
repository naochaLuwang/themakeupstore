

"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Printer, ArrowLeft, Globe, ShieldCheck, CheckCircle2, Clock, AlertCircle, Loader2, Truck, Ticket } from "lucide-react"
import Link from "next/link"
import { QRCodeSVG } from "qrcode.react"

export default function OrderInvoicePage() {
    const { id } = useParams()
    const supabase = createClient()
    const [order, setOrder] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [isThermal, setIsThermal] = useState(false)

    useEffect(() => {
        async function fetchOrder() {
            const { data } = await supabase
                .from('orders')
                .select('*, order_items(*)')
                .eq('id', id)
                .single()
            setOrder(data)
            setLoading(false)
        }
        fetchOrder()
    }, [id])

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
    if (!order) return <div className="p-10 text-center text-slate-500 font-bold uppercase tracking-widest">Order not found</div>

    // --- ENHANCED CALCULATION LOGIC ---

    // 1. Total Value at original MRP
    const subtotalMRP = order.order_items.reduce((acc: number, item: any) => {
        return acc + (Number(item.mrp || item.unit_price) * item.quantity);
    }, 0);

    // 2. Total Value at selling price (Product price after individual discounts)
    const subtotalActual = order.order_items.reduce((acc: number, item: any) => {
        return acc + (Number(item.unit_price) * item.quantity);
    }, 0);

    // 3. Store-level savings (MRP vs Selling Price)
    const productSavings = subtotalMRP - subtotalActual;

    // 4. Promo Code discount
    const promoDiscount = Number(order.promo_discount_amount) || 0;

    // 5. Grand Total Savings (Visible "Win" for customer)
    const totalSavings = productSavings + promoDiscount;

    const getStatusStyles = (status: string) => {
        const s = status?.toLowerCase()
        if (s === 'paid' || s === 'completed') return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', icon: <CheckCircle2 className="w-3 h-3" /> }
        if (s === 'pending') return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', icon: <Clock className="w-3 h-3" /> }
        return { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', icon: <AlertCircle className="w-3 h-3" /> }
    }

    const statusStyle = getStatusStyles(order.payment_status)

    return (
        <div className={`min-h-screen py-10 px-4 transition-colors duration-500 ${isThermal ? 'bg-zinc-200' : 'bg-white'}`}>
            <style jsx global>{`
                @media print {
                    header, footer, nav { display: none !important; }
                    @page { 
                        size: ${isThermal ? '58mm auto' : 'A4'}; 
                        margin: 0; 
                    }
                    body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .no-print { display: none !important; }
                    #printable-invoice {
                        border: none !important;
                        box-shadow: none !important;
                        position: absolute;
                        top: 0; left: 0;
                        width: ${isThermal ? '80mm' : '100%'} !important;
                        padding: ${isThermal ? '5mm' : '15mm'} !important;
                        border-radius: 0 !important;
                    }
                }
            `}</style>

            <div className="max-w-4xl mx-auto flex justify-between items-center mb-8 no-print">
                <Button variant="ghost" asChild className="rounded-full font-bold">
                    <Link href={`/admin/orders`}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Link>
                </Button>

                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={() => setIsThermal(!isThermal)}
                        className={`rounded-full px-6 font-bold transition-all ${isThermal ? 'bg-slate-900 text-white hover:bg-black' : 'text-slate-500'}`}
                    >
                        <Ticket className="w-4 h-4 mr-2" /> {isThermal ? 'A4 Format' : 'POS Mode'}
                    </Button>
                    <Button onClick={() => window.print()} className="rounded-full shadow-lg bg-slate-900 hover:bg-slate-800 transition-all font-bold text-white">
                        <Printer className="w-4 h-4 mr-2" /> Print {isThermal ? 'Receipt' : 'Invoice'}
                    </Button>
                </div>
            </div>

            {/* <div
                id="printable-invoice"
                className={`mx-auto bg-white transition-all duration-500 overflow-hidden ${isThermal
                    ? 'w-[80mm] p-6 rounded-none border-x border-dashed border-zinc-300'
                    : 'max-w-3xl p-12 rounded-[2.5rem] border-2 border-slate-50 shadow-sm relative'
                    }`}
            >
               
                <div className={`${isThermal ? 'text-center mb-6' : 'flex justify-between items-start mb-8'} relative z-10`}>
                    <div>
                        <div className={`flex flex-col ${isThermal ? 'items-center' : ''}`}>
                            <span className={`${isThermal ? 'text-xl font-daciana' : 'text-3xl font-daciana'} font-black leading-none text-slate-900 uppercase`}>THE MAKEUP STORE</span>
                            <span className="text-[10px] font-light tracking-[0.2em] uppercase text-slate-400">WANGKHEI</span>
                        </div>
                        <div className={`text-[9px] text-slate-500 font-medium mt-3 leading-tight ${isThermal ? 'text-center' : ''}`}>
                            <p>Wangkhei Angom Leikai</p>
                            <p>Manipur 795005</p>
                        </div>
                    </div>
                    {!isThermal && (
                        <div className="text-right">
                            <h1 className="text-6xl font-black uppercase text-slate-100 leading-none italic select-none">Invoice</h1>
                            <p className="text-slate-400 font-mono text-[10px] mt-2 uppercase tracking-tighter">Ref: {order.id.slice(0, 8).toUpperCase()}</p>
                        </div>
                    )}
                </div>

                {!isThermal && (
                    <div className={`mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} text-[10px] font-black uppercase tracking-widest`}>
                        {statusStyle.icon} Status: {order.payment_status}
                    </div>
                )}

                
                <div className={`border-t border-b border-dashed border-slate-200 py-4 mb-6 ${isThermal ? 'space-y-3' : 'grid grid-cols-2 gap-10'}`}>
                    <div>
                        <h3 className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Customer</h3>
                        <p className="font-black text-sm text-slate-900 uppercase">{order.shipping_address?.full_name}</p>
                        <p className="text-[10px] text-slate-500">{order.shipping_address?.phone}</p>
                    </div>
                    <div>
                        <h3 className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Shipping</h3>
                        <p className="text-[9px] text-slate-600 font-medium leading-relaxed">
                            {order.shipping_address?.street}, PIN: {order.shipping_address?.pincode}
                        </p>
                        <p className="text-[8px] font-black text-slate-900 uppercase mt-1 flex items-center gap-1">
                            <Truck className="w-2.5 h-2.5" /> {order.shipping_label || "Standard"}
                        </p>
                    </div>
                </div>

          
                <div className="space-y-4 mb-8">
                    {!isThermal && (
                        <div className="grid grid-cols-12 gap-2 text-[8px] font-black text-slate-300 uppercase tracking-widest pb-2 border-b">
                            <div className="col-span-5">Description</div>
                            <div className="col-span-2 text-right">MRP</div>
                            <div className="col-span-2 text-center">Disc.</div>
                            <div className="col-span-1 text-center">Qty</div>
                            <div className="col-span-2 text-right">Amount</div>
                        </div>
                    )}

                    {order.order_items.map((item: any) => {
                        const mrp = Number(item.mrp || item.unit_price);
                        const rate = Number(item.unit_price);
                        const discPercent = mrp > rate ? Math.round(((mrp - rate) / mrp) * 100) : 0;

                        return (
                            <div key={item.id} className={`${isThermal ? 'space-y-1 pb-2 border-b border-dotted border-slate-100' : 'grid grid-cols-12 gap-2 items-center text-[11px]'}`}>
                                <div className={isThermal ? '' : 'col-span-5'}>
                                    <p className="font-black text-slate-900 uppercase leading-none">{item.product_name}</p>
                                    <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">{item.variant_title}</p>
                                </div>
                                {!isThermal && <div className="col-span-2 text-right text-slate-400 italic">₹{mrp.toLocaleString()}</div>}
                                {!isThermal && (
                                    <div className="col-span-2 text-center">
                                        {discPercent > 0 ? (
                                            <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 uppercase">
                                                {discPercent}% OFF
                                            </span>
                                        ) : <span className="text-slate-200">—</span>}
                                    </div>
                                )}
                                <div className={`${isThermal ? 'text-[9px] font-bold text-slate-500' : 'col-span-1 text-center font-black'}`}>
                                    {isThermal ? `${item.quantity} x ₹${rate} ` : `x${item.quantity}`}
                                </div>
                                <div className={`${isThermal ? 'block font-black text-slate-900' : 'col-span-2 text-right font-black'}`}>
                                    ₹{(rate * item.quantity).toLocaleString()}
                                </div>
                            </div>
                        )
                    })}
                </div>

            
                <div className={`pt-4 border-t-2 border-slate-900 border-dashed ${isThermal ? 'space-y-1' : 'flex flex-col items-end space-y-2'}`}>

         
                    <div className={`${isThermal ? 'flex justify-between' : 'w-48 flex justify-between'} text-[9px] font-bold text-slate-400 uppercase`}>
                        <span>Subtotal (MRP)</span>
                        <span className="text-slate-900 font-black">₹{subtotalMRP.toLocaleString()}</span>
                    </div>


                    {productSavings > 0 && (
                        <div className={`${isThermal ? 'flex justify-between' : 'w-48 flex justify-between'} text-[9px] font-medium text-slate-400 uppercase italic`}>
                            <span>Item Discounts</span>
                            <span>-₹{productSavings.toLocaleString()}</span>
                        </div>
                    )}

                    <div className={`${isThermal ? 'flex justify-between border-y border-dotted border-slate-200 py-1' : 'w-48 flex justify-between border-y border-slate-100 py-1'} text-[9px] font-black text-slate-900 uppercase`}>
                        <span>Subtotal</span>
                        <span>₹{subtotalActual.toLocaleString()}</span>
                    </div>

                 
                    <div className={`${isThermal ? 'flex justify-between' : 'w-48 flex justify-between'} text-[9px] font-bold text-slate-400 uppercase`}>
                        <span>Shipping Cost</span>
                        <span className="text-slate-900 font-black">₹{order.shipping_price || 0}</span>
                    </div>

                  
                    {promoDiscount > 0 && (
                        <div className={`${isThermal ? 'flex justify-between' : 'w-48 flex justify-between'} text-[9px] font-black text-emerald-600 uppercase`}>
                            <span className="flex items-center gap-1">
                                <Ticket className="w-2.5 h-2.5" /> {order.promo_code || 'PROMO'}
                            </span>
                            <span>-₹{promoDiscount.toLocaleString()}</span>
                        </div>
                    )}

             
                    {totalSavings > 0 && (
                        <div className={`${isThermal ? 'flex justify-between' : 'w-48 flex justify-between'} text-[9px] font-black text-emerald-600 uppercase bg-emerald-50 px-2 py-1 rounded border border-emerald-100`}>
                            <span>Total Savings</span>
                            <span>-₹{totalSavings.toLocaleString()}</span>
                        </div>
                    )}

                
                    <div className={`${isThermal ? 'flex justify-between pt-2 border-t border-slate-900 border-dotted' : 'w-full flex justify-between items-end border-t-4 border-slate-900 pt-4 mt-2'}`}>
                        <div className={isThermal ? '' : 'text-left'}>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Net Payable</p>
                            <p className="text-[9px] font-black text-slate-900 uppercase italic leading-none">{order.payment_method}</p>
                        </div>
                        <p className={`${isThermal ? 'text-xl' : 'text-5xl'} font-black italic tracking-tighter text-slate-900`}>
                            ₹{Number(order.total).toLocaleString()}
                        </p>
                    </div>
                </div>

  
                <div className={`mt-8 flex flex-col items-center gap-4 ${isThermal ? 'border-t border-dotted pt-4' : 'pt-8 border-t border-slate-50'}`}>
                    <QRCodeSVG value={`https://themakeupstorewangkhei.com/track/${id}`} size={isThermal ? 60 : 80} />
                    <div className="text-center">
                        <p className="text-[8px] font-black text-slate-900 uppercase tracking-widest leading-none">Live Tracking Available</p>
                        {!isThermal && <p className="text-[7px] text-slate-400 mt-2 uppercase font-bold">Authorized computer generated invoice</p>}
                    </div>
                </div>

                {!isThermal && (
                    <div className="mt-8 flex justify-between items-center text-[7px] font-black text-slate-300 uppercase tracking-[0.3em] pt-4 border-t border-slate-50">
                        <div className="flex items-center gap-2"><ShieldCheck className="w-3 h-3" /> Secure Record</div>
                        <div className="flex items-center gap-2"><Globe className="w-3 h-3" /> makeupstorewangkhei.com</div>
                    </div>
                )}
            </div> */}

            <div
                id="printable-invoice"
                className={`mx-auto bg-white transition-all duration-500 overflow-hidden ${isThermal
                    ? 'w-[58mm] p-2 rounded-none border-t border-black' // Optimized for 2-inch
                    : 'max-w-3xl p-12 rounded-[2.5rem] border-2 border-slate-50 shadow-sm relative'
                    }`}
            >
                {/* BRANDING */}
                <div className={`${isThermal ? 'text-center mb-4' : 'flex justify-between items-start mb-8'} relative z-10`}>
                    <div>
                        <div className={`flex flex-col ${isThermal ? 'items-center' : ''}`}>
                            <span className={`${isThermal ? 'text-[14px] font-daciana' : 'text-3xl font-daciana'} font-black leading-none text-slate-900 uppercase`}>
                                THE MAKEUP STORE
                            </span>
                            <span className="text-[10px] font-light tracking-[0.2em] uppercase text-slate-400">WANGKHEI</span>
                        </div>
                        <div className={`text-[9px] text-slate-500 font-medium mt-2 leading-tight ${isThermal ? 'text-center' : ''}`}>
                            <p>Wangkhei Angom Leikai</p>
                            <p>Manipur 795005</p>
                            {isThermal && <p className="mt-1 font-bold">PH: [Your Phone]</p>}
                        </div>
                    </div>
                    {!isThermal && (
                        <div className="text-right">
                            <h1 className="text-6xl font-black uppercase text-slate-100 leading-none italic select-none">Invoice</h1>
                            <p className="text-slate-400 font-mono text-[10px] mt-2 uppercase tracking-tighter">Ref: {order.id.slice(0, 8).toUpperCase()}</p>
                        </div>
                    )}
                </div>

                {!isThermal && (
                    <div className={`mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} text-[10px] font-black uppercase tracking-widest`}>
                        {statusStyle.icon} Status: {order.payment_status}
                    </div>
                )}

                {/* INFO DIVIDER */}
                {/* INFO DIVIDER */}
                <div className={`border-t border-b border-dashed border-slate-200 py-3 mb-4 ${isThermal ? 'space-y-1 text-[9px]' : 'grid grid-cols-2 gap-10 py-4 mb-6'}`}>
                    <div className={isThermal ? 'flex flex-col' : ''}>
                        <div className={isThermal ? 'flex justify-between w-full' : ''}>
                            <h3 className={isThermal ? 'font-bold uppercase' : 'text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1'}>
                                {isThermal ? 'Order:' : 'Customer'}
                            </h3>
                            <p className={isThermal ? 'font-mono' : 'font-black text-sm text-slate-900 uppercase'}>
                                {isThermal ? `#${order.id.slice(0, 8).toUpperCase()}` : order.shipping_address?.full_name}
                            </p>
                        </div>

                        {/* Added Phone Number for POS */}
                        {isThermal && (
                            <div className="flex justify-between border-t border-dotted border-slate-100 pt-1 mt-1">
                                <span className="font-bold uppercase">Customer:</span>
                                <span className="truncate ml-2">{order.shipping_address?.full_name}</span>
                            </div>
                        )}
                        {isThermal && (
                            <div className="flex justify-between">
                                <span className="font-bold uppercase">Phone:</span>
                                <span className="ml-2">{order.shipping_address?.phone || 'N/A'}</span>
                            </div>
                        )}
                    </div>

                    {!isThermal && (
                        <div>
                            <h3 className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Shipping</h3>
                            <p className="text-[9px] text-slate-600 font-medium leading-relaxed">
                                {order.shipping_address?.street}, PIN: {order.shipping_address?.pincode}
                            </p>
                            <p className="text-[8px] font-black text-slate-900 uppercase mt-1 flex items-center gap-1">
                                <Truck className="w-2.5 h-2.5" /> {order.shipping_label || "Standard"}
                            </p>
                        </div>
                    )}
                </div>

                {/* ITEMS LIST */}
                <div className="space-y-4 mb-6">
                    {!isThermal && (
                        <div className="grid grid-cols-12 gap-2 text-[8px] font-black text-slate-300 uppercase tracking-widest pb-2 border-b">
                            <div className="col-span-5">Description</div>
                            <div className="col-span-2 text-right">MRP</div>
                            <div className="col-span-2 text-center">Disc.</div>
                            <div className="col-span-1 text-center">Qty</div>
                            <div className="col-span-2 text-right">Amount</div>
                        </div>
                    )}

                    {order.order_items.map((item: any) => {
                        const mrp = Number(item.mrp || item.unit_price);
                        const rate = Number(item.unit_price);
                        const discPercent = mrp > rate ? Math.round(((mrp - rate) / mrp) * 100) : 0;

                        return (
                            <div key={item.id} className={`${isThermal ? 'pb-2 border-b border-dotted border-slate-100' : 'grid grid-cols-12 gap-2 items-center text-[11px]'}`}>
                                <div className={isThermal ? 'w-full mb-1' : 'col-span-5'}>
                                    <p className={`font-black text-slate-900 uppercase leading-none ${isThermal ? 'text-[10px]' : ''}`}>{item.product_name}</p>
                                    <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">{item.variant_title}</p>
                                </div>
                                {!isThermal && <div className="col-span-2 text-right text-slate-400 italic">₹{mrp.toLocaleString()}</div>}
                                {!isThermal && (
                                    <div className="col-span-2 text-center">
                                        {discPercent > 0 ? (
                                            <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 uppercase">
                                                {discPercent}% OFF
                                            </span>
                                        ) : <span className="text-slate-200">—</span>}
                                    </div>
                                )}
                                <div className={`${isThermal ? 'flex justify-between items-center text-[9px]' : 'col-span-1 text-center font-black'}`}>
                                    <span className={isThermal ? 'text-slate-500 font-bold' : ''}>
                                        {isThermal ? `${item.quantity} x ₹${rate.toLocaleString()}` : `x${item.quantity}`}
                                    </span>
                                    <span className={isThermal ? 'font-black text-slate-900' : 'hidden'}>
                                        {isThermal && `₹${(rate * item.quantity).toLocaleString()}`}
                                    </span>
                                </div>
                                {!isThermal && (
                                    <div className="col-span-2 text-right font-black">
                                        ₹{(rate * item.quantity).toLocaleString()}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                {/* TOTALS SECTION */}
                <div className={`pt-4 border-t-2 border-slate-900 border-dashed ${isThermal ? 'space-y-1' : 'flex flex-col items-end space-y-2'}`}>

                    {/* MRP Subtotal */}
                    <div className={`${isThermal ? 'flex justify-between' : 'w-48 flex justify-between'} text-[9px] font-bold text-slate-400 uppercase`}>
                        <span>{isThermal ? 'Items Total' : 'Subtotal (MRP)'}</span>
                        <span className="text-slate-900 font-black">₹{subtotalMRP.toLocaleString()}</span>
                    </div>

                    {/* Item Discounts */}
                    {productSavings > 0 && (
                        <div className={`${isThermal ? 'flex justify-between' : 'w-48 flex justify-between'} text-[9px] font-medium text-slate-400 uppercase italic`}>
                            <span>{isThermal ? 'Savings' : 'Item Discounts'}</span>
                            <span>-₹{productSavings.toLocaleString()}</span>
                        </div>
                    )}

                    {/* ACTUAL Sub-Total */}
                    <div className={`${isThermal ? 'flex justify-between border-y border-dotted border-slate-200 py-1' : 'w-48 flex justify-between border-y border-slate-100 py-1'} text-[9px] font-black text-slate-900 uppercase`}>
                        <span>Subtotal</span>
                        <span>₹{subtotalActual.toLocaleString()}</span>
                    </div>

                    {/* Shipping */}
                    <div className={`${isThermal ? 'flex justify-between' : 'w-48 flex justify-between'} text-[9px] font-bold text-slate-400 uppercase`}>
                        <span>Shipping</span>
                        <span className="text-slate-900 font-black">₹{order.shipping_price || 0}</span>
                    </div>

                    {/* Promo Code */}
                    {promoDiscount > 0 && (
                        <div className={`${isThermal ? 'flex justify-between' : 'w-48 flex justify-between'} text-[9px] font-black text-emerald-600 uppercase`}>
                            <span className="flex items-center gap-1">
                                <Ticket className="w-2.5 h-2.5" /> {order.promo_code || 'PROMO'}
                            </span>
                            <span>-₹{promoDiscount.toLocaleString()}</span>
                        </div>
                    )}

                    {/* Net Payable */}
                    <div className={`${isThermal ? 'flex justify-between pt-2 border-t border-slate-900 border-dotted' : 'w-full flex justify-between items-end border-t-4 border-slate-900 pt-4 mt-2'}`}>
                        <div className={isThermal ? '' : 'text-left'}>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Net Payable</p>
                            <p className="text-[9px] font-black text-slate-900 uppercase italic leading-none">{order.payment_method}</p>
                        </div>
                        <p className={`${isThermal ? 'text-[18px]' : 'text-5xl'} font-black italic tracking-tighter text-slate-900`}>
                            ₹{Number(order.total).toLocaleString()}
                        </p>
                    </div>
                </div>

                {/* QR & FOOTER */}
                <div className={`mt-6 flex flex-col items-center gap-3 ${isThermal ? 'border-t border-dotted pt-4' : 'mt-8 pt-8 border-t border-slate-50 gap-4'}`}>
                    <QRCodeSVG value={`https://themakeupstorewangkhei.com/track/${id}`} size={isThermal ? 50 : 80} />
                    <div className="text-center">
                        <p className="text-[8px] font-black text-slate-900 uppercase tracking-widest leading-none">Live Tracking Available</p>
                        {!isThermal && <p className="text-[7px] text-slate-400 mt-2 uppercase font-bold">Authorized computer generated invoice</p>}
                    </div>
                </div>

                {!isThermal && (
                    <div className="mt-8 flex justify-between items-center text-[7px] font-black text-slate-300 uppercase tracking-[0.3em] pt-4 border-t border-slate-50">
                        <div className="flex items-center gap-2"><ShieldCheck className="w-3 h-3" /> Secure Record</div>
                        <div className="flex items-center gap-2"><Globe className="w-3 h-3" /> makeupstorewangkhei.com</div>
                    </div>
                )}
            </div>
        </div>
    )
}