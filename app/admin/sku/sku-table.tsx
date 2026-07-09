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
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <Input
                        placeholder="Search products or SKUs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 text-sm border-slate-200 bg-slate-50 rounded-lg"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                            <th className="py-3 px-4 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Product</th>
                            <th className="py-3 px-4 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Variant</th>
                            <th className="py-3 px-4 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">SKU</th>
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
                                <td colSpan={4} className="h-24 text-center text-xs text-slate-400">
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
            <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-sm font-semibold text-slate-800">{productName}</span>
                </div>
            </td>
            <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                    <Package className="w-3 h-3 text-slate-300 shrink-0" />
                    <span className="text-xs text-slate-500">{variant.title || "Default"}</span>
                </div>
            </td>
            <td className="py-3 px-4">
                <Input
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="Enter SKU..."
                    className="w-44 h-8 text-xs font-mono border-slate-200 bg-slate-50 rounded-lg px-2 uppercase"
                />
            </td>
            <td className="py-3 px-4 text-right">
                <button
                    onClick={() => onSave(variant.id, sku)}
                    disabled={isLoading || !hasChanges}
                    className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all disabled:opacity-30 disabled:pointer-events-none"
                >
                    {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                </button>
            </td>
        </tr>
    )
}
