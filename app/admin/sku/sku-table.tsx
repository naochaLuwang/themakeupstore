"use client"

import { useState, useEffect, Fragment } from "react"
import { updateSku } from "@/app/actions/sku"
import { toast } from "sonner"
import { Loader2, Save, Search, Package, Tag } from "lucide-react"
import { Input } from "@/components/ui/input"

export default function SkuTable({ initialProducts }: { initialProducts: any[] }) {
    const [products, setProducts] = useState(initialProducts)
    const [loadingId, setLoadingId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => {
        setProducts(initialProducts)
    }, [initialProducts])

    const filteredProducts = products.filter(p => {
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
        return (
            p.name.toLowerCase().includes(q) ||
            p.product_variants?.some((v: any) => v.title?.toLowerCase().includes(q)) ||
            p.product_variants?.some((v: any) => v.sku?.toLowerCase().includes(q))
        )
    })

    const handleSave = async (variantId: string, sku: string) => {
        setLoadingId(variantId)
        try {
            await updateSku(variantId, sku)
            setProducts(current =>
                current.map(p => ({
                    ...p,
                    product_variants: (p.product_variants || []).map((v: any) =>
                        v.id === variantId ? { ...v, sku: sku.trim().toUpperCase() || null } : v
                    )
                }))
            )
            return true
        } catch (err: any) {
            toast.error(err.message || "Error updating SKU")
            return false
        } finally {
            setLoadingId(null)
        }
    }

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 stroke-[1.5]" />
                    <Input
                        placeholder="Search products or SKUs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 text-sm border-slate-200 bg-slate-50 rounded-lg"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto shadow-sm min-w-0 max-w-full">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                            <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 tracking-normal">Product</th>
                            <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 tracking-normal">Variant</th>
                            <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 tracking-normal">SKU</th>
                            <th className="py-3 px-4 text-right"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredProducts.map((product) => (
                            <Fragment key={product.id}>
                                {(product.product_variants || []).map((v: any) => (
                                    <SkuRow
                                        key={v.id}
                                        variant={v}
                                        productName={product.name}
                                        onSave={handleSave}
                                        isLoading={loadingId === v.id}
                                    />
                                ))}
                            </Fragment>
                        ))}
                        {filteredProducts.length === 0 && (
                            <tr>
                                <td colSpan={4} className="h-24 text-center text-xs text-slate-500 tabular-nums">
                                    No products found matching your search.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function SkuRow({ variant, productName, onSave, isLoading }: any) {
    const [sku, setSku] = useState(variant.sku || "")

    useEffect(() => {
        setSku(variant.sku || "")
    }, [variant.sku])

    const hasChanges = sku.trim().toUpperCase() !== (variant.sku || "").trim().toUpperCase()

    return (
        <tr className="group transition-colors hover:bg-slate-50/50">
            <td className="py-3 px-4 tabular-nums">
                <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-slate-500 shrink-0 stroke-[1.5]" />
                    <span className="text-sm font-semibold text-slate-800">{productName}</span>
                </div>
            </td>
            <td className="py-3 px-4 tabular-nums">
                <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-slate-400 shrink-0 stroke-[1.5]" />
                    <span className="text-xs text-slate-500">{variant.title || "Default"}</span>
                </div>
            </td>
            <td className="py-3 px-4 tabular-nums">
                <Input
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="Enter SKU..."
                    className="w-44 h-8 text-xs font-mono border-slate-200 bg-slate-50 rounded-lg px-2"
                />
            </td>
            <td className="py-3 px-4 text-right tabular-nums">
                <button
                    onClick={() => onSave(variant.id, sku)}
                    disabled={isLoading || !hasChanges}
                    className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin stroke-[1.5]" /> : <Save className="w-4 h-4 stroke-[1.5]" />}
                </button>
            </td>
        </tr>
    )
}
