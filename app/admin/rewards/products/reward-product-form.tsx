"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { saveRewardProduct } from "@/app/actions/rewards-admin"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export function RewardProductForm({ initialData }: { initialData?: any }) {
    const router = useRouter()
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({
        product_name: initialData?.product_name || "",
        description: initialData?.description || "",
        thumbnail_url: initialData?.thumbnail_url || "",
        coins_required: initialData?.coins_required || "",
        stock: initialData?.stock || "",
        active: initialData?.active ?? true,
        reward_type: initialData?.reward_type || "product",
        discount_amount: initialData?.discount_amount || "",
        min_order_value: initialData?.min_order_value || "",
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.product_name || !form.coins_required) {
            toast.error("Name and coins required")
            return
        }
        setSaving(true)
        const res = await saveRewardProduct({ ...form, id: initialData?.id })
        if (res.success) {
            toast.success("Saved!")
            router.push("/admin/rewards/products")
            router.refresh()
        } else {
            toast.error(res.message || "Failed")
        }
        setSaving(false)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
                <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">Product Name</label>
                    <input type="text" value={form.product_name} onChange={e => setForm({ ...form, product_name: e.target.value })}
                        className="w-full h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-900 focus:outline-none focus:border-rose-300" />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">Description</label>
                    <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                        className="w-full h-20 p-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-900 focus:outline-none focus:border-rose-300" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-slate-700 mb-1 block">Coins Required</label>
                        <input type="number" min="1" value={form.coins_required} onChange={e => setForm({ ...form, coins_required: e.target.value })}
                            className="w-full h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-900 focus:outline-none focus:border-rose-300" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-700 mb-1 block">Stock</label>
                        <input type="number" min="0" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })}
                            className="w-full h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-900 focus:outline-none focus:border-rose-300" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-slate-700 mb-1 block">Reward Type</label>
                        <select value={form.reward_type} onChange={e => setForm({ ...form, reward_type: e.target.value })}
                            className="w-full h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:border-rose-300">
                            <option value="product">Product</option>
                            <option value="coupon">Coupon</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-4 h-10">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} className="w-4 h-4 rounded text-rose-500" />
                            <span className="text-sm font-medium text-slate-700">Active</span>
                        </label>
                    </div>
                </div>
                {form.reward_type === "coupon" && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-700 mb-1 block">Discount Amount (₹)</label>
                            <input type="number" min="1" value={form.discount_amount} onChange={e => setForm({ ...form, discount_amount: e.target.value })}
                                className="w-full h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-900 focus:outline-none focus:border-rose-300" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-700 mb-1 block">Min Order Value (₹)</label>
                            <input type="number" min="0" value={form.min_order_value} onChange={e => setForm({ ...form, min_order_value: e.target.value })}
                                className="w-full h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-900 focus:outline-none focus:border-rose-300" />
                        </div>
                    </div>
                )}
            </div>
            <button type="submit" disabled={saving} className="h-10 px-6 rounded-xl bg-rose-500 text-white text-sm font-bold hover:bg-rose-600 transition-all disabled:opacity-50 inline-flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Reward Product
            </button>
        </form>
    )
}
