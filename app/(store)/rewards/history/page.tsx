import { redirect } from "next/navigation"
import { getTransactionHistory } from "@/app/actions/loyalty"
import { ChevronLeft, Coins, TrendingUp, TrendingDown, Clock, X } from "lucide-react"
import Link from "next/link"

function formatDate(ts: string) {
    const d = new Date(ts)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const days = Math.floor(diff / 86400000)

    if (days === 0) {
        return `Today, ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`
    }
    if (days === 1) return "Yesterday"
    if (days < 7) return `${days} days ago`
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export default async function RewardsHistoryPage() {
    const data = await getTransactionHistory()
    if (!data) redirect("/login")

    const { points, transactions, summary } = data

    return (
        <div className="min-h-screen bg-[#FDFBF7]">
            <div className="max-w-lg mx-auto px-4 pt-6 pb-28">

                {/* Back */}
                {/* <Link
                    href="/rewards"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-800 mb-5"
                >
                    <ChevronLeft className="w-4 h-4" /> Back
                </Link> */}

                {/* Header */}
                <h1 className="text-lg font-black tracking-tight text-slate-900 mb-1">Transaction History</h1>
                <p className="text-[11px] text-slate-400 mb-6">Every M Coin movement, from first purchase to latest reward</p>

                {/* Summary row */}
                <div className="flex items-center justify-between rounded-2xl bg-white border border-slate-200/70 shadow-sm px-4 py-3.5 mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center">
                            <Coins className="w-4 h-4 text-slate-700" />
                        </div>
                        <div>
                            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Balance</p>
                            <p className="text-xl font-black text-slate-900 tracking-tight leading-none mt-0.5">{points.balance} <span className="text-[10px] font-semibold text-slate-400">coins</span></p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="text-right">
                            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Earned</p>
                            <p className="text-sm font-bold text-slate-700 tabular-nums mt-0.5">+{summary.earned}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Spent</p>
                            <p className="text-sm font-bold text-slate-700 tabular-nums mt-0.5">−{summary.spent}</p>
                        </div>
                    </div>
                </div>

                {/* Pending notice */}
                {summary.pending > 0 && (
                    <div className="rounded-xl bg-white border border-slate-200/70 shadow-sm px-4 py-3 mb-5 flex items-center gap-2.5">
                        <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                        <div>
                            <p className="text-[10px] font-bold text-slate-800">{summary.pending} M Coins pending</p>
                            <p className="text-[9px] text-slate-400">Available after your orders are delivered</p>
                        </div>
                    </div>
                )}

                {/* Transaction List */}
                {transactions.length > 0 ? (
                    <div className="rounded-2xl border border-slate-200/70 bg-white shadow-sm divide-y divide-slate-100">
                        {transactions.map((tx: any) => {
                            const isEarn = tx.type === "earn" || tx.type === "bonus"
                            const isPending = tx.status === "pending"
                            const isCancelled = tx.status === "cancelled"
                            return (
                                <div key={tx.id} className={`px-4 py-3.5 ${isCancelled ? "opacity-45" : ""} flex items-center justify-between gap-3`}>
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center ${isCancelled ? "bg-slate-50 text-slate-300"
                                                : isEarn ? "bg-pink-50 text-pink-500"
                                                    : "bg-slate-100 text-slate-400"
                                            }`}>
                                            {isCancelled ? (
                                                <X className="w-4 h-4" />
                                            ) : isEarn ? (
                                                <TrendingUp className="w-4 h-4" />
                                            ) : (
                                                <TrendingDown className="w-4 h-4" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className={`text-xs font-semibold truncate ${isCancelled ? "text-slate-400 line-through" : "text-slate-800"}`}>
                                                {tx.note || tx.reference_type || "Transaction"}
                                            </p>
                                            <div className="flex items-center gap-1.5 mt-1">
                                                {isCancelled && (
                                                    <span className="text-[7px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                                        Cancelled
                                                    </span>
                                                )}
                                                {isPending && !isCancelled && (
                                                    <span className="text-[7px] font-semibold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                                        Pending
                                                    </span>
                                                )}
                                                {!isPending && !isCancelled && tx.status === "available" && tx.type !== "spend" && (
                                                    <span className="text-[7px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                                        Cleared
                                                    </span>
                                                )}
                                                <span className="text-[9px] text-slate-300">·</span>
                                                <span className="text-[9px] text-slate-400">{formatDate(tx.created_at)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className={`text-sm font-black tabular-nums ${isCancelled ? "text-slate-300" : isEarn ? "text-pink-500" : "text-slate-700"
                                            }`}>
                                            {isEarn ? "+" : "−"}{tx.amount}
                                        </p>
                                        {!isNaN(tx.balance_after) && (
                                            <p className="text-[8px] text-slate-400 tabular-nums mt-0.5">{tx.balance_after} left</p>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center">
                        <Coins className="w-6 h-6 text-slate-200 mx-auto mb-3" />
                        <p className="text-xs font-semibold text-slate-400">No transactions yet</p>
                        <p className="text-[9px] text-slate-300 mt-1">Earn coins on your next purchase</p>
                    </div>
                )}
            </div>
        </div>
    )
}