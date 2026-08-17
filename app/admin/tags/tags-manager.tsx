"use client"

import { useState, useMemo } from "react"
import { bulkUpdateTags } from "@/app/actions/tags"
import { toast } from "sonner"
import { Loader2, Save, Search, Tag, X, Check, Square, CheckSquare } from "lucide-react"
import { Input } from "@/components/ui/input"

type ProductData = {
    id: string
    name: string
    brand?: string
    tag?: string | null
    thumbnail_url?: string | null
    product_categories?: { category_id: string }[]
}

export default function TagsManager({ initialProducts, categories }: { initialProducts: ProductData[]; categories: { id: string; name: string }[] }) {
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedCategory, setSelectedCategory] = useState("all")
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [bulkTag, setBulkTag] = useState("")
    const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({})
    const [saving, setSaving] = useState(false)

    const products = useMemo(() => {
        return initialProducts.map((p) => ({
            ...p,
            tag: pendingChanges[p.id] !== undefined ? pendingChanges[p.id] : (p.tag || ""),
        }))
    }, [initialProducts, pendingChanges])

    const filtered = useMemo(() => {
        const q = searchQuery.toLowerCase()
        return products.filter((p) => {
            const matchesSearch =
                !q ||
                p.name.toLowerCase().includes(q) ||
                p.brand?.toLowerCase().includes(q) ||
                p.tag?.toLowerCase().includes(q)
            const matchesCategory =
                selectedCategory === "all" ||
                p.product_categories?.some((pc) => pc.category_id === selectedCategory)
            return matchesSearch && matchesCategory
        })
    }, [products, searchQuery, selectedCategory])

    const selectedCount = selectedIds.size

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        setSelectedIds(next)
    }

    const toggleSelectAll = () => {
        if (selectedCount > 0) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(filtered.map((p) => p.id)))
        }
    }

    const clearTagForSelected = () => {
        if (selectedCount === 0) return
        setPendingChanges((prev) => {
            const next = { ...prev }
            selectedIds.forEach((id) => { next[id] = "" })
            return next
        })
        setSelectedIds(new Set())
    }

    const applyTagToSelected = () => {
        const clean = bulkTag.trim().toUpperCase()
        if (selectedCount === 0) {
            toast.error("Select at least one product first")
            return
        }
        if (!clean) {
            toast.error("Enter a tag value")
            return
        }
        setPendingChanges((prev) => {
            const next = { ...prev }
            selectedIds.forEach((id) => { next[id] = clean })
            return next
        })
        setBulkTag("")
        setSelectedIds(new Set())
        toast.success(`Applied "${clean}" to ${selectedIds.size} product${selectedIds.size > 1 ? "s" : ""}`)
    }

    const changedCount = Object.keys(pendingChanges).filter((id) => {
        const original = initialProducts.find((p) => p.id === id)?.tag || ""
        return pendingChanges[id] !== original
    }).length

    const handleSave = async () => {
        const updates = Object.entries(pendingChanges)
            .filter(([id]) => {
                const original = initialProducts.find((p) => p.id === id)?.tag || ""
                return pendingChanges[id] !== original
            })
            .map(([id, tag]) => ({ id, tag }))

        if (updates.length === 0) return

        setSaving(true)
        try {
            const result = await bulkUpdateTags(updates)
            if (result.success) {
                toast.success(`Saved ${updates.length} product tag${updates.length > 1 ? "s" : ""}`)
                setPendingChanges({})
            } else {
                toast.error(result.error || "Failed to update tags")
            }
        } finally {
            setSaving(false)
        }
    }

    const applyToFiltered = () => {
        const clean = bulkTag.trim().toUpperCase()
        if (!clean) { toast.error("Enter a tag value"); return }
        setPendingChanges((prev) => {
            const next = { ...prev }
            filtered.forEach((p) => { next[p.id] = clean })
            return next
        })
        setBulkTag("")
        setSelectedIds(new Set())
        toast.success(`Applied "${clean}" to ${filtered.length} product${filtered.length > 1 ? "s" : ""}`)
    }

    return (
        <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
            {/* Toolbar */}
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <div className="flex flex-col sm:flex-row gap-3 flex-1 sm:items-center">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Search products..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-10 rounded-xl bg-slate-50 border-none text-sm"
                        />
                    </div>
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="h-10 rounded-xl bg-slate-50 border-none text-sm font-semibold text-slate-700 px-3 outline-none cursor-pointer"
                    >
                        <option value="all">All Categories</option>
                        {categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center gap-3">
                    {changedCount > 0 && (
                        <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                            {changedCount} unsaved change{changedCount > 1 ? "s" : ""}
                        </span>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saving || changedCount === 0}
                        className="h-10 px-5 rounded-xl bg-slate-900 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? "Saving..." : "Save All"}
                    </button>
                </div>
            </div>

            {/* Bulk Apply Bar */}
            <div className="px-4 py-4 border-b border-slate-100 bg-gradient-to-r from-[#fdf2f8] to-white flex flex-col sm:flex-row gap-3 sm:items-center">
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#fc2779]">Bulk Tag</span>
                    <div className="relative">
                        <Input
                            value={bulkTag}
                            onChange={(e) => setBulkTag(e.target.value.toUpperCase())}
                            placeholder="e.g. BESTSELLER"
                            onKeyDown={(e) => { if (e.key === "Enter") applyTagToSelected() }}
                            className="h-9 rounded-lg bg-white border border-[#fbcfe8] text-xs font-bold uppercase tracking-wider w-44 focus:border-[#fc2779] focus:ring-2 focus:ring-[#fc2779]/20"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={applyTagToSelected}
                        disabled={selectedCount === 0}
                        className="h-9 px-4 rounded-lg bg-[#fc2779] text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 hover:bg-[#e01567] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                        <Check className="w-3.5 h-3.5" /> Apply to {selectedCount > 0 ? `${selectedCount} selected` : "selection"}
                    </button>
                    <button
                        onClick={applyToFiltered}
                        className="h-9 px-4 rounded-lg border border-[#fbcfe8] text-[#fc2779] text-[10px] font-black uppercase tracking-wider hover:bg-[#fdf2f8] transition-all"
                    >
                        Apply to all {filtered.length} filtered
                    </button>
                    <button
                        onClick={clearTagForSelected}
                        disabled={selectedCount === 0}
                        className="h-9 px-4 rounded-lg border border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-wider hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                        <X className="w-3 h-3 inline mr-1" /> Clear for selected
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-100">
                            <th className="py-3 px-4 w-10">
                                <button
                                    onClick={toggleSelectAll}
                                    className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
                                    title={selectedCount > 0 ? "Deselect all" : "Select all"}
                                >
                                    {selectedCount > 0 ? (
                                        <CheckSquare className="w-4 h-4 text-[#fc2779]" />
                                    ) : (
                                        <Square className="w-4 h-4 text-slate-300" />
                                    )}
                                </button>
                            </th>
                            <th className="text-left py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Product</th>
                            <th className="text-left py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Brand</th>
                            <th className="text-left py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 w-40">Current Tag</th>
                            <th className="text-left py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 w-24">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((product) => {
                            const isSelected = selectedIds.has(product.id)
                            const isPending = pendingChanges[product.id] !== undefined
                            const isChanged = isPending && pendingChanges[product.id] !== (initialProducts.find((p) => p.id === product.id)?.tag || "")

                            return (
                                <tr
                                    key={product.id}
                                    onClick={() => toggleSelect(product.id)}
                                    className={`border-b border-slate-50 transition-colors cursor-pointer ${isSelected ? "bg-[#fdf2f8]" : isChanged ? "bg-amber-50/30" : "hover:bg-slate-50/50"}`}
                                >
                                    <td className="py-3 px-4">
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? "bg-[#fc2779] border-[#fc2779]" : "border-slate-300 bg-white"}`}>
                                            {isSelected && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                                                {product.thumbnail_url ? (
                                                    <img src={product.thumbnail_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Tag className="w-4 h-4 text-slate-300" />
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-xs font-bold text-slate-900 truncate max-w-[200px]">{product.name}</p>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className="text-xs text-slate-500">{product.brand || "—"}</span>
                                    </td>
                                    <td className="py-3 px-4">
                                        {product.tag ? (
                                            <span className="text-[10px] font-black uppercase tracking-wider text-[#fc2779] bg-[#fdf2f8] px-2.5 py-1 rounded-full">{product.tag}</span>
                                        ) : (
                                            <span className="text-[10px] text-slate-300">—</span>
                                        )}
                                    </td>
                                    <td className="py-3 px-4">
                                        {isChanged ? (
                                            <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Modified</span>
                                        ) : product.tag ? (
                                            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Set</span>
                                        ) : (
                                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-300">—</span>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {filtered.length === 0 && (
                <div className="py-12 text-center">
                    <Tag className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                    <p className="text-xs text-slate-400">No products found</p>
                </div>
            )}
        </div>
    )
}
