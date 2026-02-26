"use client"

import * as React from "react"
import { useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Save, RotateCcw, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react"

export function BulkUpdateTable({ inventory }: { inventory: any[] }) {
    const [pendingChanges, setPendingChanges] = useState<{ [key: string]: number }>({})
    const [isSaving, setIsSaving] = useState(false)
    const supabase = createClient()
    const router = useRouter()

    const hasChanges = Object.keys(pendingChanges).length > 0

    const handleInputChange = (id: string, value: string) => {
        const numValue = parseInt(value)
        if (isNaN(numValue)) return

        setPendingChanges(prev => ({
            ...prev,
            [id]: numValue
        }))
    }

    const resetChanges = () => setPendingChanges({})

    const saveChanges = async () => {
        setIsSaving(true)
        try {
            const updates = Object.entries(pendingChanges).map(([id, stock]) => ({
                id,
                stock
            }))

            const { error } = await supabase
                .from('product_variants')
                .upsert(updates)

            if (error) throw error

            toast.success(`Updated ${updates.length} items successfully`)
            setPendingChanges({})
            router.refresh()
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="space-y-4">
            {/* Floating Action Bar */}
            {hasChanges && (
                <div className="sticky top-20 z-20 flex items-center justify-between bg-slate-900 text-white p-4 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-4">
                    <div className="flex items-center gap-4 ml-2">
                        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        <p className="text-[10px] font-black uppercase tracking-widest">
                            {Object.keys(pendingChanges).length} Variants modified
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="ghost"
                            onClick={resetChanges}
                            className="text-white hover:bg-white/10 text-[10px] font-black uppercase tracking-widest h-9"
                        >
                            <RotateCcw className="w-3.5 h-3.5 mr-2" /> Discard
                        </Button>
                        <Button
                            onClick={saveChanges}
                            disabled={isSaving}
                            className="bg-white text-slate-900 hover:bg-slate-100 text-[10px] font-black uppercase tracking-widest h-9 px-6"
                        >
                            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-2" />}
                            Publish Changes
                        </Button>
                    </div>
                </div>
            )}

            <div className="rounded-[2rem] border border-slate-100 bg-white overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left border-b border-slate-50 bg-slate-50/50">
                            <th className="p-5 font-black uppercase tracking-widest text-[9px] text-slate-400">Product Detail</th>
                            <th className="p-5 font-black uppercase tracking-widest text-[9px] text-slate-400">Status</th>
                            <th className="p-5 font-black uppercase tracking-widest text-[9px] text-slate-400 text-right">Current</th>
                            <th className="p-5 font-black uppercase tracking-widest text-[9px] text-slate-400 text-right">New Stock</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {inventory.map((item) => {
                            const isModified = pendingChanges[item.id] !== undefined
                            const displayStock = isModified ? pendingChanges[item.id] : item.stock

                            return (
                                <tr key={item.id} className={`transition-colors ${isModified ? 'bg-amber-50/30' : 'hover:bg-slate-50/50'}`}>
                                    <td className="p-5">
                                        <div className="font-bold text-slate-900 uppercase tracking-tight text-xs">
                                            {item.products?.name}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] font-mono text-slate-400">{item.sku}</span>
                                            <span className="text-[10px] text-slate-300">•</span>
                                            <span className="text-[10px] italic text-slate-400">{item.title}</span>
                                        </div>
                                    </td>
                                    <td className="p-5">
                                        {displayStock <= 0 ? (
                                            <Badge variant="destructive" className="rounded-lg text-[9px] uppercase tracking-tighter">Out</Badge>
                                        ) : displayStock <= 10 ? (
                                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none rounded-lg text-[9px] uppercase tracking-tighter">Low</Badge>
                                        ) : (
                                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none rounded-lg text-[9px] uppercase tracking-tighter">Healthy</Badge>
                                        )}
                                    </td>
                                    <td className="p-5 text-right font-mono text-slate-400 text-xs">
                                        {item.stock}
                                    </td>
                                    <td className="p-5 text-right">
                                        <input
                                            type="number"
                                            min="0"
                                            defaultValue={item.stock}
                                            onChange={(e) => handleInputChange(item.id, e.target.value)}
                                            className={`w-24 p-2.5 text-right rounded-xl border font-bold text-xs outline-none transition-all ${isModified
                                                ? 'border-amber-400 ring-2 ring-amber-100 bg-white'
                                                : 'border-slate-100 bg-slate-50 focus:border-slate-900 focus:bg-white'
                                                }`}
                                        />
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