"use client"
import { Trash2, Loader2 } from "lucide-react"
import { deleteGiftProduct } from "@/app/actions/gift-products"
import { useState } from "react"
import { toast } from "sonner"

export function GiftProductDeleteButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false)
  const handleDelete = async () => {
    if (!confirm("Delete this gift product permanently?")) return
    setLoading(true)
    try {
      await deleteGiftProduct(id)
      toast.success("Deleted")
      window.location.reload()
    } catch {
      toast.error("Delete failed")
    } finally {
      setLoading(false)
    }
  }
  return (
    <button onClick={handleDelete} disabled={loading} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50">
      {loading ? <Loader2 className="w-4 h-4 animate-spin stroke-[1.5]" /> : <Trash2 className="w-4 h-4 stroke-[1.5]" />}
    </button>
  )
}
