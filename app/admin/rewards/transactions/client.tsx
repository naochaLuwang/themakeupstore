"use client"

import { useState, useMemo } from "react"
import { ArrowLeft, ArrowLeftRight, Coins, Search, ShieldAlert, CheckCircle2, Clock, XCircle } from "lucide-react"
import Link from "next/link"

export function GlobalTransactionsClient({ transactions }: { transactions: any[] }) {
    const [search, setSearch] = useState("")
    const [typeFilter, setTypeFilter] = useState("all")
    const [statusFilter, setStatusFilter] = useState("all")

    const filtered = useMemo(() => {
        let result = transactions
        if (search) {
            const q = search.toLowerCase()
            result = result.filter((t: any) =>
                t.note?.toLowerCase().includes(q) ||
                t.profiles?.full_name?.toLowerCase().includes(q) ||
                t.profiles?.phone?.toLowerCase().includes(q)
            )
        }
        if (typeFilter !== "all") result = result.filter((t: any) => t.type === typeFilter)
        if (statusFilter !== "all") result = result.filter((t: any) => t.status === statusFilter)
        return result
    }, [transactions, search, typeFilter, statusFilter])

    const totalEarned = transactions.filter((t: any) => (t.type === "earn" || t.type === "bonus") && t.status === "available").reduce((s: number, t: any) => s + t.amount, 0)
    const totalSpent = transactions.filter((t: any) => t.type === "spend" && t.status !== "cancelled").reduce((s: number, t: any) => s + t.amount, 0)
    const totalPending = transactions.filter((t: any) => t.status === "pending").reduce((s: number, t: any) => s + t.amount, 0)

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/admin/rewards" className="rounded-xl h-10 w-10 border border-slate-200 hover:bg-slate-100 transition-all text-slate-400 inline-flex items-center justify-center">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="space-y-1">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">Global Transaction Ledger</h1>
                    <p className="text-sm text-slate-500">
                        {transactions.length} total events · Available Earned: {totalEarned.toLocaleString()} · Spent: {totalSpent.toLocaleString()} · Pending: {totalPending.toLocaleString()}
                    </p>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[240px] max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by customer name, phone, or note..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-rose-300 transition-all"
                    />
                </div>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                    className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:border-rose-300 appearance-none cursor-pointer">
                    <option value="all">All Types (Earn, Spend, Bonus, Expired)</option>
                    <option value="earn">Earn (Orders)</option>
                    <option value="spend">Spend (Checkout)</option>
                    <option value="bonus">Bonus (Admin Credit)</option>
                    <option value="expired">Expired</option>
                </select>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:border-rose-300 appearance-none cursor-pointer">
                    <option value="all">All Statuses</option>
                    <option value="available">Available (Active)</option>
                    <option value="pending">Pending Delivery</option>
                    <option value="cancelled">Cancelled / Voided</option>
                </select>
            </div>

            {filtered.length > 0 ? (
                <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
                    <table className="w-full">
                        <thead className="bg-slate-50/50">
                            <tr className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                                <th className="py-4 px-6 text-left">Customer</th>
                                <th className="py-4 px-6 text-center">Event Type</th>
                                <th className="py-4 px-6 text-right">Coins Delta</th>
                                <th className="py-4 px-6 text-center">Status</th>
                                <th className="py-4 px-6 text-left">Description / Note</th>
                                <th className="py-4 px-6 text-right">Date & Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.map((tx: any) => {
                                const isCancelled = tx.status === "cancelled"
                                const isPositive = tx.type === "earn" || tx.type === "bonus"
                                
                                return (
                                    <tr key={tx.id} className={`transition-colors ${isCancelled ? "bg-slate-50/60 opacity-60" : "hover:bg-slate-50/50"}`}>
                                        <td className="py-4 px-6">
                                            <div className="text-sm font-bold text-slate-900">{tx.profiles?.full_name || "Unknown Customer"}</div>
                                            <div className="text-xs text-slate-400">{tx.profiles?.phone || "No phone"}</div>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                                                tx.type === "earn" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                                tx.type === "spend" ? "bg-rose-50 text-rose-700 border-rose-200" :
                                                tx.type === "bonus" ? "bg-purple-50 text-purple-700 border-purple-200" :
                                                "bg-slate-100 text-slate-600 border-slate-200"
                                            }`}>
                                                {tx.type}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            {isCancelled ? (
                                                <span className="text-sm font-bold text-slate-400 line-through">
                                                    {isPositive ? "+" : "−"}{tx.amount.toLocaleString()} coins
                                                </span>
                                            ) : (
                                                <span className={`text-sm font-black tabular-nums ${isPositive ? "text-emerald-600" : "text-rose-600"}`}>
                                                    {isPositive ? "+" : "−"}{tx.amount.toLocaleString()} <span className="text-xs font-normal text-slate-500">coins</span>
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                                                isCancelled ? "bg-red-50 text-red-600 border-red-200" :
                                                tx.status === "available" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                                "bg-amber-50 text-amber-700 border-amber-200"
                                            }`}>
                                                {isCancelled ? <XCircle className="w-3 h-3" /> : tx.status === "available" ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                                {isCancelled ? "Voided / Cancelled" : tx.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-sm text-slate-600 max-w-xs truncate">
                                            {tx.note || "—"}
                                        </td>
                                        <td className="py-4 px-6 text-right text-xs text-slate-400 tabular-nums">
                                            {new Date(tx.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                                            <div className="text-[10px] text-slate-300">
                                                {new Date(tx.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="rounded-2xl border bg-white p-12 text-center shadow-sm">
                    <ArrowLeftRight className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-400">No transactions match your filters</p>
                </div>
            )}
        </div>
    )
}
