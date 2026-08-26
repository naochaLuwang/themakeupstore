"use client"

import { useEffect, useState, useRef } from "react"
import { useReducedMotion } from "framer-motion"
import Link from "next/link"

interface OrderItem {
    id: string
    product_name: string
    variant_title: string | null
    quantity: number
    unit_price: number
    mrp: number
    is_gift: boolean
}

interface Order {
    id: string
    created_at: string
    total: number
    shipping_price: number
    shipping_label: string | null
    payment_method: string
    payment_status: string
    razorpay_payment_id: string | null
    promo_code: string | null
    promo_discount_amount: number
    bxgy_discount_amount: number
    coin_discount_amount: number
    shipping_address: any
    order_items: OrderItem[]
}

function formatCurrency(n: number) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)
}

function formatDate(iso: string) {
    const d = new Date(iso)
    const day = d.getDate()
    const month = d.toLocaleDateString("en-US", { month: "long" }).toUpperCase()
    const year = d.getFullYear()
    const hours = d.getHours()
    const minutes = d.getMinutes().toString().padStart(2, "0")
    const ampm = hours >= 12 ? "PM" : "AM"
    const h12 = hours % 12 || 12
    return { day: `${day}`, month, year, time: `${h12}:${minutes} ${ampm}` }
}

function dottedLine() {
    return "· · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ·"
}

function solidLine() {
    return "—————————————————————————————————"
}

export function ReceiptPage({ order }: { order: Order }) {
    const [printReady, setPrintReady] = useState(false)
    const receiptRef = useRef<HTMLDivElement>(null)
    const reduceMotion = useReducedMotion()

    const items = (order.order_items || []).filter((i) => !i.is_gift)
    const giftItems = (order.order_items || []).filter((i) => i.is_gift)
    const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0)
    const shipping = Number(order.shipping_price) || 0
    const total = Number(order.total) || 0
    const promoDiscount = Number(order.promo_discount_amount) || 0
    const { day, month, year, time } = formatDate(order.created_at)
    const shortId = order.id.slice(0, 8).toUpperCase()
    const addr = order.shipping_address || {}
    const paymentLabel = order.payment_method === "razorpay"
        ? `RAZORPAY`
        : order.payment_method === "cod"
        ? "CASH ON DELIVERY"
        : (order.payment_method || "COD").toUpperCase()
    const paymentBadge = order.payment_status === "paid" ? "PAID" : order.payment_status === "unpaid" ? "COD" : order.payment_status.toUpperCase()

    useEffect(() => {
        const t = setTimeout(() => setPrintReady(true), 100)
        return () => clearTimeout(t)
    }, [])

    const handlePrint = () => window.print()

    return (
        <div
            className="min-h-[100dvh] flex flex-col items-center justify-start md:justify-center px-4 py-12 md:py-0 print:p-0 print:min-h-0"
            style={{ backgroundColor: "#EAE6DE" }}
        >
            {/* ── PRINT STYLES ── */}
            <style>{`
                @media print {
                    body * { visibility: hidden !important; }
                    #receipt-paper, #receipt-paper * { visibility: visible !important; }
                    #receipt-paper {
                        position: absolute;
                        left: 50%;
                        top: 0;
                        transform: translateX(-50%);
                        box-shadow: none !important;
                        margin: 0 !important;
                        border-radius: 0 !important;
                    }
                    #receipt-paper .torn-edge { display: none !important; }
                    #receipt-paper .receipt-actions { display: none !important; }
                    #receipt-paper .receipt-bg { display: none !important; }
                    html, body { background: white !important; }
                }
                @keyframes receiptSlideIn {
                    0% { opacity: 0; transform: translateY(-30px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                @keyframes receiptReveal {
                    0% { clip-path: inset(0 0 100% 0); }
                    100% { clip-path: inset(0 0 0% 0); }
                }
                @keyframes grain {
                    0%, 100% { transform: translate(0, 0); }
                    10% { transform: translate(-5%, -10%); }
                    30% { transform: translate(3%, -15%); }
                    50% { transform: translate(12%, 9%); }
                    70% { transform: translate(9%, 4%); }
                    90% { transform: translate(-1%, 7%); }
                }
                .receipt-anim-slide {
                    animation: receiptSlideIn 1.2s cubic-bezier(0.22, 1, 0.36, 1) forwards;
                }
                .receipt-anim-reveal {
                    animation: receiptReveal 1.8s cubic-bezier(0.22, 1, 0.36, 1) 0.3s forwards;
                    clip-path: inset(0 0 100% 0);
                }
                .receipt-anim-static {
                    opacity: 1;
                }
                .torn-edge {
                    position: relative;
                }
                .torn-edge::after {
                    content: "";
                    position: absolute;
                    bottom: -8px;
                    left: 0;
                    right: 0;
                    height: 9px;
                    background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 9'%3E%3Cpath d='M0,0 Q15,9 30,0 Q45,9 60,0 Q75,9 90,0 Q105,9 120,0 Q135,9 150,0 Q165,9 180,0 Q195,9 210,0 Q225,9 240,0 Q255,9 270,0 Q285,9 300,0 Q315,9 330,0 Q345,9 360,0 Q375,9 390,0 Q405,9 420,0 Q435,9 450,0 Q465,9 480,0 Q495,9 510,0 Q525,9 540,0 Q555,9 570,0 Q585,9 600,0 Q615,9 630,0 Q645,9 660,0 Q675,9 690,0 Q705,9 720,0 Q735,9 750,0 Q765,9 780,0 Q795,9 810,0 Q825,9 840,0 Q855,9 870,0 Q885,9 900,0 Q915,9 930,0 Q945,9 960,0 Q975,9 990,0 Q1005,9 1020,0 Q1035,9 1050,0 Q1065,9 1080,0 Q1095,9 1110,0 Q1125,9 1140,0 Q1155,9 1170,0 Q1185,9 1200,0 L1200,9 L0,9 Z' fill='%23F8F5EE'/%3E%3C/svg%3E") repeat-x;
                    background-size: 120px 9px;
                }
                @media (prefers-reduced-motion: reduce) {
                    .receipt-anim-slide, .receipt-anim-reveal {
                        animation: none !important;
                        opacity: 1 !important;
                        clip-path: none !important;
                    }
                }
            `}</style>

            {/* ── RECEIPT ── */}
            <div
                ref={receiptRef}
                id="receipt-paper"
                className={`relative w-full max-w-[420px] torn-edge ${printReady ? (reduceMotion ? "receipt-anim-static" : "receipt-anim-slide") : "opacity-0"}`}
            >
                {/* Paper texture noise */}
                <div
                    className="receipt-bg pointer-events-none absolute inset-0 z-10 opacity-[0.03]"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                        backgroundSize: "200px 200px",
                    }}
                />

                {/* Soft shadow underneath */}
                <div className="absolute -inset-1 rounded-sm bg-black/[0.04] blur-md -z-10" />

                {/* Paper */}
                <div
                    className={`relative rounded-sm px-6 sm:px-8 pt-10 pb-14 ${printReady && !reduceMotion ? "receipt-anim-reveal" : ""}`}
                    style={{ backgroundColor: "#F8F5EE" }}
                >
                    {/* ── BRAND ── */}
                    <header className="text-center mb-8">
                        <p className="font-daciana text-[22px] leading-none tracking-tight" style={{ color: "#171717" }}>
                            THE MAKEUP STORE
                        </p>
                        <p
                            className="mt-1.5 font-mono text-[8px] uppercase tracking-[0.4em] font-medium"
                            style={{ color: "#77736B" }}
                        >
                            Wangkhei, Imphal
                        </p>
                    </header>

                    <div className="text-center mb-6 font-mono text-[10px] tracking-wider" style={{ color: "#C9C3B8" }}>
                        {solidLine()}
                    </div>

                    {/* ── CONFIRMED ── */}
                    <div className="text-center mb-8">
                        <p className="font-daciana text-[18px] tracking-[0.15em] uppercase" style={{ color: "#171717" }}>
                            Order Confirmed
                        </p>
                        <p className="mt-2 font-mono text-[10px] leading-relaxed" style={{ color: "#77736B" }}>
                            Thank you for your purchase.
                        </p>
                    </div>

                    {/* ── ORDER META ── */}
                    <div className="text-center mb-8 font-mono" style={{ color: "#171717" }}>
                        <p className="text-[11px] font-semibold tracking-wider">
                            ORDER #{shortId}
                        </p>
                        <p className="text-[10px] mt-1 tracking-wide" style={{ color: "#77736B" }}>
                            {day} {month} {year} · {time}
                        </p>
                    </div>

                    <div className="text-center mb-6 font-mono text-[10px] tracking-wider" style={{ color: "#C9C3B8" }}>
                        {dottedLine()}
                    </div>

                    {/* ── ITEMS ── */}
                    <div className="mb-8">
                        <p className="font-mono text-[9px] uppercase tracking-[0.3em] mb-4 font-medium" style={{ color: "#77736B" }}>
                            Items
                        </p>
                        <div className="space-y-4">
                            {items.map((item) => (
                                <div key={item.id} className="flex justify-between items-start gap-4 font-mono">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[11px] font-medium truncate" style={{ color: "#171717" }}>
                                            {item.product_name}
                                        </p>
                                        {item.variant_title && (
                                            <p className="text-[9px] mt-0.5" style={{ color: "#77736B" }}>
                                                {item.variant_title}
                                            </p>
                                        )}
                                        <p className="text-[9px] mt-0.5" style={{ color: "#77736B" }}>
                                            Qty {item.quantity}
                                        </p>
                                    </div>
                                    <p className="text-[11px] font-medium tabular-nums whitespace-nowrap" style={{ color: "#171717" }}>
                                        {formatCurrency(item.unit_price * item.quantity)}
                                    </p>
                                </div>
                            ))}
                            {giftItems.map((item) => (
                                <div key={item.id} className="flex justify-between items-start gap-4 font-mono">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[11px] font-medium truncate" style={{ color: "#171717" }}>
                                            {item.product_name}
                                        </p>
                                        <p className="text-[9px] mt-0.5" style={{ color: "#77736B" }}>
                                            Free Gift · Qty {item.quantity}
                                        </p>
                                    </div>
                                    <p className="text-[11px] font-medium tabular-nums whitespace-nowrap" style={{ color: "#77736B" }}>
                                        FREE
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="text-center mb-6 font-mono text-[10px] tracking-wider" style={{ color: "#C9C3B8" }}>
                        {dottedLine()}
                    </div>

                    {/* ── TOTALS ── */}
                    <div className="mb-8 font-mono text-[10px]" style={{ color: "#171717" }}>
                        <div className="flex justify-between mb-2">
                            <span style={{ color: "#77736B" }}>Subtotal</span>
                            <span className="tabular-nums">{formatCurrency(subtotal)}</span>
                        </div>
                        {promoDiscount > 0 && (
                            <div className="flex justify-between mb-2">
                                <span style={{ color: "#77736B" }}>Discount ({order.promo_code})</span>
                                <span className="tabular-nums" style={{ color: "#77736B" }}>-{formatCurrency(promoDiscount)}</span>
                            </div>
                        )}
                        {Number(order.coin_discount_amount) > 0 && (
                            <div className="flex justify-between mb-2">
                                <span style={{ color: "#77736B" }}>M Coins</span>
                                <span className="tabular-nums" style={{ color: "#77736B" }}>-{formatCurrency(Number(order.coin_discount_amount))}</span>
                            </div>
                        )}
                        <div className="flex justify-between mb-2">
                            <span style={{ color: "#77736B" }}>Shipping</span>
                            <span className="tabular-nums">{shipping === 0 ? "FREE" : formatCurrency(shipping)}</span>
                        </div>

                        <div className="text-center my-4 font-mono text-[10px] tracking-wider" style={{ color: "#C9C3B8" }}>
                            {dottedLine()}
                        </div>

                        <div className="flex justify-between text-[12px] font-semibold">
                            <span>Total</span>
                            <span className="tabular-nums">{formatCurrency(total)}</span>
                        </div>
                    </div>

                    <div className="text-center mb-6 font-mono text-[10px] tracking-wider" style={{ color: "#C9C3B8" }}>
                        {dottedLine()}
                    </div>

                    {/* ── PAYMENT ── */}
                    <div className="mb-8">
                        <p className="font-mono text-[9px] uppercase tracking-[0.3em] mb-3 font-medium" style={{ color: "#77736B" }}>
                            Payment
                        </p>
                        <div className="flex justify-between items-center font-mono text-[10px]" style={{ color: "#171717" }}>
                            <span>{paymentLabel}</span>
                            <span className={`font-semibold tracking-wider ${paymentBadge === "PAID" ? "" : ""}`}
                                style={{ color: paymentBadge === "PAID" ? "#171717" : "#77736B" }}
                            >
                                {paymentBadge}
                            </span>
                        </div>
                    </div>

                    <div className="text-center mb-6 font-mono text-[10px] tracking-wider" style={{ color: "#C9C3B8" }}>
                        {dottedLine()}
                    </div>

                    {/* ── SHIPPING TO ── */}
                    <div className="mb-8">
                        <p className="font-mono text-[9px] uppercase tracking-[0.3em] mb-3 font-medium" style={{ color: "#77736B" }}>
                            Shipping To
                        </p>
                        <div className="font-mono text-[10px] leading-relaxed" style={{ color: "#171717" }}>
                            {addr.full_name && <p>{addr.full_name}</p>}
                            {addr.address && <p>{addr.address}</p>}
                            {addr.city && addr.state && (
                                <p>{addr.city}{addr.pincode ? `, ${addr.state} ${addr.pincode}` : `, ${addr.state}`}</p>
                            )}
                            {addr.phone && <p className="mt-1" style={{ color: "#77736B" }}>{addr.phone}</p>}
                        </div>
                    </div>

                    <div className="text-center mb-6 font-mono text-[10px] tracking-wider" style={{ color: "#C9C3B8" }}>
                        {dottedLine()}
                    </div>

                    {/* ── MESSAGE ── */}
                    <div className="text-center mb-8">
                        <p className="font-mono text-[10px] leading-relaxed" style={{ color: "#77736B" }}>
                            Your order has been confirmed.
                        </p>
                        <p className="font-mono text-[10px] leading-relaxed mt-1" style={{ color: "#77736B" }}>
                            We&rsquo;ll send you another note when your order is on its way.
                        </p>
                    </div>

                    {/* ── ACTIONS (hidden in print) ── */}
                    <div className="receipt-actions text-center space-y-3 mb-10">
                        <Link
                            href={`/track/${order.id}`}
                            className="inline-block font-mono text-[10px] uppercase tracking-[0.2em] font-medium border-b transition-colors duration-200 pb-0.5"
                            style={{ color: "#171717", borderColor: "#C9C3B8" }}
                        >
                            Track Order
                        </Link>
                        <div className="flex justify-center gap-6">
                            <Link
                                href="/"
                                className="font-mono text-[10px] uppercase tracking-[0.2em] border-b transition-colors duration-200 pb-0.5"
                                style={{ color: "#77736B", borderColor: "transparent" }}
                            >
                                Continue Shopping
                            </Link>
                            <button
                                onClick={handlePrint}
                                className="font-mono text-[10px] uppercase tracking-[0.2em] border-b transition-colors duration-200 pb-0.5 cursor-pointer"
                                style={{ color: "#77736B", borderColor: "transparent" }}
                            >
                                Download Receipt
                            </button>
                        </div>
                    </div>

                    {/* ── THANK YOU ── */}
                    <div className="text-center">
                        <p className="font-daciana text-[14px] tracking-[0.2em] uppercase" style={{ color: "#171717" }}>
                            Thank You
                        </p>
                        <div className="mt-3 flex justify-center">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#171717" }}>
                                <span className="font-daciana text-[14px] leading-none text-white pt-0.5">M</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}