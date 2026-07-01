"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { X, Receipt, RotateCcw, Search, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function RecentOrders({ onClose }: { onClose: () => void }) {
    const [orders, setOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const supabase = createClient()

    useEffect(() => {
        fetchOrders()
    }, [])

    const fetchOrders = async () => {
        setLoading(true)
        const { data } = await supabase
            .from("pos_orders")
            .select(`
                *,
                pos_customers(name, phone),
                pos_order_items(
                    id, product_name, variant_title, quantity, unit_price, total_price
                )
            `)
            .order("created_at", { ascending: false })
            .limit(50)
        setOrders(data || [])
        setLoading(false)
    }

    const handleRefund = async (orderId: string) => {
        if (!window.confirm("Refund this order? Stock will be restored.")) return
        const { data: items } = await supabase
            .from("pos_order_items")
            .select("variant_id, quantity")
            .eq("pos_order_id", orderId)
        if (items) {
            for (const item of items) {
                const { data: v } = await supabase
                    .from("product_variants")
                    .select("stock")
                    .eq("id", item.variant_id)
                    .single()
                if (v) {
                    await supabase
                        .from("product_variants")
                        .update({ stock: (v.stock || 0) + item.quantity })
                        .eq("id", item.variant_id)
                }
            }
        }
        await supabase.from("pos_orders").update({ status: "refunded" }).eq("id", orderId)
        fetchOrders()
    }

    const filtered = search.trim()
        ? orders.filter(o =>
            o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
            o.pos_customers?.name?.toLowerCase().includes(search.toLowerCase()) ||
            o.pos_customers?.phone?.includes(search)
          )
        : orders

    return (
        <div className="flex flex-col h-full">
            <div className="h-14 border-b flex items-center justify-between px-5 shrink-0">
                <h2 className="text-sm font-bold flex items-center gap-2">
                    <Receipt className="w-4 h-4" /> Recent Orders
                </h2>
                <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="p-3 border-b">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search orders..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full h-9 pl-9 pr-3 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-300"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                        <Receipt className="w-10 h-10 mb-2" />
                        <p className="text-xs font-medium">No orders found</p>
                    </div>
                ) : (
                    filtered.map(order => (
                        <div key={order.id} className="p-4 border-b hover:bg-slate-50">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-bold font-mono">{order.order_number}</p>
                                    <p className="text-[10px] text-slate-400">
                                        {new Date(order.created_at).toLocaleString()}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {order.pos_customers?.name || order.pos_customers?.phone || "Walk-in"}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold">₹{order.grand_total?.toLocaleString()}</p>
                                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                        order.status === "completed"
                                            ? "bg-emerald-50 text-emerald-600"
                                            : order.status === "refunded"
                                            ? "bg-red-50 text-red-600"
                                            : "bg-amber-50 text-amber-600"
                                    }`}>
                                        {order.status}
                                    </span>
                                </div>
                            </div>
                            {order.pos_order_items && (
                                <div className="mt-2 text-[10px] text-slate-400">
                                    {order.pos_order_items.slice(0, 3).map((item: any) => (
                                        <p key={item.id}>
                                            {item.product_name}{item.variant_title ? ` (${item.variant_title})` : ""} × {item.quantity}
                                        </p>
                                    ))}
                                    {order.pos_order_items.length > 3 && (
                                        <p className="text-slate-300">+{order.pos_order_items.length - 3} more</p>
                                    )}
                                </div>
                            )}
                            {order.status === "completed" && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleRefund(order.id)}
                                    className="mt-2 h-7 px-2 text-[10px] text-red-400 hover:text-red-600 hover:bg-red-50"
                                >
                                    <RotateCcw className="w-3 h-3 mr-1" /> Refund
                                </Button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
