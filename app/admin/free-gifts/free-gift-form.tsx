"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Search, Check } from "lucide-react"
import { createFreeGift, updateFreeGift } from "@/app/actions/promotions"

interface FreeGiftFormProps {
    products: any[]
    categories: any[]
    initialData?: any
    initialSelectedIds?: {
        product_ids?: string[]
        category_ids?: string[]
        brands?: string[]
    }
}

export function FreeGiftForm({ products, categories, initialData, initialSelectedIds }: FreeGiftFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [triggerType, setTriggerType] = useState(initialData?.trigger_type || 'cart_total')
    const [applyTo, setApplyTo] = useState(initialData?.apply_to || 'all')
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>(initialSelectedIds?.product_ids || [])
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(initialSelectedIds?.category_ids || [])
    const [selectedBrands, setSelectedBrands] = useState<string[]>(initialSelectedIds?.brands || [])
    const [productSearch, setProductSearch] = useState('')
    const [categorySearch, setCategorySearch] = useState('')

    const filteredProducts = products.filter((p: any) =>
        p.name.toLowerCase().includes(productSearch.toLowerCase())
    )
    const filteredCategories = categories.filter((c: any) =>
        c.name.toLowerCase().includes(categorySearch.toLowerCase())
    )

    const toggleProduct = (id: string) => {
        setSelectedProductIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }
    const toggleCategory = (id: string) => {
        setSelectedCategoryIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }

    const handleSubmit = async (formData: FormData) => {
        setLoading(true)
        try {
            const data = {
                name: formData.get('name') as string,
                description: formData.get('description') as string || undefined,
                gift_product_id: formData.get('gift_product_id') as string,
                gift_variant_id: formData.get('gift_variant_id') as string || undefined,
                gift_quantity: Number(formData.get('gift_quantity')) || 1,
                trigger_type: triggerType,
                trigger_threshold: triggerType === 'cart_total'
                    ? (Number(formData.get('trigger_threshold')) || 0)
                    : (Number(formData.get('trigger_threshold')) || 1),
                min_cart_amount: formData.get('min_cart_amount') ? Number(formData.get('min_cart_amount')) : null,
                apply_to: applyTo,
                qualifying_product_ids: triggerType === 'specific_products' ? selectedProductIds : undefined,
                qualifying_category_ids: triggerType === 'specific_categories' ? selectedCategoryIds : undefined,
                qualifying_brands: triggerType === 'specific_brands'
                    ? (formData.get('qualifying_brands') as string || '').split(',').map(s => s.trim()).filter(Boolean)
                    : undefined,
                usage_limit: Number(formData.get('usage_limit')) || undefined,
                once_per_user: formData.get('once_per_user') === 'on',
                max_per_order: Number(formData.get('max_per_order')) || 1,
                starts_at: formData.get('starts_at') as string || new Date().toISOString(),
                expires_at: formData.get('expires_at') as string || undefined,
                is_active: formData.get('is_active') !== 'off',
            }

            if (!data.name || !data.gift_product_id) {
                toast.error("Name and gift product are required")
                setLoading(false)
                return
            }

            if (initialData) {
                await updateFreeGift(initialData.id, data)
                toast.success("Rule updated")
            } else {
                await createFreeGift(data)
                toast.success("Rule created")
            }
            router.push('/admin/free-gifts')
            router.refresh()
        } catch (err: any) {
            toast.error(err.message || "Failed to save rule")
        } finally {
            setLoading(false)
        }
    }

    return (
        <form action={handleSubmit} className="space-y-8">
            {/* Rule Name */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rule Name</label>
                <input name="name" defaultValue={initialData?.name} required
                    className="w-full h-12 px-4 text-sm bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-slate-900 transition-all outline-none"
                    placeholder="e.g., Birthday Gift, Festival Offer"
                />
            </div>

            {/* Description */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description</label>
                <textarea name="description" defaultValue={initialData?.description} rows={2}
                    className="w-full px-4 py-3 text-sm bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-slate-900 transition-all outline-none resize-none"
                    placeholder="Internal note about this rule"
                />
            </div>

            {/* Gift Product */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gift Product</label>
                <select name="gift_product_id" defaultValue={initialData?.gift_product_id} required
                    className="w-full h-12 px-4 text-sm bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-slate-900 transition-all outline-none">
                    <option value="">Select a product</option>
                    {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            </div>

            {/* Gift Quantity */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gift Quantity</label>
                <input name="gift_quantity" type="number" min={1} defaultValue={initialData?.gift_quantity || 1}
                    className="w-full h-12 px-4 text-sm bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-slate-900 transition-all outline-none"
                />
            </div>

            {/* Trigger Type */}
            <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Trigger Condition</label>
                <div className="flex flex-wrap gap-2">
                    {[
                        { value: 'cart_total', label: 'Cart Total' },
                        { value: 'specific_products', label: 'Specific Products' },
                        { value: 'specific_categories', label: 'Specific Categories' },
                        { value: 'specific_brands', label: 'Specific Brands' },
                    ].map(opt => (
                        <button key={opt.value} type="button" onClick={() => setTriggerType(opt.value)}
                            className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${triggerType === opt.value ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                            {opt.label}
                        </button>
                    ))}
                </div>
                <input key={triggerType} name="trigger_threshold" type="number" min={0}
                    defaultValue={triggerType === 'cart_total'
                        ? (initialData?.trigger_threshold ?? 0)
                        : (initialData?.trigger_threshold ?? 1)
                    }
                    className="w-full h-12 px-4 text-sm bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-slate-900 transition-all outline-none"
                    placeholder={triggerType === 'cart_total' ? "Minimum cart total (₹)" : "Minimum quantity of qualifying items"}
                />
                {triggerType === 'specific_products' && (
                    <div className="space-y-2">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input value={productSearch} onChange={e => setProductSearch(e.target.value)}
                                className="w-full h-10 pl-9 pr-4 text-sm bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-slate-900 transition-all outline-none"
                                placeholder="Search products..." />
                        </div>
                        <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1">
                            {filteredProducts.map((p: any) => (
                                <button key={p.id} type="button" onClick={() => toggleProduct(p.id)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-all ${selectedProductIds.includes(p.id) ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-700'}`}>
                                    {p.name}
                                    {selectedProductIds.includes(p.id) && <Check className="w-3 h-3" />}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {triggerType === 'specific_categories' && (
                    <div className="space-y-2">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input value={categorySearch} onChange={e => setCategorySearch(e.target.value)}
                                className="w-full h-10 pl-9 pr-4 text-sm bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-slate-900 transition-all outline-none"
                                placeholder="Search categories..." />
                        </div>
                        <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1">
                            {filteredCategories.map((c: any) => (
                                <button key={c.id} type="button" onClick={() => toggleCategory(c.id)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-all ${selectedCategoryIds.includes(c.id) ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-700'}`}>
                                    {c.name}
                                    {selectedCategoryIds.includes(c.id) && <Check className="w-3 h-3" />}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {triggerType === 'specific_brands' && (
                    <input name="qualifying_brands" type="text"
                        defaultValue={initialSelectedIds?.brands?.join(', ')}
                        className="w-full h-12 px-4 text-sm bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-slate-900 transition-all outline-none"
                        placeholder="Comma-separated brand names" />
                )}
            </div>

            {/* Optional Minimum Cart Amount */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Minimum Cart Amount <span className="text-slate-300 font-normal normal-case">(optional)</span>
                </label>
                <input name="min_cart_amount" type="number" min={0} defaultValue={initialData?.min_cart_amount || ''}
                    className="w-full h-12 px-4 text-sm bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-slate-900 transition-all outline-none"
                    placeholder="e.g., 500 — leave empty for no minimum" />
                <p className="text-[11px] text-slate-400">Cart must be at least this amount (₹) for the gift to apply, regardless of other conditions.</p>
            </div>

            {/* Limits */}
            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Usage Limit</label>
                    <input name="usage_limit" type="number" min={0} defaultValue={initialData?.usage_limit}
                        className="w-full h-12 px-4 text-sm bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-slate-900 transition-all outline-none"
                        placeholder="∞" />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Max / Order</label>
                    <input name="max_per_order" type="number" min={1} defaultValue={initialData?.max_per_order || 1}
                        className="w-full h-12 px-4 text-sm bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-slate-900 transition-all outline-none" />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Per User Only</label>
                    <label className="flex items-center gap-2 h-12 px-4 bg-slate-50 rounded-xl cursor-pointer">
                        <input name="once_per_user" type="checkbox" defaultChecked={initialData?.once_per_user}
                            className="w-4 h-4 rounded border-slate-300" />
                        <span className="text-sm text-slate-600">Once per user</span>
                    </label>
                </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Start Date</label>
                    <input name="starts_at" type="datetime-local" defaultValue={initialData?.starts_at?.slice(0, 16)}
                        className="w-full h-12 px-4 text-sm bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-slate-900 transition-all outline-none" />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Expiry Date</label>
                    <input name="expires_at" type="datetime-local" defaultValue={initialData?.expires_at?.slice(0, 16)}
                        className="w-full h-12 px-4 text-sm bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-slate-900 transition-all outline-none" />
                </div>
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                    <input name="is_active" type="checkbox" defaultChecked={initialData?.is_active ?? true} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-slate-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                </label>
                <span className="text-sm font-medium text-slate-700">Active</span>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading}
                className="h-12 px-8 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors inline-flex items-center gap-2 disabled:opacity-50">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {initialData ? 'Update Rule' : 'Create Rule'}
            </button>
        </form>
    )
}
