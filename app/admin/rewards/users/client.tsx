"use client"

import { useState, useMemo } from "react"
import { Coins, Users, ArrowUpRight, ArrowDownRight, Search, Filter, Eye, EyeOff, Star, Zap, Crown, Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
  bronze: { label: "Bronze", color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200", icon: Star },
  silver: { label: "Silver", color: "text-slate-600", bg: "bg-slate-100", border: "border-slate-300", icon: Zap },
  gold: { label: "Gold", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-300", icon: Crown },
}

function formatDate(ts: string | null) {
  if (!ts) return "—"
  const d = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" })
}

export function AdminRewardsUsersClient({ users }: { users: any[] }) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [tierFilter, setTierFilter] = useState("all")
  const [hideZero, setHideZero] = useState(true)

  const filtered = useMemo(() => {
    let result = users
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(u =>
        u.full_name?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q) ||
        u.user_id.toLowerCase().includes(q)
      )
    }
    if (tierFilter !== "all") {
      result = result.filter(u => u.tier === tierFilter)
    }
    if (hideZero) {
      result = result.filter(u => u.balance > 0)
    }
    return result
  }, [users, search, tierFilter, hideZero])

  // Stats from full unfiltered data
  const totalBalance = users.reduce((s: number, u: any) => s + Number(u.balance), 0)
  const activeUsers = users.filter(u => u.balance > 0).length
  const totalEarned = users.reduce((s: number, u: any) => s + Number(u.lifetime_earned), 0)
  const totalSpent = users.reduce((s: number, u: any) => s + Number(u.lifetime_spent), 0)
  const tierCounts = { gold: 0, silver: 0, bronze: 0 }
  for (const u of users) tierCounts[u.tier as keyof typeof tierCounts]++

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Reward Users</h1>
        <p className="text-sm text-slate-500">
          {users.length} total users · {activeUsers} with active coins
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Coins className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">{totalBalance.toLocaleString("en-IN")}</div>
              <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Total Coins</div>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-black text-emerald-600">{activeUsers}</div>
              <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Active Users</div>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-black text-blue-600">{totalEarned.toLocaleString("en-IN")}</div>
              <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Lifetime Earned</div>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
              <ArrowDownRight className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <div className="text-2xl font-black text-rose-600">{totalSpent.toLocaleString("en-IN")}</div>
              <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Lifetime Spent</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tier Breakdown */}
      <div className="flex items-center gap-3">
        {(["gold", "silver", "bronze"] as const).map(tier => {
          const cfg = TIER_CONFIG[tier]
          const Icon = cfg.icon
          return (
            <div key={tier} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${cfg.border} ${cfg.bg}`}>
              <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
              <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
              <span className="text-xs font-black text-slate-900">{tierCounts[tier]}</span>
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, phone, or user ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-rose-300 focus:ring-1 focus:ring-rose-300/20 transition-all"
          />
        </div>

        {/* Tier filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <select
            value={tierFilter}
            onChange={e => setTierFilter(e.target.value)}
            className="h-10 pl-9 pr-8 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:border-rose-300 appearance-none cursor-pointer"
          >
            <option value="all">All Tiers</option>
            <option value="gold">Gold</option>
            <option value="silver">Silver</option>
            <option value="bronze">Bronze</option>
          </select>
        </div>

        {/* Hide zero toggle */}
        <button
          onClick={() => setHideZero(!hideZero)}
          className={`h-10 px-4 rounded-xl border text-xs font-bold transition-all inline-flex items-center gap-2 ${
            hideZero
              ? "bg-rose-500 text-white border-rose-500"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          }`}
        >
          {hideZero ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {hideZero ? "Zero Hidden" : "Zero Visible"}
        </button>
      </div>

      {/* Results count */}
      <div className="text-xs text-slate-400 font-semibold">
        Showing {filtered.length} of {users.length} users
      </div>

      {/* Table */}
      {filtered.length > 0 ? (
        <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
          <table className="w-full">
            <thead className="bg-slate-50/50">
              <tr className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-4 px-6 text-left">User</th>
                <th className="py-4 px-6 text-right">Balance</th>
                <th className="py-4 px-6 text-right">Earned</th>
                <th className="py-4 px-6 text-right">Spent</th>
                <th className="py-4 px-6 text-center">Pending</th>
                <th className="py-4 px-6 text-center">Tier</th>
                <th className="py-4 px-6 text-right">Last Active</th>
                <th className="py-4 px-6 text-center w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((user) => {
                const tierCfg = TIER_CONFIG[user.tier] || TIER_CONFIG.bronze
                const TierIcon = tierCfg.icon
                return (
                  <tr key={user.user_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div>
                        <div className="text-sm font-bold text-slate-900">{user.full_name}</div>
                        <div className="text-xs text-slate-400">{user.phone || "No phone"}</div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="text-sm font-black text-slate-900 tabular-nums">{user.balance.toLocaleString("en-IN")}</span>
                      <span className="text-xs text-slate-400 ml-1">coins</span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="text-sm font-semibold text-emerald-600 tabular-nums">{user.lifetime_earned.toLocaleString("en-IN")}</span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="text-sm font-semibold text-rose-500 tabular-nums">{user.lifetime_spent.toLocaleString("en-IN")}</span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      {user.pending > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                          {user.pending}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${tierCfg.bg} ${tierCfg.border} ${tierCfg.color}`}>
                        <TierIcon className="w-3 h-3" />
                        {tierCfg.label}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="text-xs text-slate-400">{formatDate(user.last_activity)}</span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <Link
                        href={`/admin/rewards/users/${user.user_id}`}
                        className="rounded-lg h-8 w-8 border border-slate-200 hover:bg-slate-100 transition-all inline-flex items-center justify-center text-slate-400"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-2xl border bg-white p-12 text-center shadow-sm">
          <Coins className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-400">No users found</p>
          <p className="text-xs text-slate-300 mt-1">
            {search ? "Try a different search term" : hideZero ? "All users have 0 balance — toggle to show" : "No users match the filters"}
          </p>
        </div>
      )}
    </div>
  )
}
