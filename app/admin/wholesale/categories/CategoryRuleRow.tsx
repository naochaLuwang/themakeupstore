"use client"

import { useState } from "react"
import { updateWholesaleRule } from "@/app/actions/wholesale"
import { toast } from "sonner"
import { Save, Loader2 } from "lucide-react"

export default function CategoryRuleRow({ category }: { category: any }) {
    // Extract the existing rule from the array
    const rule = category.category_wholesale_rules?.[0]

    // 1. POPULATE WITH UPDATED VALUES: Initializing state with DB values
    const [discount, setDiscount] = useState(rule?.discount_percentage?.toString() || "")
    const [moq, setMoq] = useState(rule?.min_order_quantity?.toString() || "")
    const [active, setActive] = useState(rule?.is_active ?? true)
    const [loading, setLoading] = useState(false)

    const handleSave = async () => {
        setLoading(true)

        // Convert text back to numbers for the database
        const res = await updateWholesaleRule({
            categoryId: category.id,
            discount: parseFloat(discount) || 0,
            moq: parseInt(moq) || 0,
            active
        })

        if (res.success) {
            toast.success(`Updated ${category.name}`, {
                description: `Discount: ${discount}%, MOQ: ${moq}`
            })
        } else {
            toast.error("Failed to update rule")
        }
        setLoading(false)
    }

    return (
        <tr className="hover:bg-slate-50/50 transition-colors group">
            <td className="p-6 tabular-nums">
                <div className="font-semibold text-slate-900">{category.name}</div>
                <div className="text-xs text-slate-500 font-mono mt-1 tracking-normal">ID: {category.id.split('-')[0]}...</div>
            </td>

            {/* 2. TEXT INPUTS INSTEAD OF NUMBER: Using type="text" with clean styling */}
            <td className="p-6 tabular-nums">
                <div className="relative w-32">
                    <input
                        type="text"
                        value={discount}
                        placeholder="0"
                        onChange={(e) => setDiscount(e.target.value.replace(/[^0-9.]/g, ''))}
                        className="w-full bg-slate-100 border-none h-11 px-4 pr-10 rounded-xl font-semibold text-slate-700 focus:ring-2 ring-blue-500/20 outline-none transition-colors"
                    />
                    <span className="absolute right-4 top-3 text-slate-500 font-semibold">%</span>
                </div>
            </td>

            <td className="p-6 tabular-nums">
                <div className="relative w-32">
                    <input
                        type="text"
                        value={moq}
                        placeholder="12"
                        onChange={(e) => setMoq(e.target.value.replace(/[^0-9]/g, ''))}
                        className="w-full bg-slate-100 border-none h-11 px-4 rounded-xl font-semibold text-slate-700 focus:ring-2 ring-slate-900/5 outline-none transition-colors"
                    />
                </div>
            </td>

            <td className="p-6 tabular-nums">
                <button
                    onClick={() => setActive(!active)}
                    className={`w-12 h-6 rounded-lg transition-colors relative ${active ? 'bg-emerald-500' : 'bg-slate-200'}`}
                >
                    <div className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-colors ${active ? 'left-7' : 'left-1'}`} />
                </button>
            </td>

            <td className="p-6 text-right tabular-nums">
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="bg-slate-900 text-white h-11 px-6 rounded-xl font-semibold hover:bg-slate-900 disabled:opacity-20 transition-colors flex items-center gap-2 ml-auto shadow-sm"
                >
                    {loading ? <Loader2 className="animate-spin w-4 h-4 stroke-[1.5]" /> : <Save className="w-4 h-4 stroke-[1.5]" />}
                    Save Rule
                </button>
            </td>
        </tr>
    )
}