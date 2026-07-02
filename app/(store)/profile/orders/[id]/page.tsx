"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { ArrowLeft, Package, Clock, Truck, CheckCircle2, RefreshCw, XCircle } from "lucide-react"
import { toast } from "sonner"
import { useCart } from "@/components/store/use-cart"

const steps = [
    { status: "pending", label: "Placed", icon: Clock },
    { status: "processing", label: "Processing", icon: Package },
    { status: "shipped", label: "In Transit", icon: Truck },
    { status: "delivered", label: "Delivered", icon: CheckCircle2 },
]

export default function OrderDetailPage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const supabase = createClient()

    const [order, setOrder] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [cancelling, setCancelling] = useState(false)
    const [reordering, setReordering] = useState(false)
    const [fallbackLabel, setFallbackLabel] = useState("")
    const [returnRequests, setReturnRequests] = useState<any[]>([])
    const [rewardPoints, setRewardPoints] = useState<any>(null)
    const { addItem } = useCart()

    useEffect(() => {
        if (id) fetchOrder()
    }, [id])

    useEffect(() => {
        if (order?.shipping_address?.pincode && !order?.shipping_address?.delivery_label) {
            ;(async () => {
                const { data: zone } = await supabase
                    .from("shipping_zones")
                    .select("id")
                    .eq("pincode", order.shipping_address.pincode)
                    .maybeSingle()
                if (zone) {
                    const { data: methods } = await supabase
                        .from("shipping_methods")
                        .select("delivery_time_label")
                        .eq("zone_id", zone.id)
                        .eq("is_active", true)
                        .order("price", { ascending: true })
                        .limit(1)
                    if (methods?.length) setFallbackLabel(methods[0].delivery_time_label)
                }
            })()
        }
    }, [order?.shipping_address?.pincode])

    const fetchOrder = async () => {
        const { data: orderData } = await supabase
            .from("orders")
            .select(`
                *,
                order_items (
                    id, product_id, product_variant_id, product_name, variant_title, sku,
                    quantity, unit_price, mrp,
                    products:product_id (thumbnail_url, slug)
                )
            `)
            .eq("id", id)
            .single()

        if (orderData) {
            setOrder(orderData)
            const [{ data: returns }, { data: rewardPts }] = await Promise.all([
                supabase
                    .from("return_requests")
                    .select(`
                        id, product_id, product_variant_id, status, reason, admin_note, created_at,
                        return_status_logs(id, status, note, created_at)
                    `)
                    .eq("order_id", id),
                supabase
                    .from("reward_points")
                    .select("points, status, created_at")
                    .eq("order_id", id)
                    .eq("type", "earned")
                    .maybeSingle(),
            ])
            if (returns) setReturnRequests(returns)
            if (rewardPts) setRewardPoints(rewardPts)
        }
        setLoading(false)
    }

    const handleCancelOrder = async () => {
        if (!confirm("Are you sure you want to cancel this order?")) return
        setCancelling(true)
        try {
            const { error } = await supabase
                .from("orders")
                .update({ status: "cancelled" })
                .eq("id", id)
            if (error) throw error
            setOrder((prev: any) => ({ ...prev, status: "cancelled" }))
            toast.success("Order cancelled")
        } catch {
            toast.error("Failed to cancel order")
        } finally {
            setCancelling(false)
        }
    }

    const handleReorder = async () => {
        setReordering(true)
        try {
            const variantIds = order.order_items
                .map((i: any) => i.product_variant_id)
                .filter(Boolean)

            const { data: variants } = await supabase
                .from("product_variants")
                .select("id, stock, product_id, products!inner(category_id)")
                .in("id", variantIds)

            const stockMap: Record<string, number> = {}
            const catMap: Record<string, string> = {}
            if (variants) {
                for (const v of variants) {
                    stockMap[v.id] = v.stock
                    catMap[v.product_id] = (v.products as any).category_id
                }
            }

            for (const item of order.order_items) {
                if (!item.product_variant_id) continue
                addItem({
                    id: item.product_variant_id,
                    productId: item.product_id,
                    categoryId: catMap[item.product_id] || "",
                    variantId: item.product_variant_id,
                    name: item.product_name,
                    variantTitle: item.variant_title || "",
                    price: Number(item.unit_price),
                    mrp: Number(item.mrp || item.unit_price),
                    image: item.products?.thumbnail_url || "",
                    quantity: item.quantity,
                    stock: stockMap[item.product_variant_id] ?? 999,
                })
            }
            router.push("/cart")
            toast.success("Items added to cart")
        } catch {
            toast.error("Could not reorder items")
        } finally {
            setReordering(false)
        }
    }

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr)
        return d.toLocaleDateString("en-IN", {
            day: "numeric", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit",
        })
    }

    const getDeliveryLine = () => {
        if (order.status === "shipped") return "Out for delivery"
        if (order.status === "delivered") {
            if (order.delivered_at) {
                const d = new Date(order.delivered_at)
                return `Delivered on ${d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}`
            }
            return "Delivered"
        }
        const label = order?.shipping_address?.delivery_label || fallbackLabel
        if (!label || !order?.shipping_address?.pincode) return null
        const baseDate = order.shipped_at ? new Date(order.shipped_at) : new Date(order.created_at)
        const prefix = "Arriving by"
        if (/FRI\/SAT/i.test(label)) {
            const d = new Date(baseDate)
            const currentDay = d.getDay()
            let diff = 6 - currentDay
            if (diff <= 0) diff += 7
            d.setDate(d.getDate() + diff)
            return `${prefix} ${d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}`
        }
        const match = label.match(/(\d+)\s*-\s*\d+/)
        if (match) {
            const days = parseInt(match[1], 10)
            const d = new Date(baseDate)
            d.setDate(d.getDate() + days)
            return `${prefix} ${d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}`
        }
        return `${prefix} — ${label}`
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-white">
                <div className="flex items-center px-5 pt-14 pb-3">
                    <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center">
                        <ArrowLeft className="w-5 h-5 text-gray-800" />
                    </button>
                </div>
                <div className="px-5 space-y-4 mt-4">
                    <div className="h-5 bg-gray-100 rounded w-1/3 animate-pulse" />
                    <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />
                    <div className="h-20 bg-gray-100 rounded-xl animate-pulse" />
                </div>
            </div>
        )
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <p className="text-gray-500">Order not found</p>
            </div>
        )
    }

    const currentStep = steps.findIndex(s => s.status === order.status?.toLowerCase())
    const isCancelled = order.status === "cancelled"
    const address = order.shipping_address as any
    const discount = Number(order.promo_discount_amount) || 0
    const shipping = Number(order.shipping_price) || 0
    const subtotal = (Number(order.total) + discount) - shipping

    const statusColors: Record<string, string> = {
        pending: "#F59E0B",
        approved: "#22C55E",
        rejected: "#DC2626",
        refunded: "#3B82F6",
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <div className="flex items-center px-5 pt-3 pb-3">
                <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center -ml-2">
                    <ArrowLeft className="w-5 h-5 text-gray-800" />
                </button>
            </div>

            <div className="px-3.5 pb-24">
                {/* Receipt Card */}
                <div className="border border-gray-200 rounded-xl p-5">
                    {/* Header */}
                    <div className="flex flex-col items-center mb-5">
                        {isCancelled && (
                            <div className="flex items-center gap-1.5 bg-red-50 px-3 py-1 rounded-full mb-3">
                                <XCircle className="w-3.5 h-3.5 text-red-500" />
                                <span className="text-[10px] font-extrabold tracking-wider text-red-500">CANCELLED</span>
                            </div>
                        )}
                        <h2 className="text-[22px] font-extrabold tracking-widest text-gray-900">THE MAKEUP STORE</h2>
                        <p className="text-[9px] tracking-[0.25em] text-[#FC2779] mt-0.5">WANGKHEI</p>
                        <p className="text-[10px] tracking-wider text-gray-300 my-2.5">- - - - - - - - - - - - - - - -</p>
                        <p className="text-[10px] font-bold tracking-widest text-gray-400">ORDER RECEIPT</p>
                        <p className="text-[10px] tracking-wider text-gray-300 my-2.5">- - - - - - - - - - - - - - - -</p>
                    </div>

                    {/* Tracker */}
                    <div className="relative mb-5 mt-1">
                        <div className="absolute top-3.5 left-4 right-4 h-0.5 bg-gray-200" />
                        <div className="flex justify-between">
                            {steps.map((step, idx) => {
                                if (isCancelled && idx > 0) return null
                                const active = idx <= currentStep && !isCancelled
                                const current = idx === currentStep && !isCancelled
                                const Icon = step.icon
                                return (
                                    <div key={step.status} className="flex flex-col items-center gap-1.5 z-10">
                                        <div
                                            className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${
                                                active
                                                    ? "bg-[#FC2779] border-[#FC2779] text-white"
                                                    : "bg-white border-gray-200 text-gray-400"
                                            } ${current ? "animate-pulse" : ""}`}
                                        >
                                            <Icon className="w-3.5 h-3.5" />
                                        </div>
                                        <p className={`text-[8px] font-bold tracking-wider ${active ? "text-gray-900" : "text-gray-400"}`}>
                                            {step.label}
                                        </p>
                                        {current && (
                                            <p className="text-[6.5px] font-extrabold tracking-wider text-[#FC2779] uppercase">Current</p>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Order Info */}
                    <div className="text-center mb-1">
                        <p className="text-[13px] text-gray-900">Order No: MUS-{order.id.toUpperCase()}</p>
                        <p className="text-[13px] text-gray-400">{formatDate(order.created_at)}</p>
                    </div>

                    <p className="text-[10px] tracking-wider text-gray-300 my-2.5 text-center">- - - - - - - - - - - - - - - -</p>

                    {/* Items */}
                    <div className="mb-1">
                        <p className="text-[10px] font-bold tracking-widest text-gray-400 mb-3">ITEMS</p>
                        {order.order_items?.map((item: any) => {
                            const hasReturn = returnRequests.some(
                                r => r.product_id === item.product_id && (!item.product_variant_id || r.product_variant_id === item.product_variant_id)
                            )
                            const returnReq = returnRequests.find(
                                r => r.product_id === item.product_id && (!item.product_variant_id || r.product_variant_id === item.product_variant_id)
                            )

                            return (
                                <div key={item.id}>
                                    <div className="flex items-center gap-3 py-2.5 border-b border-gray-50">
                                        {item.products?.thumbnail_url ? (
                                            <img
                                                src={item.products.thumbnail_url}
                                                alt=""
                                                className="w-11 h-11 rounded object-cover bg-gray-50"
                                            />
                                        ) : (
                                            <div className="w-11 h-11 rounded bg-gray-50 flex items-center justify-center">
                                                <Package className="w-4 h-4 text-gray-300" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-medium text-gray-900 truncate">{item.product_name}</p>
                                            {item.variant_title && (
                                                <p className="text-[11px] text-gray-400">{item.variant_title}</p>
                                            )}
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-[11px] text-gray-500">×{item.quantity}</p>
                                            {Number(item.mrp) > Number(item.unit_price) && (
                                                <>
                                                    <p className="text-[11px] text-gray-400 line-through">₹{Math.round(Number(item.mrp) * item.quantity)}</p>
                                                    <p className="text-[11px] text-green-600">−₹{Math.round((Number(item.mrp) - Number(item.unit_price)) * item.quantity)}</p>
                                                </>
                                            )}
                                            <p className="text-[13px] font-semibold text-gray-900">₹{Math.round(item.unit_price * item.quantity)}</p>
                                        </div>
                                    </div>
                                    {order.status === "delivered" && !hasReturn && (
                                        <Link
                                            href={`/profile/orders/${order.id}/return?item=${item.id}`}
                                            className="w-full flex items-center justify-center gap-1.5 py-2 my-1 rounded-lg border border-gray-200 text-[#FC2779] text-xs font-bold"
                                        >
                                            <RefreshCw className="w-3.5 h-3.5" />
                                            Request Return
                                        </Link>
                                    )}
                                    {order.status === "delivered" && returnReq && (
                                        <div className="flex items-center gap-1.5 py-1.5 mb-1">
                                            <div
                                                className="w-2 h-2 rounded-full"
                                                style={{ backgroundColor: statusColors[returnReq.status] || "#999" }}
                                            />
                                            <p className="text-xs font-semibold text-gray-400 capitalize">
                                                Return {returnReq.status}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    <p className="text-[10px] tracking-wider text-gray-300 my-2.5 text-center">- - - - - - - - - - - - - - - -</p>

                    {/* Summary */}
                    <div className="mb-1">
                        <div className="flex justify-between mb-1.5">
                            <span className="text-[13px] text-gray-500">Subtotal</span>
                            <span className="text-[13px] font-medium text-gray-900">₹{Math.round(subtotal)}</span>
                        </div>
                        <div className="flex justify-between mb-1.5">
                            <span className="text-[13px] text-gray-500">Shipping</span>
                            <span className="text-[13px] font-medium text-gray-900">
                                {shipping ? `₹${shipping}` : "FREE"}
                            </span>
                        </div>
                        {discount > 0 && (
                            <div className="flex justify-between mb-1.5">
                                <span className="text-[13px] text-green-600">
                                    Promo ({order.promo_code})
                                </span>
                                <span className="text-[13px] font-medium text-green-600">-₹{discount}</span>
                            </div>
                        )}
                        <p className="text-[10px] tracking-wider text-gray-300 my-2 text-center">- - - - - - - - - - - - - - - -</p>
                        <div className="flex justify-between items-center mt-1 mb-2">
                            <span className="text-[17px] font-extrabold text-gray-900">TOTAL</span>
                            <span className="text-xl font-extrabold text-[#FC2779]">₹{Math.round(Number(order.total))}</span>
                        </div>
                        {rewardPoints && (
                            <div className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-green-50 mt-1">
                                <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                </svg>
                                <span className="text-[11px] font-bold text-gray-500">
                                    +{rewardPoints.points} points {rewardPoints.status === "available" ? "earned" : "pending (available after delivery)"}
                                </span>
                            </div>
                        )}
                        <div className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-gray-50 mt-1">
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                {order.payment_method} • {order.payment_status}
                            </span>
                        </div>
                    </div>

                    <p className="text-[10px] tracking-wider text-gray-300 my-2.5 text-center">- - - - - - - - - - - - - - - -</p>

                    {/* Address */}
                    {address && (
                        <div className="mb-1">
                            <p className="text-[10px] font-bold tracking-widest text-gray-400 mb-3">DELIVER TO</p>
                            <div className="space-y-0.5">
                                <p className="text-[13px] font-semibold text-gray-900">{address.full_name}</p>
                                <p className="text-[13px] text-gray-500 leading-relaxed">
                                    {address.street}
                                    {address.area_name ? `, ${address.area_name}` : ""}, {address.city}, {address.state} - {address.pincode}
                                </p>
                                <p className="text-[13px] text-gray-400">{address.phone}</p>
                                {!isCancelled && getDeliveryLine() && (
                                    <p className="text-xs font-semibold text-green-600 mt-1.5">
                                        {getDeliveryLine()}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    <p className="text-[10px] tracking-wider text-gray-300 my-2.5 text-center">- - - - - - - - - - - - - - - -</p>

                    {/* Footer */}
                    <div className="flex flex-col items-center gap-1">
                        <p className="text-[13px] font-semibold text-gray-400">Thank you for your order!</p>
                        <p className="text-[11px] text-gray-400">Need help? Contact our support team</p>
                    </div>
                </div>

                {/* Cancel Order */}
                {order.status === "pending" && (
                    <button
                        onClick={handleCancelOrder}
                        disabled={cancelling}
                        className="w-full mt-6 py-3.5 rounded-xl border-2 border-red-500 flex items-center justify-center gap-2"
                    >
                        {cancelling ? (
                            <svg className="w-4 h-4 animate-spin text-red-500" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        ) : (
                            <>
                                <XCircle className="w-4.5 h-4.5 text-red-500" />
                                <span className="text-[15px] font-bold text-red-500">Cancel Order</span>
                            </>
                        )}
                    </button>
                )}

                {/* Reorder */}
                {order.status === "delivered" && (
                    <button
                        onClick={handleReorder}
                        disabled={reordering}
                        className="w-full mt-4 py-3.5 rounded-xl bg-[#FC2779] flex items-center justify-center gap-2"
                    >
                        {reordering ? (
                            <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        ) : (
                            <>
                                <RefreshCw className="w-4.5 h-4.5 text-white" />
                                <span className="text-[15px] font-bold text-white">Reorder All</span>
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    )
}
