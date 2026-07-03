"use client"
import { Trash2, Circle, Loader2 } from "lucide-react"
import { deleteShowcaseItem, toggleShowcaseItem } from "@/app/actions/showcase"
import { useState } from "react"
import { toast } from "sonner"

export function ToggleShowcaseButton({ id, isActive }: { id: string, isActive: boolean }) {
    const [loading, setLoading] = useState(false)
    const handleToggle = async () => {
        setLoading(true)
        try {
            await toggleShowcaseItem(id, isActive)
            toast.success("Status updated")
        } catch { toast.error("Failed to update status") }
        finally { setLoading(false) }
    }
    return (
        <button onClick={handleToggle} disabled={loading} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${isActive ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
            {loading ? <Loader2 className="w-2 h-2 animate-spin" /> : <Circle className="w-1.5 h-1.5 fill-current" />}
            <span className="text-[8px] font-black">{isActive ? 'Active' : 'Inactive'}</span>
        </button>
    )
}

export function DeleteShowcaseButton({ id }: { id: string }) {
    const [loading, setLoading] = useState(false)
    const handleDelete = async () => {
        if (!confirm("Delete permanently?")) return
        setLoading(true)
        const res = await deleteShowcaseItem(id)
        if (res?.success) {
            toast.success("Deleted")
            window.location.reload()
        } else {
            toast.error(res?.message || "Delete failed")
        }
        setLoading(false)
    }
    return (
        <button onClick={handleDelete} disabled={loading} className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        </button>
    )
}
