"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { QRCodeSVG } from "qrcode.react"
import { Printer, X, ShieldCheck, Truck, PackageCheck } from "lucide-react"
import { format } from "date-fns"
import Barcode from "react-barcode"

export default function OrderLabelPage() {
    const params = useParams()
    const id = params.id as string
    const supabase = createClient()
    const [order, setOrder] = useState<any>(null)
    const [loading, setLoading] = useState(true)

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

    if (loading) return <div className="flex h-screen items-center justify-center">Loading label...</div>
    if (!order) return <div className="p-10 text-center text-red-500 font-bold">Order not found</div>

    const trackingUrl = `https://themakeupstorewangkhei.com/track/${id}`

    const printLabel = () => {
        window.print()
    }

    const closeLabel = () => {
        window.close()
    }

    return (
        <div className="min-h-screen bg-white">
            <style jsx global>{`
                @media print {
                    @page { size: 4in 6in; margin: 0; padding: 0; }
                    body { margin: 0; padding: 0; background: white !important; }
                    .no-print { display: none !important; }
                    #label {
                        width: 4in;
                        height: 6in;
                        padding: 0.15in 0.2in;
                        box-sizing: border-box;
                        border: none !important;
                        box-shadow: none !important;
                        background: white !important;
                        color: black !important;
                    }
                    #label * { color: black !important; background: transparent !important; }
                    #label img, #label svg { max-width: 100% !important; }
                }
                @media screen {
                    #label { width: 4in; height: 6in; border: 1px dashed #ccc; background: white; }
                }
            `}</style>

            {/* Screen Controls */}
            <div className="fixed top-4 right-4 z-50 no-print flex gap-2">
                <button onClick={printLabel} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg hover:bg-black transition-colors">
                    <Printer className="w-4 h-4" /> Print Label
                </button>
                <button onClick={closeLabel} className="bg-white text-slate-600 px-4 py-2 rounded-lg font-bold text-sm border border-slate-300 flex items-center gap-2 shadow-lg hover:bg-slate-50 transition-colors">
                    <X className="w-4 h-4" /> Close
                </button>
            </div>

            {/* 4" x 6" Thermal Label */}
            <div id="label" className="flex flex-col">
                {/* TOP: Store Branding + Return Address */}
                <div className="flex items-start justify-between border-b border-solid border-black pb-3 mb-3">
                    <div>
                        <div className="font-daciana text-[16px] font-black leading-none uppercase tracking-tight">THE MAKEUP STORE</div>
                        <div className="text-[8px] font-light uppercase tracking-[0.2em]">WANGKHEI</div>
                        <div className="text-[7px] mt-1 leading-tight">
                            <p>Wangkhei Angom Leikai</p>
                            <p>Manipur 795005</p>
                        </div>
                    </div>
                    <div className="text-right text-[7px] leading-tight">
                        <p className="font-bold">FROM:</p>
                        <p>THE MAKEUP STORE</p>
                        <p>Wangkhei Angom Leikai</p>
                        <p>Imphal, Manipur 795005</p>
                        <p>+91-XXXXXXXXXX</p>
                    </div>
                </div>

                {/* ORDER REF + BARCODE/QR */}
                <div className="flex items-center justify-between border-b border-solid border-black pb-3 mb-3">
                    <div className="flex flex-col items-start">
                        <div className="text-[7px] font-bold uppercase tracking-wider text-slate-500">ORDER REF</div>
                        <div className="font-mono text-[14px] font-black tracking-wider">{Array.isArray(id) ? id[0].slice(0, 8) : (id || '').slice(0, 8).toUpperCase()}</div>
                        <div className="text-[7px] font-mono mt-1">{format(new Date(order.created_at), 'dd MMM yyyy, HH:mm')}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <Barcode
                            value={id.slice(0, 12).toUpperCase()}
                            format="CODE128"
                            width={1.5}
                            height={40}
                            displayValue={false}
                            fontSize={0}
                        />
                        <QRCodeSVG value={trackingUrl} size={60} />
                        <div className="text-[6px] font-mono text-center">Scan to Track</div>
                    </div>
                </div>

                {/* ORDER TYPE */}
                <div className="flex items-center justify-between border-b border-solid border-black pb-3 mb-3">
                    <div className="flex items-center gap-2">
                        {order.order_type === "delivery" ? (
                            <Truck className="w-5 h-5" />
                        ) : (
                            <PackageCheck className="w-5 h-5" />
                        )}
                        <span className="text-[9px] font-black uppercase tracking-wider">
                            {order.order_type.toUpperCase()}
                        </span>
                    </div>
                    <span className="text-[7px] font-bold">Status: {order.status.toUpperCase()}</span>
                </div>

                {/* CUSTOMER ADDRESS (Large for courier visibility) */}
                <div className="flex flex-col border-b border-solid border-black pb-3 mb-3">
                    <div className="text-[7px] font-bold uppercase tracking-wider text-slate-500 mb-1">SHIP TO:</div>
                    <div className="text-[11px] font-black leading-snug">
                        {order.shipping_address?.full_name}
                    </div>
                    <div className="text-[9px] font-medium mt-0.5">
                        {order.shipping_address?.phone}
                    </div>
                    <div className="text-[8px] mt-1 leading-relaxed">
                        {order.shipping_address?.street}
                        {order.shipping_address?.landmark && `, ${order.shipping_address.landmark}`}
                        <br />
                        {order.shipping_address?.area_name}
                        {order.shipping_address?.pincode && ` - ${order.shipping_address.pincode}`}
                    </div>
                </div>

                {/* ITEMS TABLE */}
                <div className="flex-1 overflow-hidden">
                    <div className="text-[7px] font-bold uppercase tracking-wider text-slate-500 mb-1">CONTENTS ({order.order_items?.length || 0} ITEM{order.order_items?.length !== 1 ? 'S' : ''})</div>
                    <table className="w-full text-[7px] border-collapse">
                        <thead>
                            <tr className="border-b border-solid border-black">
                                <th className="text-left py-1 font-bold">PRODUCT</th>
                                <th className="text-center py-1 font-bold w-12">QTY</th>
                            </tr>
                        </thead>
                        <tbody>
                            {order.order_items?.map((item: any, idx: number) => (
                                <tr key={item.id} className="border-b border-dotted border-slate-300 last:border-0">
                                    <td className="py-1 pr-2">
                                        <div className="font-bold uppercase truncate">{item.product_name}</div>
                                        <div className="text-slate-600">{item.variant_title || 'Standard'}</div>
                                    </td>
                                    <td className="text-center py-1 font-black tabular-nums">{item.quantity}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* FOOTER */}
                <div className="border-t border-solid border-black pt-2 flex items-center justify-between text-[7px]">
                    <div className="flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Secure Record</span>
                    </div>
                    <div className="text-right">
                        <p>makeupstorewangkhei.com</p>
                        <p className="font-bold">Track: /track/{id.slice(0, 8).toUpperCase()}</p>
                    </div>
                </div>
            </div>

            <script dangerouslySetInnerHTML={{ __html: `
                if (window.matchMedia('print').matches || document.referrer) {
                    window.onload = function() { window.print(); }
                }
            `}} />
        </div>
    )
}