"use client"

import { useState, useMemo } from "react"
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
    ArrowUpRight,
    Search,
    Trash2,
    Edit,
    CheckCircle,
    ArrowLeft,
    ArrowRight,
    AlertTriangle,
    FileDown
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

export default function PurchaseListClient({ initialOrders }: any) {
    const [orders, setOrders] = useState(initialOrders)
    const [viewingOrder, setViewingOrder] = useState<any>(null)
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const pageSize = 10

    // Edit state
    const [isEditing, setIsEditing] = useState(false)
    const [editItems, setEditItems] = useState<any[]>([])
    const [savingEdit, setSavingEdit] = useState(false)

    const supabase = createClient()

    const filteredOrders = useMemo(() => {
        if (!searchQuery.trim()) return orders
        const q = searchQuery.toLowerCase()
        return orders.filter((o: any) =>
            (o.reference_number || "").toLowerCase().includes(q) ||
            (o.suppliers?.name || "").toLowerCase().includes(q)
        )
    }, [orders, searchQuery])

    const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize))
    const safePage = Math.min(currentPage, totalPages)

    const paginatedOrders = useMemo(() => {
        const start = (safePage - 1) * pageSize
        return filteredOrders.slice(start, start + pageSize)
    }, [filteredOrders, safePage])

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
        setViewingOrder({ ...order, items: data || [] })
        setIsEditing(false)
    }

    const handleDeleteOrder = async (orderId: string) => {
        if (!window.confirm("Are you sure you want to delete this purchase order? This action cannot be undone.")) return
        setDeleteId(orderId)
        try {
            const { error: itemsErr } = await supabase.from('purchase_order_items').delete().eq('purchase_order_id', orderId)
            if (itemsErr) throw itemsErr
            const { error: poErr } = await supabase.from('purchase_orders').delete().eq('id', orderId)
            if (poErr) throw poErr
            toast.success("Purchase order deleted")
            setOrders(orders.filter((o: any) => o.id !== orderId))
        } catch (err: any) {
            toast.error(err.message || "Failed to delete")
        } finally {
            setDeleteId(null)
        }
    }

    const handleMarkOrdered = async (orderId: string) => {
        setProcessingId(orderId)
        try {
            const { error } = await supabase.from('purchase_orders').update({ status: 'ordered' }).eq('id', orderId)
            if (error) throw error
            toast.success("Order marked as ordered")
            setOrders(orders.map((o: any) => o.id === orderId ? { ...o, status: 'ordered' } : o))
        } catch (err: any) {
            toast.error(err.message || "Failed to update status")
        } finally {
            setProcessingId(null)
        }
    }

    const handleReceiveOrder = async (orderId: string) => {
        const confirm = window.confirm("Marking as received will increase live stock levels for all items in this order. Continue?")
        if (!confirm) return
        setProcessingId(orderId)

        try {
            const { data: items, error: itemsErr } = await supabase
                .from('purchase_order_items')
                .select('variant_id, quantity')
                .eq('purchase_order_id', orderId)

            if (itemsErr) throw itemsErr

            const { data: currentOrder, error: poCheckErr } = await supabase
                .from('purchase_orders')
                .select('status')
                .eq('id', orderId)
                .single()

            if (poCheckErr || currentOrder?.status === 'received') {
                throw new Error("Order is already marked as received or could not be verified.")
            }

            // Aggregate quantities by variant_id (same variant may appear on multiple rows)
            const qtyMap = new Map<string, number>()
            for (const item of items) {
                qtyMap.set(item.variant_id, (qtyMap.get(item.variant_id) || 0) + item.quantity)
            }

            for (const [variantId, qty] of qtyMap) {
                const { data: variant, error: varErr } = await supabase
                    .from('product_variants')
                    .select('stock')
                    .eq('id', variantId)
                    .single()

                if (variant && !varErr) {
                    await supabase
                        .from('product_variants')
                        .update({ stock: variant.stock + qty })
                        .eq('id', variantId)

                    await supabase.from('stock_ledger').insert({
                        variant_id: variantId,
                        change_amount: qty,
                        entry_type: 'purchase',
                        reference_id: orderId
                    })
                }
            }

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

    const handleStartEdit = () => {
        setEditItems(viewingOrder.items.map((i: any) => ({ ...i })))
        setIsEditing(true)
    }

    const handleSaveEdit = async () => {
        setSavingEdit(true)
        try {
            for (const item of editItems) {
                const orig = viewingOrder.items.find((i: any) => i.id === item.id)
                if (orig.quantity !== item.quantity || orig.unit_cost !== item.unit_cost) {
                    const { error } = await supabase
                        .from('purchase_order_items')
                        .update({ quantity: item.quantity, unit_cost: item.unit_cost })
                        .eq('id', item.id)
                    if (error) throw error
                }
            }
            const total = editItems.reduce((a: number, i: any) => a + (i.quantity * i.unit_cost), 0)
            await supabase.from('purchase_orders').update({ total_cost: total }).eq('id', viewingOrder.id)

            toast.success("Purchase order updated")
            setViewingOrder({ ...viewingOrder, items: editItems, total_cost: total })
            setOrders(orders.map((o: any) => o.id === viewingOrder.id ? { ...o, total_cost: total, items: editItems } : o))
            setIsEditing(false)
        } catch (err: any) {
            toast.error(err.message || "Failed to save changes")
        } finally {
            setSavingEdit(false)
        }
    }

    const handleExportCSV = () => {
        const rows = [["Ref No", "Supplier", "Date", "Status", "Total"]]
        orders.forEach((o: any) => {
            rows.push([
                o.reference_number || "",
                o.suppliers?.name || "",
                new Date(o.created_at).toLocaleDateString(),
                o.status,
                o.total_cost?.toLocaleString() || "0"
            ])
        })
        const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n")
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `purchase-orders-${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
        toast.success("CSV exported")
    }

    const statusBadge = (status: string) => {
        const map: Record<string, string> = {
            draft: 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-600/10',
            ordered: 'bg-amber-50 text-amber-600 ring-1 ring-amber-600/10',
            received: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-600/10',
            cancelled: 'bg-red-50 text-red-600 ring-1 ring-red-600/10',
        }
        return (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest leading-none ${map[status] || 'bg-slate-50 text-slate-500 ring-1 ring-slate-200'}`}>
                {status === 'received' && <span className="w-1 h-1 rounded-full bg-emerald-600 mr-1.5 animate-pulse" />}
                {status || 'draft'}
            </span>
        )
    }

    const smallStatusBadge = (status: string) => {
        const colors: Record<string, string> = {
            draft: 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-600/20',
            ordered: 'bg-amber-50 text-amber-600 ring-1 ring-amber-600/20',
            received: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-600/20',
            cancelled: 'bg-red-50 text-red-600 ring-1 ring-red-600/20',
        }
        return (
            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-sm ${colors[status] || 'bg-slate-50 text-slate-500 ring-1 ring-slate-200'}`}>
                {status || 'draft'}
            </span>
        )
    }

    return (
        <div className="space-y-6">
            {/* Search + Actions bar */}
            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search by ref or supplier..."
                        value={searchQuery}
                        onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                        className="pl-9 h-10 text-sm bg-white border-slate-200 focus:bg-white"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-9 px-3 text-[10px] font-bold uppercase tracking-wider">
                        <FileDown className="w-3.5 h-3.5 mr-1.5" /> Export CSV
                    </Button>
                </div>
            </div>

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
                        {paginatedOrders.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-8 py-20 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <FileText className="w-10 h-10 text-slate-200" />
                                        <p className="text-sm font-medium text-slate-400">
                                            {searchQuery ? "No purchase records match your search" : "No purchase records found"}
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            paginatedOrders.map((order: any) => {
                                const isDraft = order.status === 'draft'
                                const isOrdered = order.status === 'ordered'
                                const isReceived = order.status === 'received'
                                return (
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
                                        <td className="px-6 py-5">{statusBadge(order.status)}</td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex justify-end items-center gap-2">
                                                {isDraft && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleMarkOrdered(order.id)}
                                                            disabled={processingId === order.id}
                                                            className="h-9 px-3 bg-amber-500 hover:bg-amber-600 text-white text-[9px] font-black tracking-widest uppercase border-none shadow-sm"
                                                        >
                                                            {processingId === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3 mr-1.5" />}
                                                            Mark Ordered
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleDeleteOrder(order.id)}
                                                            disabled={deleteId === order.id}
                                                            className="h-9 px-2 text-slate-300 hover:text-red-500 hover:bg-red-50"
                                                        >
                                                            {deleteId === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                        </Button>
                                                    </>
                                                )}
                                                {(isOrdered || isReceived) && !isReceived && (
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
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {filteredOrders.length > pageSize && (
                <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-slate-500 font-medium">
                        Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filteredOrders.length)} of {filteredOrders.length}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={safePage <= 1}
                            onClick={() => setCurrentPage(safePage - 1)}
                            className="h-8 w-8 p-0"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                        </Button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                            <Button
                                key={p}
                                variant={p === safePage ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(p)}
                                className={`h-8 w-8 p-0 text-xs font-bold ${p === safePage ? 'bg-slate-900 text-white' : ''}`}
                            >
                                {p}
                            </Button>
                        ))}
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={safePage >= totalPages}
                            onClick={() => setCurrentPage(safePage + 1)}
                            className="h-8 w-8 p-0"
                        >
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </div>
            )}

            {/* --- DOCUMENT VIEW OVERLAY --- */}
            {viewingOrder && (
                <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-md flex justify-center items-start overflow-y-auto py-8 sm:py-16 px-4 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-4xl min-h-[11in] shadow-2xl rounded-xl flex flex-col relative animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 overflow-hidden">

                        {/* Status Bar */}
                        <div className={`h-1.5 w-full ${viewingOrder.status === 'received' ? 'bg-emerald-500' : viewingOrder.status === 'ordered' ? 'bg-amber-500' : 'bg-indigo-600'}`} />

                        {/* Internal Toolbar */}
                        <div className="px-8 py-5 border-b border-slate-100 bg-white flex justify-between items-center sticky top-0 z-10 no-print">
                            <div className="flex items-center gap-4">
                                <div className="flex p-0.5 bg-slate-100 rounded-lg">
                                    <Button variant="ghost" size="sm" className="h-8 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-white hover:shadow-sm" onClick={() => window.print()}>
                                        <Printer className="w-3.5 h-3.5 mr-2" /> Print PO
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-8 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-white hover:shadow-sm" onClick={handleExportCSV}>
                                        <Download className="w-3.5 h-3.5 mr-2" /> Export
                                    </Button>
                                </div>
                                {viewingOrder.status === 'draft' && !isEditing && (
                                    <Button variant="outline" size="sm" onClick={handleStartEdit} className="h-8 px-3 text-[10px] font-bold uppercase tracking-wider text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                                        <Edit className="w-3.5 h-3.5 mr-1.5" /> Edit Items
                                    </Button>
                                )}
                                {isEditing && (
                                    <div className="flex items-center gap-2">
                                        <Button size="sm" onClick={handleSaveEdit} disabled={savingEdit} className="h-8 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold uppercase tracking-wider">
                                            {savingEdit ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                                            Save Changes
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} className="h-8 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                            Cancel
                                        </Button>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => { setViewingOrder(null); setIsEditing(false) }}
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
                                    {smallStatusBadge(viewingOrder.status)}
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
                                        {(isEditing ? editItems : viewingOrder.items)?.map((item: any, i: number) => (
                                            <tr key={item.id || i}>
                                                <td className="py-6">
                                                    <div className="text-sm font-bold text-slate-900">{item.products?.name}</div>
                                                    <div className="text-[9px] text-indigo-600 font-bold uppercase tracking-wider mt-1">{item.product_variants?.title} <span className="mx-2 text-slate-300 font-normal">|</span> SKU: {item.product_variants?.sku}</div>
                                                </td>
                                                <td className="py-6 text-sm text-center font-mono font-bold">
                                                    {isEditing ? (
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            value={editItems[i]?.quantity ?? item.quantity}
                                                            onChange={e => {
                                                                const copy = [...editItems]
                                                                copy[i] = { ...copy[i], quantity: parseInt(e.target.value) || 0 }
                                                                setEditItems(copy)
                                                            }}
                                                            className="w-20 text-center border border-slate-200 rounded-lg py-1.5 text-sm font-mono font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                                                        />
                                                    ) : (
                                                        <span className="text-slate-600">{item.quantity}</span>
                                                    )}
                                                </td>
                                                <td className="py-6 text-sm text-right font-mono font-medium">
                                                    {isEditing ? (
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            step={0.01}
                                                            value={editItems[i]?.unit_cost ?? item.unit_cost}
                                                            onChange={e => {
                                                                const copy = [...editItems]
                                                                copy[i] = { ...copy[i], unit_cost: parseFloat(e.target.value) || 0 }
                                                                setEditItems(copy)
                                                            }}
                                                            className="w-28 text-right border border-slate-200 rounded-lg py-1.5 text-sm font-mono font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                                                        />
                                                    ) : (
                                                        <span className="text-slate-500">₹{item.unit_cost?.toLocaleString()}</span>
                                                    )}
                                                </td>
                                                <td className="py-6 text-sm text-right font-mono font-bold text-slate-900">
                                                    ₹{((isEditing ? editItems[i]?.quantity ?? item.quantity : item.quantity) * (isEditing ? editItems[i]?.unit_cost ?? item.unit_cost : item.unit_cost)).toLocaleString()}
                                                </td>
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
                                        <span className="font-mono font-bold text-slate-600">₹{((isEditing ? editItems : viewingOrder.items) || []).reduce((a: any, b: any) => a + (b.quantity * b.unit_cost), 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-slate-900 text-white p-5 rounded-2xl shadow-xl shadow-slate-900/10">
                                        <span className="text-[10px] uppercase tracking-[0.2em] font-black">Total Credit</span>
                                        <span className="font-mono text-2xl font-black">₹{((isEditing ? editItems : viewingOrder.items) || []).reduce((a: any, b: any) => a + (b.quantity * b.unit_cost), 0).toLocaleString()}</span>
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
