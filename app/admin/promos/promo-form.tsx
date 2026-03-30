"use client"
import { useState, useMemo } from "react"
import { createPromoCode, updatePromoCode } from "@/app/actions/promo"
import { 
    Search, 
    Check, 
    Loader2, 
    Calendar, 
    Hash, 
    IndianRupee, 
    Tag, 
    Target, 
    Zap, 
    UserCheck,
    Clock,
    Percent,
    AlertCircle,
    ArrowRight
} from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

interface PromoFormProps {
    products: any[];
    categories: any[];
    initialData?: any;
    initialSelectedIds?: string[];
}

export function PromoForm({ products, categories, initialData, initialSelectedIds = [] }: PromoFormProps) {
    const router = useRouter()
    const isEdit = !!initialData

    // State management
    const [applyTo, setApplyTo] = useState(initialData?.apply_to || 'all')
    const [discountType, setDiscountType] = useState(initialData?.discount_type || 'percentage')
    const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds)
    const [searchQuery, setSearchQuery] = useState('')
    const [loading, setLoading] = useState(false)

    const filteredItems = useMemo(() => {
        const list = applyTo === 'specific_products' ? products : categories
        const search = searchQuery.toLowerCase()
        return list.filter(item => (item.name || item.title || "").toLowerCase().includes(search)).slice(0, 20)
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
            className="max-w-5xl mx-auto space-y-8 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-700"
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
                        toast.success(isEdit ? "Offer credentials updated" : "New offer rule deployed")
                        router.push('/admin/promos')
                        router.refresh()
                    } else {
                        toast.error(res.message || "Protocol failure: check credentials")
                    }
                } catch (err: any) {
                    toast.error("System error: connection interrupted")
                } finally {
                    setLoading(false)
                }
            }}
        >
            <div className="grid grid-cols-12 gap-8">
                {/* LEFT COLUMN: PRIMARY CONFIG */}
                <div className="col-span-12 lg:col-span-8 space-y-8">
                    
                    {/* CARD 1: IDENTITY */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 rounded-lg">
                                    <Tag className="w-4 h-4 text-indigo-600" />
                                </div>
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900">Promo Identity</h3>
                            </div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Configuration Phase 01</div>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Promo Code</label>
                                <input
                                    name="code"
                                    required
                                    defaultValue={initialData?.code}
                                    placeholder="E.G. SUMMER2024"
                                    className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-5 text-sm font-black uppercase tracking-[0.2em] focus:bg-white focus:border-slate-900 transition-all outline-none shadow-inner"
                                />
                                <p className="text-[9px] text-slate-400 font-medium ml-1">Customers will enter this code at checkout.</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Promotional Description</label>
                                <textarea
                                    name="description"
                                    required
                                    rows={3}
                                    defaultValue={initialData?.description}
                                    placeholder="Summarize the offer for internal tracking or marketing banners..."
                                    className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-5 text-sm font-medium focus:bg-white focus:border-slate-900 transition-all resize-none outline-none shadow-inner"
                                />
                            </div>
                        </div>
                    </div>

                    {/* CARD 2: CONSTRAINTS & LIMITS */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-50 rounded-lg">
                                    <Zap className="w-4 h-4 text-amber-600" />
                                </div>
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900">Rules & Constraints</h3>
                            </div>
                        </div>
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 font-sans">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <Clock className="w-3 h-3 text-slate-400" /> Start Schedule
                                </label>
                                <input
                                    name="starts_at"
                                    type="datetime-local"
                                    required
                                    defaultValue={formatDateTime(initialData?.starts_at || new Date().toISOString())}
                                    className="w-full bg-slate-50 border-2 border-transparent rounded-xl p-4 text-xs font-bold outline-none focus:bg-white focus:border-slate-900 transition-all shadow-inner"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <Calendar className="w-3 h-3 text-slate-400" /> End Schedule (Expiry)
                                </label>
                                <input
                                    name="expires_at"
                                    type="datetime-local"
                                    defaultValue={formatDateTime(initialData?.expires_at)}
                                    className="w-full bg-slate-50 border-2 border-transparent rounded-xl p-4 text-xs font-bold outline-none focus:bg-white focus:border-slate-900 transition-all shadow-inner"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <Hash className="w-3 h-3 text-slate-400" /> Global Usage Limit
                                </label>
                                <input
                                    name="usage_limit"
                                    type="number"
                                    defaultValue={initialData?.usage_limit}
                                    placeholder="Unlimited"
                                    className="w-full bg-slate-50 border-2 border-transparent rounded-xl p-4 text-xs font-bold outline-none focus:bg-white focus:border-slate-900 transition-all shadow-inner"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <IndianRupee className="w-3 h-3 text-slate-400" /> Min. Order Amount
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                                    <input
                                        name="min_order_amount"
                                        type="number"
                                        defaultValue={initialData?.min_order_amount || 0}
                                        className="w-full bg-slate-50 border-2 border-transparent rounded-xl pl-8 p-4 text-xs font-bold outline-none focus:bg-white focus:border-slate-900 transition-all shadow-inner"
                                    />
                                </div>
                            </div>
                            <div className="md:col-span-2 flex items-center justify-between p-4 bg-slate-50/50 border border-slate-100 rounded-2xl">
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-black uppercase text-slate-900 tracking-wider">Per-Customer Restriction</p>
                                    <p className="text-[9px] text-slate-400 font-medium">Limit redemptions to once per unique user account.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="once_per_user_check"
                                        defaultChecked={initialData?.once_per_user}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* CARD 3: TARGETING */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-50 rounded-lg">
                                    <Target className="w-4 h-4 text-emerald-600" />
                                </div>
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900">Target Audience & Scope</h3>
                            </div>
                        </div>
                        <div className="p-8 space-y-8">
                            <div className="flex flex-wrap gap-3">
                                {[
                                    { id: 'all', label: 'Storewide', icon: Zap },
                                    { id: 'specific_products', label: 'Selected Products', icon: Tag },
                                    { id: 'specific_categories', label: 'Selected Categories', icon: Hash }
                                ].map((tab) => {
                                    const Icon = tab.icon
                                    return (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => { setApplyTo(tab.id); setSelectedIds([]); }}
                                            className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${applyTo === tab.id ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                                        >
                                            <Icon className="w-3.5 h-3.5" />
                                            {tab.label}
                                        </button>
                                    )
                                })}
                            </div>

                            {applyTo !== 'all' && (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                        <input
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder={`SEARCH ENTITIES IN ${applyTo.replace('specific_', '').toUpperCase()}...`}
                                            className="w-full bg-slate-50 border-none rounded-2xl pl-12 py-4 text-[10px] font-bold uppercase tracking-widest outline-none focus:ring-2 ring-slate-100 transition-all"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {filteredItems.map(item => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => toggleId(item.id)}
                                                className={`flex justify-between items-center p-4 rounded-2xl border-2 transition-all ${selectedIds.includes(item.id) ? 'bg-indigo-50/50 border-indigo-600 text-indigo-900' : 'bg-white border-slate-50 text-slate-500 hover:border-slate-200'}`}
                                            >
                                                <span className="text-[10px] font-black uppercase tracking-tight truncate pr-4">{item.name || item.title}</span>
                                                {selectedIds.includes(item.id) ? <Check className="w-3.5 h-3.5 text-indigo-600" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-100" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: VALUE & SUBMIT */}
                <div className="col-span-12 lg:col-span-4 space-y-8">
                    {/* VALUE PANEL */}
                    <div className="bg-white rounded-3xl border border-slate-900 shadow-2xl shadow-indigo-500/10 overflow-hidden sticky top-24">
                        <div className="p-8 bg-slate-900 text-white space-y-8">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Discount Logic</h3>
                                <Zap className="w-4 h-4 text-amber-400" />
                            </div>
                            
                            <div className="space-y-4">
                                <div className="flex p-1 bg-slate-800 rounded-2xl">
                                    <button
                                        type="button"
                                        onClick={() => setDiscountType('percentage')}
                                        className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-xl transition-all ${discountType === 'percentage' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        <Percent className="w-5 h-5" />
                                        <span className="text-[9px] font-black uppercase">Percentage</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDiscountType('fixed')}
                                        className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-xl transition-all ${discountType === 'fixed' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        <IndianRupee className="w-5 h-5" />
                                        <span className="text-[9px] font-black uppercase">Fixed Flat</span>
                                    </button>
                                </div>

                                <div className="relative group">
                                    <input
                                        name="discount_value"
                                        type="number"
                                        required
                                        defaultValue={initialData?.discount_value}
                                        placeholder="0.00"
                                        className="w-full bg-slate-800 border-none rounded-2xl p-6 text-2xl font-black text-center focus:ring-2 ring-indigo-500/50 transition-all outline-none"
                                    />
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-end opacity-40 group-focus-within:opacity-100 transition-opacity">
                                        <span className="text-[10px] font-black uppercase text-indigo-400">{discountType === 'percentage' ? 'Percent' : 'INR Rupee'}</span>
                                        <span className="text-xl font-black">{discountType === 'percentage' ? '%' : '₹'}</span>
                                    </div>
                                </div>

                                <div className="space-y-1.5 pt-4 border-t border-slate-800">
                                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">Maximum Saving Cap</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">₹</span>
                                        <input
                                            name="max_discount_amount"
                                            type="number"
                                            defaultValue={initialData?.max_discount_amount}
                                            placeholder="None (Unlimited)"
                                            className="w-full bg-slate-800 border-none rounded-xl pl-8 p-4 text-xs font-bold focus:ring-1 ring-slate-700 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="flex items-start gap-3 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                                <AlertCircle className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                                <p className="text-[9px] font-medium text-slate-500 leading-relaxed uppercase tracking-wider">
                                    Changes take effect immediately upon deployment. Once saved, these rules cannot be automatically reverted.
                                </p>
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full h-16 bg-slate-900 text-white rounded-2xl shadow-xl shadow-slate-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all transform flex items-center justify-center gap-4 group"
                            >
                                <span className="text-[11px] font-black uppercase tracking-[0.2em]">
                                    {loading ? 'Processing Protocol...' : isEdit ? 'Update Offer Node' : 'Deploy offer system'}
                                </span>
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    )
}