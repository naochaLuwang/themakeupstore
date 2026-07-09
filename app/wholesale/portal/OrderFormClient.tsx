"use client"

import { useState, useMemo } from "react"
import { createWholesaleOrder } from "@/app/actions/orders"
import { toast } from "sonner"
import { Search, ShoppingCart, AlertCircle, Loader2, Package, X, ChevronDown, Tag, Info } from "lucide-react"

export default function OrderFormClient({ initialVariants, userId }: { initialVariants: any[], userId: string }) {
    const [quantities, setQuantities] = useState<Record<string, number>>({})
    const [search, setSearch] = useState("")
    const [selectedCategory, setSelectedCategory] = useState("All Categories")
    const [loading, setLoading] = useState(false)

    // 1. Extract Categories for Filter
    const categoriesList = useMemo(() => {
        const cats = initialVariants.map(v => v.products?.categories?.name).filter(Boolean)
        return ["All Categories", ...Array.from(new Set(cats))]
    }, [initialVariants])

    // 2. Filter Search & Category
    const filteredVariants = useMemo(() => {
        return initialVariants.filter(v => {
            const query = search.toLowerCase().trim()
            const name = v.products?.name?.toLowerCase() || ""
            const sku = v.sku?.toLowerCase() || ""
            const cat = v.products?.categories?.name || ""

            const matchesSearch = name.includes(query) || sku.includes(query)
            const matchesCat = selectedCategory === "All Categories" || cat === selectedCategory
            return matchesSearch && matchesCat
        })
    }, [search, selectedCategory, initialVariants])

    // 3. Totals Engine
    const { orderSummary, totalAmount, totalUnits, errors } = useMemo(() => {
        let amount = 0, units = 0, summary: any[] = [], errs: string[] = []

        Object.entries(quantities).forEach(([id, qty]) => {
            if (qty <= 0) return
            const v = initialVariants.find(item => item.id === id)
            if (!v) return

            const rule = v.products?.categories?.category_wholesale_rules?.[0]
            const discount = rule?.is_active ? (Number(rule.discount_percentage) / 100) : 0
            const wholesalePrice = Math.floor(v.price * (1 - discount))

            amount += Math.round(wholesalePrice * qty)
            units += qty

            if (rule?.is_active && qty < rule.min_order_quantity) {
                errs.push(`${v.products.name} (${v.title}) requires min. ${rule.min_order_quantity} units`)
            }

            summary.push({
                variant_id: v.id,
                product_id: v.product_id,
                name: `${v.products.name} - ${v.title}`,
                qty,
                price: wholesalePrice
            })
        })
        return { orderSummary: summary, totalAmount: amount, totalUnits: units, errors: errs }
    }, [quantities, initialVariants])

    const handlePlaceOrder = async () => {
        if (totalUnits === 0 || errors.length > 0) return
        setLoading(true)
        const res = await createWholesaleOrder({ userId, total: totalAmount, items: orderSummary })
        if (res.success) {
            toast.success("Order Placed Successfully!")
            setQuantities({})
            window.location.href = `/wholesale/order-success?id=${res.orderId}`
        } else {
            toast.error(res.error)
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 space-y-6">
                {/* Search & Filter */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-4 text-slate-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search SKU or product..."
                            className="w-full bg-white border-2 border-slate-100 h-14 pl-12 pr-4 rounded-2xl outline-none focus:border-blue-500 font-medium"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="relative w-64">
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full bg-white border-2 border-slate-100 h-14 px-6 rounded-2xl outline-none appearance-none font-bold text-slate-700"
                        >
                            {categoriesList.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        <ChevronDown className="absolute right-4 top-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 border-b">
                            <tr>
                                <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Item Details</th>
                                <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Batch MOQ Pricing</th>
                                <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center w-40">Qty</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredVariants.map((v) => {
                                const rule = v.products?.categories?.category_wholesale_rules?.[0]
                                const moq = rule?.min_order_quantity || 1
                                const discount = rule?.is_active ? Number(rule.discount_percentage) : 0
                                const wholesalePrice = Math.floor(v.price * (1 - (discount / 100)))

                                return (
                                    <tr key={v.id} className="hover:bg-blue-50/10 transition-colors">
                                        <td className="p-6">
                                            <div className="flex items-center gap-4">
                                                <img src={v.products.thumbnail_url} className="w-14 h-14 rounded-xl object-cover border" alt={v.products.name || "Product"} loading="lazy" />
                                                <div>
                                                    <div className="font-bold text-slate-900">{v.products.name}</div>
                                                    <div className="text-xs text-slate-500">{v.title} <span className="mx-1">•</span> <span className="font-mono">{v.sku}</span></div>
                                                    <div className="mt-2 flex gap-2">
                                                        <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded">MOQ: {moq}</span>
                                                        {discount > 0 && <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">-{discount}% OFF</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6 text-center">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase">Retail Batch ({moq} units)</div>
                                            <div className="text-sm font-bold text-slate-400 line-through">₹{(v.price * moq).toLocaleString()}</div>

                                            <div className="text-[10px] font-black text-blue-600 uppercase mt-2">Wholesale Batch</div>
                                            <div className="text-xl font-black text-blue-600">₹{(wholesalePrice * moq).toLocaleString()}</div>
                                            <div className="text-[10px] text-slate-400 font-semibold">₹{wholesalePrice}/unit</div>
                                        </td>
                                        <td className="p-6">
                                            <input
                                                type="number"
                                                placeholder={`Min ${moq}`}
                                                className={`w-full h-12 rounded-xl border-2 text-center font-black outline-none transition-all ${quantities[v.id] > 0 && quantities[v.id] < moq
                                                        ? 'border-red-400 bg-red-50'
                                                        : 'border-slate-100 focus:border-blue-500'
                                                    }`}
                                                value={quantities[v.id] || ""}
                                                onChange={(e) => setQuantities({ ...quantities, [v.id]: parseInt(e.target.value) || 0 })}
                                            />
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Sidebar Summary */}
            <div className="w-full lg:w-96">
                <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 sticky top-10 shadow-2xl">
                    <h2 className="text-xl font-black mb-8 flex items-center gap-3"><Tag className="text-blue-400" /> Wholesale Quote</h2>
                    <div className="space-y-6 border-b border-white/10 pb-8 mb-8">
                        <div className="flex justify-between text-[10px] font-bold uppercase text-white/40 tracking-widest"><span>Total Units</span><span>{totalUnits}</span></div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold uppercase text-white/40 tracking-widest">Grand Total</span>
                            <span className="text-5xl font-black text-blue-400">₹{totalAmount.toLocaleString()}</span>
                        </div>
                    </div>
                    {errors.length > 0 && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                            <p className="text-red-400 text-[10px] font-black uppercase mb-2 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Requirement Check</p>
                            <ul className="text-[11px] text-red-200/70 space-y-1">{errors.slice(0, 3).map((err, i) => <li key={i}>• {err}</li>)}</ul>
                        </div>
                    )}
                    <button
                        disabled={totalUnits === 0 || errors.length > 0 || loading}
                        onClick={handlePlaceOrder}
                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-20 h-20 rounded-3xl font-black text-lg transition-all flex items-center justify-center gap-3"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <><Package className="w-6 h-6" /> Submit Order</>}
                    </button>
                </div>
            </div>
        </div>
    )
}