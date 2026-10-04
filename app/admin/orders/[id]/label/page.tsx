"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Printer, X } from "lucide-react"
import { OrderLabel } from "@/components/admin/order-label"

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
                    .order-label {
                        width: 4in;
                        height: 6in;
                        padding: 0.15in 0.2in;
                        box-sizing: border-box;
                        border: none !important;
                        box-shadow: none !important;
                        background: white !important;
                        color: black !important;
                    }
                    .order-label * { color: black !important; background: transparent !important; }
                    .order-label img, .order-label svg { max-width: 100% !important; }
                }
                @media screen {
                    .order-label { width: 4in; height: 6in; border: 1px dashed #ccc; background: white; }
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
            <OrderLabel order={order} />

            <script dangerouslySetInnerHTML={{ __html: `
                if (window.matchMedia('print').matches || document.referrer) {
                    window.onload = function() { window.print(); }
                }
            `}} />
        </div>
    )
}
