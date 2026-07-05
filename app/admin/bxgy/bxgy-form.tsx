"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Search, Check } from "lucide-react"
import { createBXGY, updateBXGY } from "@/app/actions/promotions"

interface BXGYFormProps {
    products: any[]
    categories: any[]
    initialData?: any
    initialSelectedIds?: {
        buy_product_ids?: string[]
        buy_category_ids?: string[]
        buy_brands?: string[]
        get_product_ids?: string[]
    }
}

export function BXGYForm({ products, categories, initialData, initialSelectedIds }: BXGYFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [buyType, setBuyType] = useState(initialData?.buy_type || 'specific_products')
    const [getType, setGetType] = useState(initialData?.get_type || 'cheapest_free')
    const [applyTo, setApplyTo] = useState(initialData?.apply_to || 'all')
    const [selectedBuyProductIds, setSelectedBuyProductIds] = useState<string[]>(initialSelectedIds?.buy_product_ids || [])
    const [selectedBuyCategoryIds, setSelectedBuyCategoryIds] = useState<string[]>(initialSelectedIds?.buy_category_ids || [])
    const [selectedGetProductIds, setSelectedGetProductIds] = useState<string[]>(initialSelectedIds?.get_product_ids || [])
    const [productSearch, setProductSearch] = useState('')
    const [categorySearch, setCategorySearch] = useState('')

    const filteredProducts = products.filter((p: any) =>
        p.name.toLowerCase().includes(productSearch.toLowerCase())
    )
    const filteredCategories = categories.filter((c: any) =>
        c.name.toLowerCase().includes(categorySearch.toLowerCase())
    )

    const toggleBuyProduct = (id: string) => setSelectedBuyProductIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    const toggleBuyCategory = (id: string) => setSelectedBuyCategoryIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    const toggleGetProduct = (id: string) => setSelectedGetProductIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

    const handleSubmit = async (formData: FormData) => {
        setLoading(true)
        try {
            const data = {
                name: formData.get('name') as string,
                description: formData.get('description') as string || undefined,
                buy_type: buyType,
                buy_quantity: Number(formData.get('buy_quantity')) || 2,
                get_type: getType,
                get_product_id: formData.get('get_product_id') as string || undefined,
                get_variant_id: formData.get('get_variant_id') as string || undefined,
                get_discount_type: formData.get('get_discount_type') as string || 'free',
                get_discount_value: Number(formData.get('get_discount_value')) || 100,
                apply_to: applyTo,
                buy_product_ids: buyType === 'specific_products' ? selectedBuyProductIds : undefined,
                buy_category_ids: buyType === 'specific_categories' ? selectedBuyCategoryIds : undefined,
                buy_brands: buyType === 'specific_brands' ? (formData.get('buy_brands') as string || '').split(',').map(s => s.trim()).filter(Boolean) : undefined,
                get_product_ids: getType === 'specific_product' ? selectedGetProductIds : undefined,
                usage_limit: Number(formData.get('usage_limit')) || undefined,
                once_per_user: formData.get('once_per_user') === 'on',
                max_per_order: Number(formData.get('max_per_order')) || undefined,
                starts_at: formData.get('starts_at') as string || new Date().toISOString(),
                expires_at: formData.get('expires_at') as string || undefined,
                is_active: formData.get('is_active') !== 'off',
            }

            if (!data.name) {
                toast.error("Rule name is required")
                setLoading(false)
                return
            }

            if (initialData) {
                await updateBXGY(initialData.id, data)
                toast.success("Rule updated")
            } else {
                await createBXGY(data)
                toast.success("Rule created")
            }
            router.push('/admin/bxgy')
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
                    placeholder="e.g., Buy 2 Get 1 Free" />
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description</label>
                <textarea name="description" defaultValue={initialData?.description} rows={2}
                    className="w-full px-4 py-3 text-sm bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-slate-900 transition-all outline-none resize-none"
                    placeholder="Internal note" />
            </div>

            {/* Buy Configuration */}
            <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Buy Condition</label>
                <div className="flex flex-wrap gap-2">
                    {[
                        { value: 'specific_products', label: 'Specific Products' },
                        { value: 'specific_categories', label: 'Specific Categories' },
                        { value: 'specific_brands', label: 'Specific Brands' },
                    ].map(opt => (
                        <button key={opt.value} type="button" onClick={() => setBuyType(opt.value)}
                            className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${buyType === opt.value ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                            {opt.label}
                        </button>
                    ))}
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Buy Quantity</label>
                    <input name="buy_quantity" type="number" min={2} defaultValue={initialData?.buy_quantity || 2}
                        className="w-full h-12 px-4 text-sm bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-slate-900 transition-all outline-none"
                        placeholder="How many to buy" />
                </div>
                {buyType === 'specific_products' && (
                    <div className="space-y-2">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input value={productSearch} onChange={e => setProductSearch(e.target.value)}
                                className="w-full h-10 pl-9 pr-4 text-sm bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-slate-900 transition-all outline-none"
                                placeholder="Search buy products..." />
                        </div>
                        <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1">
                            {filteredProducts.map((p: any) => (
                                <button key={p.id} type="button" onClick={() => toggleBuyProduct(p.id)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-all ${selectedBuyProductIds.includes(p.id) ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-700'}`}>
                                    {p.name}
                                    {selectedBuyProductIds.includes(p.id) && <Check className="w-3 h-3" />}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {buyType === 'specific_categories' && (
                    <div className="space-y-2">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input value={categorySearch} onChange={e => setCategorySearch(e.target.value)}
                                className="w-full h-10 pl-9 pr-4 text-sm bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-slate-900 transition-all outline-none"
                                placeholder="Search categories..." />
                        </div>
                        <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1">
                            {filteredCategories.map((c: any) => (
                                <button key={c.id} type="button" onClick={() => toggleBuyCategory(c.id)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-all ${selectedBuyCategoryIds.includes(c.id) ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-700'}`}>
                                    {c.name}
                                    {selectedBuyCategoryIds.includes(c.id) && <Check className="w-3 h-3" />}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {buyType === 'specific_brands' && (
                    <input name="buy_brands" type="text"
                        defaultValue={initialSelectedIds?.buy_brands?.join(', ')}
                        className="w-full h-12 px-4 text-sm bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-slate-900 transition-all outline-none"
                        placeholder="Comma-separated brand names" />
                )}
            </div>

            {/* Get Configuration */}
            <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Get Reward</label>
                <div className="flex flex-wrap gap-2">
                    {[
                        { value: 'cheapest_free', label: 'Cheapest Free' },
                        { value: 'specific_product', label: 'Specific Product' },
                    ].map(opt => (
                        <button key={opt.value} type="button" onClick={() => setGetType(opt.value)}
                            className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${getType === opt.value ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                            {opt.label}
                        </button>
                    ))}
                </div>
                {getType === 'specific_product' && (
                    <>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Get Product</label>
                            <select name="get_product_id" defaultValue={initialData?.get_product_id}
                                className="w-full h-12 px-4 text-sm bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-slate-900 transition-all outline-none">
                                <option value="">Select product</option>
                                {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Or select multiple get products</label>
                            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1">
                                {filteredProducts.map((p: any) => (
                                    <button key={p.id} type="button" onClick={() => toggleGetProduct(p.id)}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-all ${selectedGetProductIds.includes(p.id) ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-700'}`}>
                                        {p.name}
                                        {selectedGetProductIds.includes(p.id) && <Check className="w-3 h-3" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Discount Type</label>
                        <select name="get_discount_type" defaultValue={initialData?.get_discount_type || 'free'}
                            className="w-full h-12 px-4 text-sm bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-slate-900 transition-all outline-none">
                            <option value="free">Free (100%)</option>
                            <option value="percentage">Percentage</option>
                            <option value="fixed">Fixed Amount</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Discount Value</label>
                        <input name="get_discount_value" type="number" min={0} defaultValue={initialData?.get_discount_value || 100}
                            className="w-full h-12 px-4 text-sm bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-slate-900 transition-all outline-none" />
                    </div>
                </div>
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
                    <input name="max_per_order" type="number" min={1} defaultValue={initialData?.max_per_order}
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

            <button type="submit" disabled={loading}
                className="h-12 px-8 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors inline-flex items-center gap-2 disabled:opacity-50">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {initialData ? 'Update Rule' : 'Create Rule'}
            </button>
        </form>
    )
}
