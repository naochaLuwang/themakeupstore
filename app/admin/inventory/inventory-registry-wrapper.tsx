"use client"

import { useState, useMemo, Fragment, useEffect } from "react"
import { useRouter } from "next/navigation"
import { updateStock } from "@/app/actions/inventory"
import { toast } from "sonner"
import {
    Loader2, Save, Search, Package, Square, CheckSquare,
    Zap,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"

type VariantData = {
    id: string; sku: string; title: string; stock: number;
    price: number; discount_type?: string; discount_value?: number;
}
type ProductData = {
    id: string; name: string; brand?: string; thumbnail_url?: string;
    product_variants?: VariantData[];
    product_categories?: { category_id: string }[];
}

function computeSellingPrice(v: VariantData): number {
    const base = v.price || 0
    const dt = v.discount_type
    const dv = v.discount_value || 0
    if (dt === "percentage" && dv > 0) return base * (1 - dv / 100)
    if ((dt === "fixed" || dt === "amount") && dv > 0) return Math.max(0, base - dv)
    return base
}

function stockLevel(stock: number) {
    if (stock <= 0) return { label: "Out", color: "text-red-600", bg: "bg-red-50" }
    if (stock <= 10) return { label: "Low", color: "text-amber-600", bg: "bg-amber-50" }
    return { label: "In Stock", color: "text-emerald-600", bg: "bg-emerald-50" }
}

export default function InventoryRegistryWrapper({
    initialProducts,
    categories
}: {
    initialProducts: ProductData[];
    categories: { id: string; name: string }[];
}) {
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedCategory, setSelectedCategory] = useState("all")
    const [stockFilter, setStockFilter] = useState("all")
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const router = useRouter()
    const [savingId, setSavingId] = useState<string | null>(null)
    const [bulkOpen, setBulkOpen] = useState(false)
    const [bulkAction, setBulkAction] = useState<"set" | "add" | "subtract">("set")
    const [bulkValue, setBulkValue] = useState("10")

    const filteredProducts = useMemo(() => {
        return initialProducts.filter((p) => {
            const q = searchQuery.toLowerCase()
            const matchesSearch =
                !q ||
                p.name.toLowerCase().includes(q) ||
                p.brand?.toLowerCase().includes(q) ||
                p.product_variants?.some((v) =>
                    v.title?.toLowerCase().includes(q) ||
                    v.sku?.toLowerCase().includes(q)
                )
            const matchesCategory =
                selectedCategory === "all" ||
                p.product_categories?.some((pc) => pc.category_id === selectedCategory)

            let matchesStock = true
            const variants = p.product_variants || []
            if (stockFilter === "out") matchesStock = variants.every((v) => v.stock === 0)
            else if (stockFilter === "low") matchesStock = variants.some((v) => v.stock > 0 && v.stock <= 10)
            else if (stockFilter === "in") matchesStock = variants.every((v) => v.stock > 10)

            return matchesSearch && matchesCategory && matchesStock
        })
    }, [searchQuery, selectedCategory, stockFilter, initialProducts])

    const allVariantIds = useMemo(() => {
        const ids: string[] = []
        filteredProducts.forEach((p) =>
            p.product_variants?.forEach((v) => ids.push(v.id))
        )
        return ids
    }, [filteredProducts])

    const selectedCount = selectedIds.size

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds)
        if (next.has(id)) next.delete(id); else next.add(id)
        setSelectedIds(next)
    }

    const toggleSelectAll = () => {
        if (selectedCount > 0) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(allVariantIds))
        }
    }

    const handleSave = async (id: string, currentStock: number, input: string) => {
        let newStock = currentStock
        const clean = input.trim()
        if (clean.startsWith("+")) {
            newStock = currentStock + (parseInt(clean.slice(1)) || 0)
        } else if (clean.startsWith("-")) {
            newStock = Math.max(0, currentStock - (parseInt(clean.slice(1)) || 0))
        } else if (clean !== "") {
            newStock = parseInt(clean) || 0
        } else {
            return
        }
        if (newStock === currentStock) return

        setSavingId(id)
        try {
            await updateStock(id, newStock)
            toast.success("Stock updated")
            router.refresh()
        } catch (err: any) {
            toast.error(err.message || "Error updating stock")
        } finally {
            setSavingId(null)
        }
    }

    const handleBulkApply = async () => {
        const val = parseInt(bulkValue)
        if (isNaN(val) || val <= 0) return toast.error("Enter a valid value")

        for (const id of selectedIds) {
            // Find current stock
            let currentStock = 0
            for (const p of initialProducts) {
                const v = p.product_variants?.find((x) => x.id === id)
                if (v) { currentStock = v.stock; break }
            }

            let newStock = currentStock
            if (bulkAction === "set") newStock = val
            else if (bulkAction === "add") newStock = currentStock + val
            else if (bulkAction === "subtract") newStock = Math.max(0, currentStock - val)

            setSavingId(id)
            try {
                await updateStock(id, newStock)
            } catch {
                // continue with next
            }
        }
        setSavingId(null)
        setSelectedIds(new Set())
        setBulkOpen(false)
        router.refresh()
        toast.success(`Updated ${selectedIds.size} variants`)
    }

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <Input
                        placeholder="Search products or SKU..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 text-sm border-slate-200 bg-slate-50 rounded-lg"
                    />
                </div>
                <div className="relative shrink-0">
                    <FilterIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="pl-9 pr-8 h-9 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-600 appearance-none cursor-pointer outline-none min-w-[140px]"
                    >
                        <option value="all">All Categories</option>
                        {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>
                <div className="relative shrink-0">
                    <select
                        value={stockFilter}
                        onChange={(e) => setStockFilter(e.target.value)}
                        className="h-9 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-600 appearance-none cursor-pointer outline-none min-w-[120px] px-3"
                    >
                        <option value="all">All Stock</option>
                        <option value="low">Low (≤10)</option>
                        <option value="out">Out of Stock</option>
                        <option value="in">In Stock</option>
                    </select>
                </div>
                {selectedCount > 0 && (
                    <button
                        onClick={() => setBulkOpen(true)}
                        className="h-9 px-4 rounded-lg bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-slate-800 transition-colors shrink-0"
                    >
                        <Zap className="w-3.5 h-3.5" />
                        Bulk ({selectedCount})
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                            <th className="py-3 px-4 w-10">
                                <button onClick={toggleSelectAll} className="text-slate-300 hover:text-slate-500 transition-colors">
                                    {selectedCount > 0 ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                </button>
                            </th>
                            <th className="py-3 px-4 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Product</th>
                            <th className="py-3 px-4 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Variant</th>
                            <th className="py-3 px-4 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Price</th>
                            <th className="py-3 px-4 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Stock</th>
                            <th className="py-3 px-4 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Adjust</th>
                            <th className="py-3 px-4 w-14"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredProducts.length === 0 && (
                            <tr>
                                <td colSpan={7} className="h-24 text-center text-xs text-slate-400">
                                    No inventory items found.
                                </td>
                            </tr>
                        )}
                        {filteredProducts.map((product) => {
                            const variants = product.product_variants || []
                            const totalStock = variants.reduce((s, v) => s + v.stock, 0)

                            return (
                                <Fragment key={product.id}>
                                    {/* Product group row */}
                                    <tr className="bg-slate-50/30">
                                        <td className="py-2.5 px-4" />
                                        <td className="py-2.5 px-4" colSpan={2}>
                                            <div className="flex items-center gap-2.5">
                                                {product.thumbnail_url ? (
                                                    <img src={product.thumbnail_url} alt="" className="w-7 h-7 rounded-lg object-cover bg-slate-100 shrink-0" />
                                                ) : (
                                                    <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center">
                                                        <Package className="w-3.5 h-3.5 text-slate-300" />
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-slate-800">{product.name}</p>
                                                    {product.brand && (
                                                        <p className="text-[10px] text-slate-400">{product.brand}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-4 text-right">
                                            {variants.length > 0 && (
                                                <span className="text-xs text-slate-500">
                                                    ₹{Math.min(...variants.map(computeSellingPrice))}
                                                    {variants.length > 1 && "+"}
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-2.5 px-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <span className={`text-sm font-bold tabular-nums ${
                                                    totalStock === 0 ? "text-red-600" :
                                                    totalStock <= 10 ? "text-amber-600" :
                                                    "text-emerald-600"
                                                }`}>
                                                    {totalStock}
                                                </span>
                                                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                                    totalStock === 0 ? "bg-red-50 text-red-600" :
                                                    totalStock <= 10 ? "bg-amber-50 text-amber-600" :
                                                    "bg-emerald-50 text-emerald-600"
                                                }`}>
                                                    {totalStock === 0 ? "Out" : totalStock <= 10 ? "Low" : "OK"}
                                                </span>
                                            </div>
                                        </td>
                                        <td colSpan={2} className="py-2.5 px-4 text-right">
                                            <span className="text-xs text-slate-400">{variants.length} variant{variants.length !== 1 ? "s" : ""}</span>
                                        </td>
                                    </tr>
                                    {/* Variant rows */}
                                    {variants.map((v) => {
                                        const level = stockLevel(v.stock)
                                        const sellingPrice = computeSellingPrice(v)
                                        const isSelected = selectedIds.has(v.id)
                                        const isSaving = savingId === v.id

                                        return (
                                            <tr
                                                key={v.id}
                                                className={`group transition-colors ${isSelected ? "bg-blue-50/30" : ""}`}
                                            >
                                                <td className="py-3 px-4">
                                                    <button
                                                        onClick={() => toggleSelect(v.id)}
                                                        className={`${isSelected ? "text-blue-600" : "text-slate-200"} hover:text-blue-400 transition-colors`}
                                                    >
                                                        {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                                    </button>
                                                </td>
                                                <td className="py-3 px-4" />
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <Package className="w-3 h-3 text-slate-300 shrink-0" />
                                                        <span className="text-xs text-slate-700 font-medium">{v.title || "Default"}</span>
                                                        {v.sku && (
                                                            <code className="text-[9px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{v.sku}</code>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <span className="text-xs text-slate-600">₹{sellingPrice}</span>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <span className={`text-sm font-bold font-mono ${level.color}`}>{v.stock}</span>
                                                        <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${level.bg} ${level.color}`}>
                                                            {level.label}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <StockInput
                                                        currentStock={v.stock}
                                                        onSave={(input) => handleSave(v.id, v.stock, input)}
                                                        isSaving={isSaving}
                                                    />
                                                </td>
                                                <td className="py-3 px-4 text-right" />
                                            </tr>
                                        )
                                    })}
                                </Fragment>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Bulk Dialog */}
            <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
                <DialogContent className="sm:max-w-sm rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-sm font-bold text-slate-900">Bulk Stock Update</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="flex gap-2">
                            {(["set", "add", "subtract"] as const).map((action) => (
                                <button
                                    key={action}
                                    onClick={() => setBulkAction(action)}
                                    className={`flex-1 h-10 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                                        bulkAction === action
                                            ? "bg-slate-900 text-white shadow-sm"
                                            : "bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100"
                                    }`}
                                >
                                    {action === "set" ? "Set To" : action === "add" ? "Add" : "Subtract"}
                                </button>
                            ))}
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                {bulkAction === "set" ? "Stock Value" : "Amount"}
                            </label>
                            <Input
                                type="number"
                                min="0"
                                value={bulkValue}
                                onChange={(e) => setBulkValue(e.target.value)}
                                className="h-10 text-sm border-slate-200 bg-slate-50 rounded-xl"
                                placeholder="e.g. 10"
                            />
                        </div>
                        <p className="text-xs text-slate-400">
                            Apply to <strong className="text-slate-700">{selectedIds.size} variant{selectedIds.size !== 1 ? "s" : ""}</strong>
                        </p>
                    </div>
                    <DialogFooter className="sm:justify-end gap-2">
                        <button
                            onClick={() => setBulkOpen(false)}
                            className="h-9 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleBulkApply}
                            className="h-9 px-5 rounded-xl bg-slate-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors flex items-center gap-2"
                        >
                            <Zap className="w-3.5 h-3.5" />
                            Apply
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

// ─── Sub-components ───

function FilterIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
    )
}

function StockInput({
    currentStock,
    onSave,
    isSaving,
}: {
    currentStock: number;
    onSave: (input: string) => Promise<void> | void;
    isSaving: boolean;
}) {
    const [input, setInput] = useState("")

    useEffect(() => { setInput("") }, [currentStock])

    const hasValue = input.trim() !== ""

    let preview = currentStock
    const clean = input.trim()
    if (clean.startsWith("+")) preview = currentStock + (parseInt(clean.slice(1)) || 0)
    else if (clean.startsWith("-")) preview = Math.max(0, currentStock - (parseInt(clean.slice(1)) || 0))
    else if (clean !== "") preview = parseInt(clean) || 0
    else preview = currentStock

    const hasChanges = preview !== currentStock

    return (
        <div className="flex items-center justify-end gap-1.5">
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className={`w-20 h-8 text-xs font-mono text-right rounded-lg border transition-all px-2
                    ${hasValue ? "border-amber-400 bg-white ring-2 ring-amber-100" : "border-slate-200 bg-slate-50"}
                    [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none
                    focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300`}
                placeholder="+N / -N"
            />
            {hasChanges && (
                <span className="text-[10px] font-semibold text-amber-600 whitespace-nowrap">→{preview}</span>
            )}
            <button
                onClick={() => { onSave(input); setInput("") }}
                disabled={isSaving || !hasChanges}
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all disabled:opacity-30 disabled:pointer-events-none"
            >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            </button>
        </div>
    )
}
