import { adminGetAllUsersPoints } from "@/app/actions/loyalty"
import { Coins, Users, ArrowUpRight } from "lucide-react"
import Link from "next/link"

export default async function AdminRewardsUsersPage() {
  const users = await adminGetAllUsersPoints()

  const totalBalance = users.reduce((s: number, u: any) => s + Number(u.balance), 0)
  const totalLifetime = users.reduce((s: number, u: any) => s + Number(u.lifetime_earned), 0)
  const totalSpent = users.reduce((s: number, u: any) => s + Number(u.lifetime_spent), 0)
  const tierCounts = { gold: 0, silver: 0, bronze: 0 }
  for (const u of users) tierCounts[u.tier as keyof typeof tierCounts]++

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">User Points</h1>
        <p className="text-sm text-slate-500">Reward point balances across all users</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Balance", value: totalBalance.toLocaleString(), icon: Coins, color: "text-amber-600 bg-amber-50" },
          { label: "Users", value: users.length.toLocaleString(), icon: Users, color: "text-blue-600 bg-blue-50" },
          { label: "Lifetime Earned", value: totalLifetime.toLocaleString(), icon: ArrowUpRight, color: "text-emerald-600 bg-emerald-50" },
          { label: "Lifetime Spent", value: totalSpent.toLocaleString(), icon: ArrowUpRight, color: "text-rose-600 bg-rose-50" },
        ].map(card => (
          <div key={card.label} className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center`}>
                <card.icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900">{card.value}</div>
                <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">{card.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tier Distribution */}
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-3">Tier Distribution</h3>
        <div className="flex gap-1.5 h-4 rounded-full overflow-hidden">
          {[
            { tier: "gold", count: tierCounts.gold, color: "bg-amber-400" },
            { tier: "silver", count: tierCounts.silver, color: "bg-slate-300" },
            { tier: "bronze", count: tierCounts.bronze, color: "bg-orange-300" },
          ].map(t => users.length > 0 ? (
            <div key={t.tier} style={{ width: `${(t.count / users.length) * 100}%` }} className={`${t.color} h-full first:rounded-l-full last:rounded-r-full transition-all`} title={`${t.tier}: ${t.count}`} />
          ) : null)}
        </div>
        <div className="flex gap-6 mt-2 text-xs font-semibold text-slate-500">
          {[{ tier: "Gold", count: tierCounts.gold, dot: "bg-amber-400" }, { tier: "Silver", count: tierCounts.silver, dot: "bg-slate-300" }, { tier: "Bronze", count: tierCounts.bronze, dot: "bg-orange-300" }].map(t => (
            <span key={t.tier} className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${t.dot}`} /> {t.tier}: {t.count}</span>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-slate-50/50">
            <tr className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              <th className="py-4 px-6 text-left">User</th>
              <th className="py-4 px-6 text-right">Balance</th>
              <th className="py-4 px-6 text-right">Lifetime Earned</th>
              <th className="py-4 px-6 text-right">Lifetime Spent</th>
              <th className="py-4 px-6 text-center">Tier</th>
              <th className="py-4 px-6 text-right">Last Activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.length === 0 ? (
              <tr><td colSpan={6} className="p-12 text-center text-slate-400 font-medium">No users with points yet.</td></tr>
            ) : (
              users.map((u: any) => (
                <tr key={u.id} className="hover:bg-slate-50/30 transition-all">
                  <td className="py-4 px-6">
                    <Link href={`/admin/rewards/users/${u.user_id}`} className="flex items-center gap-3 group">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-200 to-purple-200 flex items-center justify-center text-xs font-bold text-rose-700">
                        {(u.full_name?.[0] || "?").toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 text-sm group-hover:text-rose-600 transition-colors">{u.full_name}</div>
                        <div className="text-xs text-slate-400">{u.phone}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="py-4 px-6 text-right font-bold text-slate-900">{u.balance.toLocaleString()}</td>
                  <td className="py-4 px-6 text-right font-semibold text-slate-700">{u.lifetime_earned.toLocaleString()}</td>
                  <td className="py-4 px-6 text-right font-semibold text-slate-700">{u.lifetime_spent.toLocaleString()}</td>
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      u.tier === "gold" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                      u.tier === "silver" ? "bg-slate-100 text-slate-600 border border-slate-200" :
                      "bg-orange-50 text-orange-700 border border-orange-200"
                    }`}>{u.tier}</span>
                  </td>
                  <td className="py-4 px-6 text-right text-xs text-slate-400">
                    {u.last_activity ? new Date(u.last_activity).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
