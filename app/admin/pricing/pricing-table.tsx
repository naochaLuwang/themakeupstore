// // app/admin/pricing/pricing-table.tsx
// "use client"

// import React, { useState, useMemo } from "react"
// import { updatePricing } from "@/app/actions/pricing"
// import { toast } from "sonner"
// import { Loader2, Save, Search, Zap, Package, CheckSquare, Square, Filter } from "lucide-react"

// export default function PricingTable({
//     initialProducts,
//     categories
// }: {
//     initialProducts: any[],
//     categories: any[]
// }) {
//     const [loadingId, setLoadingId] = useState<string | null>(null)
//     const [searchQuery, setSearchQuery] = useState("")
//     const [selectedCategory, setSelectedCategory] = useState<string>("all")
//     const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
//     const [isBulkUpdating, setIsBulkUpdating] = useState(false)

//     // 1. Enhanced Filter Logic (Search + Category)
//     const filteredProducts = useMemo(() => {
//         return initialProducts.filter(p => {
//             const matchesSearch =
//                 p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
//                 p.product_variants?.some((v: any) => v.title?.toLowerCase().includes(searchQuery.toLowerCase())) ||
//                 p.product_variants?.some((v: any) => v.sku?.toLowerCase().includes(searchQuery.toLowerCase()));

//             const matchesCategory =
//                 selectedCategory === "all" ||
//                 p.product_categories?.some((pc: any) => pc.category_id === selectedCategory);

//             return matchesSearch && matchesCategory;
//         })
//     }, [searchQuery, selectedCategory, initialProducts])

//     // Selection Logic
//     const toggleSelect = (id: string) => {
//         const next = new Set(selectedIds)
//         if (next.has(id)) next.delete(id)
//         else next.add(id)
//         setSelectedIds(next)
//     }

//     const toggleSelectAll = () => {
//         if (selectedIds.size > 0) {
//             setSelectedIds(new Set())
//         } else {
//             const allIds = new Set<string>()
//             filteredProducts.forEach(p => {
//                 if (p.has_variants) p.product_variants.forEach((v: any) => allIds.add(v.id))
//                 else allIds.add(p.id)
//             })
//             setSelectedIds(allIds)
//         }
//     }

//     const handleSave = async (id: string, type: 'product' | 'variant', rowData: any) => {
//         setLoadingId(id)
//         try {
//             await updatePricing({
//                 id, type,
//                 price: parseFloat(rowData.price) || 0,
//                 discount_type: rowData.discount_type,
//                 discount_value: parseFloat(rowData.discount_value) || 0
//             })
//             return true
//         } catch (err: any) {
//             toast.error(`Error updating ${id}`)
//             return false
//         } finally {
//             setLoadingId(null)
//         }
//     }

//     const handleBulkApply = async () => {
//         const percentage = window.prompt("Enter discount percentage (e.g. 10):", "10")
//         if (!percentage || isNaN(Number(percentage))) return

//         setIsBulkUpdating(true)
//         let successCount = 0

//         for (const id of selectedIds) {
//             let item: any = null
//             let type: 'product' | 'variant' = 'product'

//             for (const p of initialProducts) {
//                 if (p.id === id) { item = p; type = 'product'; break; }
//                 const v = p.product_variants?.find((v: any) => v.id === id)
//                 if (v) { item = v; type = 'variant'; break; }
//             }

//             if (item) {
//                 const ok = await handleSave(id, type, {
//                     price: type === 'product' ? item.base_price : item.price,
//                     discount_type: 'percentage',
//                     discount_value: percentage
//                 })
//                 if (ok) successCount++
//             }
//         }
//         setIsBulkUpdating(false)
//         setSelectedIds(new Set())
//         toast.success(`Updated ${successCount} items`)
//     }

//     return (
//         <div className="space-y-6">
//             {/* TOOLBAR */}
//             <div className="flex flex-col md:flex-row gap-4 sticky top-4 z-20">
//                 {/* Search */}
//                 <div className="relative flex-1">
//                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
//                     <input
//                         className="w-full pl-11 pr-4 h-14 rounded-2xl border border-slate-200 bg-white shadow-sm focus:ring-4 ring-indigo-500/10 outline-none transition-all text-sm font-bold"
//                         placeholder="Search products..."
//                         value={searchQuery}
//                         onChange={(e) => setSearchQuery(e.target.value)}
//                     />
//                 </div>

//                 {/* Category Filter */}
//                 <div className="relative">
//                     <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
//                     <select
//                         value={selectedCategory}
//                         onChange={(e) => setSelectedCategory(e.target.value)}
//                         className="pl-11 pr-8 h-14 rounded-2xl border border-slate-200 bg-white shadow-sm focus:ring-4 ring-indigo-500/10 outline-none transition-all text-[10px] font-black uppercase tracking-widest appearance-none min-w-[180px]"
//                     >
//                         <option value="all">All Categories</option>
//                         {categories.map(cat => (
//                             <option key={cat.id} value={cat.id}>{cat.name}</option>
//                         ))}
//                     </select>
//                 </div>

//                 {/* Bulk Button */}
//                 {selectedIds.size > 0 && (
//                     <button
//                         onClick={handleBulkApply}
//                         disabled={isBulkUpdating}
//                         className="h-14 px-8 rounded-2xl bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all animate-in slide-in-from-right-2"
//                     >
//                         {isBulkUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-current" />}
//                         Apply to {selectedIds.size} Items
//                     </button>
//                 )}
//             </div>

//             {/* TABLE */}
//             <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
//                 <table className="w-full text-left border-collapse">
//                     <thead>
//                         <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
//                             <th className="p-6 w-10">
//                                 <button onClick={toggleSelectAll} className="text-slate-300 hover:text-indigo-500">
//                                     {selectedIds.size > 0 ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
//                                 </button>
//                             </th>
//                             <th className="p-6">Product Tree</th>
//                             <th className="p-6">MSRP (₹)</th>
//                             <th className="p-6">Type</th>
//                             <th className="p-6">Value</th>
//                             <th className="p-6 text-right">Action</th>
//                         </tr>
//                     </thead>
//                     <tbody className="divide-y divide-slate-50">
//                         {filteredProducts.map((product) => (
//                             <React.Fragment key={product.id}>
//                                 <PriceRow
//                                     item={product}
//                                     type="product"
//                                     onSave={handleSave}
//                                     isLoading={loadingId === product.id}
//                                     isSelected={selectedIds.has(product.id)}
//                                     onSelect={() => toggleSelect(product.id)}
//                                 />
//                                 {product.has_variants && product.product_variants.map((v: any) => (
//                                     <PriceRow
//                                         key={v.id}
//                                         item={v}
//                                         type="variant"
//                                         isVariant={true}
//                                         onSave={handleSave}
//                                         isLoading={loadingId === v.id}
//                                         isSelected={selectedIds.has(v.id)}
//                                         onSelect={() => toggleSelect(v.id)}
//                                     />
//                                 ))}
//                             </React.Fragment>
//                         ))}
//                     </tbody>
//                 </table>
//             </div>
//         </div>
//     )
// }

// function PriceRow({ item, type, isVariant, onSave, isLoading, isSelected, onSelect }: any) {
//     const [data, setData] = useState({
//         price: (type === 'product' ? item.base_price : item.price) ?? 0,
//         discount_type: item.discount_type || 'none',
//         discount_value: item.discount_value ?? 0
//     })

//     return (
//         <tr className={`group transition-all hover:bg-slate-50/50 ${isSelected ? 'bg-indigo-50/40' : isVariant ? 'bg-slate-50/10' : 'bg-white'}`}>
//             <td className="p-6">
//                 <button onClick={onSelect} className={`${isSelected ? 'text-indigo-600' : 'text-slate-200'} hover:text-indigo-400 transition-colors`}>
//                     {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
//                 </button>
//             </td>
//             <td className="p-6">
//                 <div className="flex items-center gap-3">
//                     <span className={`font-black uppercase tracking-tight ${isVariant ? 'text-[11px] text-slate-400 ml-4' : 'text-sm text-slate-900'}`}>
//                         {isVariant ? `└ ${item.title}` : item.name}
//                     </span>
//                 </div>
//             </td>
//             <td className="p-6">
//                 <input
//                     type="number"
//                     value={data.price}
//                     onChange={(e) => setData({ ...data, price: e.target.value })}
//                     className="w-24 bg-transparent border-b-2 border-transparent hover:border-indigo-200 focus:border-indigo-500 outline-none font-bold text-sm"
//                 />
//             </td>
//             <td className="p-6">
//                 <select
//                     value={data.discount_type}
//                     onChange={(e) => setData({ ...data, discount_type: e.target.value })}
//                     className="bg-transparent text-[9px] font-black uppercase tracking-widest outline-none cursor-pointer"
//                 >
//                     <option value="none">Fixed</option>
//                     <option value="percentage">% Off</option>
//                     <option value="amount">Flat</option>
//                 </select>
//             </td>
//             <td className="p-6">
//                 <input
//                     type="number"
//                     value={data.discount_value}
//                     disabled={data.discount_type === 'none'}
//                     onChange={(e) => setData({ ...data, discount_value: e.target.value })}
//                     className="w-20 bg-transparent border-b-2 border-transparent hover:border-slate-200 focus:border-indigo-500 outline-none font-bold text-sm disabled:opacity-10"
//                 />
//             </td>
//             <td className="p-6 text-right">
//                 <button
//                     onClick={() => onSave(item.id, type, data)}
//                     disabled={isLoading}
//                     className="w-10 h-10 inline-flex items-center justify-center bg-slate-900 text-white rounded-xl hover:bg-indigo-600 transition-all disabled:opacity-50"
//                 >
//                     {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
//                 </button>
//             </td>
//         </tr>
//     )
// }


"use client"

import React, { useState, useMemo, useEffect } from "react"
import { updatePricing } from "@/app/actions/pricing"
import { toast } from "sonner"
import { Loader2, Save, Search, Zap, Package, CheckSquare, Square, Filter } from "lucide-react"

export default function PricingTable({
    initialProducts: serverProducts,
    categories
}: {
    initialProducts: any[],
    categories: any[]
}) {
    // 1. Maintain local state for the products to reflect updates instantly
    const [products, setProducts] = useState(serverProducts)
    const [loadingId, setLoadingId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedCategory, setSelectedCategory] = useState<string>("all")
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [isBulkUpdating, setIsBulkUpdating] = useState(false)

    // Sync local state if server props change
    useEffect(() => {
        setProducts(serverProducts)
    }, [serverProducts])

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesSearch =
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.product_variants?.some((v: any) => v.title?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                p.product_variants?.some((v: any) => v.sku?.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesCategory =
                selectedCategory === "all" ||
                p.product_categories?.some((pc: any) => pc.category_id === selectedCategory);

            return matchesSearch && matchesCategory;
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

    // 2. Updated handleSave to update local state
    const handleSave = async (id: string, type: 'product' | 'variant', rowData: any) => {
        setLoadingId(id)
        try {
            await updatePricing({
                id, type,
                price: parseFloat(rowData.price) || 0,
                discount_type: rowData.discount_type,
                discount_value: parseFloat(rowData.discount_value) || 0
            })

            // Update local state so UI reflects change
            setProducts(currentProducts => currentProducts.map(p => {
                if (type === 'product' && p.id === id) {
                    return { ...p, base_price: rowData.price, discount_type: rowData.discount_type, discount_value: rowData.discount_value }
                }
                if (type === 'variant') {
                    const hasTargetVariant = p.product_variants?.some((v: any) => v.id === id)
                    if (hasTargetVariant) {
                        return {
                            ...p,
                            product_variants: p.product_variants.map((v: any) =>
                                v.id === id ? { ...v, price: rowData.price, discount_type: rowData.discount_type, discount_value: rowData.discount_value } : v
                            )
                        }
                    }
                }
                return p
            }))

            return true
        } catch (err: any) {
            toast.error(`Error updating ${id}`)
            return false
        } finally {
            setLoadingId(null)
        }
    }

    const handleBulkApply = async () => {
        const percentage = window.prompt("Enter discount percentage (e.g. 10):", "10")
        if (!percentage || isNaN(Number(percentage))) return

        setIsBulkUpdating(true)
        let successCount = 0

        for (const id of selectedIds) {
            let item: any = null
            let type: 'product' | 'variant' = 'product'

            for (const p of products) {
                if (p.id === id) { item = p; type = 'product'; break; }
                const v = p.product_variants?.find((v: any) => v.id === id)
                if (v) { item = v; type = 'variant'; break; }
            }

            if (item) {
                const ok = await handleSave(id, type, {
                    price: type === 'product' ? item.base_price : item.price,
                    discount_type: 'percentage',
                    discount_value: percentage
                })
                if (ok) successCount++
            }
        }
        setIsBulkUpdating(false)
        setSelectedIds(new Set())
        toast.success(`Updated ${successCount} items`)
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 sticky top-4 z-20">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        className="w-full pl-11 pr-4 h-14 rounded-2xl border border-slate-200 bg-white shadow-sm focus:ring-4 ring-indigo-500/10 outline-none transition-all text-sm font-bold"
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="relative">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="pl-11 pr-8 h-14 rounded-2xl border border-slate-200 bg-white shadow-sm focus:ring-4 ring-indigo-500/10 outline-none transition-all text-[10px] font-black uppercase tracking-widest appearance-none min-w-[180px]"
                    >
                        <option value="all">All Categories</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>

                {selectedIds.size > 0 && (
                    <button
                        onClick={handleBulkApply}
                        disabled={isBulkUpdating}
                        className="h-14 px-8 rounded-2xl bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
                    >
                        {isBulkUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-current" />}
                        Apply to {selectedIds.size} Items
                    </button>
                )}
            </div>

            <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <th className="p-6 w-10">
                                <button onClick={toggleSelectAll} className="text-slate-300 hover:text-indigo-500">
                                    {selectedIds.size > 0 ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                                </button>
                            </th>
                            <th className="p-6">Product Tree</th>
                            <th className="p-6">MSRP (₹)</th>
                            <th className="p-6">Type</th>
                            <th className="p-6">Value</th>
                            <th className="p-6 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredProducts.map((product) => (
                            <React.Fragment key={product.id}>
                                <PriceRow
                                    item={product}
                                    type="product"
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
                                        isVariant={true}
                                        onSave={handleSave}
                                        isLoading={loadingId === v.id}
                                        isSelected={selectedIds.has(v.id)}
                                        onSelect={() => toggleSelect(v.id)}
                                    />
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function PriceRow({ item, type, isVariant, onSave, isLoading, isSelected, onSelect }: any) {
    // 3. Initialize data from props
    const [data, setData] = useState({
        price: (type === 'product' ? item.base_price : item.price) ?? 0,
        discount_type: item.discount_type || 'none',
        discount_value: item.discount_value ?? 0
    })

    // 4. CRITICAL: Update internal input state when item props change (Bulk Update fix)
    useEffect(() => {
        setData({
            price: (type === 'product' ? item.base_price : item.price) ?? 0,
            discount_type: item.discount_type || 'none',
            discount_value: item.discount_value ?? 0
        })
    }, [item, type])

    return (
        <tr className={`group transition-all hover:bg-slate-50/50 ${isSelected ? 'bg-indigo-50/40' : isVariant ? 'bg-slate-50/10' : 'bg-white'}`}>
            <td className="p-6">
                <button onClick={onSelect} className={`${isSelected ? 'text-indigo-600' : 'text-slate-200'} hover:text-indigo-400 transition-colors`}>
                    {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                </button>
            </td>
            <td className="p-6">
                <div className="flex items-center gap-3">
                    <span className={`font-black uppercase tracking-tight ${isVariant ? 'text-[11px] text-slate-400 ml-4' : 'text-sm text-slate-900'}`}>
                        {isVariant ? `└ ${item.title}` : item.name}
                    </span>
                </div>
            </td>
            <td className="p-6">
                <input
                    type="number"
                    value={data.price}
                    onChange={(e) => setData({ ...data, price: e.target.value })}
                    className="w-24 bg-transparent border-b-2 border-transparent hover:border-indigo-200 focus:border-indigo-500 outline-none font-bold text-sm"
                />
            </td>
            <td className="p-6">
                <select
                    value={data.discount_type}
                    onChange={(e) => setData({ ...data, discount_type: e.target.value })}
                    className="bg-transparent text-[9px] font-black uppercase tracking-widest outline-none cursor-pointer"
                >
                    <option value="none">Fixed</option>
                    <option value="percentage">% Off</option>
                    <option value="amount">Flat</option>
                </select>
            </td>
            <td className="p-6">
                <input
                    type="number"
                    value={data.discount_value}
                    disabled={data.discount_type === 'none'}
                    onChange={(e) => setData({ ...data, discount_value: e.target.value })}
                    className="w-20 bg-transparent border-b-2 border-transparent hover:border-slate-200 focus:border-indigo-500 outline-none font-bold text-sm disabled:opacity-10"
                />
            </td>
            <td className="p-6 text-right">
                <button
                    onClick={() => onSave(item.id, type, data)}
                    disabled={isLoading}
                    className="w-10 h-10 inline-flex items-center justify-center bg-slate-900 text-white rounded-xl hover:bg-indigo-600 transition-all disabled:opacity-50 shadow-sm"
                >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </button>
            </td>
        </tr>
    )
}