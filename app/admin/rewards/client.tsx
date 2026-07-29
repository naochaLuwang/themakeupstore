"use client"

import { useState, useEffect, useRef } from "react"
import { Gift, Plus, Eye, EyeOff, Pencil, Trash2, X, Search, Loader2, Tag } from "lucide-react"
import { createRewardProduct, updateRewardProduct, toggleRewardProduct, deleteRewardProduct } from "@/app/actions/loyalty"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

function fmt(n: number) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)
}

function RewardsTable({ rewards, onEdit }: { rewards: any[]; onEdit: (r: any) => void }) {
    const router = useRouter()
    const [deleting, setDeleting] = useState<string | null>(null)

    const handleToggle = async (id: string, active: boolean) => {
        const res = await toggleRewardProduct(id, active)
        if (res?.success) {
            toast.success(active ? "Reward disabled" : "Reward enabled")
            router.refresh()
        } else {
            toast.error(res?.message || "Failed to update reward")
        }
    }

    const handleDelete = async (id: string) => {
        setDeleting(id)
        await deleteRewardProduct(id)
        setDeleting(null)
        toast.success("Reward deleted")
        router.refresh()
    }

    return (
        <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
            <table className="w-full">
                <thead className="bg-slate-50/50">
                    <tr className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                        <th className="py-4 px-6 text-left">Reward</th>
                        <th className="py-4 px-6 text-left">Type</th>
                        <th className="py-4 px-6 text-left">Tier</th>
                        <th className="py-4 px-6 text-left">Coins</th>
                        <th className="py-4 px-6 text-left">Stock</th>
                        <th className="py-4 px-6 text-left">Value</th>
                        <th className="py-4 px-6 text-left">Status</th>
                        <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {rewards.map((r: any) => (
                        <tr key={r.id} className={`group hover:bg-slate-50/50 transition-colors ${!r.active ? "opacity-60" : ""}`}>
                            <td className="py-4 px-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                                        {r.reward_type === "coupon" ? (
                                            <Tag className="w-4 h-4 text-emerald-500" />
                                        ) : r.thumbnail_url ? (
                                            <img src={r.thumbnail_url} alt={r.product_name} className="w-full h-full object-cover" />
                                        ) : (
                                            <Gift className="w-4 h-4 text-slate-400" />
                                        )}
                                    </div>
                                    <div>
                                        <span className="text-sm font-semibold text-slate-900">{r.product_name}</span>
                                        {r.reward_type === "coupon" && r.discount_amount && (
                                            <p className="text-[10px] text-emerald-600 font-medium">
                                                {fmt(r.discount_amount)} OFF{r.min_order_value ? ` on ${fmt(r.min_order_value)}` : ""}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </td>
                            <td className="py-4 px-6">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                    r.reward_type === "coupon" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
                                }`}>
                                    {r.reward_type === "coupon" ? "Coupon" : "Product"}
                                </span>
                            </td>
                            <td className="py-4 px-6">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                    !r.tier_restriction ? "bg-slate-100 text-slate-500"
                                    : r.tier_restriction === "gold" ? "bg-amber-50 text-amber-700"
                                    : r.tier_restriction === "silver" ? "bg-slate-100 text-slate-600"
                                    : "bg-orange-50 text-orange-700"
                                }`}>
                                    {r.tier_restriction ? r.tier_restriction : "All"}
                                </span>
                            </td>
                            <td className="py-4 px-6">
                                <span className="font-mono font-bold text-amber-600 text-sm">{r.coins_required}</span>
                            </td>
                            <td className="py-4 px-6">
                                <span className={`text-sm font-semibold ${r.stock <= 5 ? "text-rose-600" : "text-slate-700"}`}>
                                    {r.stock}
                                </span>
                            </td>
                            <td className="py-4 px-6">
                                <span className="text-sm text-slate-500">
                                    {r.reward_type === "coupon" ? fmt(r.discount_amount || r.coins_required * 100) : fmt(r.coins_required * 100)}
                                </span>
                            </td>
                            <td className="py-4 px-6">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                    r.active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                                }`}>
                                    {r.active ? "Active" : "Disabled"}
                                </span>
                            </td>
                            <td className="py-4 px-6 text-right">
                                <div className="flex justify-end items-center gap-1.5">
                                    <button
                                        onClick={() => onEdit(r)}
                                        className="rounded-lg h-9 w-9 border border-slate-200 hover:bg-slate-100 transition-all text-slate-400 inline-flex items-center justify-center"
                                        title="Edit"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleToggle(r.id, r.active)}
                                        className="rounded-lg h-9 w-9 border border-slate-200 hover:bg-slate-100 transition-all text-slate-400 inline-flex items-center justify-center"
                                        title={r.active ? "Disable" : "Enable"}
                                    >
                                        {r.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4 text-emerald-500" />}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(r.id)}
                                        disabled={deleting === r.id}
                                        className="rounded-lg h-9 w-9 border border-slate-200 hover:bg-red-50 transition-all text-slate-400 hover:text-red-500 inline-flex items-center justify-center disabled:opacity-40"
                                        title="Delete"
                                    >
                                        {deleting === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {rewards.length === 0 && (
                        <tr>
                            <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                                No reward products yet
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    )
}

function CouponFields({ prefix = "" }: { prefix?: string }) {
    const [discount, setDiscount] = useState("")
    const [minOrder, setMinOrder] = useState("")

    return (
        <>
            <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    {prefix}Discount Amount (₹) *
                </label>
                <input name="discount_amount" type="number" min={1} value={discount} onChange={e => setDiscount(e.target.value)} required
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-900 transition-colors"
                />
            </div>
            <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    {prefix}Min. Order Value
                </label>
                <input name="min_order_value" type="number" min={0} value={minOrder} onChange={e => setMinOrder(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-900 transition-colors"
                    placeholder="0"
                />
            </div>
        </>
    )
}

function TierSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
        <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Tier Restriction</label>
            <select value={value} onChange={e => onChange(e.target.value)} name="tier_restriction"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-900 transition-colors bg-white"
            >
                <option value="">All Tiers</option>
                <option value="bronze">Bronze only</option>
                <option value="silver">Silver only</option>
                <option value="gold">Gold only</option>
            </select>
        </div>
    )
}

function EditDialog({ reward, onClose }: { reward: any; onClose: () => void }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [type, setType] = useState(reward.reward_type || "product")
    const [previewUrl, setPreviewUrl] = useState(reward.thumbnail_url || "")
    const [discountAmount, setDiscountAmount] = useState(String(reward.discount_amount || ""))
    const [minOrderValue, setMinOrderValue] = useState(String(reward.min_order_value || ""))
    const [tierRestriction, setTierRestriction] = useState(reward.tier_restriction || "")

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)
        formData.set("reward_type", type)
        if (type === "coupon") {
            formData.set("discount_amount", discountAmount)
            formData.set("min_order_value", minOrderValue)
        }
        const res = await updateRewardProduct(reward.id, formData)
        setLoading(false)
        if (res.success) {
            toast.success("Reward updated")
            onClose()
            router.refresh()
        } else {
            toast.error(res.message || "Update failed")
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                    <h2 className="text-sm font-black tracking-tight text-slate-900">Edit Reward</h2>
                    <button onClick={onClose} className="rounded-lg h-8 w-8 border border-slate-200 hover:bg-slate-100 transition-all inline-flex items-center justify-center text-slate-400">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {/* Type toggle */}
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Reward Type</label>
                        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
                            <button type="button" onClick={() => setType("product")}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${type === "product" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>
                                Product
                            </button>
                            <button type="button" onClick={() => setType("coupon")}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${type === "coupon" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>
                                Coupon
                            </button>
                        </div>
                    </div>

                    <input type="hidden" name="reward_type" value={type} />

                    <TierSelect value={tierRestriction} onChange={setTierRestriction} />

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Name</label>
                            <input name="product_name" defaultValue={reward.product_name} required
                                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-900 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Coins Required</label>
                            <input name="coins_required" type="number" min={1} defaultValue={reward.coins_required} required
                                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-900 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Stock</label>
                            <input name="stock" type="number" min={0} defaultValue={reward.stock}
                                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-900 transition-colors"
                            />
                        </div>

                        {/* Coupon-specific fields */}
                        {type === "coupon" && (
                            <>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Discount Amount (₹)</label>
                                    <input name="discount_amount" type="number" min={1} value={discountAmount} onChange={e => setDiscountAmount(e.target.value)} required
                                        className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-900 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Min. Order Value</label>
                                    <input name="min_order_value" type="number" min={0} value={minOrderValue} onChange={e => setMinOrderValue(e.target.value)}
                                        className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-900 transition-colors"
                                        placeholder="0"
                                    />
                                </div>
                            </>
                        )}

                        {/* Thumbnail (show for both, but only display preview for product) */}
                        {type === "product" && (
                            <div className="col-span-2">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Thumbnail URL</label>
                                <input name="thumbnail_url" value={previewUrl} onChange={e => setPreviewUrl(e.target.value)}
                                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-900 transition-colors placeholder:text-slate-300"
                                />
                                {previewUrl && (
                                    <div className="mt-2 w-14 h-14 rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                                        <img src={previewUrl} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="col-span-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Description</label>
                            <textarea name="description" rows={2} defaultValue={reward.description || ""}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-900 transition-colors resize-none"
                            />
                        </div>

                        <div className="col-span-2 flex items-center gap-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input name="active" type="checkbox" value="true" defaultChecked={reward.active} className="rounded border-slate-300 text-pink-500 focus:ring-pink-200" />
                                <span className="text-xs font-semibold text-slate-600">Active</span>
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="rounded-lg h-10 px-5 border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className="rounded-lg h-10 px-5 bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-all disabled:opacity-50 inline-flex items-center gap-1.5">
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

function ProductSearchSelect({ onSelect }: { onSelect: (p: { product_name: string; thumbnail_url: string | null; description: string | null }) => void }) {
    const [query, setQuery] = useState("")
    const [results, setResults] = useState<any[]>([])
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const debounceRef = useRef<NodeJS.Timeout>(undefined)

    useEffect(() => {
        if (query.length < 2) {
            setResults([])
            return
        }
        clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(async () => {
            setLoading(true)
            try {
                const res = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`)
                const data = await res.json()
                setResults(data.products || [])
                setOpen(true)
            } catch { }
            setLoading(false)
        }, 300)
    }, [query])

    return (
        <div className="relative">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search existing products..."
                    className="w-full h-10 pl-9 pr-9 rounded-lg border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-900 transition-colors placeholder:text-slate-300"
                />
                {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />}
            </div>
            {open && results.length > 0 && (
                <div className="absolute z-10 top-full mt-1 left-0 right-0 rounded-xl border border-slate-200 bg-white shadow-lg max-h-60 overflow-y-auto">
                    {results.map((p: any) => (
                        <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                                onSelect({
                                    product_name: p.name || p.product_name,
                                    thumbnail_url: p.thumbnail_url || p.images?.[0],
                                    description: p.description || null,
                                })
                                setQuery("")
                                setOpen(false)
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left transition-colors"
                        >
                            <div className="w-8 h-8 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                                {p.thumbnail_url || p.images?.[0] ? (
                                    <img src={p.thumbnail_url || p.images?.[0]} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300 text-[10px] font-daciana">M</div>
                                )}
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-900">{p.name || p.product_name}</p>
                                {p.category_name && <p className="text-[10px] text-slate-400">{p.category_name}</p>}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

function AddRewardForm() {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [type, setType] = useState("product")
    const [productName, setProductName] = useState("")
    const [previewUrl, setPreviewUrl] = useState("")
    const [description, setDescription] = useState("")
    const [tierRestriction, setTierRestriction] = useState("")

    const handleProductSelect = (p: { product_name: string; thumbnail_url: string | null; description: string | null }) => {
        setProductName(p.product_name)
        if (p.thumbnail_url) setPreviewUrl(p.thumbnail_url)
        if (p.description) setDescription(p.description)
    }

    const closeForm = () => { setOpen(false); setType("product"); setProductName(""); setPreviewUrl(""); setDescription(""); setTierRestriction("") }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)
        formData.set("reward_type", type)
        await createRewardProduct(formData)
        setLoading(false)
        toast.success("Reward added")
        closeForm()
        router.refresh()
    }

    return (
        <div>
            <button
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl h-11 px-5 bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-all"
            >
                <Plus className="h-4 w-4" /> Add Reward
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={closeForm}>
                    <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-slate-100">
                            <h2 className="text-sm font-black tracking-tight text-slate-900">Add Reward</h2>
                            <button onClick={closeForm} className="rounded-lg h-8 w-8 border border-slate-200 hover:bg-slate-100 transition-all inline-flex items-center justify-center text-slate-400">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            {/* Type toggle */}
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Reward Type</label>
                                <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
                                    <button type="button" onClick={() => setType("product")}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${type === "product" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>
                                        Product
                                    </button>
                                    <button type="button" onClick={() => setType("coupon")}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${type === "coupon" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>
                                        Coupon
                                    </button>
                                </div>
                            </div>

                            <input type="hidden" name="reward_type" value={type} />

                            <TierSelect value={tierRestriction} onChange={setTierRestriction} />

                            <div className="grid grid-cols-2 gap-4">
                                {type === "product" && (
                                    <div className="col-span-2">
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Import from Catalog</label>
                                        <ProductSearchSelect onSelect={handleProductSelect} />
                                    </div>
                                )}

                                <div className={`${type === "coupon" ? "col-span-2" : "col-span-2"}`}>
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                                        {type === "coupon" ? "Coupon Name *" : "Product Name *"}
                                    </label>
                                    <input name="product_name" value={productName} onChange={e => setProductName(e.target.value)} required
                                        className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-900 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Coins Required *</label>
                                    <input name="coins_required" type="number" min={1} required
                                        className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-900 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Stock</label>
                                    <input name="stock" type="number" min={0} defaultValue={0}
                                        className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-900 transition-colors"
                                    />
                                </div>

                                {/* Coupon fields */}
                                {type === "coupon" && (
                                    <>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Discount Amount (₹) *</label>
                                            <input name="discount_amount" type="number" min={1} required
                                                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-900 transition-colors"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Min. Order Value</label>
                                            <input name="min_order_value" type="number" min={0} defaultValue={0}
                                                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-900 transition-colors"
                                            />
                                        </div>
                                    </>
                                )}

                                {/* Thumbnail (product only) */}
                                {type === "product" && (
                                    <div className="col-span-2">
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Thumbnail URL</label>
                                        <input name="thumbnail_url" value={previewUrl} onChange={e => setPreviewUrl(e.target.value)}
                                            className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-900 transition-colors placeholder:text-slate-300"
                                        />
                                        {previewUrl && (
                                            <div className="mt-2 w-14 h-14 rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                                                <img src={previewUrl} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="col-span-2">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Description</label>
                                    <textarea name="description" value={description} onChange={e => setDescription(e.target.value)} rows={2}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-900 transition-colors resize-none"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={closeForm} className="rounded-lg h-10 px-5 border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all">
                                    Cancel
                                </button>
                                <button type="submit" disabled={loading} className="rounded-lg h-10 px-5 bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-all disabled:opacity-50 inline-flex items-center gap-1.5">
                                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Create Reward
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export function AdminRewardsClient({ rewards, stats }: { rewards: any[]; stats: any }) {
    const [editing, setEditing] = useState<any | null>(null)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">M Beauty Rewards</h1>
                    <p className="text-sm text-slate-500">Manage the rewards catalog</p>
                </div>
                <AddRewardForm />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-2xl border bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Coins</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{stats.totalCoins.toLocaleString("en-IN")}</p>
                </div>
                <div className="rounded-2xl border bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Users</p>
                    <p className="text-2xl font-black text-emerald-600 mt-1">{stats.totalUsers}</p>
                </div>
                <div className="rounded-2xl border bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Coins Redeemed</p>
                    <p className="text-2xl font-black text-blue-600 mt-1">{(stats.totalRedeemed || 0).toLocaleString("en-IN")}</p>
                </div>
                <div className="rounded-2xl border bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tier Dist.</p>
                    <p className="text-sm font-black text-slate-900 mt-1">
                        B:{stats.tiers.bronze} S:{stats.tiers.silver} G:{stats.tiers.gold}
                    </p>
                </div>
            </div>

            {/* Table */}
            <RewardsTable rewards={rewards} onEdit={setEditing} />

            {/* Edit Dialog */}
            {editing && <EditDialog reward={editing} onClose={() => setEditing(null)} />}
        </div>
    )
}
