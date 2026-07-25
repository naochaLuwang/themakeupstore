"use client"

import { useState, useMemo, useEffect, Fragment } from "react"
import { updatePricing } from "@/app/actions/pricing"
import { toast } from "sonner"
import {
    Loader2, Save, Search, Zap, CheckSquare, Square,
    IndianRupee, Percent, Tag, Package
} from "lucide-react"
import { Input } from "@/components/ui/input"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"

export default function PricingTable({
    initialProducts: serverProducts,
    categories
}: {
    initialProducts: any[],
    categories: any[]
}) {
    const [products, setProducts] = useState(serverProducts)
    const [loadingId, setLoadingId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedCategory, setSelectedCategory] = useState<string>("all")
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [isBulkUpdating, setIsBulkUpdating] = useState(false)
    const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 })
    const [bulkOpen, setBulkOpen] = useState(false)
    const [bulkType, setBulkType] = useState<"percentage" | "amount">("percentage")
    const [bulkValue, setBulkValue] = useState("10")

    useEffect(() => {
        setProducts(serverProducts)
    }, [serverProducts])

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesSearch =
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.product_variants?.some((v: any) => v.title?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                p.product_variants?.some((v: any) => v.sku?.toLowerCase().includes(searchQuery.toLowerCase()))

            const matchesCategory =
                selectedCategory === "all" ||
                p.product_categories?.some((pc: any) => pc.category_id === selectedCategory)

            return matchesSearch && matchesCategory
        })
    }, [searchQuery, selectedCategory, products])

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        setSelectedIds(next)
    }

    const toggleSelectAll = () => {
        if (selectedIds.size > 0) {
            setSelectedIds(new Set())
        } else {
            const allIds = new Set<string>()
            filteredProducts.forEach(p => {
                if (p.has_variants) p.product_variants.forEach((v: any) => allIds.add(v.id))
                else allIds.add(p.id)
            })
            setSelectedIds(allIds)
        }
    }

    const handleSave = async (id: string, type: 'product' | 'variant', rowData: any) => {
        setLoadingId(id)
        try {
            await updatePricing({
                id, type,
                price: parseFloat(rowData.price) || 0,
                discount_type: rowData.discount_type,
                discount_value: parseFloat(rowData.discount_value) || 0
            })
            setProducts(currentProducts => currentProducts.map(p => {
                if (type === 'product' && p.id === id) {
                    return {
                        ...p,
                        base_price: rowData.price,
                        discount_type: rowData.discount_type,
                        discount_value: rowData.discount_value,
                        product_variants: (p.product_variants || []).map((v: any) => ({
                            ...v, price: rowData.price,
                            discount_type: rowData.discount_type,
                            discount_value: rowData.discount_value
                        }))
                    }
                }
                if (type === 'variant') {
                    const hasTargetVariant = p.product_variants?.some((v: any) => v.id === id)
                    if (hasTargetVariant) {
                        const updatedVariants = p.product_variants.map((v: any) =>
                            v.id === id ? {
                                ...v, price: rowData.price,
                                discount_type: rowData.discount_type,
                                discount_value: rowData.discount_value
                            } : v
                        )
                        // If product has only 1 variant, sync product row too
                        const sync = p.product_variants.length === 1
                        return {
                            ...p,
                            base_price: sync ? rowData.price : p.base_price,
                            discount_type: sync ? rowData.discount_type : p.discount_type,
                            discount_value: sync ? rowData.discount_value : p.discount_value,
                            product_variants: updatedVariants,
                        }
                    }
                }
                return p
            }))
            return true
        } catch (err: any) {
            toast.error(err.message || "Error updating pricing")
            return false
        } finally {
            setLoadingId(null)
        }
    }

    const handleBulkApply = async () => {
        const val = parseFloat(bulkValue)
        if (isNaN(val) || val < 0) return toast.error("Enter a valid value")

        setIsBulkUpdating(true)
        let successCount = 0
        const ids = Array.from(selectedIds)
        setBulkProgress({ current: 0, total: ids.length })

        for (let i = 0; i < ids.length; i++) {
            const id = ids[i]
            setBulkProgress({ current: i + 1, total: ids.length })
            let item: any = null
            let type: 'product' | 'variant' = 'product'

            for (const p of products) {
                if (p.id === id) { item = p; type = 'product'; break }
                const v = p.product_variants?.find((v: any) => v.id === id)
                if (v) { item = v; type = 'variant'; break }
            }

            if (item) {
                const ok = await handleSave(id, type, {
                    price: type === 'product' ? item.base_price : item.price,
                    discount_type: bulkType,
                    discount_value: val
                })
                if (ok) successCount++
            }
        }
        setIsBulkUpdating(false)
        setBulkProgress({ current: 0, total: 0 })
        setSelectedIds(new Set())
        setBulkOpen(false)
        toast.success(`Updated ${successCount} items`)
    }

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <Input
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 text-sm border-slate-200 bg-slate-50 rounded-lg"
                    />
                </div>
                <div className="relative shrink-0">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="pl-9 pr-8 h-9 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-600 appearance-none cursor-pointer outline-none min-w-[160px]"
                    >
                        <option value="all">All Categories</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>
                {selectedIds.size > 0 && (
                    <button
                        onClick={() => setBulkOpen(true)}
                        className="h-9 px-4 rounded-lg bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-slate-800 transition-colors shrink-0"
                    >
                        <Zap className="w-3.5 h-3.5" />
                        Apply to {selectedIds.size}
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
                                    {selectedIds.size > 0 ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                </button>
                            </th>
                            <th className="py-3 px-4 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Product</th>
                            <th className="py-3 px-4 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Category</th>
                            <th className="py-3 px-4 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">MSRP (₹)</th>
                            <th className="py-3 px-4 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Discount</th>
                            <th className="py-3 px-4 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Value</th>
                            <th className="py-3 px-4 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Sale Price (₹)</th>
                            <th className="py-3 px-4 text-right"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredProducts.map((product) => (
                            <Fragment key={product.id}>
                                <PriceRow
                                    item={product}
                                    type="product"
                                    categoryName={product.product_categories?.[0]?.categories?.name || ""}
                                    onSave={handleSave}
                                    isLoading={loadingId === product.id}
                                    isSelected={selectedIds.has(product.id)}
                                    onSelect={() => toggleSelect(product.id)}
                                />
                                {product.has_variants && product.product_variants.map((v: any) => (
                                    <PriceRow
                                        key={v.id}
                                        item={v}
                                        type="variant"
                                        categoryName=""
                                        isVariant={true}
                                        onSave={handleSave}
                                        isLoading={loadingId === v.id}
                                        isSelected={selectedIds.has(v.id)}
                                        onSelect={() => toggleSelect(v.id)}
                                    />
                                ))}
                            </Fragment>
                        ))}
                        {filteredProducts.length === 0 && (
                            <tr>
                                <td colSpan={8} className="h-24 text-center text-xs text-slate-400">
                                    No products found matching your search.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Bulk Discount Dialog */}
            <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
                <DialogContent className="sm:max-w-sm rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-sm font-bold text-slate-900">Bulk Discount</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="flex gap-2">
                            <button
                                onClick={() => setBulkType("percentage")}
                                className={`flex-1 h-10 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                                    bulkType === "percentage"
                                        ? "bg-slate-900 text-white shadow-sm"
                                        : "bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100"
                                }`}
                            >
                                <Percent className="w-3.5 h-3.5 inline mr-1" />
                                % Off
                            </button>
                            <button
                                onClick={() => setBulkType("amount")}
                                className={`flex-1 h-10 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                                    bulkType === "amount"
                                        ? "bg-slate-900 text-white shadow-sm"
                                        : "bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100"
                                }`}
                            >
                                <IndianRupee className="w-3.5 h-3.5 inline mr-1" />
                                Flat
                            </button>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                {bulkType === "percentage" ? "Discount Percentage" : "Flat Amount (₹)"}
                            </label>
                            <Input
                                type="number"
                                min="0"
                                value={bulkValue}
                                onChange={(e) => setBulkValue(e.target.value)}
                                className="h-10 text-sm border-slate-200 bg-slate-50 rounded-xl"
                                placeholder={bulkType === "percentage" ? "e.g. 10" : "e.g. 100"}
                            />
                        </div>
                        {isBulkUpdating ? (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        Saving {bulkProgress.current} of {bulkProgress.total}
                                    </span>
                                    <span className="font-mono text-slate-400">
                                        {Math.round((bulkProgress.current / bulkProgress.total) * 100)}%
                                    </span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-slate-900 rounded-full transition-all duration-300"
                                        style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-slate-400">
                                Apply to <strong className="text-slate-700">{selectedIds.size} items</strong>
                            </p>
                        )}
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
                            disabled={isBulkUpdating}
                            className="h-9 px-5 rounded-xl bg-slate-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isBulkUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                            {isBulkUpdating ? "Saving..." : "Apply"}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

// ─── Filter icon (inline) ───

function Filter({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
    )
}

// ─── Price Row ───

function PriceRow({ item, type, categoryName, isVariant, onSave, isLoading, isSelected, onSelect }: any) {
    const [data, setData] = useState({
        price: (type === 'product' ? item.base_price : item.price) ?? 0,
        discount_type: item.discount_type || 'none',
        discount_value: item.discount_value ?? 0,
    })

    useEffect(() => {
        setData({
            price: (type === 'product' ? item.base_price : item.price) ?? 0,
            discount_type: item.discount_type || 'none',
            discount_value: item.discount_value ?? 0,
        })
    }, [item, type])

    const currentSalePrice = useMemo(() => {
        const msrp = parseFloat(data.price as any) || 0
        const disc = parseFloat(data.discount_value as any) || 0
        if (data.discount_type === 'percentage') return Math.round(msrp - (msrp * (disc / 100)))
        if (data.discount_type === 'amount') return Math.round(msrp - disc)
        return Math.round(msrp)
    }, [data.price, data.discount_type, data.discount_value])

    const handleSalePriceChange = (newSalePrice: string) => {
        const target = parseFloat(newSalePrice) || 0
        const msrp = parseFloat(data.price as any) || 0
        const discount = Math.max(0, msrp - target)
        setData({
            ...data,
            discount_type: 'amount',
            discount_value: discount,
        })
    }

    const hasChanges =
        parseFloat(data.price as any) !== (type === 'product' ? parseFloat(item.base_price) : parseFloat(item.price)) ||
        data.discount_type !== (item.discount_type || 'none') ||
        parseFloat(data.discount_value as any) !== parseFloat(item.discount_value || 0)

    return (
        <tr className={`group transition-colors ${isSelected ? 'bg-blue-50/30' : isVariant ? 'bg-slate-50/10' : 'bg-white hover:bg-slate-50/50'}`}>
            <td className="py-3 px-4">
                <button onClick={onSelect}
                    className={`${isSelected ? 'text-blue-600' : 'text-slate-200'} hover:text-blue-400 transition-colors`}
                >
                    {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                </button>
            </td>
            <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                    {isVariant ? (
                        <Package className="w-3 h-3 text-slate-300 shrink-0 ml-4" />
                    ) : (
                        <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                    <span className={`${isVariant ? 'text-xs text-slate-500' : 'text-sm font-semibold text-slate-800'}`}>
                        {isVariant ? item.title : item.name}
                    </span>
                </div>
            </td>
            <td className="py-3 px-4">
                {!isVariant && categoryName ? (
                    <span className="text-[11px] text-slate-400 font-medium">{categoryName}</span>
                ) : (
                    <span className="text-[11px] text-slate-200">—</span>
                )}
            </td>
            <td className="py-3 px-4">
                <Input
                    type="number"
                    min="0"
                    value={data.price}
                    onChange={(e) => setData({ ...data, price: e.target.value })}
                    className="w-20 h-8 text-xs font-mono border-slate-200 bg-slate-50 rounded-lg px-2 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
            </td>
            <td className="py-3 px-4">
                <select
                    value={data.discount_type}
                    onChange={(e) => setData({ ...data, discount_type: e.target.value })}
                    className="h-8 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-2 outline-none cursor-pointer"
                >
                    <option value="none">Fixed</option>
                    <option value="percentage">% Off</option>
                    <option value="amount">Flat ₹</option>
                </select>
            </td>
            <td className="py-3 px-4">
                <Input
                    type="number"
                    min="0"
                    value={data.discount_value}
                    disabled={data.discount_type === 'none'}
                    onChange={(e) => setData({ ...data, discount_value: e.target.value })}
                    className={`w-16 h-8 text-xs font-mono border-slate-200 rounded-lg px-2 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
                        data.discount_type === 'none'
                            ? 'bg-slate-100 text-slate-300'
                            : 'bg-slate-50'
                    }`}
                />
            </td>
            <td className="py-3 px-4">
                <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-blue-600">₹</span>
                    <Input
                        type="number"
                        min="0"
                        value={currentSalePrice}
                        onChange={(e) => handleSalePriceChange(e.target.value)}
                        className={`w-20 h-8 text-xs font-bold font-mono rounded-lg px-2 border-blue-200 bg-blue-50/50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
                            data.discount_type !== 'none' ? 'text-blue-700' : 'text-slate-700'
                        }`}
                    />
                </div>
                {data.discount_type !== 'none' && (
                    <p className="text-[9px] font-semibold text-emerald-500 mt-0.5">
                        Save ₹{(Math.round(parseFloat(data.price as any) || 0) - currentSalePrice).toLocaleString('en-IN')}
                    </p>
                )}
            </td>
            <td className="py-3 px-4 text-right">
                <button
                    onClick={() => onSave(item.id, type, data)}
                    disabled={isLoading || !hasChanges}
                    className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all disabled:opacity-30 disabled:pointer-events-none"
                >
                    {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                </button>
            </td>
        </tr>
    )
}
