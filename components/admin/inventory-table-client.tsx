"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertTriangle, Save, RotateCcw, Package, Loader2, Zap, MinusCircle } from "lucide-react"
import { bulkUpdateStock } from "@/app/actions/inventory"
import { toast } from "sonner"

export function InventoryTableClient({ initialInventory }: { initialInventory: any[] }) {
    const [drafts, setDrafts] = useState<Record<string, string>>({})
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [isSaving, setIsSaving] = useState(false)

    const hasChanges = Object.keys(drafts).length > 0
    const hasSelection = selectedIds.length > 0

    // Handle single input changes
    const handleInputChange = (id: string, val: string) => {
        setDrafts(prev => ({ ...prev, [id]: val }))
    }

    // Bulk action: Set selected to 0
    const markSelectedOutOfStock = () => {
        const newDrafts = { ...drafts }
        selectedIds.forEach(id => { newDrafts[id] = "0" })
        setDrafts(newDrafts)
        toast.warning(`${selectedIds.length} items marked as Out of Stock in draft`)
    }

    const handleSave = async () => {
        setIsSaving(true)
        const res = await bulkUpdateStock(drafts)
        if (res.success) {
            toast.success("Inventory synchronized successfully")
            setDrafts({})
            setSelectedIds([])
        } else {
            toast.error("Update failed")
        }
        setIsSaving(false)
    }

    return (
        <div className="relative">
            {/* Floating Bulk Action Bar */}
            {(hasSelection || hasChanges) && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-6 bg-slate-900 border border-white/20 text-white px-6 py-4 rounded-3xl shadow-2xl animate-in slide-in-from-bottom-5">
                    {hasSelection && (
                        <div className="flex items-center gap-2 border-r border-white/10 pr-4">
                            <span className="text-[10px] font-black text-slate-400 uppercase">Selected ({selectedIds.length})</span>
                            <Button size="sm" variant="destructive" onClick={markSelectedOutOfStock} className="h-8 rounded-xl text-[10px] font-bold">
                                <MinusCircle className="w-3 h-3 mr-1" /> Mark Out of Stock
                            </Button>
                        </div>
                    )}

                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Pending Sync</span>
                            <span className="text-sm font-bold">{Object.keys(drafts).length} items modified</span>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => { setDrafts({}); setSelectedIds([]) }} className="hover:bg-white/10 text-slate-400"><RotateCcw className="w-4 h-4" /></Button>
                            <Button onClick={handleSave} disabled={isSaving} className="bg-white text-slate-900 hover:bg-slate-200 font-bold px-8 rounded-xl">
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <div className="rounded-[2rem] border bg-white overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                        <tr className="text-left">
                            <th className="p-5 w-12 text-center">
                                <Checkbox
                                    checked={selectedIds.length === initialInventory.length}
                                    onCheckedChange={(checked) => setSelectedIds(checked ? initialInventory.map(i => i.id) : [])}
                                />
                            </th>
                            <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product & SKU</th>
                            <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Current Stock</th>
                            <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Update (Use + or - for Inbound)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {initialInventory.map((item) => {
                            const isModified = drafts[item.id] !== undefined
                            const isSelected = selectedIds.includes(item.id)
                            const displayValue = drafts[item.id] ?? item.stock

                            return (
                                <tr key={item.id} className={`transition-all ${isSelected ? 'bg-slate-50' : ''} ${isModified ? 'bg-blue-50/40' : ''}`}>
                                    <td className="p-5 text-center">
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={(checked) => setSelectedIds(prev => checked ? [...prev, item.id] : prev.filter(i => i !== item.id))}
                                        />
                                    </td>
                                    <td className="p-5">
                                        <div className="font-bold text-slate-900">{item.products?.name}</div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 uppercase tracking-tighter leading-none">
                                                {item.sku}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-black uppercase italic leading-none">
                                                {item.title === "Default" ? "Standard" : item.title}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-5 text-center">
                                        <div className="inline-flex flex-col items-center">
                                            <span className={`text-sm font-black ${item.stock <= 5 ? 'text-red-500' : 'text-slate-600'}`}>{item.stock}</span>
                                            {isModified && <Zap className="w-3 h-3 text-blue-500 mt-1" />}
                                        </div>
                                    </td>
                                    <td className="p-5 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {isModified && (
                                                <span className="text-[10px] font-black text-blue-600 uppercase bg-blue-100 px-2 py-1 rounded-lg">
                                                    New: {displayValue}
                                                </span>
                                            )}
                                            <Input
                                                className={`w-24 h-10 text-right font-black rounded-xl transition-all ${isModified ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-slate-100'}`}
                                                placeholder={item.stock}
                                                value={drafts[item.id] ?? ""}
                                                onChange={(e) => handleInputChange(item.id, e.target.value)}
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