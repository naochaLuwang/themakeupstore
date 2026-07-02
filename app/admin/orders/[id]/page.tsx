
"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Printer, ArrowLeft, Globe, ShieldCheck, CheckCircle2, Clock, AlertCircle, Loader2, Truck, Ticket, Trash2, Save, Pencil, X, Calendar, ShoppingBag, PackageCheck } from "lucide-react"
import Link from "next/link"
import { QRCodeSVG } from "qrcode.react"
import { removeOrderItem, updateOrderDiscount } from "@/app/actions/orders"
import { getTypeStatuses, STATUS_LABELS } from "@/lib/order-status"
import { toast } from "sonner"
import { format } from "date-fns"

export default function OrderInvoicePage() {
    const { id } = useParams()
    const supabase = createClient()
    const [order, setOrder] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [isThermal, setIsThermal] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [editDiscount, setEditDiscount] = useState(0)
    const [editRemark, setEditRemark] = useState("")
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        async function fetchOrder() {
            const { data } = await supabase
                .from('orders')
                .select('*, order_items(*)')
                .eq('id', id)
                .single()
            setOrder(data)
            setEditDiscount(Number(data.promo_discount_amount || 0))
            setEditRemark(data.discount_remark || "")
            setLoading(false)
        }
        fetchOrder()
    }, [id])

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
    if (!order) return <div className="p-10 text-center text-slate-500 font-bold uppercase tracking-widest">Order not found</div>

    const subtotalMRP = order.order_items.reduce((acc: number, item: any) =>
        acc + (Number(item.mrp || item.unit_price) * item.quantity), 0)

    const subtotalActual = order.order_items.reduce((acc: number, item: any) =>
        acc + (Number(item.unit_price) * item.quantity), 0)

    const productSavings = subtotalMRP - subtotalActual
    const promoDiscount = Number(order.promo_discount_amount) || 0

    const TIMESTAMP_FIELDS: Record<string, string> = {
        confirmed_at: "Confirmed",
        ...(order.order_type === "delivery"
            ? {
                out_for_delivery_at: "Out for Delivery",
                failed_delivery_at: "Failed Delivery",
                delivered_at: "Delivered",
              }
            : {
                ready_for_pickup_at: "Ready for Pickup",
                no_show_at: "No Show",
                picked_up_at: "Picked Up",
              }),
    }

    async function toggleOrderType() {
        const newType = order.order_type === "delivery" ? "pickup" : "delivery"
        const { error } = await supabase.from('orders').update({ order_type: newType, status: "pending" }).eq('id', id)
        if (error) return toast.error("Failed to update order type")
        toast.success(`Order type changed to ${newType}, status reset to pending`)
        setOrder((o: any) => ({ ...o, order_type: newType, status: "pending" }))
    }

    async function handleRemoveItem(itemId: string, index: number) {
        const res = await removeOrderItem(itemId, id as string)
        if (res.success) {
            setOrder((o: any) => ({
                ...o,
                order_items: (res as any).order_items,
                total: (res as any).total
            }))
            toast.success("Item removed")
        } else {
            toast.error(res.message || "Failed to remove item")
        }
    }

    async function handleSaveDiscount() {
        setSaving(true)
        const res = await updateOrderDiscount(id as string, editDiscount, editRemark)
        if (res.success) {
            setOrder((o: any) => ({
                ...o,
                promo_discount_amount: editDiscount,
                discount_remark: editRemark,
                total: (o.order_items || []).reduce((acc: number, i: any) => acc + (Number(i.unit_price) * i.quantity), 0) - editDiscount + Number(o.additional_charges || 0) + Number(o.shipping_price || 0)
            }))
            toast.success("Discount updated")
        } else {
            toast.error(res.message || "Failed to update discount")
        }
        setSaving(false)
        setIsEditing(false)
    }

    const getStatusStyles = (status: string) => {
        const s = status?.toLowerCase()
        if (s === 'paid' || s === 'completed') return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', icon: <CheckCircle2 className="w-3 h-3" /> }
        if (s === 'pending') return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', icon: <Clock className="w-3 h-3" /> }
        return { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', icon: <AlertCircle className="w-3 h-3" /> }
    }

    const statusStyle = getStatusStyles(order.payment_status)

    return (
        <div className={`min-h-screen py-10 px-4 transition-colors duration-500 ${isThermal ? 'bg-zinc-200' : 'bg-white'}`}>
            <style jsx global>{`
    @media print {
        header, footer, nav, button, .no-print { display: none !important; }
        @page { size: ${isThermal ? '58mm auto' : 'A4'}; margin: 0; }
        body { background: white !important; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        #printable-invoice { border: none !important; box-shadow: none !important; position: absolute; top: 0; left: 0; width: ${isThermal ? '58mm' : '100%'} !important; padding: ${isThermal ? '1mm' : '12mm'} !important; border-radius: 0 !important; color: black !important; }
        svg { max-width: 100% !important; }
    }
`}</style>

            {/* TOP TOOLBAR */}
            <div className="max-w-4xl mx-auto mb-6 no-print">
                <div className="flex justify-between items-center">
                    <Button variant="ghost" asChild className="rounded-full font-bold">
                        <Link href={`/admin/orders`}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Link>
                    </Button>
                    <div className="flex gap-3">
                        {order.status === 'pending' && !isEditing && (
                            <button onClick={() => setIsEditing(true)}
                                className="h-10 px-5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider hover:bg-slate-50 hover:text-slate-900 transition-all flex items-center gap-2 bg-white shadow-sm"
                            >
                                <Pencil className="w-3.5 h-3.5" /> Edit
                            </button>
                        )}
                        <Button variant="outline" onClick={() => setIsThermal(!isThermal)} className={`rounded-full px-6 font-bold transition-all ${isThermal ? 'bg-slate-900 text-white hover:bg-black' : 'text-slate-500'}`}>
                            <Ticket className="w-4 h-4 mr-2" /> {isThermal ? 'A4 Format' : 'POS Mode'}
                        </Button>
                        <Button onClick={() => window.print()} className="rounded-full shadow-lg bg-slate-900 hover:bg-slate-800 transition-all font-bold text-white">
                            <Printer className="w-4 h-4 mr-2" /> Print {isThermal ? 'Receipt' : 'Invoice'}
                        </Button>
                    </div>
                </div>
            </div>

            <div id="printable-invoice" className={`mx-auto bg-white transition-all duration-500 overflow-hidden ${isThermal ? 'w-[58mm] p-2 rounded-none border-t border-black' : 'max-w-3xl p-12 rounded-[2.5rem] border-2 border-slate-50 shadow-sm relative'}`}>
                {/* BRANDING */}
                <div className={`${isThermal ? 'text-center mb-4' : 'flex justify-between items-start mb-8'} relative z-10`}>
                    <div>
                        <div className={`flex flex-col ${isThermal ? 'items-center' : ''}`}>
                            <span className={`${isThermal ? 'text-[14px] font-daciana' : 'text-3xl font-daciana'} font-black leading-none text-slate-900 uppercase`}>THE MAKEUP STORE</span>
                            <span className="text-[10px] font-light tracking-[0.2em] uppercase text-slate-400">WANGKHEI</span>
                        </div>
                        <div className={`text-[9px] text-slate-500 font-medium mt-2 leading-tight ${isThermal ? 'text-center' : ''}`}>
                            <p>Wangkhei Angom Leikai</p>
                            <p>Manipur 795005</p>
                        </div>
                    </div>
                    {!isThermal && (
                        <div className="text-right">
                            <h1 className="text-6xl font-black uppercase text-slate-100 leading-none italic select-none">Invoice</h1>
                            <p className="text-slate-400 font-mono text-[10px] mt-2 uppercase tracking-tighter">Ref: {order.id.slice(0, 8).toUpperCase()}</p>
                        </div>
                    )}
                </div>

                {!isThermal && (
                    <div className="mb-6 flex flex-wrap items-center gap-2">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} text-[10px] font-black uppercase tracking-widest`}>
                            {statusStyle.icon} Payment: {order.payment_status}
                        </div>
                        <button
                            onClick={toggleOrderType}
                            className={`no-print inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all hover:opacity-80 cursor-pointer ${
                                order.order_type === "delivery"
                                    ? "bg-sky-50 text-sky-700 border-sky-200"
                                    : "bg-teal-50 text-teal-700 border-teal-200"
                            }`}
                            title={`Click to switch to ${order.order_type === "delivery" ? "pickup" : "delivery"}`}
                        >
                            {order.order_type === "delivery" ? <ShoppingBag className="w-3 h-3" /> : <PackageCheck className="w-3 h-3" />}
                            {order.order_type}
                        </button>
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${
                            order.status === "cancelled" ? "bg-red-50 text-red-600 border-red-200" :
                            order.status === "delivered" || order.status === "picked_up" ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                            "bg-indigo-50 text-indigo-600 border-indigo-200"
                        }`}>
                            {order.status}
                        </div>
                    </div>
                )}

                {/* INFO */}
                <div className={`border-t border-b border-dashed border-slate-200 py-3 mb-4 ${isThermal ? 'space-y-1 text-[9px]' : 'grid grid-cols-2 gap-10 py-4 mb-6'}`}>
                    <div className={isThermal ? 'flex flex-col' : ''}>
                        <div className={isThermal ? 'flex justify-between w-full' : ''}>
                            <h3 className={isThermal ? 'font-bold uppercase' : 'text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1'}>{isThermal ? 'Order:' : 'Customer'}</h3>
                            <p className={isThermal ? 'font-mono' : 'font-black text-sm text-slate-900 uppercase'}>{isThermal ? `#${order.id.slice(0, 8).toUpperCase()}` : order.shipping_address?.full_name}</p>
                        </div>
                        {!isThermal && order.shipping_address?.phone && (
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">{order.shipping_address.phone}</p>
                        )}
                        {isThermal && (
                            <>
                                <div className="flex justify-between border-t border-dotted border-slate-100 pt-1 mt-1"><span className="font-bold uppercase">Customer:</span><span className="truncate ml-2">{order.shipping_address?.full_name}</span></div>
                                <div className="flex justify-between"><span className="font-bold uppercase">Phone:</span><span className="ml-2">{order.shipping_address?.phone || 'N/A'}</span></div>
                            </>
                        )}
                    </div>
                    {isThermal && (
                        <div className="flex flex-col border-t border-dotted border-slate-100 mt-1 pt-1">
                            <span className="font-bold uppercase text-slate-500 text-[8px]">Address:</span>
                            <p className="leading-tight text-slate-700">{order.shipping_address?.street}, {order.shipping_address?.area_name || ''}{order.shipping_address?.pincode ? ` - ${order.shipping_address.pincode}` : ''}</p>
                        </div>
                    )}
                    {!isThermal && (
                        <div>
                            <h3 className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Shipping</h3>
                            <p className="text-[9px] text-slate-600 font-medium leading-relaxed">{order.shipping_address?.street}, PIN: {order.shipping_address?.pincode}</p>
                            <p className="text-[8px] font-black text-slate-900 uppercase mt-1 flex items-center gap-1"><Truck className="w-2.5 h-2.5" /> {order.shipping_label || "Standard"}</p>
                        </div>
                    )}
                </div>

                {order.status === 'cancelled' && order.cancelled_by && (
                    <div className={`mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-red-100 bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest`}>
                        <AlertCircle className="w-3 h-3" /> Cancelled by {order.cancelled_by === 'admin' ? 'Store' : 'Customer'}
                    </div>
                )}

                {!isThermal && (
                    <div className="mb-4 flex flex-wrap gap-2">
                        {Object.entries(TIMESTAMP_FIELDS).map(([field, label]) => {
                            const val = order[field]
                            if (!val) return null
                            const colors = field === "delivered_at" || field === "picked_up_at"
                                ? "border-emerald-100 bg-emerald-50 text-emerald-600"
                                : field === "failed_delivery_at" || field === "no_show_at"
                                ? "border-red-100 bg-red-50 text-red-600"
                                : "border-slate-100 bg-slate-50 text-slate-600"
                            return (
                                <div key={field} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${colors}`}>
                                    <Calendar className="w-3 h-3" /> {label} {format(new Date(val), 'MMM d, h:mm a')}
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* ITEMS LIST */}
                <div className="space-y-4 mb-6">
                    {!isThermal && (
                        <div className="grid grid-cols-12 gap-2 text-[8px] font-black text-slate-300 uppercase tracking-widest pb-2 border-b">
                            <div className="col-span-5">Description</div>
                            <div className="col-span-2 text-right">MRP</div>
                            <div className="col-span-2 text-center">Disc.</div>
                            <div className="col-span-1 text-center">Qty</div>
                            <div className="col-span-2 text-right">Amount</div>
                        </div>
                    )}

                    {order.order_items.map((item: any, idx: number) => {
                        const mrp = Number(item.mrp || item.unit_price)
                        const rate = Number(item.unit_price)
                        const discPercent = mrp > rate ? Math.round(((mrp - rate) / mrp) * 100) : 0

                        return (
                            <div key={item.id} className={`${isThermal ? 'pb-2 border-b border-dotted border-slate-100' : `grid grid-cols-12 gap-2 items-center text-[11px] ${isEditing ? 'rounded-lg px-2 py-1 -mx-2 bg-blue-50/30 border border-blue-100/50' : ''}`}`}>
                                <div className={`${isThermal ? 'w-full mb-1' : 'col-span-5'} ${isEditing ? 'flex items-center gap-2' : ''}`}>
                                    {isEditing && !isThermal && (
                                        <button onClick={() => handleRemoveItem(item.id, idx)} className="h-7 w-7 flex items-center justify-center rounded-lg bg-red-50 border border-red-200 text-red-400 hover:text-red-600 hover:bg-red-100 transition-colors flex-shrink-0" title="Remove item">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                    <div>
                                        <p className={`font-black text-slate-900 uppercase leading-none ${isThermal ? 'text-[10px]' : ''}`}>{item.product_name}</p>
                                        <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">{item.variant_title}</p>
                                    </div>
                                </div>
                                {!isThermal && <div className="col-span-2 text-right text-slate-400 italic">₹{mrp.toLocaleString()}</div>}
                                {!isThermal && (
                                    <div className="col-span-2 text-center">
                                        {discPercent > 0 ? (
                                            <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 uppercase">{discPercent}% OFF</span>
                                        ) : <span className="text-slate-200">—</span>}
                                    </div>
                                )}
                                <div className={`${isThermal ? 'flex justify-between items-center text-[9px]' : 'col-span-1 text-center font-black'}`}>
                                    <span className={isThermal ? 'text-slate-500 font-bold' : ''}>{isThermal ? `${item.quantity} x ₹${rate.toLocaleString()}` : `x${item.quantity}`}</span>
                                    <span className={isThermal ? 'font-black text-slate-900' : 'hidden'}>{isThermal && `₹${(rate * item.quantity).toLocaleString()}`}</span>
                                </div>
                                {!isThermal && <div className="col-span-2 text-right font-black">₹{(rate * item.quantity).toLocaleString()}</div>}
                            </div>
                        )
                    })}
                </div>

                {/* TOTALS */}
                <div className={`pt-4 border-t-2 border-slate-900 border-dashed ${isThermal ? 'space-y-1' : 'flex flex-col items-end space-y-2'}`}>
                    <div className={`${isThermal ? 'flex justify-between' : 'w-48 flex justify-between'} text-[9px] font-bold text-slate-400 uppercase`}>
                        <span>{isThermal ? 'Items Total' : 'Subtotal (MRP)'}</span>
                        <span className="text-slate-900 font-black">₹{subtotalMRP.toLocaleString()}</span>
                    </div>
                    {productSavings > 0 && (
                        <div className={`${isThermal ? 'flex justify-between' : 'w-48 flex justify-between'} text-[9px] font-medium text-slate-400 uppercase italic`}>
                            <span>{isThermal ? 'Savings' : 'Item Discounts'}</span>
                            <span>-₹{productSavings.toLocaleString()}</span>
                        </div>
                    )}
                    <div className={`${isThermal ? 'flex justify-between border-y border-dotted border-slate-200 py-1' : 'w-48 flex justify-between border-y border-slate-100 py-1'} text-[9px] font-black text-slate-900 uppercase`}>
                        <span>Subtotal</span>
                        <span>₹{subtotalActual.toLocaleString()}</span>
                    </div>
                    <div className={`${isThermal ? 'flex justify-between' : 'w-48 flex justify-between'} text-[9px] font-bold text-slate-400 uppercase`}>
                        <span>Shipping</span>
                        <span className="text-slate-900 font-black">₹{order.shipping_price || 0}</span>
                    </div>
                    {promoDiscount > 0 && (
                        <div>
                            <div className={`${isThermal ? 'flex justify-between' : 'w-48 flex justify-between'} text-[9px] font-black text-emerald-600 uppercase`}>
                                <span className="flex items-center gap-1"><Ticket className="w-2.5 h-2.5" /> {order.promo_code || 'Manual Discount'}</span>
                                <span>-₹{promoDiscount.toLocaleString()}</span>
                            </div>
                            {order.discount_remark && !order.promo_code && (
                                <div className={`${isThermal ? 'text-[7px]' : 'w-56'} mt-1.5 px-2 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-right`}>
                                    <p className="text-[9px] font-bold text-emerald-700 leading-tight">{order.discount_remark}</p>
                                </div>
                            )}
                        </div>
                    )}
                    <div className={`${isThermal ? 'flex justify-between pt-2 border-t border-slate-900 border-dotted' : 'w-full flex justify-between items-end border-t-4 border-slate-900 pt-4 mt-2'}`}>
                        <div className={isThermal ? '' : 'text-left'}>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Net Payable</p>
                            <p className="text-[9px] font-black text-slate-900 uppercase italic leading-none">{order.payment_method}</p>
                        </div>
                        <p className={`${isThermal ? 'text-[18px]' : 'text-5xl'} font-black italic tracking-tighter text-slate-900`}>₹{Number(order.total).toLocaleString()}</p>
                    </div>
                </div>

                {/* QR & FOOTER */}
                <div className={`mt-6 flex flex-col items-center gap-3 ${isThermal ? 'border-t border-dotted pt-4' : 'mt-8 pt-8 border-t border-slate-50 gap-4'}`}>
                    <QRCodeSVG value={`https://themakeupstorewangkhei.com/track/${id}`} size={isThermal ? 50 : 80} />
                    <div className="text-center">
                        <p className="text-[8px] font-black text-slate-900 uppercase tracking-widest leading-none">Live Tracking Available</p>
                        {!isThermal && <p className="text-[7px] text-slate-400 mt-2 uppercase font-bold">Authorized computer generated invoice</p>}
                    </div>
                </div>

                {!isThermal && (
                    <div className="mt-8 flex justify-between items-center text-[7px] font-black text-slate-300 uppercase tracking-[0.3em] pt-4 border-t border-slate-50">
                        <div className="flex items-center gap-2"><ShieldCheck className="w-3 h-3" /> Secure Record</div>
                        <div className="flex items-center gap-2"><Globe className="w-3 h-3" /> makeupstorewangkhei.com</div>
                    </div>
                )}
            </div>

            {/* EDIT PANEL */}
            {isEditing && !isThermal && (
                <div className="max-w-4xl mx-auto mb-6 no-print">
                    <div className="rounded-xl border border-blue-200 bg-blue-50/50 shadow-sm p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-blue-100">
                                    <Pencil className="w-4 h-4 text-blue-600" />
                                </div>
                                <span className="text-sm font-bold text-slate-900">Edit Order</span>
                                <span className="text-[10px] text-slate-400 font-medium">#{order.id.slice(0, 8).toUpperCase()}</span>
                            </div>
                            <button
                                onClick={() => { setIsEditing(false); setEditDiscount(Number(order.promo_discount_amount || 0)); setEditRemark(order.discount_remark || "") }}
                                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                            >
                                <X className="w-3.5 h-3.5 text-slate-400" />
                            </button>
                        </div>

                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-4 space-y-1">
                                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Discount (₹)</label>
                                <Input
                                    type="number" min="0"
                                    value={editDiscount}
                                    onChange={(e) => setEditDiscount(parseFloat(e.target.value) || 0)}
                                    className="h-10 text-sm font-bold border-blue-200 bg-white rounded-xl"
                                />
                            </div>
                            <div className="col-span-5 space-y-1">
                                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Remark (reason)</label>
                                <Input
                                    value={editRemark}
                                    onChange={(e) => setEditRemark(e.target.value)}
                                    placeholder="Optional note..."
                                    className="h-10 text-sm border-blue-200 bg-white rounded-xl"
                                />
                            </div>
                            <div className="col-span-3 flex items-end gap-2">
                                <button
                                    onClick={handleSaveDiscount} disabled={saving}
                                    className="flex-1 h-10 rounded-xl bg-slate-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                    Save
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-500 pt-1 border-t border-blue-100">
                            <span>Click <strong className="text-red-500">×</strong> on any item below to remove it</span>
                            <span className="text-slate-300">|</span>
                            <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-500" />
                                Changes apply immediately after save
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
