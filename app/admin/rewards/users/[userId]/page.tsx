import { adminGetUserTransactions } from "@/app/actions/loyalty"
import { ChevronLeft, Coins, Award, TrendingUp, TrendingDown, ExternalLink, X } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { AdjustPointsForm } from "./adjust-points-form"

export default async function AdminRewardsUserDetailPage(props: { params: Promise<{ userId: string }> }) {
  const { userId } = await props.params
  const data = await adminGetUserTransactions(userId)
  if (!data) notFound()

  const { points, transactions, profile } = data

  const activeTxs = transactions.filter((t: any) => t.status !== "cancelled")
  const totalEarned = activeTxs.filter((t: any) => t.type === "earn" || t.type === "bonus").reduce((s: number, t: any) => s + t.amount, 0)
  const totalSpent = activeTxs.filter((t: any) => t.type === "spend").reduce((s: number, t: any) => s + t.amount, 0)
  const pendingAmount = activeTxs.filter((t: any) => t.status === "pending").reduce((s: number, t: any) => s + t.amount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/rewards/users" className="rounded-xl h-10 w-10 border border-slate-200 hover:bg-slate-100 transition-colors text-slate-500 inline-flex items-center justify-center">
          <ChevronLeft className="w-5 h-5 stroke-[1.5]" />
        </Link>
        <div className="space-y-1">
          <h1 className="text-slate-900 text-2xl font-black tracking-tight">{profile?.full_name || "Unknown User"}</h1>
          <p className="text-sm text-slate-500">Reward points &amp; transaction history</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center"><Coins className="w-5 h-5 text-amber-600 stroke-[1.5]" /></div>
            <div>
              <div className="text-2xl font-semibold text-slate-900">{points.balance.toLocaleString()}</div>
              <div className="text-xs text-slate-500 font-semibold tracking-normal">Balance</div>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center"><Award className="w-5 h-5 text-emerald-600 stroke-[1.5]" /></div>
            <div>
              <div className="text-2xl font-semibold text-slate-900">{points.lifetime_earned.toLocaleString()}</div>
              <div className="text-xs text-slate-500 font-semibold tracking-normal">Lifetime Earned</div>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center"><TrendingDown className="w-5 h-5 text-rose-600 stroke-[1.5]" /></div>
            <div>
              <div className="text-2xl font-semibold text-slate-900">{totalSpent.toLocaleString()}</div>
              <div className="text-xs text-slate-500 font-semibold tracking-normal">Spent</div>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-slate-700 stroke-[1.5]" /></div>
            <div>
              <div className="inline-flex items-center gap-2">
                <span className="text-2xl font-semibold text-slate-900">{points.tier}</span>
                {pendingAmount > 0 && <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{pendingAmount} pending</span>}
              </div>
              <div className="text-xs text-slate-500 font-semibold tracking-normal">Tier</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Adjust Points Form */}
        <div className="lg:col-span-1">
          <AdjustPointsForm userId={userId} />
        </div>

        {/* Transaction History */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Transaction History</h3>
            </div>
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {transactions.length === 0 ? (
                <div className="p-12 text-center text-slate-500 font-medium">No transactions yet.</div>
              ) : (
                transactions.map((tx: any) => {
                  const isCancelled = tx.status === "cancelled"
                  return (
                  <div key={tx.id} className={`px-6 py-4 transition-colors ${isCancelled ? "opacity-40" : "hover:bg-slate-50/30"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                          isCancelled ? "bg-slate-50 text-slate-500" :
                          tx.type === "earn" || tx.type === "bonus" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                        }`}>
                          {isCancelled ? <X className="w-4 h-4 stroke-[1.5]" /> : (tx.type === "earn" || tx.type === "bonus" ? "+" : "−")}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold text-sm capitalize ${isCancelled ? "text-slate-500" : "text-slate-900"}`}>{tx.type}</span>
                            {isCancelled && (
                              <span className="text-xs px-1.5 py-0.5 rounded font-semibold bg-red-50 text-red-500">Cancelled</span>
                            )}
                            {!isCancelled && (
                            <>
                            <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${
                              tx.status === "available" ? "bg-emerald-50 text-emerald-600" :
                              tx.status === "pending" ? "bg-amber-50 text-amber-600" :
                              "bg-slate-100 text-slate-500"
                            }`}>{tx.status}</span>
                            <span className="text-xs text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded font-mono">{tx.reference_type}</span>
                            </>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">{tx.note || "—"}</div>
                          {tx.reference_type === "order" && tx.reference_id && (
                            <Link href={`/admin/orders/${tx.reference_id}`} className="inline-flex items-center gap-1 mt-1 text-xs font-semibold text-rose-500 hover:text-rose-600 transition-colors">
                              <ExternalLink className="w-4 h-4 stroke-[1.5]" /> View Order
                            </Link>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold text-sm ${tx.type === "earn" || tx.type === "bonus" ? "text-emerald-600" : "text-rose-600"}`}>
                          {tx.type === "earn" || tx.type === "bonus" ? "+" : "−"}{tx.amount.toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                        <div className="text-xs text-slate-400 font-mono">
                          {tx.balance_after != null ? `Bal: ${tx.balance_after.toLocaleString()}` : ""}
                        </div>
                      </div>
                    </div>
                  </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
