"use client"

import { QRCodeSVG } from "qrcode.react"
import { ShieldCheck, Truck, PackageCheck } from "lucide-react"
import { format } from "date-fns"
import Barcode from "react-barcode"

export type ManualLabelData = {
    reference: string
    orderType: "delivery" | "pickup"
    status: string
    name: string
    phone: string
    street: string
    landmark: string
    area: string
    pincode: string
    paymentMode: "prepaid" | "cod"
    amount: number
    hasDeliveryCharge: boolean
    deliveryCharge: number
}

function telUri(phone: string): string {
    const trimmed = phone.trim()
    if (!trimmed) return ""
    const digits = trimmed.replace(/\D/g, "")
    if (trimmed.startsWith("+")) return `tel:${digits}`
    if (digits.length === 10) return `tel:+91${digits}`
    if (digits.length === 12 && digits.startsWith("91")) return `tel:+${digits}`
    return digits ? `tel:${digits}` : ""
}

export function ManualLabel({ data }: { data: ManualLabelData }) {
    const reference = data.reference.trim().toUpperCase()
    const qrValue = telUri(data.phone)
    const deliveryRow = data.hasDeliveryCharge ? (
        <div className="border-t-2 border-black py-2">
            {data.deliveryCharge > 0 ? (
                <>
                    <span className="text-[16px] font-black tracking-tight">
                        + ₹{Number(data.deliveryCharge).toLocaleString("en-IN")}
                    </span>
                    <span className="text-[11px] font-black uppercase tracking-wider ml-1.5">Delivery</span>
                </>
            ) : (
                <span className="text-[14px] font-black uppercase tracking-tight">+ Delivery Charge</span>
            )}
        </div>
    ) : null

    return (
        <div className="manual-label flex flex-col">
            {/* TOP: Store Branding + Return Address */}
            <div className="flex items-start justify-between border-b border-solid border-black pb-3 mb-3">
                <div>
                    <div className="font-daciana text-[16px] font-black leading-none uppercase tracking-tight">THE MAKEUP STORE</div>
                    <div className="text-[8px] font-semibold uppercase tracking-[0.2em]">WANGKHEI</div>
                    <div className="text-[7px] font-semibold mt-1 leading-tight">
                        <p>Wangkhei Angom Leikai</p>
                        <p>Manipur 795005</p>
                    </div>
                </div>
                <div className="text-right text-[7px] font-semibold leading-tight">
                    <p className="font-bold">FROM:</p>
                    <p>THE MAKEUP STORE</p>
                    <p>Wangkhei Angom Leikai</p>
                    <p>Imphal, Manipur 795005</p>
                    <p>+91-8794833630</p>
                </div>
            </div>

            {/* ORDER REF + BARCODE/QR */}
            <div className="flex items-center justify-between border-b border-solid border-black pb-3 mb-3">
                <div className="flex flex-col items-start min-w-0">
                    <div className="text-[7px] font-bold uppercase tracking-wider text-black">ORDER REF</div>
                    <div className="font-mono text-[14px] font-black tracking-wider break-all">{reference || "—"}</div>
                    <div className="text-[7px] font-semibold font-mono mt-1">{format(new Date(), "dd MMM yyyy, HH:mm")}</div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                    {reference && (
                        <Barcode
                            value={reference.slice(0, 12)}
                            format="CODE128"
                            width={1.5}
                            height={40}
                            displayValue={false}
                            fontSize={0}
                        />
                    )}
                    {qrValue && <QRCodeSVG value={qrValue} size={60} />}
                    {qrValue && <div className="text-[6px] font-semibold font-mono text-center">Scan to Call</div>}
                </div>
            </div>

            {/* ORDER TYPE */}
            <div className="flex items-center justify-between border-b border-solid border-black pb-3 mb-3">
                <div className="flex items-center gap-2">
                    {data.orderType === "delivery" ? (
                        <Truck className="w-5 h-5" />
                    ) : (
                        <PackageCheck className="w-5 h-5" />
                    )}
                    <span className="text-[9px] font-black uppercase tracking-wider">
                        {data.orderType.toUpperCase()}
                    </span>
                </div>
                <span className="text-[7px] font-black">Status: {data.status.toUpperCase()}</span>
            </div>

            {/* CUSTOMER ADDRESS (Large for courier visibility) */}
            <div className="flex flex-col border-b border-solid border-black pb-3 mb-3">
                <div className="text-[7px] font-bold uppercase tracking-wider text-black mb-1">
                    {data.orderType === "delivery" ? "SHIP TO:" : "CUSTOMER:"}
                </div>
                <div className="text-[14px] font-black leading-snug tracking-tight">{data.name}</div>
                <div className="text-[12px] font-black mt-1 tracking-tight">{data.phone}</div>
                {(data.street || data.area || data.pincode) && (
                    <div className="text-[10px] font-bold mt-1.5 leading-relaxed">
                        {data.street}
                        {data.landmark && `, ${data.landmark}`}
                        {(data.area || data.pincode) && <br />}
                        {data.area
                            ? `${data.area}${data.pincode ? ` - ${data.pincode}` : ""}`
                            : data.pincode}
                    </div>
                )}
            </div>

            {/* PAYMENT */}
            <div className="flex-1 overflow-hidden flex flex-col justify-center">
                {data.paymentMode === "prepaid" ? (
                    <div className="border-2 border-black text-center">
                        <div className="py-3">
                            <div className="text-[7px] font-bold uppercase tracking-[0.3em] text-black">Payment</div>
                            <div className="text-[30px] font-black uppercase tracking-tight leading-none mt-1">PREPAID</div>
                            <div className="text-[7px] font-bold uppercase tracking-widest mt-1.5">Nothing to collect</div>
                        </div>
                        {deliveryRow}
                    </div>
                ) : (
                    <div className="border-2 border-black text-center">
                        <div className="py-3">
                            <div className="text-[7px] font-bold uppercase tracking-[0.3em] text-black">Amount to Collect</div>
                            <div className="text-[36px] font-black tracking-tight leading-none mt-1">
                                ₹{Number(data.amount || 0).toLocaleString("en-IN")}
                            </div>
                            <div className="text-[7px] font-bold uppercase tracking-widest mt-1.5">Cash on Delivery</div>
                        </div>
                        {deliveryRow}
                    </div>
                )}
            </div>

            {/* FOOTER */}
            <div className="border-t border-solid border-black pt-2 flex items-center justify-between text-[7px] font-semibold">
                <div className="flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Secure Record</span>
                </div>
                <div className="text-right">
                    <p>www.themakeupstorewangkhei.com</p>
                    <p className="font-bold">Ref: {(reference || "—").slice(0, 24)}</p>
                </div>
            </div>
        </div>
    )
}
