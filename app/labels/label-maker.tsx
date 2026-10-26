"use client"

import { useState } from "react"
import { toast } from "sonner"
import { ArrowLeft, Printer, Loader2 } from "lucide-react"
import Link from "next/link"
import { ManualLabel, type ManualLabelData } from "@/components/manual-label"

const STATUSES = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "OUT FOR DELIVERY", "DELIVERED", "CANCELLED"]

const emptyForm: ManualLabelData = {
    reference: "",
    orderType: "delivery",
    status: "PENDING",
    name: "",
    phone: "",
    street: "",
    landmark: "",
    area: "",
    pincode: "",
    paymentMode: "cod",
    amount: 0,
    hasDeliveryCharge: false,
    deliveryCharge: 0,
}

const inputCls =
    "w-full h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100 transition-all"

const labelCls = "block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5"

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
    return (
        <div className={className}>
            <label className={labelCls}>{label}</label>
            {children}
        </div>
    )
}

export function LabelMaker() {
    const [form, setForm] = useState<ManualLabelData>(emptyForm)
    const [printing, setPrinting] = useState(false)

    const set = <K extends keyof ManualLabelData>(key: K, value: ManualLabelData[K]) =>
        setForm(prev => ({ ...prev, [key]: value }))

    const handlePrint = () => {
        if (!form.reference.trim()) return toast.error("Reference number is required.")
        if (!form.name.trim()) return toast.error("Customer name is required.")
        if (!form.phone.trim()) return toast.error("Phone number is required.")
        if (form.paymentMode === "cod" && Number(form.amount) <= 0)
            return toast.error("Enter the COD amount to collect.")
        setPrinting(true)
        window.print()
    }

    return (
        <div className="label-root max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-8">
            <style jsx global>{`
                @media print {
                    @page { size: 4in 6in; margin: 0; padding: 0; }
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        position: static !important;
                        overflow: visible !important;
                        height: auto !important;
                    }
                    #app-scroller { overflow: visible !important; height: auto !important; }
                    main, .label-root { position: static !important; padding: 0 !important; margin: 0 !important; max-width: none !important; }
                    .no-print { display: none !important; }
                    body * { visibility: hidden !important; }
                    .label-page, .label-page * { visibility: visible !important; }
                    .label-page {
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: 4in;
                        height: 6in;
                        padding: 0.15in 0.2in;
                        box-sizing: border-box;
                        overflow: hidden;
                        margin: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                        background: white !important;
                    }
                    .label-page .manual-label {
                        width: 100% !important;
                        height: 100% !important;
                        border: none !important;
                        box-shadow: none !important;
                        background: white !important;
                        color: black !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .label-page .manual-label * {
                        color: black !important;
                        background: transparent !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .label-page .manual-label .font-light,
                    .label-page .manual-label .font-thin,
                    .label-page .manual-label .font-normal,
                    .label-page .manual-label .font-medium { font-weight: 600 !important; }
                    .label-page .manual-label img,
                    .label-page .manual-label svg { max-width: 100% !important; }
                }
                @media screen {
                    .label-page {
                        width: 4in;
                        height: 6in;
                        overflow: hidden;
                        border: 1px dashed #ccc;
                        background: white;
                        box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
                    }
                    .label-page .manual-label {
                        width: 100%;
                        height: 100%;
                        padding: 0.15in 0.2in;
                        box-sizing: border-box;
                    }
                }
            `}</style>

            {/* HEADER */}
            <div className="no-print flex flex-wrap items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                    <Link
                        href="/"
                        className="rounded-xl h-10 w-10 border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-all"
                        title="Back to store"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-900">Label Maker</h1>
                        <p className="text-sm text-slate-500">
                            Fill the details — print one 4&quot; × 6&quot; label. Nothing is saved.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_4.4in] items-start">
                {/* FORM */}
                <div className="no-print rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Reference No. *" className="col-span-2 sm:col-span-1">
                            <input
                                className={inputCls}
                                value={form.reference}
                                onChange={e => set("reference", e.target.value)}
                                placeholder="e.g. MK-001"
                                maxLength={40}
                            />
                        </Field>

                        <Field label="Type">
                            <div className="flex h-10 rounded-xl border border-slate-200 bg-slate-50 p-1">
                                {(["delivery", "pickup"] as const).map(t => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => set("orderType", t)}
                                        className={`flex-1 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                                            form.orderType === t
                                                ? "bg-slate-900 text-white shadow-sm"
                                                : "text-slate-500 hover:text-slate-700"
                                        }`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </Field>

                        <Field label="Status" className="col-span-2 sm:col-span-1">
                            <select
                                className={inputCls}
                                value={form.status}
                                onChange={e => set("status", e.target.value)}
                            >
                                {STATUSES.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </Field>

                        <Field label="Customer Name *" className="col-span-2">
                            <input
                                className={inputCls}
                                value={form.name}
                                onChange={e => set("name", e.target.value)}
                                placeholder="Full name"
                            />
                        </Field>

                        <Field label="Phone *" className="col-span-2 sm:col-span-1">
                            <input
                                className={inputCls}
                                value={form.phone}
                                onChange={e => set("phone", e.target.value)}
                                placeholder="e.g. 9876543210"
                                inputMode="tel"
                            />
                        </Field>

                        <Field label="Pincode" className="col-span-2 sm:col-span-1">
                            <input
                                className={inputCls}
                                value={form.pincode}
                                onChange={e => set("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                                placeholder="e.g. 795005"
                                inputMode="numeric"
                            />
                        </Field>

                        <Field label="Street / Locality" className="col-span-2">
                            <input
                                className={inputCls}
                                value={form.street}
                                onChange={e => set("street", e.target.value)}
                                placeholder="House no, street, locality"
                            />
                        </Field>

                        <Field label="Landmark (optional)" className="col-span-2 sm:col-span-1">
                            <input
                                className={inputCls}
                                value={form.landmark}
                                onChange={e => set("landmark", e.target.value)}
                                placeholder="Near ..."
                            />
                        </Field>

                        <Field label="Area / City" className="col-span-2 sm:col-span-1">
                            <input
                                className={inputCls}
                                value={form.area}
                                onChange={e => set("area", e.target.value)}
                                placeholder="Area, city"
                            />
                        </Field>

                        <div className="col-span-2">
                            <label className={labelCls}>Payment</label>
                            <div className="flex gap-2">
                                {(["cod", "prepaid"] as const).map(m => (
                                    <button
                                        key={m}
                                        type="button"
                                        onClick={() => set("paymentMode", m)}
                                        className={`h-10 flex-1 rounded-xl border text-xs font-bold uppercase tracking-wide transition-all ${
                                            form.paymentMode === m
                                                ? "border-slate-900 bg-slate-900 text-white"
                                                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                                        }`}
                                    >
                                        {m === "cod" ? "Cash on Delivery" : "Prepaid"}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {form.paymentMode === "cod" && (
                            <Field label="Amount to Collect (₹)" className="col-span-2 sm:col-span-1">
                                <input
                                    className={inputCls}
                                    value={form.amount || ""}
                                    onChange={e => set("amount", Number(e.target.value.replace(/\D/g, "")) || 0)}
                                    placeholder="e.g. 1499"
                                    inputMode="numeric"
                                />
                            </Field>
                        )}

                        <div className="col-span-2 sm:col-span-1">
                            <label className={`${labelCls} flex items-center gap-2 cursor-pointer select-none`}>
                                <input
                                    type="checkbox"
                                    checked={form.hasDeliveryCharge}
                                    onChange={e => set("hasDeliveryCharge", e.target.checked)}
                                    className="h-4 w-4 rounded border-slate-300 accent-slate-900 cursor-pointer"
                                />
                                Delivery Charge
                            </label>
                            {form.hasDeliveryCharge && (
                                <input
                                    className={inputCls}
                                    value={form.deliveryCharge || ""}
                                    onChange={e => set("deliveryCharge", Number(e.target.value.replace(/\D/g, "")) || 0)}
                                    placeholder="e.g. 50"
                                    inputMode="numeric"
                                    autoFocus
                                />
                            )}
                        </div>
                    </div>

                    <div className="mt-7 flex flex-col sm:flex-row gap-2.5">
                        <button
                            onClick={handlePrint}
                            disabled={printing}
                            className="flex-1 h-11 rounded-xl bg-slate-900 text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-black transition-colors disabled:opacity-60"
                        >
                            {printing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                            Print Label
                        </button>
                        <button
                            type="button"
                            onClick={() => setForm(emptyForm)}
                            className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                            Clear
                        </button>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
                        Tip: keep the reference 12 characters or shorter so the barcode scans cleanly. In the print
                        dialog, choose your label printer and set paper size to 4&quot; × 6&quot;.
                    </p>
                </div>

                {/* PREVIEW */}
                <div className="justify-self-center lg:justify-self-start">
                    <div className="no-print text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Live preview
                    </div>
                    <div className="label-page">
                        <ManualLabel data={form} />
                    </div>
                </div>
            </div>
        </div>
    )
}
