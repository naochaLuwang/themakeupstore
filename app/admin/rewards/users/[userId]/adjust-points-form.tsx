"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { adminAdjustPoints } from "@/app/actions/loyalty"
import { toast } from "sonner"
import { Loader2, Plus } from "lucide-react"

export function AdjustPointsForm({ userId }: { userId: string }) {
  const router = useRouter()
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const numAmount = Number(amount)
    if (!numAmount || numAmount <= 0) { toast.error("Enter a valid amount"); return }
    if (!note.trim()) { toast.error("Add a reason note"); return }

    setIsPending(true)
    const res = await adminAdjustPoints(userId, numAmount, note.trim())

    if (res.success) {
      toast.success(`Credited ${numAmount} coins`)
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
      <h3 className="text-sm font-bold text-slate-900 mb-4">Credit M Coins</h3>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <input
            type="number"
            min="1"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="Coins to credit"
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-rose-300 focus:ring-1 focus:ring-rose-300/20 transition-all"
          />
          <Plus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        </div>

        <input
          type="text"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Reason (e.g. compensation, promo bonus)"
          className="w-full h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-rose-300 focus:ring-1 focus:ring-rose-300/20 transition-all"
        />

        <button
          type="submit"
          disabled={isPending || !amount || !note.trim()}
          className="w-full h-10 rounded-xl bg-rose-500 text-white text-sm font-bold hover:bg-rose-600 transition-colors disabled:opacity-40"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Credit Coins"}
        </button>
      </form>
    </div>
  )
}
