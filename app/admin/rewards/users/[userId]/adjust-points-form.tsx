"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { adminAdjustPoints } from "@/app/actions/loyalty"
import { toast } from "sonner"
import { Loader2, Plus, Minus } from "lucide-react"

export function AdjustPointsForm({ userId, currentBalance }: { userId: string; currentBalance: number }) {
  const router = useRouter()
  const [mode, setMode] = useState<"credit" | "deduct">("credit")
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const numAmount = Number(amount)
    if (!numAmount || numAmount <= 0) { toast.error("Enter a valid amount"); return }
    if (!note.trim()) { toast.error("Add a reason note"); return }

    setIsPending(true)
    const signedAmount = mode === "credit" ? numAmount : -numAmount
    const res = await adminAdjustPoints(userId, signedAmount, note.trim())

    if (res.success) {
      toast.success(mode === "credit" ? `Credited ${numAmount} coins` : `Deducted ${numAmount} coins`)
      setAmount("")
      setNote("")
      router.refresh()
    } else {
      toast.error(res.message || "Failed to adjust points")
    }
    setIsPending(false)
  }

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <h3 className="text-sm font-bold text-slate-900 mb-4">Adjust Points</h3>

      <div className="flex gap-2 mb-4">
        <button type="button" onClick={() => setMode("credit")}
          className={`flex-1 h-9 rounded-lg text-xs font-bold transition-all ${mode === "credit" ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200" : "bg-slate-50 text-slate-500 hover:bg-slate-100"}`}>
          <Plus className="w-3 h-3 inline-block mr-1" /> Credit
        </button>
        <button type="button" onClick={() => setMode("deduct")}
          className={`flex-1 h-9 rounded-lg text-xs font-bold transition-all ${mode === "deduct" ? "bg-rose-500 text-white shadow-lg shadow-rose-200" : "bg-slate-50 text-slate-500 hover:bg-slate-100"}`}>
          <Minus className="w-3 h-3 inline-block mr-1" /> Deduct
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-900">Amount</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} min="1" placeholder="e.g. 100"
            className="w-full h-10 px-3 mt-1 rounded-xl bg-slate-50 border-none text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-rose-500/20"
          />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-900">Reason</label>
          <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Birthday bonus, Refund"
            className="w-full h-10 px-3 mt-1 rounded-xl bg-slate-50 border-none text-sm text-slate-900 outline-none focus:ring-2 focus:ring-rose-500/20"
          />
        </div>
        <div className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
          Current balance: <span className="font-bold text-slate-900">{currentBalance.toLocaleString()}</span>
          {mode === "deduct" && Number(amount) > 0 && (
            <span className="ml-2">
              → <span className={`font-bold ${currentBalance - Number(amount) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {(currentBalance - Number(amount)).toLocaleString()}
              </span>
            </span>
          )}
          {mode === "credit" && Number(amount) > 0 && (
            <span className="ml-2">→ <span className="font-bold text-emerald-600">{(currentBalance + Number(amount)).toLocaleString()}</span></span>
          )}
        </div>
        <button type="submit" disabled={isPending}
          className="w-full h-10 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50">
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          {mode === "credit" ? "Credit Points" : "Deduct Points"}
        </button>
      </form>
    </div>
  )
}
