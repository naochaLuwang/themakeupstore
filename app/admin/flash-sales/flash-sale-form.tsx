"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { createFlashSale, updateFlashSale } from "@/app/actions/flash-sales"
import { toast } from "sonner"
import { Search, Loader2, Zap, Check, ChevronDown } from "lucide-react"
import { useDebouncedCallback } from "use-debounce"

interface FlashSaleFormProps {
  initialData?: any
  isEdit?: boolean
  categories?: { id: string; name: string }[]
}

const SCOPES = [
  { value: 'product', label: 'Specific Product' },
  { value: 'category', label: 'Entire Category' },
  { value: 'brand', label: 'Entire Brand' },
  { value: 'all', label: 'All Products' },
] as const

export function FlashSaleForm({ initialData, isEdit = false, categories = [] }: FlashSaleFormProps) {
  const router = useRouter()

  const [scope, setScope] = useState<string>(initialData?.scope || 'product')
  const [productId, setProductId] = useState(initialData?.product_id || "")
  const [productName, setProductName] = useState(initialData?.products?.name || "")
  const [categoryId, setCategoryId] = useState(initialData?.category_id || "")
  const [brand, setBrand] = useState(initialData?.brand || "")
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">(initialData?.discount_type || "percentage")
  const [discountValue, setDiscountValue] = useState(initialData?.discount_value || "")
  const [label, setLabel] = useState(initialData?.label || "")
  const [startsAt, setStartsAt] = useState(initialData?.starts_at ? new Date(initialData.starts_at).toISOString().slice(0, 16) : "")
  const [endsAt, setEndsAt] = useState(initialData?.ends_at ? new Date(initialData.ends_at).toISOString().slice(0, 16) : "")

  const [searchQuery, setSearchQuery] = useState(initialData?.products?.name || "")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [brandSearch, setBrandSearch] = useState(initialData?.brand || "")
  const [brandResults, setBrandResults] = useState<string[]>([])
  const [brandOpen, setBrandOpen] = useState(false)
  const [brandSearching, setBrandSearching] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const searchRef = useRef<HTMLDivElement>(null)
  const brandRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false)
      if (brandRef.current && !brandRef.current.contains(e.target as Node)) setBrandOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSearch = useDebouncedCallback(async (term: string) => {
    if (!term.trim()) { setSearchResults([]); setSearchOpen(false); return }
    setSearching(true)
    const { data } = await supabase.from('products').select('id, name, thumbnail_url').ilike('name', `%${term}%`).order('name').limit(10)
    setSearchResults(data || [])
    setSearchOpen(true)
    setSearching(false)
  }, 300)

  const handleBrandSearch = useDebouncedCallback(async (term: string) => {
    if (!term.trim()) { setBrandResults([]); setBrandOpen(false); return }
    setBrandSearching(true)
    const { data } = await supabase.from('products').select('brand').not('brand', 'is', null).ilike('brand', `%${term}%`).order('brand').limit(10)
    const unique = [...new Set((data || []).map((r: any) => r.brand).filter(Boolean))]
    setBrandResults(unique as string[])
    setBrandOpen(true)
    setBrandSearching(false)
  }, 300)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!discountValue || !startsAt || !endsAt) {
      toast.error("Fill in all required fields")
      return
    }
    if (scope === 'product' && !productId) { toast.error("Select a product"); return }
    if (scope === 'category' && !categoryId) { toast.error("Select a category"); return }
    if (scope === 'brand' && !brand.trim()) { toast.error("Enter a brand"); return }
    if (new Date(endsAt) <= new Date(startsAt)) { toast.error("End time must be after start time"); return }

    setIsPending(true)
    const formData = new FormData()
    const payload: any = {
      scope,
      discount_type: discountType,
      discount_value: Number(discountValue),
      starts_at: new Date(startsAt).toISOString(),
      ends_at: new Date(endsAt).toISOString(),
      label,
    }
    if (scope === 'product') payload.product_id = productId
    if (scope === 'category') payload.category_id = categoryId
    if (scope === 'brand') payload.brand = brand.trim()
    if (isEdit) payload.is_active = initialData.is_active

    formData.append("payload", JSON.stringify(payload))
    const res = isEdit ? await updateFlashSale(initialData.id, formData) : await createFlashSale(formData)

    if (res.success) {
      toast.success(isEdit ? "Flash sale updated" : "Flash sale created")
      router.push("/admin/flash-sales")
      router.refresh()
    } else {
      toast.error(res.error || "Something went wrong")
    }
    setIsPending(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-2xl border bg-white p-6 md:p-8 shadow-sm space-y-6">
        {/* Scope Selector */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-900">Applies To</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
            {SCOPES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setScope(s.value)}
                className={`h-10 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all ${
                  scope === s.value
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-200'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Product Search (scope=product) */}
        {scope === 'product' && (
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-900">Product</label>
            <div ref={searchRef} className="relative mt-2">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search product..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); handleSearch(e.target.value) }}
                onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
                className="w-full h-11 pl-9 pr-4 rounded-xl bg-slate-50 border-none font-bold text-slate-900 text-sm outline-none focus:ring-2 focus:ring-rose-500/20"
              />
              {searchOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                  {searching ? (
                    <div className="p-4 text-center text-slate-400"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-sm">No products found</div>
                  ) : (
                    searchResults.map((p: any) => (
                      <button key={p.id} type="button" onClick={() => { setProductId(p.id); setProductName(p.name); setSearchQuery(p.name); setSearchOpen(false) }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left">
                        {p.thumbnail_url ? <img src={p.thumbnail_url} className="w-8 h-8 rounded-lg object-cover border border-slate-100" /> : <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center"><Zap className="w-3 h-3 text-slate-400" /></div>}
                        <span className="text-sm font-semibold text-slate-900">{p.name}</span>
                        {p.id === productId && <Check className="w-4 h-4 text-emerald-500 ml-auto" />}
                      </button>
                    ))
                  )}
                </div>
              )}
              {productName && !searchOpen && (
                <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-rose-50/40 rounded-xl">
                  <Zap className="w-4 h-4 text-rose-500" />
                  <span className="text-sm font-semibold text-slate-900">{productName}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Category Select (scope=category) */}
        {scope === 'category' && (
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-900">Category</label>
            <div className="relative mt-2">
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-slate-50 border-none font-bold text-slate-900 text-sm outline-none focus:ring-2 focus:ring-rose-500/20 appearance-none cursor-pointer"
              >
                <option value="">Select a category...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Brand Input (scope=brand) */}
        {scope === 'brand' && (
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-900">Brand</label>
            <div ref={brandRef} className="relative mt-2">
              <input
                type="text"
                placeholder="Search or type brand name..."
                value={brandSearch}
                onChange={(e) => { setBrandSearch(e.target.value); setBrand(e.target.value); handleBrandSearch(e.target.value) }}
                onFocus={() => brandResults.length > 0 && setBrandOpen(true)}
                className="w-full h-11 px-4 rounded-xl bg-slate-50 border-none font-bold text-slate-900 text-sm outline-none focus:ring-2 focus:ring-rose-500/20"
              />
              {brandOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-40 overflow-y-auto">
                  {brandSearching ? (
                    <div className="p-4 text-center text-slate-400"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></div>
                  ) : brandResults.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-sm">No brands found</div>
                  ) : (
                    brandResults.map((b) => (
                      <button key={b} type="button" onClick={() => { setBrand(b); setBrandSearch(b); setBrandOpen(false) }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left">
                        <span className="text-sm font-semibold text-slate-900">{b}</span>
                        {b === brand && <Check className="w-4 h-4 text-emerald-500 ml-auto" />}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* All Store info */}
        {scope === 'all' && (
          <div className="p-4 bg-amber-50/40 rounded-xl border border-amber-100">
            <p className="text-sm font-semibold text-amber-700">This flash sale will apply to every product in the store.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-900">Discount Type</label>
            <div className="flex gap-3 mt-2">
              {(["percentage", "fixed"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setDiscountType(t)}
                  className={`flex-1 h-11 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${discountType === t ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                >
                  {t === 'percentage' ? '% Off' : '₹ Fixed'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-900">Discount Value</label>
            <div className="relative mt-2">
              <span className="absolute left-3 top-3 text-slate-400 font-bold text-sm">{discountType === 'percentage' ? '%' : '₹'}</span>
              <input type="number" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} min="0" max={discountType === 'percentage' ? 100 : undefined} className="w-full h-11 pl-8 pr-4 rounded-xl bg-slate-50 border-none font-bold text-slate-900 text-sm outline-none focus:ring-2 focus:ring-rose-500/20" required />
            </div>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-900">Label <span className="text-slate-300 font-normal normal-case tracking-normal">(optional — e.g. &quot;Weekend Blast&quot;)</span></label>
          <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Weekend Blast" className="w-full h-11 px-4 mt-2 rounded-xl bg-slate-50 border-none font-bold text-slate-900 text-sm outline-none focus:ring-2 focus:ring-rose-500/20" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-900">Starts At</label>
            <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="w-full h-11 px-4 mt-2 rounded-xl bg-slate-50 border-none font-bold text-slate-900 text-sm outline-none focus:ring-2 focus:ring-rose-500/20" required />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-900">Ends At</label>
            <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="w-full h-11 px-4 mt-2 rounded-xl bg-slate-50 border-none font-bold text-slate-900 text-sm outline-none focus:ring-2 focus:ring-rose-500/20" required />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={() => router.back()} className="rounded-xl h-11 px-6 border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
        <button type="submit" disabled={isPending} className="rounded-xl h-11 px-8 bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors inline-flex items-center gap-2 disabled:opacity-50">
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isEdit ? 'Update Flash Sale' : 'Create Flash Sale'}
        </button>
      </div>
    </form>
  )
}
