"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { OrderLabel } from "@/components/admin/order-label"
import { Printer, ArrowLeft, PackageOpen, Loader2 } from "lucide-react"
import Link from "next/link"

const MAX_LABELS = 100

export default function BatchLabelsPage() {
    const supabase = createClient()
    const [orders, setOrders] = useState<any[]>([])
    const [requested, setRequested] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [printing, setPrinting] = useState(false)

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const raw = params.get("ids") || ""
        const ids = Array.from(new Set(
            raw.split(",").map(s => s.trim()).filter(Boolean)
        )).slice(0, MAX_LABELS)
        setRequested(ids)

        if (ids.length === 0) {
            setLoading(false)
            return
        }

        async function fetchOrders() {
            const { data } = await supabase
                .from('orders')
                .select('*, order_items(*)')
                .in('id', ids)
            const byId = new Map((data || []).map((o: any) => [o.id, o]))
            setOrders(ids.map(id => byId.get(id)).filter(Boolean))
            setLoading(false)
        }
        fetchOrders()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handlePrint = () => {
        setPrinting(true)
        window.print()
    }

    useEffect(() => {
        const afterPrint = () => setPrinting(false)
        window.addEventListener("afterprint", afterPrint)
        return () => window.removeEventListener("afterprint", afterPrint)
    }, [])

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center gap-2 text-slate-400 font-medium">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading labels...
            </div>
        )
    }

    if (requested.length === 0) {
        return (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
                <PackageOpen className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-500 font-medium mb-4">No order ids provided</p>
                <Link href="/admin/orders" className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Orders
                </Link>
            </div>
        )
    }

    const missing = requested.length - orders.length

    return (
        <div className="page-root space-y-6">
            <style jsx global>{`
                @media print {
                    @page { size: 4in 6in; margin: 0; padding: 0; }
                    html, body { margin: 0 !important; padding: 0 !important; background: white !important; background-image: none !important; }
                    .no-print { display: none !important; }
                    header, aside, nav, [data-sidebar], [data-sidebar-wrapper] { display: none !important; }
                    main { padding: 0 !important; margin: 0 !important; }
                    .page-root > * + * { margin-top: 0 !important; }
                    .print-root { display: block !important; padding: 0 !important; margin: 0 !important; gap: 0 !important; max-width: none !important; }
                    .label-page {
                        display: block !important;
                        width: 4in;
                        height: 6in;
                        overflow: hidden;
                        page-break-after: always;
                        break-after: page;
                        break-inside: avoid;
                        padding: 0.15in 0.2in;
                        box-sizing: border-box;
                        background: white !important;
                    }
                    .label-page:last-child { page-break-after: auto; break-after: auto; }
                    .label-page .order-label {
                        width: 100% !important;
                        height: 100% !important;
                        border: none !important;
                        box-shadow: none !important;
                        background: white !important;
                        color: black !important;
                    }
                    .label-page .order-label * { color: black !important; background: transparent !important; }
                    .label-page .order-label img, .label-page .order-label svg { max-width: 100% !important; }
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
                    .label-page .order-label {
                        width: 100%;
                        height: 100%;
                        padding: 0.15in 0.2in;
                        box-sizing: border-box;
                    }
                }
            `}</style>

            {/* Screen Controls */}
            <div className="no-print flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Link
                        href="/admin/orders"
                        className="rounded-xl h-10 w-10 border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-all"
                        title="Back to orders"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-900">
                            {orders.length} Label{orders.length !== 1 ? "s" : ""}
                        </h1>
                        <p className="text-sm text-slate-500">
                            One 4&quot; × 6&quot; label per page — a single print job
                            {missing > 0 && <span className="text-amber-600"> · {missing} order{missing !== 1 ? "s" : ""} not found</span>}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handlePrint}
                        disabled={printing || orders.length === 0}
                        className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm hover:bg-black transition-colors disabled:opacity-60"
                    >
                        {printing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                        Print All{orders.length > 1 ? ` (${orders.length})` : ""}
                    </button>
                </div>
            </div>

            {/* Labels (screen preview stack / print pages) */}
            <div className="print-root flex flex-col items-start gap-6 print:gap-0">
                {orders.map(order => (
                    <div key={order.id} className="label-page">
                        <OrderLabel order={order} />
                    </div>
                ))}
            </div>

            <script dangerouslySetInnerHTML={{ __html: `
                if (window.matchMedia('print').matches || document.referrer) {
                    window.onload = function() { window.print(); }
                }
            `}} />
        </div>
    )
}
