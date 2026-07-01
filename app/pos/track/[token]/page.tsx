import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"
import { Clock, CookingPot, CheckCircle, PackageCheck } from "lucide-react"

export const dynamic = "force-dynamic"

const STATUS_META: Record<string, { label: string; icon: any; color: string }> = {
    pending: { label: "Order Placed", icon: Clock, color: "text-slate-400" },
    preparing: { label: "Preparing", icon: CookingPot, color: "text-amber-500" },
    ready: { label: "Ready for Pickup", icon: CheckCircle, color: "text-emerald-500" },
    delivered: { label: "Delivered", icon: PackageCheck, color: "text-blue-500" },
    refunded: { label: "Refunded", icon: PackageCheck, color: "text-red-500" },
}

export default async function TrackTokenPage({ params }: any) {
    const { token } = await params
    const supabase = await createClient()

    const cleanToken = token.replace(/^K/i, "")
    const { data: order } = await supabase
        .from("pos_orders")
        .select(`
            *,
            pos_order_items(id, product_name, variant_title, quantity, unit_price)
        `)
        .or(`token_number.eq.${cleanToken},token_number.ilike.${cleanToken}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

    if (!order) notFound()

    const meta = STATUS_META[order.status] || STATUS_META.pending
    const steps = ["pending", "preparing", "ready", "delivered"]
    const currentStep = steps.indexOf(order.status)
    const MetaIcon = meta.icon

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Your Token</p>
                    <div className="text-7xl font-black text-slate-900 tracking-tight">
                        {order.token_number}
                    </div>
                </div>

                <div className="bg-white rounded-3xl border shadow-xl p-8 space-y-8">
                    <div className="text-center">
                        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3">
                            <MetaIcon className={`w-8 h-8 ${meta.color}`} />
                        </div>
                        <p className={`text-lg font-bold ${meta.color}`}>{meta.label}</p>
                    </div>

                    <div className="space-y-4">
                        {steps.map((step, i) => {
                            const m = STATUS_META[step]
                            const done = i <= currentStep
                            const current = i === currentStep
                            return (
                                <div key={step} className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                        done ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-300"
                                    } ${current ? "ring-4 ring-slate-900/10" : ""}`}>
                                        {done ? (
                                            <CheckCircle className="w-4 h-4" />
                                        ) : (
                                            <div className="w-2 h-2 rounded-full bg-slate-300" />
                                        )}
                                    </div>
                                    <div>
                                        <p className={`text-sm font-bold ${done ? "text-slate-900" : "text-slate-300"}`}>
                                            {m.label}
                                        </p>
                                        {current && order.status === "preparing" && order.prepared_at && (
                                            <p className="text-xs text-slate-400">
                                                {new Date(order.prepared_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                            </p>
                                        )}
                                        {current && order.status === "ready" && order.ready_at && (
                                            <p className="text-xs text-slate-400">
                                                Ready since {new Date(order.ready_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <div className="border-t pt-6 space-y-3">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Items</p>
                        {(order.pos_order_items || []).map((item: any) => (
                            <div key={item.id} className="flex justify-between text-sm">
                                <span className="text-slate-600">
                                    {item.product_name}{item.variant_title ? ` (${item.variant_title})` : ""} × {item.quantity}
                                </span>
                                <span className="font-semibold">₹{(item.unit_price * item.quantity).toLocaleString()}</span>
                            </div>
                        ))}
                        <div className="flex justify-between text-base font-bold border-t pt-3">
                            <span>Total</span>
                            <span>₹{order.grand_total?.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="border-t pt-4 flex justify-between text-sm">
                        <span className="text-slate-400">Payment</span>
                        <span className={`font-bold ${
                            order.payment_status === "paid" ? "text-emerald-600" : "text-amber-600"
                        }`}>
                            {order.payment_status === "paid" ? "Paid" : "Pending at Counter"}
                        </span>
                    </div>

                    {order.customer_name && (
                        <div className="text-center text-xs text-slate-400">
                            {order.customer_name} • {order.customer_phone}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
