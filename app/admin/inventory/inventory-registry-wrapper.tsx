"use client"

import { useState, useMemo, Fragment } from "react"
import { useRouter } from "next/navigation"
import { updateStock } from "@/app/actions/inventory"
import { toast } from "sonner"
import {
    Loader2, Save, Search, Package, Square, CheckSquare, MinusSquare,
    Zap,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"

type VariantData = {
    id: string; sku: string; title: string; stock: number;
    price: number; discount_type?: string; discount_value?: number;
}
export type ProductData = {
    id: string; name: string; brand?: string; thumbnail_url?: string;
    product_variants?: VariantData[];
    product_categories?: { category_id: string }[];
}

type StockFilter = "all" | "out" | "low" | "in"
const MAX_STOCK = 2_147_483_647

function matchesStockFilter(stock: number, filter: StockFilter) {
    if (filter === "out") return stock <= 0
    if (filter === "low") return stock > 0 && stock <= 10
    if (filter === "in") return stock > 0
    return true
}

function stockAdjustment(currentStock: number, input: string): number | null {
    const clean = input.trim()
    if (!/^[+-]?\d+$/.test(clean)) return null
    const amount = Number(clean)
    if (!Number.isSafeInteger(amount)) return null
    const stock = /^[+-]/.test(clean) ? Math.max(0, currentStock + amount) : amount
    return Number.isSafeInteger(stock) && stock >= 0 && stock <= MAX_STOCK ? stock : null
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
    categories,
    initialSearch = "",
    initialStock = "all",
}: {
    initialProducts: ProductData[];
    categories: { id: string; name: string }[];
    initialSearch?: string;
    initialStock?: StockFilter;
}) {
    const [searchQuery, setSearchQuery] = useState(initialSearch)
    const [selectedCategory, setSelectedCategory] = useState("all")
    const [stockFilter, setStockFilter] = useState<StockFilter>(initialStock)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const router = useRouter()
    const [savingId, setSavingId] = useState<string | null>(null)
    const [bulkOpen, setBulkOpen] = useState(false)
    const [bulkAction, setBulkAction] = useState<"set" | "add" | "subtract">("set")
    const [bulkValue, setBulkValue] = useState("10")
    const [isBulkUpdating, setIsBulkUpdating] = useState(false)
    const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 })
    const [bulkError, setBulkError] = useState("")
    const isUpdating = isBulkUpdating || savingId !== null

    const filteredProducts = useMemo(() => {
        const q = searchQuery.trim().toLowerCase()
        return initialProducts.flatMap((p) => {
            const matchesProduct =
                !q ||
                p.name.toLowerCase().includes(q) ||
                p.brand?.toLowerCase().includes(q)
            const matchesCategory =
                selectedCategory === "all" ||
                p.product_categories?.some((pc) => pc.category_id === selectedCategory)
            if (!matchesCategory) return []

            const variants = (p.product_variants || []).filter((v) =>
                matchesStockFilter(v.stock, stockFilter) &&
                (matchesProduct || v.title?.toLowerCase().includes(q) || v.sku?.toLowerCase().includes(q))
            )
            return variants.length > 0 ? [{ ...p, product_variants: variants, totalVariants: p.product_variants?.length || 0 }] : []
        })
    }, [searchQuery, selectedCategory, stockFilter, initialProducts])

    const allVariantIds = useMemo(() => {
        const ids: string[] = []
        filteredProducts.forEach((p) =>
            p.product_variants?.forEach((v) => ids.push(v.id))
        )
        return ids
    }, [filteredProducts])

    const selectedVariantIds = allVariantIds.filter((id) => selectedIds.has(id))
    const selectedCount = selectedVariantIds.length
    const allSelected = allVariantIds.length > 0 && selectedCount === allVariantIds.length
    const hasFilters = searchQuery !== "" || selectedCategory !== "all" || stockFilter !== "all"

    const clearSelection = () => {
        setSelectedIds(new Set())
        setBulkError("")
    }

    const toggleSelect = (id: string) => {
        setSelectedIds((previous) => {
            const next = new Set(previous)
            if (next.has(id)) next.delete(id); else next.add(id)
            return next
        })
    }

    const toggleSelectAll = () => {
        setSelectedIds(allSelected ? new Set() : new Set(allVariantIds))
    }

    const handleSave = async (id: string, currentStock: number, input: string) => {
        if (isUpdating) return false
        const newStock = stockAdjustment(currentStock, input)
        if (newStock === null) {
            toast.error("Enter a whole number, +N or -N")
            return false
        }
        if (newStock === currentStock) return false

        setSavingId(id)
        try {
            const result = await updateStock(id, newStock)
            if (!result.success) {
                toast.error(result.message || "Error updating stock")
                return false
            }
            toast.success("Stock updated")
            router.refresh()
            return true
        } catch {
            toast.error("Unable to save stock. Check the current stock before trying again.")
            return false
        } finally {
            setSavingId(null)
        }
    }

    const handleBulkApply = async () => {
        if (isUpdating || selectedCount === 0) return
        const val = stockAdjustment(0, bulkValue)
        if (!/^\d+$/.test(bulkValue.trim()) || val === null || (bulkAction !== "set" && val === 0)) {
            return toast.error(bulkAction === "set" ? "Enter a whole number of 0 or more" : "Enter a whole number greater than 0")
        }

        const variantsById = new Map(initialProducts.flatMap((p) => (p.product_variants || []).map((v) => [v.id, v] as const)))
        const updates = selectedVariantIds.map((id) => {
            const stock = variantsById.get(id)!.stock
            const input = bulkAction === "set" ? String(val) : `${bulkAction === "add" ? "+" : "-"}${val}`
            return { id, newStock: stockAdjustment(stock, input) }
        })
        if (updates.some((update) => update.newStock === null)) return toast.error("Stock value is too large")

        setIsBulkUpdating(true)
        setBulkError("")
        setBulkProgress({ current: 0, total: updates.length })
        const failedIds = new Set<string>()
        let updatedCount = 0
        try {
            for (let i = 0; i < updates.length; i++) {
                const { id, newStock } = updates[i]
                try {
                    const result = await updateStock(id, newStock!)
                    if (result.success) updatedCount++
                    else failedIds.add(id)
                } catch {
                    failedIds.add(id)
                }
                setBulkProgress({ current: i + 1, total: updates.length })
            }
            setSelectedIds(failedIds)
            router.refresh()
            if (failedIds.size > 0) {
                const message = `${updatedCount} updated; ${failedIds.size} could not be confirmed. Check current stock before retrying the selected variants.`
                setBulkError(message)
                toast.error(message)
            } else {
                setBulkOpen(false)
                toast.success(`Updated ${updatedCount} variants`)
            }
        } finally {
            setIsBulkUpdating(false)
            setBulkProgress({ current: 0, total: 0 })
        }
    }

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 stroke-[1.5]" />
                    <Input
                        aria-label="Search inventory"
                        placeholder="Search products, shades or SKU..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); clearSelection() }}
                        disabled={isUpdating}
                        className="pl-9 h-9 text-sm border-slate-200 bg-slate-50 rounded-lg"
                    />
                </div>
                <div className="relative shrink-0">
                    <FilterIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                    <select
                        aria-label="Filter by category"
                        value={selectedCategory}
                        onChange={(e) => { setSelectedCategory(e.target.value); clearSelection() }}
                        disabled={isUpdating}
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
                        aria-label="Filter by stock"
                        value={stockFilter}
                        onChange={(e) => { setStockFilter(e.target.value as StockFilter); clearSelection() }}
                        disabled={isUpdating}
                        className="h-9 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-600 appearance-none cursor-pointer outline-none min-w-[120px] px-3"
                    >
                        <option value="all">All Stock</option>
                        <option value="low">Low Stock (1–10)</option>
                        <option value="out">Out of Stock</option>
                        <option value="in">In Stock (&gt;0)</option>
                    </select>
                </div>
                {selectedCount > 0 && (
                    <button
                        onClick={() => { setBulkError(""); setBulkOpen(true) }}
                        disabled={isUpdating}
                        className="h-9 px-4 rounded-lg bg-slate-900 text-white text-xs font-semibold tracking-normal flex items-center gap-2 hover:bg-slate-800 transition-colors shrink-0"
                    >
                        <Zap className="w-4 h-4 stroke-[1.5]" />
                        Bulk ({selectedCount})
                    </button>
                )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <p role="status">
                    Showing {allVariantIds.length} variant{allVariantIds.length !== 1 ? "s" : ""} across {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""}. Filters apply to individual variants.
                </p>
                {hasFilters && (
                    <button
                        onClick={() => { setSearchQuery(""); setSelectedCategory("all"); setStockFilter("all"); clearSelection() }}
                        disabled={isUpdating}
                        className="font-medium text-slate-700 hover:text-slate-900 underline underline-offset-2 disabled:opacity-50"
                    >
                        Clear filters
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto shadow-sm min-w-0 max-w-full">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                            <th className="py-3 px-4 w-10">
                                <button
                                    onClick={toggleSelectAll}
                                    role="checkbox"
                                    aria-label="Select all visible variants"
                                    aria-checked={allSelected ? true : selectedCount > 0 ? "mixed" : false}
                                    disabled={isUpdating || allVariantIds.length === 0}
                                    className="text-slate-400 hover:text-slate-500 transition-colors disabled:opacity-40"
                                >
                                    {allSelected ? <CheckSquare className="w-4 h-4 stroke-[1.5]" /> : selectedCount > 0 ? <MinusSquare className="w-4 h-4 stroke-[1.5]" /> : <Square className="w-4 h-4 stroke-[1.5]" />}
                                </button>
                            </th>
                            <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 tracking-normal">Product</th>
                            <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 tracking-normal">Variant</th>
                            <th className="py-3 px-4 text-right text-xs font-semibold text-slate-500 tracking-normal">MRP / Price</th>
                            <th className="py-3 px-4 text-center text-xs font-semibold text-slate-500 tracking-normal">Stock</th>
                            <th className="py-3 px-4 text-right text-xs font-semibold text-slate-500 tracking-normal">Adjust</th>
                            <th className="py-3 px-4 w-14"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredProducts.length === 0 && (
                            <tr>
                                <td colSpan={7} className="h-24 text-center text-xs text-slate-500 tabular-nums">
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
                                        <td className="py-2.5 px-4 tabular-nums" />
                                        <td className="py-2.5 px-4 tabular-nums" colSpan={2}>
                                            <div className="flex items-center gap-2.5">
                                                {product.thumbnail_url ? (
                                                    <img src={product.thumbnail_url} alt={product.name || "Product"} className="w-7 h-7 rounded-lg object-cover bg-slate-100 shrink-0" />
                                                ) : (
                                                    <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center">
                                                        <Package className="w-4 h-4 text-slate-400 stroke-[1.5]" />
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-slate-800">{product.name}</p>
                                                    {product.brand && (
                                                        <p className="text-xs text-slate-500">{product.brand}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-4 text-right tabular-nums">
                                            {variants.length > 0 && (() => {
                                                const minSelling = Math.min(...variants.map(computeSellingPrice))
                                                const minMrp = Math.min(...variants.map((v) => v.price || 0))
                                                const hasDiscount = minMrp > minSelling
                                                return (
                                                    <span className="text-xs text-slate-500 inline-flex items-center gap-1.5 justify-end">
                                                        {hasDiscount && (
                                                            <span className="line-through text-slate-500">₹{minMrp.toFixed(2)}</span>
                                                        )}
                                                        <span className={hasDiscount ? "text-emerald-600 font-semibold" : ""}>
                                                            ₹{minSelling.toFixed(2)}
                                                        </span>
                                                        {variants.length > 1 && "+"}
                                                    </span>
                                                )
                                            })()}
                                        </td>
                                        <td className="py-2.5 px-4 text-center tabular-nums" title="Stock across the variants shown below">
                                            <div className="flex items-center justify-center gap-2">
                                                <span className={`text-sm font-semibold tabular-nums ${
                                                    totalStock <= 0 ? "text-red-600" :
                                                    totalStock <= 10 ? "text-amber-600" :
                                                    "text-emerald-600"
                                                }`}>
                                                    {totalStock}
                                                </span>
                                                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                                                    totalStock <= 0 ? "bg-red-50 text-red-600" :
                                                    totalStock <= 10 ? "bg-amber-50 text-amber-600" :
                                                    "bg-emerald-50 text-emerald-600"
                                                }`}>
                                                    {totalStock <= 0 ? "Out" : totalStock <= 10 ? "Low" : "OK"}
                                                </span>
                                            </div>
                                        </td>
                                        <td colSpan={2} className="py-2.5 px-4 text-right tabular-nums">
                                            <span className="text-xs text-slate-500">
                                                {variants.length < product.totalVariants ? `${variants.length} of ${product.totalVariants}` : variants.length} variant{product.totalVariants !== 1 ? "s" : ""}
                                            </span>
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
                                                <td className="py-3 px-4 tabular-nums">
                                                    <button
                                                        onClick={() => toggleSelect(v.id)}
                                                        role="checkbox"
                                                        aria-label={`Select ${product.name} — ${v.title || "Default"}${v.sku ? ` (${v.sku})` : ""}`}
                                                        aria-checked={isSelected}
                                                        disabled={isUpdating}
                                                        className={`${isSelected ? "text-slate-700" : "text-slate-200"} hover:text-blue-400 transition-colors`}
                                                    >
                                                        {isSelected ? <CheckSquare className="w-4 h-4 stroke-[1.5]" /> : <Square className="w-4 h-4 stroke-[1.5]" />}
                                                    </button>
                                                </td>
                                                <td className="py-3 px-4 tabular-nums" />
                                                <td className="py-3 px-4 tabular-nums">
                                                    <div className="flex items-center gap-2">
                                                        <Package className="w-4 h-4 text-slate-400 shrink-0 stroke-[1.5]" />
                                                        <span className="text-xs text-slate-700 font-medium">{v.title || "Default"}</span>
                                                        {v.sku && (
                                                            <code className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{v.sku}</code>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-right tabular-nums">
                                                    <span className="text-xs inline-flex items-center gap-1.5 justify-end">
                                                        {(v.price || 0) > sellingPrice && (
                                                            <span className="line-through text-slate-500">₹{(v.price || 0).toFixed(2)}</span>
                                                        )}
                                                        <span className={(v.price || 0) > sellingPrice ? "text-emerald-600 font-semibold" : "text-slate-600"}>
                                                            ₹{sellingPrice.toFixed(2)}
                                                        </span>
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-center tabular-nums">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <span className={`text-sm font-semibold font-mono ${level.color}`}>{v.stock}</span>
                                                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${level.bg} ${level.color}`}>
                                                            {level.label}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-right tabular-nums">
                                                    <StockInput
                                                        key={`${v.id}:${v.stock}`}
                                                        label={`${product.name} — ${v.title || "Default"}${v.sku ? ` (${v.sku})` : ""}`}
                                                        currentStock={v.stock}
                                                        onSave={(input) => handleSave(v.id, v.stock, input)}
                                                        isSaving={isSaving}
                                                        disabled={isUpdating}
                                                    />
                                                </td>
                                                <td className="py-3 px-4 text-right tabular-nums" />
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
            <Dialog open={bulkOpen} onOpenChange={(open) => { if (!isBulkUpdating) setBulkOpen(open) }}>
                <DialogContent className="sm:max-w-sm rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-sm font-semibold text-slate-900">Bulk Stock Update</DialogTitle>
                        <DialogDescription>Update only the selected visible variants.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="flex gap-2">
                            {(["set", "add", "subtract"] as const).map((action) => (
                                <button
                                    key={action}
                                    onClick={() => setBulkAction(action)}
                                    disabled={isBulkUpdating}
                                    className={`flex-1 h-10 rounded-xl text-xs font-semibold tracking-normal transition-colors ${
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
                            <label htmlFor="bulk-stock-value" className="text-xs font-semibold text-slate-500 tracking-normal">
                                {bulkAction === "set" ? "Stock Value" : "Amount"}
                            </label>
                            <Input
                                id="bulk-stock-value"
                                type="number"
                                min={bulkAction === "set" ? 0 : 1}
                                step="1"
                                value={bulkValue}
                                onChange={(e) => setBulkValue(e.target.value)}
                                disabled={isBulkUpdating}
                                className="h-10 text-sm border-slate-200 bg-slate-50 rounded-xl"
                                placeholder="e.g. 10"
                            />
                        </div>
                        {isBulkUpdating ? (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin stroke-[1.5]" />
                                        Saving {bulkProgress.current} of {bulkProgress.total}
                                    </span>
                                    <span className="font-mono text-slate-500">
                                        {Math.round((bulkProgress.current / bulkProgress.total) * 100)}%
                                    </span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-slate-900 rounded-full transition-colors duration-300"
                                        style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-slate-500">
                                Apply to <strong className="text-slate-700">{selectedCount} visible variant{selectedCount !== 1 ? "s" : ""}</strong>
                            </p>
                        )}
                        {bulkError && <p role="alert" className="text-xs text-red-600">{bulkError}</p>}
                    </div>
                    <DialogFooter className="sm:justify-end gap-2">
                        <button
                            onClick={() => setBulkOpen(false)}
                            disabled={isBulkUpdating}
                            className="h-9 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleBulkApply}
                            disabled={isBulkUpdating || selectedCount === 0}
                            className="h-9 px-5 rounded-xl bg-slate-900 text-white text-xs font-semibold tracking-normal hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isBulkUpdating ? <Loader2 className="w-4 h-4 animate-spin stroke-[1.5]" /> : <Zap className="w-4 h-4 stroke-[1.5]" />}
                            {isBulkUpdating ? "Saving..." : "Apply"}
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
    label,
    currentStock,
    onSave,
    isSaving,
    disabled,
}: {
    label: string;
    currentStock: number;
    onSave: (input: string) => Promise<boolean>;
    isSaving: boolean;
    disabled: boolean;
}) {
    const [input, setInput] = useState("")

    const hasValue = input.trim() !== ""
    const preview = stockAdjustment(currentStock, input)
    const invalid = hasValue && preview === null
    const hasChanges = preview !== null && preview !== currentStock

    return (
        <div className="flex items-center justify-end gap-1.5">
            <input
                type="text"
                aria-label={`Adjust stock for ${label}`}
                aria-invalid={invalid}
                title="Enter a whole number to set stock, +N to add or -N to subtract"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={disabled}
                className={`w-20 h-8 text-xs font-mono text-right rounded-lg border transition-colors px-2
                    ${invalid ? "border-red-400 bg-red-50" : hasValue ? "border-amber-400 bg-white ring-2 ring-amber-100" : "border-slate-200 bg-slate-50"}
                    [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300`}
                placeholder="+N / -N"
            />
            {hasChanges && (
                <span className="text-xs font-semibold text-amber-600 whitespace-nowrap">→{preview}</span>
            )}
            <button
                aria-label={`Save stock for ${label}`}
                onClick={async () => { if (await onSave(input)) setInput("") }}
                disabled={disabled || !hasChanges}
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-colors disabled:opacity-30 disabled:pointer-events-none"
            >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin stroke-[1.5]" /> : <Save className="w-4 h-4 stroke-[1.5]" />}
            </button>
        </div>
    )
}
