"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RotateCcw, Loader2, Zap } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export function InventoryTableClient({ filteredInventory }: { filteredInventory: any[] }) {
    // We now store the RAW input string to allow controlled clearing
    const [drafts, setDrafts] = useState<Record<string, { value: number, inputStr: string }>>({})
    const [isSaving, setIsSaving] = useState(false)
    const supabase = createClient()
    const router = useRouter()

    const hasChanges = Object.keys(drafts).length > 0

    const handleInputChange = (id: string, currentStock: number, input: string) => {
        if (input === "") {
            const newDrafts = { ...drafts }
            delete newDrafts[id]
            setDrafts(newDrafts)
            return
        }

        let newTotal = currentStock
        const cleanInput = input.trim()

        if (cleanInput.startsWith('+')) {
            const addValue = parseInt(cleanInput.slice(1)) || 0
            newTotal = currentStock + addValue
        } else if (cleanInput.startsWith('-')) {
            const subValue = parseInt(cleanInput.slice(1)) || 0
            newTotal = Math.max(0, currentStock - subValue)
        } else {
            newTotal = parseInt(cleanInput) || 0
        }

        setDrafts(prev => ({
            ...prev,
            [id]: { value: newTotal, inputStr: input }
        }))
    }

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const updatePromises = Object.entries(drafts).map(([id, data]) =>
                supabase
                    .from('product_variants')
                    .update({ stock: data.value })
                    .eq('id', id)
            )

            const results = await Promise.all(updatePromises)
            const error = results.find(res => res.error)?.error

            if (!error) {
                toast.success("Inventory synchronized")
                // CLEARING LOGIC: Resetting the state clears the controlled inputs
                setDrafts({})
                router.refresh()
            } else {
                toast.error(error.message)
            }
        } catch (err) {
            toast.error("An unexpected error occurred")
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="relative">
            {/* NOIR SYNC BAR */}
            {hasChanges && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-6 bg-slate-900 border border-white/20 text-white px-6 py-4 rounded-3xl shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex gap-4 items-center">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Adjustments Ready</span>
                            <span className="text-xs font-bold">{Object.keys(drafts).length} changes pending</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setDrafts({})} className="text-slate-500 hover:text-white">
                            <RotateCcw className="w-4 h-4" />
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving} className="bg-white text-slate-900 hover:bg-slate-200 font-black px-6 rounded-xl text-[10px] uppercase">
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Publish Changes"}
                        </Button>
                    </div>
                </div>
            )}

            <div className="rounded-[2.5rem] border border-slate-200 bg-white overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50/50 border-b">
                        <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <th className="p-6">Variant Detail</th>
                            <th className="p-6 text-center">Current</th>
                            <th className="p-6 text-right">Adjustment (+ / -)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredInventory.map((item) => {
                            const draft = drafts[item.id]
                            const isModified = draft !== undefined

                            return (
                                <tr key={item.id} className={`group transition-all hover:bg-slate-50/50 ${isModified ? 'bg-blue-50/20' : ''}`}>
                                    <td className="p-6">
                                        <div className="font-bold text-slate-900 text-xs uppercase tracking-tight">{item.products?.name}</div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] font-mono text-slate-400">{item.sku}</span>
                                            <span className="text-[10px] text-slate-300">•</span>
                                            <span className="text-[10px] italic text-slate-500">{item.title}</span>
                                        </div>
                                    </td>
                                    <td className="p-6 text-center">
                                        <span className={`text-lg font-black italic ${item.stock <= 5 ? 'text-red-500' : 'text-slate-900'}`}>
                                            {item.stock}
                                        </span>
                                    </td>
                                    <td className="p-6 text-right">
                                        <div className="flex items-center justify-end gap-3">
                                            {isModified && (
                                                <div className="flex flex-col items-end mr-2">
                                                    <span className="text-[9px] font-black text-blue-600 uppercase">Preview</span>
                                                    <span className="text-sm font-black text-blue-600 italic">{draft.value}</span>
                                                </div>
                                            )}
                                            <Input
                                                type="text"
                                                // CONTROLLED INPUT: value is linked to state
                                                value={draft?.inputStr || ""}
                                                className={`w-28 h-10 text-right font-black rounded-xl border-2 transition-all ${isModified ? 'border-blue-500 bg-white ring-4 ring-blue-500/5' : 'border-slate-100 bg-slate-50'}`}
                                                placeholder="± Adjust"
                                                onChange={(e) => handleInputChange(item.id, item.stock, e.target.value)}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}