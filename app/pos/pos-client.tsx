"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import {
    Plus, Minus, Trash2, Search, User, Phone, ShoppingBag, Clock,
    CookingPot, CheckCircle, PackageCheck, Loader2, X, ChevronRight,
    CreditCard, Banknote, Smartphone, Printer
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const STATUS_LABELS: Record<string, string> = {
    pending: "Pending",
    preparing: "Preparing",
    ready: "Ready",
    delivered: "Delivered",
}
const STATUS_COLORS: Record<string, string> = {
    pending: "bg-slate-100 text-slate-600",
    preparing: "bg-amber-50 text-amber-600",
    ready: "bg-emerald-50 text-emerald-600",
    delivered: "bg-blue-50 text-blue-600",
}

export default function PosClient({ cashierId, products, categories, pendingOrders: initialPending }: any) {
    const supabase = createClient()
    const searchRef = useRef<HTMLInputElement>(null)

    // Tab state
    const [tab, setTab] = useState<"new" | "orders">("new")

    // New order state
    const [cartItems, setCartItems] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [activeCategory, setActiveCategory] = useState<string | null>(null)
    const [customerName, setCustomerName] = useState("")
    const [customerPhone, setCustomerPhone] = useState("")
    const [showPayment, setShowPayment] = useState(false)
    const [paymentMethod, setPaymentMethod] = useState("cash")
    const [tendered, setTendered] = useState("")
    const [placing, setPlacing] = useState(false)

    // Active orders
    const [pendingOrders, setPendingOrders] = useState(initialPending)
    const [processingId, setProcessingId] = useState<string | null>(null)

    // Kiosk order lookup
    const [lookupQuery, setLookupQuery] = useState("")
    const [lookupResults, setLookupResults] = useState<any[]>([])

    const filteredProducts = useMemo(() => {
        let list = products
        if (activeCategory) list = list.filter((p: any) => p.category_id === activeCategory)
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            list = list.filter((p: any) =>
                p.name.toLowerCase().includes(q) ||
                p.product_variants?.some((v: any) => v.sku?.toLowerCase().includes(q))
            )
        }
        return list
    }, [products, activeCategory, searchQuery])

    const subtotal = cartItems.reduce((a, i) => a + i.price * i.quantity, 0)
    const grandTotal = subtotal

    // ─── Cart Actions ───
    const addToCart = useCallback((variant: any, product: any) => {
        const price = variant.discount_type && variant.discount_type !== "none"
            ? variant.discount_type === "percentage"
                ? Math.round(variant.price - (variant.price * (variant.discount_value || 0) / 100))
                : Math.round(variant.price - (variant.discount_value || 0))
            : Math.round(variant.price)
        setCartItems(prev => {
            const existing = prev.find(i => i.variantId === variant.id)
            if (existing) return prev.map(i => i.variantId === variant.id ? { ...i, quantity: i.quantity + 1 } : i)
            return [...prev, {
                variantId: variant.id, productId: product.id, name: product.name,
                variantTitle: variant.title || "Default", image: variant.image_url || product.thumbnail_url || "",
                price, quantity: 1, stock: variant.stock || 0, sku: variant.sku || "",
            }]
        })
    }, [])

    const updateQty = (variantId: string, qty: number) => {
        if (qty < 1) return
        setCartItems(prev => prev.map(i => i.variantId === variantId ? { ...i, quantity: qty } : i))
    }

    // ─── Kiosk Order Lookup ───
    useEffect(() => {
        if (!lookupQuery.trim()) { setLookupResults([]); return }
        const q = lookupQuery.toLowerCase()
        const fetchKiosk = async () => {
            const { data } = await supabase
                .from("pos_orders")
                .select(`
                    *, pos_order_items(id, product_name, variant_title, quantity, unit_price, total_price)
                `)
                .or(`token_number.ilike.${q},customer_phone.ilike.${q}`)
                .in("status", ["pending"])
                .order("created_at", { ascending: false })
                .limit(10)
            setLookupResults(data || [])
        }
        const timer = setTimeout(fetchKiosk, 300)
        return () => clearTimeout(timer)
    }, [lookupQuery, supabase])

    // ─── Place Counter Order ───
    const handlePlaceOrder = async () => {
        if (cartItems.length === 0) return
        setPlacing(true)
        try {
            const { data: seqData } = await supabase.rpc("get_next_pos_token")
            const seq = String(seqData || 1).padStart(3, "0")
            const token = `C${seq}`
            const orderNumber = `POS-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${seq}`

            const { data: order, error: orderErr } = await supabase
                .from("pos_orders")
                .insert({
                    order_number: orderNumber,
                    token_number: seq,
                    token_prefix: "C",
                    order_type: "counter",
                    status: "pending",
                    payment_status: "paid",
                    cashier_id: cashierId,
                    customer_name: customerName.trim() || null,
                    customer_phone: customerPhone.trim() || null,
                    subtotal,
                    grand_total: grandTotal,
                    payment_method: paymentMethod,
                    tendered_amount: paymentMethod === "cash" ? (parseFloat(tendered) || 0) : null,
                    change_amount: paymentMethod === "cash" ? Math.max(0, (parseFloat(tendered) || 0) - grandTotal) : 0,
                })
                .select()
                .single()
            if (orderErr) throw orderErr

            const { error: itemsErr } = await supabase.from("pos_order_items").insert(
                cartItems.map(i => ({
                    pos_order_id: order.id,
                    product_id: i.productId,
                    variant_id: i.variantId,
                    product_name: i.name,
                    variant_title: i.variantTitle,
                    sku: i.sku,
                    quantity: i.quantity,
                    unit_price: i.price,
                    total_price: i.price * i.quantity,
                }))
            )
            if (itemsErr) throw itemsErr

            for (const item of cartItems) {
                const { error: stockErr } = await supabase.rpc("decrement_stock", {
                    row_id: item.variantId, amount: item.quantity,
                })
                if (stockErr) {
                    await supabase.from("product_variants").update({ stock: Math.max(0, (item.stock || 0) - item.quantity) }).eq("id", item.variantId)
                }
                await supabase.from("stock_ledger").insert({
                    variant_id: item.variantId, change_amount: -item.quantity, entry_type: "sale", reference_id: order.id,
                })
            }

            toast.success(`Order ${token} completed`)
            setCartItems([])
            setCustomerName("")
            setCustomerPhone("")
            setShowPayment(false)
            setTendered("")
            setPendingOrders((prev: any[]) => [{ ...order, pos_order_items: [] }, ...prev])
        } catch (err: any) {
            toast.error(err.message || "Failed to place order")
        } finally {
            setPlacing(false)
        }
    }

    // ─── Kiosk Order Payment ───
    const handlePayKioskOrder = async (orderId: string) => {
        setProcessingId(orderId)
        try {
            await supabase.from("pos_orders").update({ payment_status: "paid" }).eq("id", orderId)
            setPendingOrders((prev: any[]) => prev.map(o => o.id === orderId ? { ...o, payment_status: "paid" } : o))
            // Deduct stock now that payment is received
            const { data: items } = await supabase
                .from("pos_order_items")
                .select("variant_id, quantity")
                .eq("pos_order_id", orderId)
            if (items) {
                for (const item of items) {
                    const { error: stockErr } = await supabase.rpc("decrement_stock", {
                        row_id: item.variant_id, amount: item.quantity,
                    })
                    if (stockErr) {
                        const { data: v } = await supabase.from("product_variants").select("stock").eq("id", item.variant_id).single()
                        if (v) await supabase.from("product_variants").update({ stock: Math.max(0, (v.stock || 0) - item.quantity) }).eq("id", item.variant_id)
                    }
                    await supabase.from("stock_ledger").insert({
                        variant_id: item.variant_id, change_amount: -item.quantity, entry_type: "sale", reference_id: orderId,
                    })
                }
            }
            toast.success("Payment received")
        } catch (err: any) {
            toast.error(err.message || "Failed to process payment")
        } finally {
            setProcessingId(null)
        }
    }

    // ─── Status Management ───
    const handleStatusChange = async (orderId: string, newStatus: string) => {
        setProcessingId(orderId)
        try {
            const update: any = { status: newStatus }
            if (newStatus === "preparing") update.prepared_at = new Date().toISOString()
            if (newStatus === "ready") update.ready_at = new Date().toISOString()
            if (newStatus === "delivered") update.delivered_at = new Date().toISOString()
            await supabase.from("pos_orders").update(update).eq("id", orderId)
            setPendingOrders((prev: any[]) =>
                newStatus === "delivered"
                    ? prev.filter(o => o.id !== orderId)
                    : prev.map(o => o.id === orderId ? { ...o, ...update } : o)
            )
            toast.success(`Marked as ${STATUS_LABELS[newStatus] || newStatus}`)
        } catch (err: any) {
            toast.error(err.message || "Failed to update")
        } finally {
            setProcessingId(null)
        }
    }

    // ─── Render ───
    const statusBadge = (status: string, paymentStatus?: string) => (
        <div className="flex items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${STATUS_COLORS[status] || "bg-slate-100 text-slate-500"}`}>
                {status === "preparing" && <CookingPot className="w-3 h-3" />}
                {status === "ready" && <CheckCircle className="w-3 h-3" />}
                {status === "pending" && <Clock className="w-3 h-3" />}
                {STATUS_LABELS[status] || status}
            </span>
            {paymentStatus === "pending" && (
                <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider">Unpaid</span>
            )}
        </div>
    )

    return (
        <div className="h-full flex flex-col">
            {/* Tab Bar */}
            <div className="h-12 border-b bg-white flex items-center px-4 gap-2 shrink-0">
                <button
                    onClick={() => setTab("new")}
                    className={`h-8 px-4 rounded-lg text-xs font-bold transition-all ${
                        tab === "new" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"
                    }`}
                >
                    <Plus className="w-3.5 h-3.5 inline mr-1.5" /> New Order
                </button>
                <button
                    onClick={() => setTab("orders")}
                    className={`h-8 px-4 rounded-lg text-xs font-bold transition-all ${
                        tab === "orders" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"
                    }`}
                >
                    <Clock className="w-3.5 h-3.5 inline mr-1.5" /> Active Orders
                    {pendingOrders.filter((o: any) => o.status !== "delivered").length > 0 && (
                        <span className="ml-1.5 w-5 h-5 rounded-full bg-white/20 text-white text-[9px] flex items-center justify-center inline-flex">
                            {pendingOrders.filter((o: any) => o.status !== "delivered").length}
                        </span>
                    )}
                </button>
            </div>

            {tab === "new" ? (
                <div className="flex-1 flex overflow-hidden">
                    {/* Left: Products */}
                    <div className="flex-1 flex flex-col min-w-0">
                        <div className="h-12 border-b flex items-center px-4 gap-3 shrink-0">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    ref={searchRef}
                                    type="text"
                                    placeholder="Search products or SKU..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full h-9 pl-9 pr-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 focus:bg-white"
                                />
                            </div>
                            <div className="flex gap-1 overflow-x-auto">
                                <button onClick={() => setActiveCategory(null)}
                                    className={`shrink-0 h-8 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                                        activeCategory === null ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                    }`}>All</button>
                                {categories.map((cat: any) => (
                                    <button key={cat.id} onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                                        className={`shrink-0 h-8 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                                            activeCategory === cat.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                        }`}>{cat.name}</button>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            <div className="grid grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5">
                                {filteredProducts.map((product: any) =>
                                    (product.product_variants || []).map((variant: any) => {
                                        const oos = (variant.stock ?? 0) <= 0
                                        return (
                                            <button key={variant.id} onClick={() => !oos && addToCart(variant, product)} disabled={oos}
                                                className={`relative flex flex-col rounded-xl border p-3 text-left transition-all ${
                                                    oos ? "bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed"
                                                        : "bg-white border-slate-200 hover:border-slate-900 hover:shadow-md cursor-pointer"
                                                }`}>
                                                <p className="text-xs font-bold text-slate-900 line-clamp-1">{product.name}</p>
                                                {product.has_variants && variant.title && (
                                                    <p className="text-[10px] text-slate-400">{variant.title}</p>
                                                )}
                                                <span className="text-sm font-bold text-slate-900 mt-1">₹{Math.round(variant.price).toLocaleString()}</span>
                                                {cartItems.find(i => i.variantId === variant.id) && (
                                                    <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-slate-900 text-white text-[9px] font-bold flex items-center justify-center">
                                                        {cartItems.find((i: any) => i.variantId === variant.id)!.quantity}
                                                    </span>
                                                )}
                                            </button>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Cart */}
                    <div className="w-[380px] border-l bg-white flex flex-col shrink-0">
                        <div className="h-12 border-b flex items-center justify-between px-4 shrink-0">
                            <span className="text-sm font-bold">Cart ({cartItems.length})</span>
                            {cartItems.length > 0 && (
                                <button onClick={() => { setCartItems([]); setCustomerName(""); setCustomerPhone("") }}
                                    className="text-[10px] font-bold text-red-400 hover:text-red-600">Clear</button>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                            {cartItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                                    <ShoppingBag className="w-10 h-10 mb-2" />
                                    <p className="text-xs font-medium">Cart is empty</p>
                                </div>
                            ) : (
                                cartItems.map(item => (
                                    <div key={item.variantId} className="flex gap-3 p-3 bg-slate-50 rounded-xl">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-900">{item.name}</p>
                                            {item.variantTitle !== "Default" && <p className="text-[10px] text-slate-400">{item.variantTitle}</p>}
                                            <p className="text-sm font-black text-slate-900 mt-1">₹{item.price.toLocaleString()}</p>
                                            <div className="flex items-center gap-1.5 mt-1.5">
                                                <button onClick={() => updateQty(item.variantId, item.quantity - 1)}
                                                    className="w-7 h-7 rounded-lg bg-white border flex items-center justify-center hover:bg-slate-100">
                                                    <Minus className="w-3 h-3" />
                                                </button>
                                                <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                                                <button onClick={() => updateQty(item.variantId, item.quantity + 1)}
                                                    className="w-7 h-7 rounded-lg bg-white border flex items-center justify-center hover:bg-slate-100">
                                                    <Plus className="w-3 h-3" />
                                                </button>
                                                <button onClick={() => setCartItems(prev => prev.filter(i => i.variantId !== item.variantId))}
                                                    className="ml-auto w-7 h-7 rounded-lg bg-white border flex items-center justify-center hover:bg-red-50">
                                                    <Trash2 className="w-3 h-3 text-slate-400 hover:text-red-500" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {cartItems.length > 0 && (
                            <div className="border-t p-4 space-y-3 bg-white">
                                <div className="space-y-2">
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input type="text" placeholder="Customer name" value={customerName}
                                            onChange={e => setCustomerName(e.target.value)}
                                            className="w-full h-9 pl-9 pr-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-300" />
                                    </div>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input type="tel" placeholder="Phone (optional)" value={customerPhone}
                                            onChange={e => setCustomerPhone(e.target.value)}
                                            className="w-full h-9 pl-9 pr-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-300" />
                                    </div>
                                </div>
                                <div className="flex justify-between items-baseline">
                                    <span className="text-slate-500">Total</span>
                                    <span className="text-2xl font-black">₹{grandTotal.toLocaleString()}</span>
                                </div>
                                <Button onClick={() => setShowPayment(true)}
                                    className="w-full h-12 text-sm font-bold bg-slate-900 hover:bg-slate-800">
                                    Charge ₹{grandTotal.toLocaleString()}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* ─── Active Orders Tab ─── */
                <div className="flex-1 flex overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {pendingOrders.filter((o: any) => o.status !== "delivered").length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 text-slate-300">
                                <PackageCheck className="w-12 h-12 mb-3" />
                                <p className="text-sm font-medium">No active orders</p>
                            </div>
                        ) : (
                            pendingOrders.filter((o: any) => o.status !== "delivered").map((order: any) => (
                                <div key={order.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-4">
                                            <div className="text-center min-w-[60px]">
                                                <p className="text-[10px] font-bold text-slate-400">{order.token_prefix}{order.token_number}</p>
                                                <p className="text-2xl font-black text-slate-900">{order.token_number}</p>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    {statusBadge(order.status, order.payment_status)}
                                                    <span className="text-[10px] text-slate-400">{order.order_type}</span>
                                                </div>
                                                {(order.customer_name || order.customer_phone) && (
                                                    <p className="text-xs text-slate-500">
                                                        {order.customer_name} {order.customer_phone ? `• ${order.customer_phone}` : ""}
                                                    </p>
                                                )}
                                                <div className="mt-1.5 text-xs text-slate-400 space-y-0.5">
                                                    {(order.pos_order_items || []).map((item: any) => (
                                                        <p key={item.id}>{item.product_name}{item.variant_title ? ` (${item.variant_title})` : ""} × {item.quantity}</p>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col items-end gap-2">
                                            <p className="text-lg font-black">₹{order.grand_total?.toLocaleString()}</p>
                                            <div className="flex gap-1.5">
                                                {order.payment_status === "pending" && (
                                                    <Button size="sm" onClick={() => handlePayKioskOrder(order.id)}
                                                        disabled={processingId === order.id}
                                                        className="h-8 px-3 text-[10px] font-bold bg-emerald-500 hover:bg-emerald-600 text-white border-none">
                                                        {processingId === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Pay"}
                                                    </Button>
                                                )}
                                                {order.payment_status === "paid" && order.status === "pending" && (
                                                    <Button size="sm" onClick={() => handleStatusChange(order.id, "preparing")}
                                                        disabled={processingId === order.id}
                                                        className="h-8 px-3 text-[10px] font-bold bg-slate-900 hover:bg-slate-800 text-white border-none">
                                                        {processingId === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Prep"}
                                                    </Button>
                                                )}
                                                {order.payment_status === "paid" && order.status === "preparing" && (
                                                    <Button size="sm" onClick={() => handleStatusChange(order.id, "ready")}
                                                        disabled={processingId === order.id}
                                                        className="h-8 px-3 text-[10px] font-bold bg-slate-900 hover:bg-slate-800 text-white border-none">
                                                        {processingId === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Ready"}
                                                    </Button>
                                                )}
                                                {order.status === "ready" && (
                                                    <Button size="sm" onClick={() => handleStatusChange(order.id, "delivered")}
                                                        disabled={processingId === order.id}
                                                        className="h-8 px-3 text-[10px] font-bold bg-emerald-500 hover:bg-emerald-600 text-white border-none">
                                                        {processingId === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Deliver"}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Kiosk Order Lookup */}
                    <div className="w-[360px] border-l bg-white flex flex-col shrink-0">
                        <div className="h-12 border-b flex items-center px-4 shrink-0">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kiosk Orders</span>
                        </div>
                        <div className="p-3 border-b">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input type="text" placeholder="Search by token or phone..." value={lookupQuery}
                                    onChange={e => setLookupQuery(e.target.value)}
                                    className="w-full h-9 pl-9 pr-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-300" />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {(lookupQuery.trim() ? lookupResults : pendingOrders.filter((o: any) => o.order_type === "kiosk" && o.status !== "delivered")).map((order: any) => (
                                <div key={order.id} className="p-4 border-b hover:bg-slate-50">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-lg font-black text-slate-900">
                                                {order.token_prefix}{order.token_number}
                                            </p>
                                            {(order.customer_name || order.customer_phone) && (
                                                <p className="text-xs text-slate-500">
                                                    {order.customer_name} {order.customer_phone ? `• ${order.customer_phone}` : ""}
                                                </p>
                                            )}
                                            <p className="text-xs text-slate-400 mt-1">
                                                {(order.pos_order_items || []).map((item: any) => item.product_name).join(", ")}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-base font-black">₹{order.grand_total?.toLocaleString()}</p>
                                            {statusBadge(order.status, order.payment_status)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {lookupQuery.trim() && lookupResults.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-300">
                                    <Search className="w-8 h-8 mb-2" />
                                    <p className="text-xs font-medium">No kiosk orders found</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {showPayment && (
                <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
                        <div className="text-center">
                            <p className="text-3xl font-black">₹{grandTotal.toLocaleString()}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: "cash", label: "Cash", icon: Banknote },
                                { id: "card", label: "Card", icon: CreditCard },
                                { id: "upi", label: "UPI", icon: Smartphone },
                            ].map(pm => {
                                const Icon = pm.icon
                                return (
                                    <button key={pm.id} onClick={() => setPaymentMethod(pm.id)}
                                        className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all ${
                                            paymentMethod === pm.id ? "border-slate-900 bg-slate-50" : "border-slate-200 text-slate-400"
                                        }`}>
                                        <Icon className="w-5 h-5" />
                                        <span className="text-[10px] font-bold">{pm.label}</span>
                                    </button>
                                )
                            })}
                        </div>
                        {paymentMethod === "cash" && (
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-500">Amount Tendered</label>
                                <input type="number" value={tendered} onChange={e => setTendered(e.target.value)}
                                    className="w-full h-12 text-right text-lg font-bold border-2 border-slate-200 rounded-xl px-4 focus:outline-none focus:border-slate-900"
                                    autoFocus
                                />
                                {parseFloat(tendered) >= grandTotal && (
                                    <p className="text-right text-sm font-bold text-emerald-600">
                                        Change: ₹{Math.round((parseFloat(tendered) - grandTotal) * 100) / 100}
                                    </p>
                                )}
                            </div>
                        )}
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => setShowPayment(false)} className="flex-1 h-12 text-sm font-bold">Cancel</Button>
                            <Button onClick={handlePlaceOrder} disabled={placing || (paymentMethod === "cash" && parseFloat(tendered || "0") < grandTotal)}
                                className="flex-1 h-12 text-sm font-bold bg-slate-900 hover:bg-slate-800">
                                {placing ? <Loader2 className="w-4 h-4 animate-spin" /> : `Pay ₹${grandTotal.toLocaleString()}`}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
