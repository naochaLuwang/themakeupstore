import { listGiftCards, toggleGiftCardStatus } from "@/app/actions/gift-cards"
import { Gift, Eye, EyeOff } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { GiftCardDialog } from "@/components/admin/gift-card-dialog"

function formatCurrency(n: number) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)
}

function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

function expiryInfo(expiresAt: string | null, status: string): { label: string; class: string } {
    if (!expiresAt) return { label: "—", class: "text-slate-300" }
    if (status === "expired" || status === "disabled") return { label: formatDate(expiresAt), class: "text-slate-400" }
    const now = new Date()
    const expiry = new Date(expiresAt)
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / 86400000)
    if (daysLeft < 0) return { label: "Expired", class: "text-red-500 font-semibold" }
    if (daysLeft <= 30) return { label: `${formatDate(expiresAt)} (${daysLeft}d)`, class: "text-amber-600 font-semibold" }
    return { label: formatDate(expiresAt), class: "text-slate-500" }
}

const statusBadge: Record<string, { class: string; label: string }> = {
    active: { class: "bg-emerald-50 text-emerald-700", label: "Active" },
    redeemed: { class: "bg-blue-50 text-blue-700", label: "Redeemed" },
    expired: { class: "bg-slate-100 text-slate-500", label: "Expired" },
    disabled: { class: "bg-red-50 text-red-700", label: "Disabled" },
}

function totalRedeemed(gc: any): number {
    return (gc.gift_card_redemptions || []).reduce((sum: number, r: any) => sum + Number(r.amount), 0)
}

export default async function AdminGiftCardsPage() {
    const giftCards = await listGiftCards()

    async function handleToggle(id: string, currentStatus: string) {
        "use server"
        const newStatus = currentStatus === "active" ? "disabled" : "active"
        await toggleGiftCardStatus(id, newStatus)
    }

    const stats = {
        total: giftCards?.length || 0,
        active: giftCards?.filter((g: any) => g.status === "active").length || 0,
        redeemed: giftCards?.reduce((sum: number, g: any) => sum + totalRedeemed(g), 0) || 0,
        activeBalance: giftCards?.reduce((s: number, g: any) => s + (g.status === "active" ? Number(g.remaining_balance) : 0), 0) || 0,
    }

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-2xl font-black tracking-tight text-slate-900">Gift Cards</h1>
                <p className="text-sm text-slate-500">Track all purchased gift cards</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-2xl border bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Cards</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{stats.total}</p>
                </div>
                <div className="rounded-2xl border bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Cards</p>
                    <p className="text-2xl font-black text-emerald-600 mt-1">{stats.active}</p>
                </div>
                <div className="rounded-2xl border bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Redeemed</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{formatCurrency(stats.redeemed)}</p>
                </div>
                <div className="rounded-2xl border bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Balance</p>
                    <p className="text-2xl font-black text-rose-500 mt-1">{formatCurrency(stats.activeBalance)}</p>
                </div>
            </div>

            <div className="hidden lg:block rounded-2xl border bg-white overflow-hidden shadow-sm">
                <table className="w-full">
                    <thead className="bg-slate-50/50">
                        <tr className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                            <th className="py-4 px-6 text-left">Code</th>
                            <th className="py-4 px-6 text-left">Balance</th>
                            <th className="py-4 px-6 text-left">Redeemed</th>
                            <th className="py-4 px-6 text-left">Status</th>
                            <th className="py-4 px-6 text-left">Valid Until</th>
                            <th className="py-4 px-6 text-left">Recipient</th>
                            <th className="py-4 px-6 text-left">Purchased By</th>
                            <th className="py-4 px-6 text-left">Purchased On</th>
                            <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {giftCards?.flatMap((gc: any) => {
                            const badge = statusBadge[gc.status] || statusBadge.active
                            const redemptions = gc.gift_card_redemptions || []
                            const redeemedTotal = totalRedeemed(gc)
                            const rows = [(
                                <tr key={gc.id} className={`group hover:bg-slate-50/50 transition-colors ${gc.status !== "active" ? "opacity-60" : ""}`}>
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                                <Gift className="w-4 h-4 text-slate-400" />
                                            </div>
                                            <div>
                                                <span className="font-mono font-semibold text-slate-900 text-sm tracking-wider">{gc.code}</span>
                                                {redemptions.length > 0 && (
                                                    <p className="text-[11px] text-slate-400 mt-0.5">{redemptions.length} redemption{redemptions.length !== 1 ? "s" : ""}</p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="text-sm">
                                            <span className="font-semibold text-slate-900">{formatCurrency(Number(gc.remaining_balance))}</span>
                                            <span className="text-[11px] text-slate-400 ml-2">/ {formatCurrency(Number(gc.original_balance))}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="text-sm font-semibold text-blue-600">{formatCurrency(redeemedTotal)}</span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <Badge className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border-none ${badge.class}`}>
                                            {badge.label}
                                        </Badge>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className={`text-sm ${expiryInfo(gc.expires_at, gc.status).class}`}>
                                            {expiryInfo(gc.expires_at, gc.status).label}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="text-sm font-medium text-slate-700">
                                            {gc.recipient_name || gc.recipient_email || "—"}
                                        </span>
                                        {gc.recipient_name && gc.recipient_email && (
                                            <p className="text-[11px] text-slate-400">{gc.recipient_email}</p>
                                        )}
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="text-sm text-slate-600">
                                            {gc.profiles?.full_name || gc.profiles?.email || (gc.purchased_by ? `${gc.purchased_by.slice(0, 8)}...` : "—")}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="text-sm text-slate-500">{formatDate(gc.created_at)}</span>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <div className="flex justify-end items-center gap-2">
                                            <GiftCardDialog gc={gc} />
                                            <form action={handleToggle.bind(null, gc.id, gc.status)}>
                                                <button className="rounded-lg h-9 w-9 border border-slate-200 hover:bg-slate-100 transition-all text-slate-400 inline-flex items-center justify-center">
                                                    {gc.status === "active" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4 text-emerald-500" />}
                                                </button>
                                            </form>
                                        </div>
                                    </td>
                                </tr>
                            )]
                            return rows
                        })}
                    </tbody>
                </table>
            </div>

            {!giftCards?.length && (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
                    <Gift className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-medium">No gift cards found</p>
                </div>
            )}
        </div>
    )
}
