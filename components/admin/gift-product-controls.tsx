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
    <button onClick={handleDelete} disabled={loading} className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50">
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
    </button>
  )
}
