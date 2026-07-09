"use client"

import { Dialog, DialogContent, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Gift, History, X, ExternalLink } from "lucide-react"

function fmt(n: number) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)
}

function fd(d: string) {
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

function fdt(d: string) {
    return new Date(d).toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    })
}

const sBadge: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700",
    redeemed: "bg-blue-50 text-blue-700",
    expired: "bg-slate-100 text-slate-500",
    disabled: "bg-red-50 text-red-700",
}

const oBadge: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700",
    confirmed: "bg-blue-50 text-blue-700",
    shipped: "bg-indigo-50 text-indigo-700",
    delivered: "bg-emerald-50 text-emerald-700",
    cancelled: "bg-red-50 text-red-700",
}

function InfoBlock({ items }: { items: { label: string; value: string | React.ReactNode }[] }) {
    return (
        <div className="space-y-1.5">
            {items.map((item, i) => (
                <div key={i} className="flex items-baseline justify-between gap-4">
                    <span className="text-xs text-slate-400 shrink-0">{item.label}</span>
                    <span className="text-sm font-medium text-slate-900 text-right">{item.value}</span>
                </div>
            ))}
        </div>
    )
}

export function GiftCardDialog({ gc }: { gc: any }) {
    const redemptions = gc.gift_card_redemptions || []
    const redeemedTotal = redemptions.reduce((s: number, r: any) => s + Number(r.amount), 0)
    const now = new Date()
    const expiry = gc.expires_at ? new Date(gc.expires_at) : null
    const daysLeft = expiry ? Math.ceil((expiry.getTime() - now.getTime()) / 86400000) : null

    const validityColor = !expiry ? "bg-slate-50"
        : daysLeft! < 0 ? "bg-red-50"
        : daysLeft! <= 30 ? "bg-amber-50"
        : "bg-emerald-50"

    const validityText = !expiry ? "No expiry"
        : daysLeft! < 0 ? `${Math.abs(daysLeft!)} days overdue`
        : daysLeft! === 0 ? "Expires today"
        : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`

    const validityTextColor = !expiry ? "text-slate-500"
        : daysLeft! < 0 ? "text-red-600"
        : daysLeft! <= 30 ? "text-amber-700"
        : "text-emerald-700"

    return (
        <Dialog>
            <DialogTrigger asChild>
                <button className="rounded-lg h-9 px-3 border border-slate-200 hover:bg-slate-100 transition-all text-xs font-medium text-slate-500 inline-flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" />
                    View Details
                </button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0">
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-white">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
                            <Gift className="w-4 h-4 text-rose-500" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-900">Gift Card</p>
                            <p className="text-[11px] text-slate-400 font-mono tracking-wider">{gc.code}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border-none ${sBadge[gc.status] || sBadge.active}`}>
                            {gc.status?.charAt(0).toUpperCase() + gc.status?.slice(1)}
                        </Badge>
                        <DialogClose className="rounded-lg h-7 w-7 border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
                            <X className="w-3.5 h-3.5" />
                        </DialogClose>
                    </div>
                </div>

                <div className="p-5 space-y-5">
                    {/* Validity banner */}
                    <div className={`${validityColor} rounded-xl px-4 py-3 flex items-center justify-between`}>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Validity</span>
                        <span className={`text-sm font-bold ${validityTextColor}`}>
                            {expiry ? fd(gc.expires_at) : "—"}
                            <span className="ml-2 font-black">{validityText}</span>
                        </span>
                    </div>

                    {/* Balance row */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-xl bg-white border border-slate-100 p-3.5 text-center">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Original</p>
                            <p className="text-base font-black text-slate-900 mt-0.5">{fmt(Number(gc.original_balance))}</p>
                        </div>
                        <div className="rounded-xl bg-white border border-slate-100 p-3.5 text-center">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Redeemed</p>
                            <p className="text-base font-black text-blue-600 mt-0.5">{fmt(redeemedTotal)}</p>
                        </div>
                        <div className="rounded-xl bg-white border border-slate-100 p-3.5 text-center">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Remaining</p>
                            <p className="text-base font-black text-slate-900 mt-0.5">{fmt(Number(gc.remaining_balance))}</p>
                        </div>
                    </div>

                    {/* Info cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="rounded-xl border border-slate-100 p-3.5 space-y-2.5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Purchaser</p>
                            <InfoBlock items={[
                                { label: "Name", value: gc.profiles?.full_name || "—" },
                                { label: "Email", value: gc.profiles?.email || "—" },
                                { label: "Date", value: fdt(gc.created_at) },
                            ]} />
                        </div>
                        <div className="rounded-xl border border-slate-100 p-3.5 space-y-2.5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recipient</p>
                            <InfoBlock items={[
                                { label: "Name", value: gc.recipient_name || "—" },
                                { label: "Email", value: gc.recipient_email || "—" },
                                ...(gc.message ? [{ label: "Message", value: <span className="italic text-slate-500">&ldquo;{gc.message}&rdquo;</span> }] : []),
                            ]} />
                        </div>
                    </div>

                    {/* Redemption History */}
                    {redemptions.length > 0 && (
                        <div>
                            <div className="flex items-center gap-1.5 mb-3">
                                <History className="w-3.5 h-3.5 text-slate-400" />
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Redemption History ({redemptions.length})
                                </p>
                            </div>
                            <div className="space-y-2.5">
                                {redemptions.map((r: any, i: number) => {
                                    const order = r.orders
                                    const user = order?.user
                                    const obs = oBadge[order?.status] || oBadge.pending
                                    return (
                                        <div key={i} className="rounded-xl border border-slate-100 bg-white overflow-hidden">
                                            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/50 border-b border-slate-100">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-bold text-slate-900">{fmt(Number(r.amount))}</span>
                                                    <span className="text-[11px] text-slate-400">{fdt(r.redeemed_at)}</span>
                                                </div>
                                                <Badge className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border-none ${obs}`}>
                                                    {order?.status?.charAt(0).toUpperCase() + order?.status?.slice(1) || "—"}
                                                </Badge>
                                            </div>
                                            <div className="px-4 py-2.5">
                                                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                                                    <span className="text-slate-400">Order #</span>
                                                    <span className="font-semibold text-slate-900 text-right">
                                                        {order?.id ? `#${order.id.toString().slice(-8).toUpperCase()}` : "—"}
                                                    </span>
                                                    <span className="text-slate-400">Total</span>
                                                    <span className="font-semibold text-slate-900 text-right">
                                                        {order?.total != null ? fmt(Number(order.total)) : "—"}
                                                    </span>
                                                    <span className="text-slate-400">Placed By</span>
                                                    <span className="font-medium text-slate-900 text-right truncate">
                                                        {user?.full_name || user?.email || "—"}
                                                    </span>
                                                    <span className="text-slate-400">Placed On</span>
                                                    <span className="text-slate-600 text-right">
                                                        {order?.created_at ? fdt(order.created_at) : "—"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
