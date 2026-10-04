"use client"

import { QRCodeSVG } from "qrcode.react"
import { ShieldCheck, Truck, PackageCheck } from "lucide-react"
import { format } from "date-fns"
import Barcode from "react-barcode"

export function OrderLabel({ order }: { order: any }) {
    const id: string = order.id
    const trackingUrl = `https://themakeupstorewangkhei.com/track/${id}`

    return (
        <div className="order-label flex flex-col">
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
                    <div className="font-mono text-[14px] font-black tracking-wider">{id.slice(0, 8).toUpperCase()}</div>
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
                        {(order.order_type || "delivery").toUpperCase()}
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
            {/* PAYMENT */}
            <div className="flex-1 overflow-hidden flex flex-col justify-center">
                {order.payment_status === "paid" ? (
                    <div className="border-2 border-black py-3 text-center">
                        <div className="text-[7px] font-bold uppercase tracking-[0.3em] text-slate-500">Payment</div>
                        <div className="text-[24px] font-black uppercase tracking-tight leading-none mt-1">PREPAID</div>
                        <div className="text-[7px] font-bold uppercase tracking-widest mt-1.5">Nothing to collect</div>
                    </div>
                ) : (
                    <div className="border-2 border-black py-3 text-center">
                        <div className="text-[7px] font-bold uppercase tracking-[0.3em] text-slate-500">Amount to Collect</div>
                        <div className="text-[30px] font-black tracking-tight leading-none mt-1">₹{Number(order.total || 0).toLocaleString("en-IN")}</div>
                        <div className="text-[7px] font-bold uppercase tracking-widest mt-1.5">
                            {order.payment_status === "refunded" ? "Refunded" : "Cash on Delivery"}
                        </div>
                    </div>
                )}
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
    )
}
