"use client"

import { useState, useMemo, useCallback } from "react"
import { createClient } from "@/utils/supabase/client"
import { ShoppingBag, Plus, Minus, Trash2, ChevronLeft, Check, Phone, User, X, Loader2 } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"
import BarcodeScanner from "@/components/pos/barcode-scanner"

export default function KioskClient({ products, categories }: any) {
    const supabase = createClient()
    const [activeCategory, setActiveCategory] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [cartItems, setCartItems] = useState<any[]>([])
    const [showCart, setShowCart] = useState(false)
    const [checkoutStep, setCheckoutStep] = useState<"cart" | "details" | "token">("cart")
    const [customerName, setCustomerName] = useState("")
    const [customerPhone, setCustomerPhone] = useState("")
    const [tokenData, setTokenData] = useState<any>(null)
    const [placing, setPlacing] = useState(false)

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

    const cartCount = cartItems.reduce((a, i) => a + i.quantity, 0)
    const cartTotal = cartItems.reduce((a, i) => a + i.price * i.quantity, 0)

    const addToCart = useCallback((variant: any, product: any) => {
        const price = Math.round(variant.price)
        setCartItems(prev => {
            const existing = prev.find(i => i.variantId === variant.id)
            if (existing) {
                return prev.map(i =>
                    i.variantId === variant.id ? { ...i, quantity: i.quantity + 1 } : i
                )
            }
            return [...prev, {
                variantId: variant.id,
                productId: product.id,
                name: product.name,
                variantTitle: variant.title || "Default",
                image: variant.image_url || product.thumbnail_url || "",
                price,
                quantity: 1,
            }]
        })
    }, [])

    const updateQty = (variantId: string, qty: number) => {
        if (qty < 1) return
        setCartItems(prev => prev.map(i => i.variantId === variantId ? { ...i, quantity: qty } : i))
    }

    const removeItem = (variantId: string) => {
        setCartItems(prev => prev.filter(i => i.variantId !== variantId))
    }

    const handleBarcodeDetect = (value: string) => {
        setSearchQuery(value)
        toast.success(`Scanned: ${value}`)
    }

    const proceedToCheckout = () => {
        setCheckoutStep("details")
    }

    const handlePlaceOrder = async () => {
        if (!customerPhone.trim()) return
        setPlacing(true)
        try {
            const { data: seqData } = await supabase.rpc("get_next_pos_token")
            const seq = String(seqData || 1).padStart(3, "0")
            const token = `K${seq}`
            const orderNumber = `POS-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${seq}`

            const { data: order, error: orderErr } = await supabase
                .from("pos_orders")
                .insert({
                    order_number: orderNumber,
                    token_number: seq,
                    token_prefix: "K",
                    order_type: "kiosk",
                    status: "pending",
                    payment_status: "pending",
                    customer_name: customerName.trim() || null,
                    customer_phone: customerPhone.trim(),
                    subtotal: cartTotal,
                    grand_total: cartTotal,
                    payment_method: "pending",
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
                    quantity: i.quantity,
                    unit_price: i.price,
                    total_price: i.price * i.quantity,
                }))
            )
            if (itemsErr) throw itemsErr

            // Create/update POS customer
            const { data: existing } = await supabase
                .from("pos_customers")
                .select("id")
                .eq("phone", customerPhone.trim())
                .maybeSingle()

            if (existing) {
                await supabase
                    .from("pos_customers")
                    .update({
                        total_visits: supabase.rpc("increment_counter"),
                        last_visit: new Date().toISOString(),
                    })
                    .eq("id", existing.id)
            } else {
                await supabase.from("pos_customers").insert({
                    phone: customerPhone.trim(),
                    name: customerName.trim() || null,
                    total_visits: 1,
                    last_visit: new Date().toISOString(),
                })
            }

            setTokenData({ token, orderNumber: orderNumber })
            setCheckoutStep("token")
        } catch (err: any) {
            toast.error(err.message || "Failed to place order")
        } finally {
            setPlacing(false)
        }
    }

    const resetKiosk = () => {
        setCartItems([])
        setCustomerName("")
        setCustomerPhone("")
        setTokenData(null)
        setCheckoutStep("cart")
        setShowCart(false)
    }

    // ─── Token Screen ───
    if (tokenData) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white p-8">
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
                        <Check className="w-10 h-10 text-emerald-600" />
                    </div>
                    <p className="text-sm font-medium text-emerald-600 uppercase tracking-widest mb-2">Order Placed</p>
                    <div className="text-8xl font-black text-slate-900 tracking-tight mb-4">
                        {tokenData.token}
                    </div>
                    <p className="text-slate-500 text-sm mb-8">
                        Please proceed to the counter to complete your payment.
                        Show this token to the staff.
                    </p>
                    <div className="bg-slate-50 rounded-2xl p-6 border text-left space-y-2 mb-8">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Items</span>
                            <span className="font-semibold">{cartCount}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Total</span>
                            <span className="font-bold text-lg">₹{cartTotal.toLocaleString()}</span>
                        </div>
                        {customerName && (
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Name</span>
                                <span className="font-medium">{customerName}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Phone</span>
                            <span className="font-medium">{customerPhone}</span>
                        </div>
                    </div>
                    <button
                        onClick={resetKiosk}
                        className="h-14 px-10 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all"
                    >
                        New Order
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <header className="h-16 border-b bg-white flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-3 flex-1">
                    <ShoppingBag className="w-5 h-5" />
                    <h1 className="text-xl font-black tracking-tight">Kiosk</h1>
                    <div className="relative flex-1 max-w-xs ml-4">
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full h-10 pl-4 pr-4 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-200 focus:bg-white transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <BarcodeScanner onDetect={handleBarcodeDetect} />
                </div>
                <button
                    onClick={() => setShowCart(true)}
                    className="relative h-12 px-5 bg-slate-900 text-white rounded-xl flex items-center gap-2 text-sm font-bold hover:bg-slate-800 transition-all"
                >
                    <ShoppingBag className="w-5 h-5" />
                    Cart
                    {cartCount > 0 && (
                        <span className="ml-1 w-6 h-6 rounded-full bg-white text-slate-900 text-xs font-bold flex items-center justify-center">
                            {cartCount}
                        </span>
                    )}
                    {cartCount > 0 && (
                        <span className="ml-2 text-xs opacity-70">₹{cartTotal.toLocaleString()}</span>
                    )}
                </button>
            </header>

            {/* Categories */}
            <div className="h-16 border-b flex items-center gap-2 px-6 overflow-x-auto shrink-0">
                <button
                    onClick={() => setActiveCategory(null)}
                    className={`shrink-0 h-10 px-6 rounded-xl text-sm font-bold transition-all ${
                        activeCategory === null ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                >
                    All
                </button>
                {categories.map((cat: any) => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                        className={`shrink-0 h-10 px-6 rounded-xl text-sm font-bold transition-all ${
                            activeCategory === cat.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                    >
                        {cat.name}
                    </button>
                ))}
            </div>

            {/* Product Grid */}
            <div className="flex-1 overflow-y-auto p-6">
                {filteredProducts.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-300 text-sm font-medium">
                        No products in this category
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {filteredProducts.map((product: any) =>
                            (product.product_variants || []).map((variant: any) => {
                                const inCart = cartItems.find(i => i.variantId === variant.id)
                                const oos = (variant.stock ?? 0) <= 0
                                return (
                                    <button
                                        key={variant.id}
                                        onClick={() => !oos && addToCart(variant, product)}
                                        disabled={oos}
                                        className={`relative flex flex-col rounded-2xl border-2 p-4 text-left transition-all ${
                                            oos
                                                ? "border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed"
                                                : inCart
                                                ? "border-slate-900 bg-slate-50 cursor-pointer"
                                                : "border-slate-200 bg-white hover:border-slate-400 cursor-pointer"
                                        }`}
                                    >
                                        <div className="w-full aspect-square bg-slate-50 rounded-xl overflow-hidden mb-3 flex items-center justify-center">
                                            {(variant.image_url || product.thumbnail_url) ? (
                                                <Image
                                                    src={variant.image_url || product.thumbnail_url}
                                                    alt={variant.title || product.name}
                                                    width={160}
                                                    height={160}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-4xl font-bold text-slate-300">
                                                    {product.name.charAt(0)}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm font-bold text-slate-900 line-clamp-1">{product.name}</p>
                                        {product.has_variants && variant.title && (
                                            <p className="text-xs text-slate-400 mt-0.5">{variant.title}</p>
                                        )}
                                        <div className="flex items-center justify-between mt-2">
                                            <span className="text-lg font-black text-slate-900">
                                                ₹{Math.round(variant.price).toLocaleString()}
                                            </span>
                                            {inCart && (
                                                <span className="text-xs font-bold text-slate-500">×{inCart.quantity}</span>
                                            )}
                                        </div>
                                        {oos && (
                                            <span className="mt-1 text-[10px] font-bold uppercase text-red-500">Out of Stock</span>
                                        )}
                                    </button>
                                )
                            })
                        )}
                    </div>
                )}
            </div>

            {/* Cart Drawer */}
            {showCart && (
                <div className="fixed inset-0 z-50 flex">
                    <div className="flex-1 bg-black/30" onClick={() => setShowCart(false)} />
                    <div className="w-[480px] max-w-full bg-white flex flex-col animate-in slide-in-from-right">
                        {/* Cart Header */}
                        <div className="h-16 border-b flex items-center justify-between px-6 shrink-0">
                            <div className="flex items-center gap-3">
                                <button onClick={() => setShowCart(false)} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200">
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <h2 className="text-lg font-bold">Your Cart</h2>
                                <span className="text-sm text-slate-400">({cartCount} items)</span>
                            </div>
                            {cartItems.length > 0 && (
                                <button onClick={() => { setCartItems([]); setCheckoutStep("cart") }} className="text-xs font-bold text-red-400 hover:text-red-600">
                                    Clear
                                </button>
                            )}
                        </div>

                        {/* Cart Items */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {cartItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                                    <ShoppingBag className="w-12 h-12 mb-3" />
                                    <p className="text-sm font-medium">Cart is empty</p>
                                </div>
                            ) : (
                                cartItems.map(item => (
                                    <div key={item.variantId} className="flex gap-4 p-4 bg-slate-50 rounded-2xl">
                                        <div className="w-16 h-20 bg-white rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
                                            {item.image ? (
                                                <Image src={item.image} alt={item.name} width={64} height={80} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-xl font-bold text-slate-300">{item.name.charAt(0)}</span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-900">{item.name}</p>
                                            {item.variantTitle !== "Default" && (
                                                <p className="text-xs text-slate-400">{item.variantTitle}</p>
                                            )}
                                            <p className="text-base font-black text-slate-900 mt-1">₹{item.price.toLocaleString()}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <button onClick={() => updateQty(item.variantId, item.quantity - 1)} className="w-9 h-9 rounded-xl bg-white border flex items-center justify-center hover:bg-slate-100">
                                                    <Minus className="w-4 h-4" />
                                                </button>
                                                <span className="w-8 text-center text-base font-bold">{item.quantity}</span>
                                                <button onClick={() => updateQty(item.variantId, item.quantity + 1)} className="w-9 h-9 rounded-xl bg-white border flex items-center justify-center hover:bg-slate-100">
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => removeItem(item.variantId)} className="ml-auto w-9 h-9 rounded-xl bg-white border flex items-center justify-center hover:bg-red-50 hover:border-red-200">
                                                    <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-500" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Checkout */}
                        {cartItems.length > 0 && checkoutStep === "cart" && (
                            <div className="border-t p-6 space-y-4 bg-white">
                                <div className="flex justify-between items-baseline">
                                    <span className="text-slate-500">Total</span>
                                    <span className="text-3xl font-black">₹{cartTotal.toLocaleString()}</span>
                                </div>
                                <button
                                    onClick={proceedToCheckout}
                                    className="w-full h-14 bg-slate-900 text-white text-base font-bold rounded-xl hover:bg-slate-800 transition-all"
                                >
                                    Continue — ₹{cartTotal.toLocaleString()}
                                </button>
                                <p className="text-center text-xs text-slate-400">Pay at counter after placing order</p>
                            </div>
                        )}

                        {/* Customer Details Step */}
                        {checkoutStep === "details" && (
                            <div className="border-t p-6 space-y-4 bg-white">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phone Number *</label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            type="tel"
                                            placeholder="Enter your phone number"
                                            value={customerPhone}
                                            onChange={e => setCustomerPhone(e.target.value)}
                                            className="w-full h-14 pl-12 pr-4 text-base border-2 border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 transition-all"
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Name (optional)</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Enter your name"
                                            value={customerName}
                                            onChange={e => setCustomerName(e.target.value)}
                                            className="w-full h-14 pl-12 pr-4 text-base border-2 border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-between items-baseline pt-2">
                                    <span className="text-slate-500">Total</span>
                                    <span className="text-3xl font-black">₹{cartTotal.toLocaleString()}</span>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setCheckoutStep("cart")}
                                        className="h-14 px-6 border-2 border-slate-200 text-sm font-bold rounded-xl hover:bg-slate-50"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={handlePlaceOrder}
                                        disabled={!customerPhone.trim() || placing}
                                        className="flex-1 h-14 bg-slate-900 text-white text-base font-bold rounded-xl hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                                    >
                                        {placing ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                <Check className="w-5 h-5 mr-2" /> Place Order
                                            </>
                                        )}
                                    </button>
                                </div>
                                <p className="text-center text-xs text-slate-400">
                                    Your order will be sent to the counter. Show your token to pay and collect.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
