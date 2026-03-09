"use client"

import { useState } from "react"
import { createClient } from "@/utils/supabase/client"
import {
    PackageCheck,
    Eye,
    Loader2,
    X,
    Printer,
    Download,
    FileText
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export default function PurchaseListClient({ initialOrders }: any) {
    const [orders, setOrders] = useState(initialOrders)
    const [viewingOrder, setViewingOrder] = useState<any>(null)
    const [processingId, setProcessingId] = useState<string | null>(null)
    const supabase = createClient()

    // Fetch full order details including items when "View" is clicked
    const handleViewDetails = async (order: any) => {
        const { data, error } = await supabase
            .from('purchase_order_items')
            .select(`
                *,
                product_variants (title, sku),
                products (name)
            `)
            .eq('purchase_order_id', order.id)

        if (error) return toast.error("Could not load details")
        setViewingOrder({ ...order, items: data })
    }

    const handleReceiveOrder = async (orderId: string) => {
        const confirm = window.confirm("Marking as received will update live stock. Continue?")
        if (!confirm) return
        setProcessingId(orderId)

        const { error } = await supabase
            .from('purchase_orders')
            .update({ status: 'received', received_at: new Date().toISOString() })
            .eq('id', orderId)

        if (error) {
            toast.error("Error: " + error.message)
        } else {
            toast.success("Stock updated successfully")
            setOrders(orders.map((o: any) => o.id === orderId ? { ...o, status: 'received' } : o))
        }
        setProcessingId(null)
    }

    return (
        <div className="relative">
            <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b">
                        <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            <th className="px-6 py-4">Ref No.</th>
                            <th className="px-6 py-4">Supplier</th>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {orders.map((order: any) => (
                            <tr key={order.id} className="hover:bg-slate-50/50">
                                <td className="px-6 py-4 font-mono text-xs text-slate-600">{order.reference_number || 'N/A'}</td>
                                <td className="px-6 py-4 text-sm font-semibold">{order.suppliers?.name}</td>
                                <td className="px-6 py-4 text-xs text-slate-400">{new Date(order.created_at).toLocaleDateString()}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${order.status === 'received' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                        {order.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                    {order.status === 'draft' && (
                                        <Button size="sm" onClick={() => handleReceiveOrder(order.id)} disabled={processingId === order.id} className="h-8 bg-emerald-600 hover:bg-emerald-700 text-[10px] font-bold uppercase">
                                            {processingId === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <PackageCheck className="w-3 h-3 mr-1" />}
                                            Receive
                                        </Button>
                                    )}
                                    <Button variant="outline" size="sm" onClick={() => handleViewDetails(order)} className="h-8 px-3">
                                        <Eye className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                                        <span className="text-[10px] font-bold uppercase">View</span>
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* --- PDF-STYLE VIEW OVERLAY --- */}
            {viewingOrder && (
                <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex justify-center items-start overflow-y-auto py-12 px-6">
                    <div className="bg-white w-full max-w-4xl min-h-[11in] shadow-2xl rounded-sm flex flex-col animate-in fade-in zoom-in-95 duration-300">

                        {/* Internal Toolbar */}
                        <div className="p-4 border-b bg-slate-50 flex justify-between items-center sticky top-0 no-print">
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" className="text-xs" onClick={() => window.print()}>
                                    <Printer className="w-3.5 h-3.5 mr-2" /> Print
                                </Button>
                                <Button variant="outline" size="sm" className="text-xs">
                                    <Download className="w-3.5 h-3.5 mr-2" /> PDF
                                </Button>
                            </div>
                            <button onClick={() => setViewingOrder(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* DOCUMENT CONTENT */}
                        <div className="p-16 flex-1 space-y-12 text-slate-900 printable-area">
                            <div className="flex justify-between items-start">
                                <div className="space-y-4">
                                    <div className="bg-indigo-600 text-white w-12 h-12 flex items-center justify-center rounded text-xl font-bold">A</div>
                                    <div>
                                        <h1 className="text-2xl font-bold uppercase tracking-tighter">Purchase Order</h1>
                                        <p className="text-sm text-slate-500 font-mono">{viewingOrder.id}</p>
                                    </div>
                                </div>
                                <div className="text-right space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Status</p>
                                    <p className="text-sm font-bold uppercase text-indigo-600 tracking-widest">{viewingOrder.status}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-12 border-t border-b py-8 border-slate-100">
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Supplier Details</p>
                                    <p className="text-lg font-bold">{viewingOrder.suppliers?.name}</p>
                                    <p className="text-sm text-slate-500 whitespace-pre-wrap">{viewingOrder.suppliers?.address || 'No address provided'}</p>
                                </div>
                                <div className="text-right space-y-2">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Reference Details</p>
                                    <p className="text-sm"><span className="text-slate-400 uppercase text-[9px] font-bold">Date:</span> {new Date(viewingOrder.created_at).toLocaleDateString()}</p>
                                    <p className="text-sm"><span className="text-slate-400 uppercase text-[9px] font-bold">Ref No:</span> {viewingOrder.reference_number || 'N/A'}</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b-2 border-slate-900">
                                            <th className="py-4 text-[11px] font-bold uppercase">Item Description</th>
                                            <th className="py-4 text-[11px] font-bold uppercase text-center">Qty</th>
                                            <th className="py-4 text-[11px] font-bold uppercase text-right">Unit Price</th>
                                            <th className="py-4 text-[11px] font-bold uppercase text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {viewingOrder.items?.map((item: any, i: number) => (
                                            <tr key={i}>
                                                <td className="py-5">
                                                    <p className="text-sm font-bold">{item.products?.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{item.product_variants?.title} — {item.product_variants?.sku}</p>
                                                </td>
                                                <td className="py-5 text-sm text-center font-mono">{item.quantity}</td>
                                                <td className="py-5 text-sm text-right font-mono">₹{item.unit_cost?.toLocaleString()}</td>
                                                <td className="py-5 text-sm text-right font-bold font-mono">₹{(item.quantity * item.unit_cost).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="pt-8 flex justify-end">
                                <div className="w-64 space-y-3 bg-slate-50 p-6 rounded">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500 uppercase font-bold">Subtotal</span>
                                        <span className="font-mono">₹{viewingOrder.items?.reduce((a: any, b: any) => a + (b.quantity * b.unit_cost), 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm font-bold border-t border-slate-200 pt-3">
                                        <span className="uppercase">Grand Total</span>
                                        <span className="text-indigo-600 font-mono text-lg">₹{viewingOrder.items?.reduce((a: any, b: any) => a + (b.quantity * b.unit_cost), 0).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-20 text-[10px] text-slate-400 uppercase tracking-[0.2em] text-center italic border-t border-slate-50">
                                This is a computer generated document.
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}