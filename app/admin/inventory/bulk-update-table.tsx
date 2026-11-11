"use client"

import * as React from "react"
import { useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Save, RotateCcw } from "lucide-react"

export function BulkUpdateTable({ inventory }: { inventory: any[] }) {
    const [pendingChanges, setPendingChanges] = useState<{ [key: string]: number }>({})
    const [isSaving, setIsSaving] = useState(false)
    const [saveProgress, setSaveProgress] = useState({ current: 0, total: 0 })
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
        const entries = Object.entries(pendingChanges)
        setSaveProgress({ current: 0, total: entries.length })
        try {
            for (let i = 0; i < entries.length; i++) {
                const [id, stock] = entries[i]
                setSaveProgress({ current: i + 1, total: entries.length })

                const { error } = await supabase
                    .from('product_variants')
                    .upsert({ id, stock })

                if (error) throw error
            }

            toast.success(`Updated ${entries.length} items successfully`)
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
            {(hasChanges || isSaving) && (
                <div className="sticky top-20 z-20 flex items-center justify-between bg-slate-900 text-white p-4 rounded-2xl shadow-sm animate-in fade-in slide-in-from-top-4">
                    <div className="flex items-center gap-4 ml-2">
                        {isSaving ? (
                            <div className="flex items-center gap-3">
                                <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                <div>
                                    <p className="text-xs font-semibold tracking-normal">
                                        Saving {saveProgress.current} of {saveProgress.total}
                                    </p>
                                    <div className="w-32 h-1 bg-white/10 rounded-full mt-1.5 overflow-hidden">
                                        <div
                                            className="h-full bg-white rounded-full transition-colors duration-300"
                                            style={{ width: `${(saveProgress.current / saveProgress.total) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="w-2 h-2 rounded-full bg-amber-400" />
                                <p className="text-xs font-semibold tracking-normal">
                                    {Object.keys(pendingChanges).length} Variants modified
                                </p>
                            </>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {!isSaving && (
                            <>
                                <Button
                                    variant="ghost"
                                    onClick={resetChanges}
                                    className="text-white hover:bg-white/10 text-xs font-semibold tracking-normal h-9"
                                >
                                    <RotateCcw className="w-4 h-4 mr-2 stroke-[1.5]" /> Discard
                                </Button>
                                <Button
                                    onClick={saveChanges}
                                    className="bg-white text-slate-900 hover:bg-slate-100 text-xs font-semibold tracking-normal h-9 px-6"
                                >
                                    <Save className="w-4 h-4 mr-2 stroke-[1.5]" /> Publish Changes
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            )}

            <div className="rounded-2xl border border-slate-100 bg-white overflow-x-auto shadow-sm min-w-0 max-w-full">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left border-b border-slate-50 bg-slate-50/50">
                            <th className="p-5 font-semibold tracking-normal text-xs text-slate-500">Product Detail</th>
                            <th className="p-5 font-semibold tracking-normal text-xs text-slate-500">Status</th>
                            <th className="p-5 font-semibold tracking-normal text-xs text-slate-500 text-right">Current</th>
                            <th className="p-5 font-semibold tracking-normal text-xs text-slate-500 text-right">New Stock</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {inventory.map((item) => {
                            const isModified = pendingChanges[item.id] !== undefined
                            const displayStock = isModified ? pendingChanges[item.id] : item.stock

                            return (
                                <tr key={item.id} className={`transition-colors ${isModified ? 'bg-amber-50/30' : 'hover:bg-slate-50/50'}`}>
                                    <td className="p-5 tabular-nums">
                                        <div className="font-semibold text-slate-900 tracking-tight text-xs">
                                            {item.products?.name}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs font-mono text-slate-500">{item.sku}</span>
                                            <span className="text-xs text-slate-400">•</span>
                                            <span className="text-xs text-slate-500">{item.title}</span>
                                        </div>
                                    </td>
                                    <td className="p-5 tabular-nums">
                                        {displayStock <= 0 ? (
                                            <Badge variant="destructive" className="rounded-lg text-xs tracking-normal">Out</Badge>
                                        ) : displayStock <= 10 ? (
                                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none rounded-lg text-xs tracking-normal">Low</Badge>
                                        ) : (
                                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none rounded-lg text-xs tracking-normal">Healthy</Badge>
                                        )}
                                    </td>
                                    <td className="p-5 text-right font-mono text-slate-500 text-xs tabular-nums">
                                        {item.stock}
                                    </td>
                                    <td className="p-5 text-right tabular-nums">
                                        <input
                                            type="number"
                                            min="0"
                                            defaultValue={item.stock}
                                            onChange={(e) => handleInputChange(item.id, e.target.value)}
                                            className={`w-24 p-2.5 text-right rounded-xl border font-semibold text-xs outline-none transition-colors ${isModified
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