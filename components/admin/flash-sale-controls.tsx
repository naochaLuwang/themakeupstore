"use client"
import { Trash2, Circle, Loader2 } from "lucide-react"
import { deleteFlashSale, toggleFlashSale } from "@/app/actions/flash-sales"
import { useState } from "react"
import { toast } from "sonner"

export function FlashSaleStatusToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const [loading, setLoading] = useState(false)
  const handleToggle = async () => {
    setLoading(true)
    try {
      await toggleFlashSale(id, isActive)
      toast.success("Status updated")
      window.location.reload()
    } catch {
      toast.error("Failed to update status")
    } finally {
      setLoading(false)
    }
  }
  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${isActive ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
    >
      {loading ? <Loader2 className="w-2 h-2 animate-spin" /> : <Circle className="w-1.5 h-1.5 fill-current" />}
      <span className="text-[8px] font-black">{isActive ? 'Active' : 'Draft'}</span>
    </button>
  )
}

export function DeleteFlashSaleButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false)
  const handleDelete = async () => {
    if (!confirm("Delete this flash sale permanently?")) return
    setLoading(true)
    try {
      await deleteFlashSale(id)
      toast.success("Deleted")
      window.location.reload()
    } catch {
      toast.error("Delete failed")
    } finally {
      setLoading(false)
    }
  }
  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
    </button>
  )
}
