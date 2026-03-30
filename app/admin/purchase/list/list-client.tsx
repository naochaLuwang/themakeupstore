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
    FileText,
    Calendar,
    Building2,
    Hash,
    ChevronRight,
    ArrowUpRight
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
        const confirm = window.confirm("Marking as received will increase live stock levels for all items in this order. Continue?")
        if (!confirm) return
        setProcessingId(orderId)

        try {
            // 1. Fetch items for this order
            const { data: items, error: itemsErr } = await supabase
                .from('purchase_order_items')
                .select('variant_id, quantity')
                .eq('purchase_order_id', orderId)
            
            if (itemsErr) throw itemsErr

            // 1b. Proactive check: Ensure order isn't already received (safety)
            const { data: currentOrder, error: poCheckErr } = await supabase
                .from('purchase_orders')
                .select('status')
                .eq('id', orderId)
                .single()
            
            if (poCheckErr || currentOrder?.status === 'received') {
                throw new Error("Order is already marked as received or could not be verified.")
            }

            // 2. Update stock for each item
            for (const item of items) {
                const { data: variant, error: varErr } = await supabase
                    .from('product_variants')
                    .select('stock')
                    .eq('id', item.variant_id)
                    .single()
                
                if (variant && !varErr) {
                    const { error: updErr } = await supabase
                        .from('product_variants')
                        .update({ stock: (variant.stock || 0) + item.quantity })
                        .eq('id', item.variant_id)
                    
                    if (updErr) console.error("Error updating stock for variant", item.variant_id, updErr)
                }
            }

            // 3. Update order status
            const { error: poErr } = await supabase
                .from('purchase_orders')
                .update({ 
                    status: 'received', 
                    received_at: new Date().toISOString() 
                })
                .eq('id', orderId)

            if (poErr) throw poErr

            toast.success("Inventory stock successfully updated and order received")
            setOrders(orders.map((o: any) => o.id === orderId ? { ...o, status: 'received' } : o))
        } catch (err: any) {
            toast.error("Error processing receipt: " + err.message)
        } finally {
            setProcessingId(null)
        }
    }

    return (
        <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50/50 border-b border-slate-100">
                        <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">
                            <th className="px-8 py-5 flex items-center gap-2 font-bold"><Hash className="w-3 h-3" /> Ref No.</th>
                            <th className="px-6 py-5"><div className="flex items-center gap-2"><Building2 className="w-3 h-3" /> Supplier</div></th>
                            <th className="px-6 py-5"><div className="flex items-center gap-2"><Calendar className="w-3 h-3" /> Date</div></th>
                            <th className="px-6 py-5">Status</th>
                            <th className="px-8 py-5 text-right font-bold">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {orders.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-8 py-20 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <FileText className="w-10 h-10 text-slate-200" />
                                        <p className="text-sm font-medium text-slate-400">No purchase records found</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            orders.map((order: any) => (
                                <tr key={order.id} className="group hover:bg-slate-50/50 transition-all duration-200">
                                    <td className="px-8 py-5 font-mono text-xs font-semibold text-slate-600">
                                        {order.reference_number || <span className="text-slate-300 italic">No Ref.</span>}
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="text-sm font-bold text-slate-800">{order.suppliers?.name}</div>
                                    </td>
                                    <td className="px-6 py-5 text-xs text-slate-500 font-medium whitespace-nowrap">
                                        {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest leading-none ${
                                            order.status === 'received' 
                                            ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-600/10' 
                                            : 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-600/10'
                                        }`}>
                                            {order.status === 'received' && <span className="w-1 h-1 rounded-full bg-emerald-600 mr-1.5 animate-pulse" />}
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="flex justify-end items-center gap-3">
                                            {order.status !== 'received' && (
                                                <Button 
                                                    size="sm" 
                                                    onClick={() => handleReceiveOrder(order.id)} 
                                                    disabled={processingId === order.id} 
                                                    className="h-9 px-4 bg-slate-900 border-none hover:bg-emerald-600 text-[10px] font-black tracking-widest uppercase transition-all duration-300 shadow-sm hover:shadow-emerald-600/20"
                                                >
                                                    {processingId === order.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PackageCheck className="w-3.5 h-3.5 mr-2" />}
                                                    Mark as Received
                                                </Button>
                                            )}
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={() => handleViewDetails(order)} 
                                                className="h-9 px-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 group-hover:translate-x-1 transition-all duration-200"
                                            >
                                                <Eye className="w-4 h-4 mr-2" />
                                                <span className="text-[10px] font-black tracking-widest uppercase">Details</span>
                                                <ChevronRight className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-all" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* --- REDESIGNED DOCUMENT VIEW OVERLAY --- */}
            {viewingOrder && (
                <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-md flex justify-center items-start overflow-y-auto py-8 sm:py-16 px-4 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-4xl min-h-[11in] shadow-2xl rounded-xl flex flex-col relative animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 overflow-hidden">
                        
                        {/* Status Bar */}
                        <div className={`h-1.5 w-full ${viewingOrder.status === 'received' ? 'bg-emerald-500' : 'bg-indigo-600'}`} />

                        {/* Internal Toolbar */}
                        <div className="px-8 py-5 border-b border-slate-100 bg-white flex justify-between items-center sticky top-0 z-10 no-print">
                            <div className="flex items-center gap-4">
                                <div className="flex p-0.5 bg-slate-100 rounded-lg">
                                    <Button variant="ghost" size="sm" className="h-8 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-white hover:shadow-sm" onClick={() => window.print()}>
                                        <Printer className="w-3.5 h-3.5 mr-2" /> Print PO
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-8 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-white hover:shadow-sm">
                                        <Download className="w-3.5 h-3.5 mr-2" /> Export
                                    </Button>
                                </div>
                            </div>
                            <button 
                                onClick={() => setViewingOrder(null)} 
                                className="group w-10 h-10 flex items-center justify-center bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-all duration-300"
                            >
                                <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                            </button>
                        </div>

                        {/* DOCUMENT CONTENT */}
                        <div className="p-12 sm:p-20 flex-1 space-y-16 text-slate-900 printable-area leading-relaxed">
                            {/* Header Section */}
                            <div className="flex justify-between items-start">
                                <div className="space-y-6">
                                    <div className="bg-slate-900 text-white w-14 h-14 flex items-center justify-center rounded-2xl text-2xl font-black shadow-xl shadow-slate-900/20">A</div>
                                    <div>
                                        <h1 className="text-4xl font-black uppercase tracking-tight text-slate-900">Purchase Order</h1>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Transaction ID:</span>
                                            <span className="text-[10px] font-mono font-bold text-slate-800">{viewingOrder.id}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right flex flex-col items-end gap-3">
                                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-sm ${
                                        viewingOrder.status === 'received' 
                                        ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-600/20' 
                                        : 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-600/20'
                                    }`}>
                                        {viewingOrder.status}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Issue Date</p>
                                        <p className="text-sm font-bold text-slate-800">{new Date(viewingOrder.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Addresses Section */}
                            <div className="grid grid-cols-2 gap-16 border-t border-slate-100 pt-12">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                                        <Building2 className="w-3.5 h-3.5" /> From Supplier
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-xl font-black text-slate-900">{viewingOrder.suppliers?.name}</p>
                                        <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-[280px]">
                                            {viewingOrder.suppliers?.address || 'No registered business address provided for this vendor.'}
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                                        <ArrowUpRight className="w-3.5 h-3.5" /> For Reference
                                    </div>
                                    <div className="space-y-3 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ref No</span>
                                            <span className="text-xs font-mono font-bold text-slate-900">{viewingOrder.reference_number || '---'}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Type</span>
                                            <span className="text-xs font-bold text-slate-900">Standard Procurement</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Table Section */}
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Itemized Bill of Materials</h3>
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-200">
                                            <th className="pb-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Description</th>
                                            <th className="pb-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Unit Qty</th>
                                            <th className="pb-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">Cost Price</th>
                                            <th className="pb-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">Ext. Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {viewingOrder.items?.map((item: any, i: number) => (
                                            <tr key={i}>
                                                <td className="py-6">
                                                    <div className="text-sm font-bold text-slate-900">{item.products?.name}</div>
                                                    <div className="text-[9px] text-indigo-600 font-bold uppercase tracking-wider mt-1">{item.product_variants?.title} <span className="mx-2 text-slate-300 font-normal">|</span> SKU: {item.product_variants?.sku}</div>
                                                </td>
                                                <td className="py-6 text-sm text-center font-mono font-bold text-slate-600">{item.quantity}</td>
                                                <td className="py-6 text-sm text-right font-mono font-medium text-slate-500">₹{item.unit_cost?.toLocaleString()}</td>
                                                <td className="py-6 text-sm text-right font-mono font-bold text-slate-900">₹{(item.quantity * item.unit_cost).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Footer / Totals Section */}
                            <div className="flex justify-between items-end gap-12 pt-12">
                                <div className="flex-1 max-w-sm">
                                    <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Terms & Notes</p>
                                        <p className="text-[10px] text-slate-500 leading-relaxed italic">
                                            Inventory stock levels were updated dynamically upon marking this order as "Received". Please ensure physical count matches this document before filing.
                                        </p>
                                    </div>
                                </div>
                                <div className="w-72 space-y-4">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-400 uppercase tracking-[0.15em] font-bold">Subtotal Amount</span>
                                        <span className="font-mono font-bold text-slate-600">₹{viewingOrder.items?.reduce((a: any, b: any) => a + (b.quantity * b.unit_cost), 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-slate-900 text-white p-5 rounded-2xl shadow-xl shadow-slate-900/10">
                                        <span className="text-[10px] uppercase tracking-[0.2em] font-black">Total Credit</span>
                                        <span className="font-mono text-2xl font-black">₹{viewingOrder.items?.reduce((a: any, b: any) => a + (b.quantity * b.unit_cost), 0).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-16 pb-8 flex flex-col items-center gap-4 border-t border-slate-50">
                                <p className="text-[9px] text-slate-300 uppercase tracking-[0.3em] font-medium text-center">
                                    Authorized Official Procurement Seal
                                </p>
                                <div className="h-0.5 w-12 bg-slate-100" />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}