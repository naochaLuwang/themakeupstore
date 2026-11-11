"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Ticket, Loader2 } from "lucide-react"
import { revokeRewardCoupon } from "@/app/actions/rewards-admin"
import { toast } from "sonner"

export function RewardCouponsClient({ coupons }: { coupons: any[] }) {
    const router = useRouter()
    const [revokingId, setRevokingId] = useState<string | null>(null)

    const usedCount = coupons.filter(c => c.used).length
    const unusedCount = coupons.length - usedCount
    const totalValue = coupons.reduce((s, c) => s + Number(c.discount_amount || 0), 0)

    const handleRevoke = async (id: string) => {
        setRevokingId(id)
        const res = await revokeRewardCoupon(id)
        if (res.success) toast.success("Coupon revoked")
        else toast.error(res.message || "Failed")
        setRevokingId(null)
        router.refresh()
    }

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-slate-900 text-2xl font-black tracking-tight">Reward Coupons</h1>
                <p className="text-sm text-slate-500">{coupons.length} total · {unusedCount} unused · ₹{totalValue.toLocaleString()} total value</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="rounded-2xl border bg-white p-5 shadow-sm">
                    <div className="text-2xl font-semibold text-slate-900">{coupons.length}</div>
                    <div className="text-xs text-slate-500 font-semibold tracking-normal">Total Issued</div>
                </div>
                <div className="rounded-2xl border bg-white p-5 shadow-sm">
                    <div className="text-2xl font-semibold text-emerald-600">{usedCount}</div>
                    <div className="text-xs text-slate-500 font-semibold tracking-normal">Used</div>
                </div>
                <div className="rounded-2xl border bg-white p-5 shadow-sm">
                    <div className="text-2xl font-semibold text-slate-700">{unusedCount}</div>
                    <div className="text-xs text-slate-500 font-semibold tracking-normal">Unused</div>
                </div>
            </div>

            {coupons.length > 0 ? (
                <div className="rounded-2xl border bg-white overflow-x-auto shadow-sm min-w-0 max-w-full">
                    <table className="w-full">
                        <thead className="bg-slate-50/50">
                            <tr className="text-xs font-semibold text-slate-600 tracking-normal">
                                <th className="py-4 px-6 text-left">Code</th>
                                <th className="py-4 px-6 text-left">User</th>
                                <th className="py-4 px-6 text-left">Reward</th>
                                <th className="py-4 px-6 text-right">Discount</th>
                                <th className="py-4 px-6 text-right">Min Order</th>
                                <th className="py-4 px-6 text-center">Status</th>
                                <th className="py-4 px-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {coupons.map((c) => (
                                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="py-4 px-6 tabular-nums">
                                        <span className="font-mono text-sm font-semibold text-slate-900">{c.code}</span>
                                    </td>
                                    <td className="py-4 px-6 tabular-nums">
                                        <div>
                                            <div className="text-sm font-semibold text-slate-900">{c.profiles?.full_name || "—"}</div>
                                            <div className="text-xs text-slate-500">{c.profiles?.phone || "—"}</div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-sm text-slate-600 tabular-nums">{c.reward_products?.product_name || "—"}</td>
                                    <td className="py-4 px-6 text-right text-sm font-semibold text-slate-900 tabular-nums">₹{c.discount_amount}</td>
                                    <td className="py-4 px-6 text-right text-sm text-slate-600 tabular-nums">₹{c.min_order_value || 0}</td>
                                    <td className="py-4 px-6 text-center tabular-nums">
                                        <span className={`text-xs font-semibold tracking-normal px-2 py-1 rounded-full border ${
                                            c.used ? "bg-slate-50 text-slate-500 border-slate-200" : "bg-emerald-50 text-emerald-600 border-emerald-200"
                                        }`}>
                                            {c.used ? "Used" : "Active"}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-right tabular-nums">
                                        {!c.used && (
                                            <button onClick={() => handleRevoke(c.id)} disabled={revokingId === c.id}
                                                className="text-xs font-semibold text-red-500 hover:text-red-600 transition-colors disabled:opacity-50">
                                                {revokingId === c.id ? <Loader2 className="w-4 h-4 animate-spin stroke-[1.5]" /> : "Revoke"}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="rounded-2xl border bg-white p-12 text-center shadow-sm">
                    <Ticket className="w-10 h-10 text-slate-200 mx-auto mb-3 stroke-[1.5]" />
                    <p className="text-sm font-semibold text-slate-500">No coupons issued yet</p>
                </div>
            )}
        </div>
    )
}
