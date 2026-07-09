import { redirect } from "next/navigation"
import { getTransactionHistory } from "@/app/actions/loyalty"
import { ChevronLeft, Coins, ArrowUpRight, ArrowDownRight, Clock } from "lucide-react"
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
                <Link
                    href="/rewards"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-800 mb-5"
                >
                    <ChevronLeft className="w-4 h-4" /> Back
                </Link>

                {/* Header */}
                <h1 className="text-lg font-black tracking-tight text-slate-900 mb-1">Transaction History</h1>
                <p className="text-[11px] text-slate-400 mb-5">Every M Coin movement, from first purchase to latest reward</p>

                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-2.5 mb-6">
                    <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-3.5">
                        <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Earned</p>
                        <div className="flex items-center gap-1.5">
                            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                            <p className="text-lg font-black text-emerald-600 tracking-tight">{summary.earned}</p>
                        </div>
                    </div>
                    <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-3.5">
                        <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Spent</p>
                        <div className="flex items-center gap-1.5">
                            <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
                            <p className="text-lg font-black text-rose-500 tracking-tight">{summary.spent}</p>
                        </div>
                    </div>
                    <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-3.5">
                        <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Balance</p>
                        <div className="flex items-center gap-1.5">
                            <Coins className="w-3.5 h-3.5 text-amber-500" />
                            <p className="text-lg font-black text-slate-900 tracking-tight">{points.balance}</p>
                        </div>
                    </div>
                </div>

                {/* Pending notice */}
                {summary.pending > 0 && (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 mb-5 flex items-center gap-2.5">
                        <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                        <div>
                            <p className="text-[10px] font-bold text-amber-700">{summary.pending} M Coins pending</p>
                            <p className="text-[9px] text-amber-600/70">Available after your orders are delivered</p>
                        </div>
                    </div>
                )}

                {/* Transaction List */}
                {transactions.length > 0 ? (
                    <div className="rounded-xl border border-slate-100 bg-white shadow-sm divide-y divide-slate-50">
                        {transactions.map((tx: any) => {
                            const isEarn = tx.type === "earn" || tx.type === "bonus"
                            const isPending = tx.status === "pending"
                            return (
                                <div key={tx.id} className="px-4 py-3.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center ${
                                                isEarn ? "bg-emerald-50" : "bg-rose-50"
                                            }`}>
                                                {isEarn ? (
                                                    <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                                                ) : (
                                                    <ArrowDownRight className="w-4 h-4 text-rose-400" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <p className="text-xs font-semibold text-slate-800 truncate">
                                                        {tx.note || tx.reference_type || "Transaction"}
                                                    </p>
                                                    {isPending && (
                                                        <span className="text-[7px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                                                            Pending
                                                        </span>
                                                    )}
                                                    {tx.status === "available" && tx.type !== "spend" && (
                                                        <span className="text-[7px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                                                            Cleared
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[9px] text-slate-400 mt-0.5">{formatDate(tx.created_at)}</p>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0 ml-3">
                                            <p className={`text-sm font-black tabular-nums ${
                                                isEarn ? "text-emerald-600" : "text-rose-500"
                                            }`}>
                                                {isEarn ? "+" : "-"}{tx.amount}
                                            </p>
                                            {!isNaN(tx.balance_after) && (
                                                <p className="text-[8px] text-slate-400 tabular-nums">
                                                    {tx.balance_after} left
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
                        <Coins className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                        <p className="text-sm font-semibold text-slate-400">No transactions yet</p>
                        <p className="text-[10px] text-slate-300 mt-1">Your coin history will appear here</p>
                    </div>
                )}

                {/* Footer */}
                <div className="mt-8 flex flex-col items-center gap-2">
                    <div className="w-6 h-px bg-slate-200" />
                    <p className="text-[7px] font-semibold text-slate-300 uppercase tracking-[0.3em]">The Makeup Store</p>
                </div>
            </div>
        </div>
    )
}
