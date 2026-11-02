"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Search, Check } from "lucide-react"
import { fromStoreDateTime,toStoreDateTime } from "@/lib/store-time"
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
    const [selectedBuyProductIds, setSelectedBuyProductIds] = useState<string[]>(initialSelectedIds?.buy_product_ids || [])
    const [selectedBuyCategoryIds, setSelectedBuyCategoryIds] = useState<string[]>(initialSelectedIds?.buy_category_ids || [])
    const [productSearch, setProductSearch] = useState('')
    const [categorySearch, setCategorySearch] = useState('')
    const [brandSearch, setBrandSearch] = useState('')
    const [selectedBrands, setSelectedBrands] = useState<string[]>(initialSelectedIds?.buy_brands || [])
    const [pricingMode, setPricingMode] = useState(initialData?.pricing_mode || (initialData ? 'combine_discounts' : 'replace_discounts'))
    const brands = [...new Set<string>([...products.map(p => p.brand).filter(Boolean), ...selectedBrands])].sort()

    const filteredProducts = products.filter((p: any) =>
        p.name.toLowerCase().includes(productSearch.toLowerCase())
    )
    const filteredCategories = categories.filter((c: any) =>
        c.name.toLowerCase().includes(categorySearch.toLowerCase())
    )

    const toggleBuyProduct = (id: string) => setSelectedBuyProductIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    const toggleBuyCategory = (id: string) => setSelectedBuyCategoryIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

    const handleSubmit = async (formData: FormData) => {
        setLoading(true)
        try {
            const data = {
                name: formData.get('name') as string,
                description: formData.get('description') as string || undefined,
                buy_type: buyType,
                pricing_mode: pricingMode,
                buy_quantity: 2,
                get_type: 'cheapest_free',
                get_product_id: formData.get('get_product_id') as string || undefined,
                get_variant_id: formData.get('get_variant_id') as string || undefined,
                get_discount_type: 'free',
                get_discount_value: 100,
                apply_to: 'all',
                buy_product_ids: buyType === 'specific_products' ? selectedBuyProductIds : undefined,
                buy_category_ids: buyType === 'specific_categories' ? selectedBuyCategoryIds : undefined,
                buy_brands: buyType === 'specific_brands' ? selectedBrands : undefined,
                usage_limit: Number(formData.get('usage_limit')) || undefined,
                once_per_user: formData.get('once_per_user') === 'on',
                max_per_order: undefined,
                starts_at: fromStoreDateTime(String(formData.get('starts_at') || '')) || new Date().toISOString(),
                expires_at: fromStoreDateTime(String(formData.get('expires_at') || '')),
                is_active: formData.get('is_active') === 'on',
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
                    <input name="buy_quantity" type="number" readOnly value={2}
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
                    <div className="space-y-2">
                        <input aria-label="Search brands" value={brandSearch} onChange={e => setBrandSearch(e.target.value)}
                            className="w-full h-10 px-4 text-sm bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-slate-900 outline-none"
                            placeholder="Search brands..." />
                        <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1">
                            {brands.filter(brand => brand.toLowerCase().includes(brandSearch.toLowerCase())).map(brand => (
                                <label key={brand} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50 cursor-pointer">
                                    <input type="checkbox" checked={selectedBrands.includes(brand)}
                                        onChange={() => setSelectedBrands(prev => prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand])}
                                        className="h-4 w-4 accent-pink-600" />
                                    {brand}
                                </label>
                            ))}
                        </div>
                        <p className="text-xs text-slate-500">{selectedBrands.length} selected. Any 3 units across these brands qualify together.</p>
                    </div>
                )}
            </div>

            <fieldset className="space-y-3">
                <legend className="text-xs font-bold text-slate-500 uppercase tracking-wider">Existing discounts</legend>
                {[
                    { value: 'replace_discounts', label: 'Replace existing discounts', description: 'Offer units use original prices. The cheapest original-price unit is free for every 3. Extra units keep their normal discounts. Applies even when the normal discount would be cheaper.' },
                    { value: 'combine_discounts', label: 'Combine with existing discounts', description: 'Keep current selling prices, including active sale prices. The cheapest selling-price unit is free for every 3.' },
                ].map(option => (
                    <label key={option.value} className={`flex gap-3 rounded-xl border p-4 cursor-pointer ${pricingMode === option.value ? 'border-pink-300 bg-pink-50' : 'border-slate-200 bg-white'}`}>
                        <input type="radio" name="pricing_mode" value={option.value} checked={pricingMode === option.value}
                            onChange={() => setPricingMode(option.value)} className="mt-1 h-4 w-4 shrink-0 accent-pink-600" />
                        <span><span className="block text-sm font-semibold text-slate-900">{option.label}</span>
                            <span className="block mt-1 text-xs leading-relaxed text-slate-500">{option.description}</span></span>
                    </label>
                ))}
            </fieldset>

            <div className="rounded-xl border border-pink-100 bg-pink-50 p-4 text-sm text-slate-700">
                Mix any eligible products, including repeated units of the same product. Add 3 for 1 free, 6 for the 2 cheapest free, or 9 for the 3 cheapest free. Each unit counts towards one BXGY offer. Coupons cannot be combined with this offer.
            </div>

            {/* Limits */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Usage Limit</label>
                    <input name="usage_limit" type="number" min={0} defaultValue={initialData?.usage_limit}
                        className="w-full h-12 px-4 text-sm bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-slate-900 transition-all outline-none"
                        placeholder="∞" />
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
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Start Date (IST)</label>
                    <input name="starts_at" type="datetime-local" defaultValue={toStoreDateTime(initialData?.starts_at)}
                        className="w-full h-12 px-4 text-sm bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-slate-900 transition-all outline-none" />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Expiry Date (IST)</label>
                    <input name="expires_at" type="datetime-local" defaultValue={toStoreDateTime(initialData?.expires_at)}
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
