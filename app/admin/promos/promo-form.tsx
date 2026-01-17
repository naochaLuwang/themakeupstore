"use client"
import { useState, useMemo } from "react"
import { createPromoCode } from "@/app/actions/promo"
import { Search, Check, Loader2, Calendar, Hash, IndianRupee, Tag, Target, Zap } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function PromoForm({ products, categories }: { products: any[], categories: any[] }) {
    const router = useRouter()
    const [applyTo, setApplyTo] = useState('all')
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [loading, setLoading] = useState(false)

    const filteredItems = useMemo(() => {
        const list = applyTo === 'specific_products' ? products : categories
        const search = searchQuery.toLowerCase()
        return list.filter(item => item.name.toLowerCase().includes(search)).slice(0, 10)
    }, [applyTo, searchQuery, products, categories])

    const toggleId = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
    }

    return (
        <form
            id="promo-form"
            className="max-w-4xl mx-auto space-y-8 pb-20"
            action={async (formData) => {
                setLoading(true)
                try {
                    // Ensure state-managed values are attached
                    formData.set('apply_to', applyTo)
                    formData.set('selected_ids', selectedIds.join(','))

                    const res = await createPromoCode(formData)

                    if (res.success) {
                        toast.success("Promo code created successfully")
                        // Reset local state
                        setSelectedIds([])
                        setSearchQuery('')
                        // Redirect to list page
                        router.push('/admin/promos')
                        router.refresh()
                    } else {
                        toast.error(res.message || "Failed to save")
                    }
                } catch (err: any) {
                    toast.error("A server error occurred")
                } finally {
                    setLoading(false)
                }
            }}
        >
            {/* HIDDEN INPUTS TO ENSURE DATA IS CAPTURED */}
            <input type="hidden" name="apply_to" value={applyTo} />
            <input type="hidden" name="selected_ids" value={selectedIds.join(',')} />

            {/* SECTION 1: IDENTITY & VALUE */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Tag className="w-4 h-4 text-slate-400" />
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Identity</h3>
                        </div>
                        <input
                            name="code"
                            required
                            placeholder="OFFER CODE (E.G. FESTIVE50)"
                            className="w-full bg-slate-50 border-none rounded-xl p-4 text-xs font-bold uppercase tracking-widest focus:ring-2 ring-slate-900 transition-all outline-none"
                        />
                        <textarea
                            name="description"
                            required
                            rows={2}
                            placeholder="Marketing description..."
                            className="w-full bg-slate-50 border-none rounded-xl p-4 text-xs font-medium focus:ring-2 ring-slate-900 transition-all resize-none outline-none"
                        />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-4 h-4 text-slate-400" />
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Value</h3>
                    </div>
                    <select
                        name="discount_type"
                        className="w-full bg-slate-50 border-none rounded-xl p-4 text-[10px] font-bold uppercase outline-none focus:ring-2 ring-slate-900"
                    >
                        <option value="percentage">Percentage %</option>
                        <option value="fixed">Fixed INR ₹</option>
                    </select>
                    <input
                        name="discount_value"
                        type="number"
                        required
                        placeholder="Amount"
                        className="w-full bg-slate-50 border-none rounded-xl p-4 text-xs font-bold focus:ring-2 ring-slate-900 outline-none"
                    />
                </div>
            </div>

            {/* SECTION 2: CONSTRAINTS GRID */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y md:divide-y-0 md:divide-x divide-slate-100 grid grid-cols-1 md:grid-cols-3">
                <div className="p-6 space-y-3">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                        <Calendar className="w-3 h-3" /> Expiry Date
                    </label>
                    <input
                        name="expires_at"
                        type="datetime-local"
                        className="w-full bg-slate-50 rounded-lg p-3 text-[10px] font-bold outline-none border-none focus:ring-1 ring-slate-900"
                    />
                </div>
                <div className="p-6 space-y-3">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                        <Hash className="w-3 h-3" /> Total Usage Limit
                    </label>
                    <input
                        name="usage_limit"
                        type="number"
                        placeholder="∞"
                        className="w-full bg-slate-50 rounded-lg p-3 text-[10px] font-bold outline-none border-none focus:ring-1 ring-slate-900"
                    />
                </div>
                <div className="p-6 space-y-3">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                        <IndianRupee className="w-3 h-3" /> Max Discount
                    </label>
                    <input
                        name="max_discount_amount"
                        type="number"
                        placeholder="No cap"
                        className="w-full bg-slate-50 rounded-lg p-3 text-[10px] font-bold outline-none border-none focus:ring-1 ring-slate-900"
                    />
                </div>
            </div>

            {/* SECTION 3: TARGETING (THE SCOPE) */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-slate-400" />
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Scope & Targeting</h3>
                    </div>
                    <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                        {['all', 'specific_products', 'specific_categories'].map((type) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => { setApplyTo(type); setSelectedIds([]); }}
                                className={`px-4 py-2 text-[9px] font-black uppercase tracking-tighter rounded-lg transition-all ${applyTo === type ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {type.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                {applyTo !== 'all' && (
                    <div className="space-y-4 pt-4 border-t border-slate-50 animate-in fade-in duration-500">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={`SEARCH ${applyTo === 'specific_products' ? 'PRODUCTS' : 'CATEGORIES'}...`}
                                className="w-full bg-slate-50 border-none rounded-xl pl-12 py-4 text-[10px] font-bold uppercase outline-none"
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                            {filteredItems.map(item => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => toggleId(item.id)}
                                    className={`flex justify-between items-center p-4 rounded-xl border transition-all ${selectedIds.includes(item.id) ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300'}`}
                                >
                                    <span className="text-[10px] font-bold uppercase truncate pr-4">{item.name}</span>
                                    {selectedIds.includes(item.id) ? <Check className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-slate-200" />}
                                </button>
                            ))}
                        </div>
                        <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                            {selectedIds.length} items selected
                        </div>
                    </div>
                )}

                <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                    <div>
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-2">Min. Order Requirement</label>
                        <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-1">
                            <span className="text-xs font-bold text-slate-400">₹</span>
                            <input
                                name="min_order_amount"
                                type="number"
                                defaultValue={0}
                                className="bg-transparent border-none p-2 text-xs font-bold outline-none w-24"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-slate-900 text-white px-10 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Promo Code"}
                    </button>
                </div>
            </div>
        </form>
    )
}