"use client"
import { useState, useMemo } from "react"
import { createPromoCode, updatePromoCode } from "@/app/actions/promo"
import {
    Search,
    Check,
    Loader2,
    Tag,
    Zap,
} from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface PromoFormProps {
    products: any[];
    categories: any[];
    initialData?: any;
    initialSelectedIds?: string[];
}

export function PromoForm({ products, categories, initialData, initialSelectedIds = [] }: PromoFormProps) {
    const router = useRouter()
    const isEdit = !!initialData

    const [applyTo, setApplyTo] = useState(initialData?.apply_to || 'all')
    const [discountType, setDiscountType] = useState(initialData?.discount_type || 'percentage')
    const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds)
    const [searchQuery, setSearchQuery] = useState('')
    const [loading, setLoading] = useState(false)

    const filteredItems = useMemo(() => {
        const list = applyTo === 'specific_products' ? products : categories
        const search = searchQuery.toLowerCase()
        return list.filter(item => (item.name || item.title || "").toLowerCase().includes(search)).slice(0, 30)
    }, [applyTo, searchQuery, products, categories])

    const toggleId = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
    }

    const formatDateTime = (dateStr: string) => {
        if (!dateStr) return ""
        const d = new Date(dateStr)
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    }

    return (
        <form
            id="promo-form"
            className="space-y-6"
            action={async (formData) => {
                setLoading(true)
                try {
                    formData.set('apply_to', applyTo)
                    formData.set('discount_type', discountType)
                    formData.set('selected_ids', selectedIds.join(','))
                    formData.set('once_per_user', formData.get('once_per_user_check') === 'on' ? 'on' : 'off')

                    const res = isEdit
                        ? await updatePromoCode(initialData.id, formData)
                        : await createPromoCode(formData)

                    if (res.success) {
                        toast.success(isEdit ? "Promo updated" : "Promo created")
                        router.push('/admin/promos')
                        router.refresh()
                    } else {
                        toast.error(res.message || "Failed to save")
                    }
                } catch (err: any) {
                    toast.error("Something went wrong")
                } finally {
                    setLoading(false)
                }
            }}
        >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEFT: Main Form */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Code & Description */}
                    <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-5">
                        <h2 className="text-sm font-bold text-slate-900">Promo Details</h2>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-500">Code</label>
                            <input
                                name="code"
                                required
                                defaultValue={initialData?.code}
                                placeholder="e.g. SUMMER25"
                                className="w-full h-11 px-4 text-sm font-bold uppercase tracking-wider bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-500">Description</label>
                            <textarea
                                name="description"
                                required
                                rows={2}
                                defaultValue={initialData?.description}
                                placeholder="What is this promo for?"
                                className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all resize-none"
                            />
                        </div>
                    </div>

                    {/* Discount Value */}
                    <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-5">
                        <h2 className="text-sm font-bold text-slate-900">Discount</h2>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setDiscountType('percentage')}
                                className={`flex-1 h-11 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                                    discountType === 'percentage'
                                        ? 'bg-slate-900 text-white'
                                        : 'bg-slate-50 text-slate-400 border border-slate-200 hover:text-slate-600'
                                }`}
                            >
                                Percentage
                            </button>
                            <button
                                type="button"
                                onClick={() => setDiscountType('fixed')}
                                className={`flex-1 h-11 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                                    discountType === 'fixed'
                                        ? 'bg-slate-900 text-white'
                                        : 'bg-slate-50 text-slate-400 border border-slate-200 hover:text-slate-600'
                                }`}
                            >
                                Fixed Amount
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-500">
                                    {discountType === 'percentage' ? 'Percentage Off' : 'Amount Off'}
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                                        {discountType === 'percentage' ? '%' : '₹'}
                                    </span>
                                    <input
                                        name="discount_value"
                                        type="number"
                                        required
                                        min={0}
                                        defaultValue={initialData?.discount_value}
                                        className="w-full h-11 pl-8 pr-4 text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-500">Max Discount Cap</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                                    <input
                                        name="max_discount_amount"
                                        type="number"
                                        min={0}
                                        defaultValue={initialData?.max_discount_amount}
                                        placeholder="No cap"
                                        className="w-full h-11 pl-8 pr-4 text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Rules */}
                    <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-5">
                        <h2 className="text-sm font-bold text-slate-900">Rules</h2>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-500">Start Date</label>
                                <input
                                    name="starts_at"
                                    type="datetime-local"
                                    required
                                    defaultValue={formatDateTime(initialData?.starts_at || new Date().toISOString())}
                                    className="w-full h-11 px-4 text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-500">Expiry Date</label>
                                <input
                                    name="expires_at"
                                    type="datetime-local"
                                    defaultValue={formatDateTime(initialData?.expires_at)}
                                    className="w-full h-11 px-4 text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-500">Usage Limit</label>
                                <input
                                    name="usage_limit"
                                    type="number"
                                    min={0}
                                    defaultValue={initialData?.usage_limit}
                                    placeholder="Unlimited"
                                    className="w-full h-11 px-4 text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-500">Min Order Amount</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                                    <input
                                        name="min_order_amount"
                                        type="number"
                                        min={0}
                                        defaultValue={initialData?.min_order_amount || 0}
                                        className="w-full h-11 pl-8 pr-4 text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-xl">
                            <div>
                                <p className="text-xs font-bold text-slate-900">Once per customer</p>
                                <p className="text-[11px] text-slate-400">Limit to one use per user account</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="once_per_user_check"
                                    defaultChecked={initialData?.once_per_user}
                                    className="sr-only peer"
                                />
                                <div className="w-10 h-[22px] bg-slate-200 rounded-full peer peer-checked:after:translate-x-[18px] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-[18px] after:w-[18px] after:transition-all peer-checked:bg-slate-900"></div>
                            </label>
                        </div>
                    </div>

                    {/* Targeting */}
                    <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-5">
                        <h2 className="text-sm font-bold text-slate-900">Applies To</h2>

                        <div className="flex gap-2">
                            {[
                                { id: 'all', label: 'All Products' },
                                { id: 'specific_products', label: 'Specific Products' },
                                { id: 'specific_categories', label: 'Specific Categories' },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => { setApplyTo(tab.id); setSelectedIds([]); setSearchQuery(''); }}
                                    className={`px-4 h-9 rounded-lg text-xs font-semibold transition-all ${
                                        applyTo === tab.id
                                            ? 'bg-slate-900 text-white'
                                            : 'bg-slate-50 text-slate-400 border border-slate-200 hover:text-slate-600'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {applyTo !== 'all' && (
                            <div className="space-y-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                    <input
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder={`Search ${applyTo === 'specific_products' ? 'products' : 'categories'}...`}
                                        className="w-full h-10 pl-10 pr-4 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                                    />
                                </div>
                                <div className="max-h-64 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-50">
                                    {filteredItems.length === 0 ? (
                                        <p className="p-6 text-center text-xs text-slate-400">No results found</p>
                                    ) : (
                                        filteredItems.map(item => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => toggleId(item.id)}
                                                className={`w-full flex items-center justify-between px-4 py-3 text-left transition-all ${
                                                    selectedIds.includes(item.id) ? 'bg-slate-50' : 'hover:bg-slate-50/50'
                                                }`}
                                            >
                                                <span className="text-sm font-medium text-slate-700 truncate">{item.name || item.title}</span>
                                                {selectedIds.includes(item.id) ? (
                                                    <Check className="w-4 h-4 text-slate-900 shrink-0" />
                                                ) : (
                                                    <div className="w-4 h-4 rounded-full border-2 border-slate-200 shrink-0" />
                                                )}
                                            </button>
                                        ))
                                    )}
                                </div>
                                {selectedIds.length > 0 && (
                                    <p className="text-xs text-slate-400">{selectedIds.length} selected</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: Submit */}
                <div className="lg:col-span-1">
                    <div className="sticky top-24 space-y-4">
                        <div className="rounded-2xl border bg-white p-6 shadow-sm">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl">
                                    <Zap className="w-4 h-4 text-amber-600 shrink-0" />
                                    <p className="text-[11px] font-medium text-amber-700">
                                        The promo code goes live immediately after saving.
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-12 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {loading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Tag className="w-4 h-4" />
                                            {isEdit ? 'Update Promo' : 'Create Promo'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    )
}
