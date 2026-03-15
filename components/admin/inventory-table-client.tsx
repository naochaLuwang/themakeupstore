
// "use client"

// import { useState } from "react"
// import { Badge } from "@/components/ui/badge"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Checkbox } from "@/components/ui/checkbox"
// import { AlertTriangle, Save, RotateCcw, Package, Loader2, Zap, MinusCircle, Tag, Hash } from "lucide-react"
// import { bulkUpdateStock } from "@/app/actions/inventory"
// import { toast } from "sonner"

// export function InventoryTableClient({ initialInventory }: { initialInventory: any[] }) {
//     const [drafts, setDrafts] = useState<Record<string, string>>({})
//     const [selectedIds, setSelectedIds] = useState<string[]>([])
//     const [isSaving, setIsSaving] = useState(false)

//     const hasChanges = Object.keys(drafts).length > 0
//     const hasSelection = selectedIds.length > 0

//     const handleInputChange = (id: string, val: string) => {
//         setDrafts(prev => ({ ...prev, [id]: val }))
//     }

//     const markSelectedOutOfStock = () => {
//         const newDrafts = { ...drafts }
//         selectedIds.forEach(id => { newDrafts[id] = "0" })
//         setDrafts(newDrafts)
//         toast.warning(`${selectedIds.length} items marked as Out of Stock in draft`)
//     }

//     const handleSave = async () => {
//         setIsSaving(true)
//         const res = await bulkUpdateStock(drafts)
//         if (res.success) {
//             toast.success("Inventory synchronized successfully")
//             setDrafts({})
//             setSelectedIds([])
//         } else {
//             toast.error("Update failed")
//         }
//         setIsSaving(false)
//     }

//     return (
//         <div className="relative">
//             {/* Floating Bulk Action Bar - Repositioned for Mobile Navigation */}
//             {(hasSelection || hasChanges) && (
//                 <div className="fixed bottom-6 lg:bottom-10 left-4 right-4 lg:left-1/2 lg:-translate-x-1/2 lg:w-max z-50 flex flex-col lg:flex-row items-center gap-4 lg:gap-6 bg-slate-900 border border-white/20 text-white p-4 lg:px-6 lg:py-4 rounded-[2rem] shadow-2xl animate-in slide-in-from-bottom-5">
//                     {hasSelection && (
//                         <div className="flex items-center justify-between w-full lg:w-auto lg:border-r lg:border-white/10 lg:pr-4">
//                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
//                                 Selected ({selectedIds.length})
//                             </span>
//                             <Button size="sm" variant="destructive" onClick={markSelectedOutOfStock} className="h-8 rounded-xl text-[10px] font-bold ml-4">
//                                 <MinusCircle className="w-3 h-3 mr-1" /> Set Out of Stock
//                             </Button>
//                         </div>
//                     )}

//                     <div className="flex items-center justify-between w-full lg:w-auto gap-4">
//                         <div className="flex flex-col">
//                             <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-none">Status</span>
//                             <span className="text-xs font-bold">{Object.keys(drafts).length} edits</span>
//                         </div>
//                         <div className="flex gap-2">
//                             <Button variant="ghost" size="icon" onClick={() => { setDrafts({}); setSelectedIds([]) }} className="h-10 w-10 hover:bg-white/10 text-slate-400 rounded-xl">
//                                 <RotateCcw className="w-4 h-4" />
//                             </Button>
//                             <Button onClick={handleSave} disabled={isSaving} className="bg-white text-slate-900 hover:bg-slate-200 font-bold px-6 rounded-xl h-10 text-xs">
//                                 {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
//                             </Button>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* DESKTOP TABLE VIEW */}
//             <div className="hidden lg:block rounded-[2rem] border bg-white overflow-hidden shadow-sm">
//                 <table className="w-full text-sm">
//                     <thead className="bg-slate-50 border-b">
//                         <tr className="text-left">
//                             <th className="p-5 w-12 text-center">
//                                 <Checkbox
//                                     checked={selectedIds.length === initialInventory.length}
//                                     onCheckedChange={(checked) => setSelectedIds(checked ? initialInventory.map(i => i.id) : [])}
//                                 />
//                             </th>
//                             <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product & SKU</th>
//                             <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Current Stock</th>
//                             <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Update</th>
//                         </tr>
//                     </thead>
//                     <tbody className="divide-y divide-slate-100">
//                         {initialInventory.map((item) => {
//                             const isModified = drafts[item.id] !== undefined
//                             const isSelected = selectedIds.includes(item.id)
//                             const displayValue = drafts[item.id] ?? item.stock

//                             return (
//                                 <tr key={item.id} className={`transition-all ${isSelected ? 'bg-slate-50' : ''} ${isModified ? 'bg-blue-50/40' : ''}`}>
//                                     <td className="p-5 text-center">
//                                         <Checkbox
//                                             checked={isSelected}
//                                             onCheckedChange={(checked) => setSelectedIds(prev => checked ? [...prev, item.id] : prev.filter(i => i !== item.id))}
//                                         />
//                                     </td>
//                                     <td className="p-5">
//                                         <div className="font-bold text-slate-900">{item.products?.name}</div>
//                                         <div className="flex items-center gap-2 mt-1">
//                                             <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 uppercase">
//                                                 {item.sku}
//                                             </span>
//                                             <span className="text-[10px] text-slate-400 font-black uppercase italic">
//                                                 {item.title === "Default" ? "Standard" : item.title}
//                                             </span>
//                                         </div>
//                                     </td>
//                                     <td className="p-5 text-center">
//                                         <div className="inline-flex flex-col items-center">
//                                             <span className={`text-sm font-black ${item.stock <= 5 ? 'text-red-500' : 'text-slate-600'}`}>{item.stock}</span>
//                                             {isModified && <Zap className="w-3 h-3 text-blue-500 mt-1" />}
//                                         </div>
//                                     </td>
//                                     <td className="p-5 text-right">
//                                         <div className="flex items-center justify-end gap-2">
//                                             {isModified && (
//                                                 <span className="text-[10px] font-black text-blue-600 uppercase bg-blue-100 px-2 py-1 rounded-lg">
//                                                     New: {displayValue}
//                                                 </span>
//                                             )}
//                                             <Input
//                                                 className={`w-24 h-10 text-right font-black rounded-xl transition-all ${isModified ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-slate-100'}`}
//                                                 value={drafts[item.id] ?? ""}
//                                                 onChange={(e) => handleInputChange(item.id, e.target.value)}
//                                             />
//                                         </div>
//                                     </td>
//                                 </tr>
//                             )
//                         })}
//                     </tbody>
//                 </table>
//             </div>

//             {/* MOBILE CARD VIEW */}
//             <div className="lg:hidden space-y-4">
//                 <div className="flex items-center justify-between px-2 mb-2">
//                     <div className="flex items-center gap-2">
//                         <Checkbox
//                             checked={selectedIds.length === initialInventory.length}
//                             onCheckedChange={(checked) => setSelectedIds(checked ? initialInventory.map(i => i.id) : [])}
//                         />
//                         <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Select All</span>
//                     </div>
//                 </div>

//                 {initialInventory.map((item) => {
//                     const isModified = drafts[item.id] !== undefined
//                     const isSelected = selectedIds.includes(item.id)
//                     const displayValue = drafts[item.id] ?? item.stock

//                     return (
//                         <div
//                             key={item.id}
//                             className={`p-5 rounded-[2rem] border transition-all ${isSelected ? 'border-slate-900 bg-slate-50' : 'bg-white border-slate-100'} ${isModified ? 'ring-2 ring-blue-500 border-transparent shadow-lg shadow-blue-500/5' : ''}`}
//                         >
//                             <div className="flex items-start justify-between gap-4 mb-4">
//                                 <div className="flex-1 min-w-0">
//                                     <h4 className="font-bold text-slate-900 text-sm truncate leading-tight mb-1">{item.products?.name}</h4>
//                                     <div className="flex flex-wrap gap-2">
//                                         <span className="flex items-center gap-1 text-[9px] font-mono font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg">
//                                             <Hash className="w-2.5 h-2.5" /> {item.sku}
//                                         </span>
//                                         <span className="flex items-center gap-1 text-[9px] font-black uppercase text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg tracking-tighter">
//                                             <Tag className="w-2.5 h-2.5" /> {item.title === "Default" ? "Standard" : item.title}
//                                         </span>
//                                     </div>
//                                 </div>
//                                 <Checkbox
//                                     checked={isSelected}
//                                     onCheckedChange={(checked) => setSelectedIds(prev => checked ? [...prev, item.id] : prev.filter(i => i !== item.id))}
//                                     className="mt-1 rounded-md"
//                                 />
//                             </div>

//                             <div className="flex items-center justify-between pt-4 border-t border-slate-50">
//                                 <div className="flex flex-col">
//                                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Stock</span>
//                                     <div className="flex items-center gap-2">
//                                         <span className={`text-xl font-black ${item.stock <= 5 ? 'text-red-500' : 'text-slate-900'}`}>
//                                             {item.stock}
//                                         </span>
//                                         {isModified && <Zap className="w-4 h-4 text-blue-500 animate-pulse" />}
//                                     </div>
//                                 </div>

//                                 <div className="flex flex-col items-end">
//                                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
//                                         {isModified ? "Update Pending" : "Quick Adjust"}
//                                     </span>
//                                     <div className="flex items-center gap-2">
//                                         {isModified && (
//                                             <Badge className="bg-blue-600 text-white border-none text-[10px] font-bold rounded-lg px-2 h-7">
//                                                 → {displayValue}
//                                             </Badge>
//                                         )}
//                                         <Input
//                                             type="number"
//                                             className="w-20 h-10 text-center font-black rounded-xl border-slate-200 focus:ring-2 focus:ring-black"
//                                             placeholder={item.stock}
//                                             value={drafts[item.id] ?? ""}
//                                             onChange={(e) => handleInputChange(item.id, e.target.value)}
//                                         />
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>
//                     )
//                 })}
//             </div>
//         </div>
//     )
// }

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