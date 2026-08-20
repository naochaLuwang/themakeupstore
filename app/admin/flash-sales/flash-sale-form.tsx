"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { createFlashSale, updateFlashSale } from "@/app/actions/flash-sales"
import { toast } from "sonner"
import { Search, Loader2, Zap, Check, ChevronDown, Calendar, Clock, Trash2, Eye, Shield, Sparkles, X } from "lucide-react"
import { useDebouncedCallback } from "use-debounce"

interface FlashSaleFormProps {
  initialData?: any
  isEdit?: boolean
  categories?: { id: string; name: string }[]
}

const SCOPES = [
  { value: 'product', label: 'Specific Product', description: 'One product or variant', icon: Zap },
  { value: 'category', label: 'Entire Category', description: 'All products in a category', icon: Shield },
  { value: 'brand', label: 'Entire Brand', description: 'All products from a brand', icon: Sparkles },
  { value: 'all', label: 'All Products', description: 'Store-wide flash sale', icon: Calendar },
] as const

export function FlashSaleForm({ initialData, isEdit = false, categories = [] }: FlashSaleFormProps) {
  const router = useRouter()
  const supabase = createClient()

  const [scope, setScope] = useState<string>(initialData?.scope || 'product')
  const [productId, setProductId] = useState(initialData?.product_id || "")
  const [productName, setProductName] = useState(initialData?.products?.name || "")
  const [productVariantId, setProductVariantId] = useState(initialData?.variant_id || "")
  const [productVariantName, setProductVariantName] = useState(initialData?.variant_title || "")
  const [categoryId, setCategoryId] = useState(initialData?.category_id || "")
  const [categoryName, setCategoryName] = useState(initialData?.categories?.name || "")
  const [brand, setBrand] = useState(initialData?.brand || "")
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">(initialData?.discount_type || "percentage")
  const [discountValue, setDiscountValue] = useState(initialData?.discount_value || "")
  const [label, setLabel] = useState(initialData?.label || "")
  const [startsAt, setStartsAt] = useState(initialData?.starts_at ? new Date(initialData.starts_at).toISOString().slice(0, 16) : "")
  const [endsAt, setEndsAt] = useState(initialData?.ends_at ? new Date(initialData.ends_at).toISOString().slice(0, 16) : "")
  const [isPending, setIsPending] = useState(false)

  // Search states
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [brandSearch, setBrandSearch] = useState("")
  const [brandResults, setBrandResults] = useState<string[]>([])
  const [brandOpen, setBrandOpen] = useState(false)
  const [brandSearching, setBrandSearching] = useState(false)
  const [variantOpen, setVariantOpen] = useState(false)
  const [variants, setVariants] = useState<any[]>([])

  const searchRef = useRef<HTMLDivElement>(null)
  const brandRef = useRef<HTMLDivElement>(null)

  // Initialize search query from existing data
  useEffect(() => {
    if (initialData?.products?.name) {
      setSearchQuery(initialData.products.name)
    }
    if (initialData?.brand) {
      setBrandSearch(initialData.brand)
    }
  }, [initialData])

  // Fetch variants when product is selected
  useEffect(() => {
    if (productId) {
      supabase.from('product_variants').select('id, title, price, stock').eq('product_id', productId).order('price').then(({ data }: { data: any[] | null }) => {
        setVariants(data || [])
        if (data && data.length > 0 && !productVariantId) {
          // Don't auto-select variant, let user choose
        }
      })
    } else {
      setVariants([])
      setProductVariantId("")
      setProductVariantName("")
    }
  }, [productId, supabase])

  // Click outside to close dropdowns
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
    const { data } = await supabase.from('products').select('brand').ilike('brand', `%${term}%`).order('brand')
    const uniqueBrands = [...new Set((data as { brand: string }[] || []).map(p => p.brand).filter(Boolean))]
    setBrandResults(uniqueBrands)
    setBrandOpen(true)
    setBrandSearching(false)
  }, 300)

  const selectProduct = (p: any) => {
    setProductId(p.id)
    setProductName(p.name)
    setSearchQuery(p.name)
    setSearchOpen(false)
  }

  const selectBrand = (b: string) => {
    setBrand(b)
    setBrandSearch(b)
    setBrandOpen(false)
  }

  const selectVariant = (v: any) => {
    setProductVariantId(v.id)
    setProductVariantName(v.title)
    setVariantOpen(false)
  }

  const clearProduct = () => {
    setProductId("")
    setProductName("")
    setSearchQuery("")
    setProductVariantId("")
    setProductVariantName("")
  }

  const clearCategory = () => {
    setCategoryId("")
    setCategoryName("")
  }

  const clearBrand = () => {
    setBrand("")
    setBrandSearch("")
  }

  const validate = () => {
    const start = new Date(startsAt)
    const end = new Date(endsAt)
    
    if (!startsAt || !endsAt) return "Start and end times are required"
    if (end <= start) return "End time must be after start time"
    if (isNaN(Number(discountValue)) || Number(discountValue) <= 0) return "Discount value must be positive"
    if (discountType === 'percentage' && Number(discountValue) > 100) return "Percentage discount cannot exceed 100%"
    if (scope === 'product' && !productId) return "Please select a product"
    if (scope === 'category' && !categoryId) return "Please select a category"
    if (scope === 'brand' && !brand) return "Please enter a brand name"
    return null
  }

  const getPreviewPrice = () => {
    if (!discountValue) return null
    const base = 1999 // Example base price
    if (discountType === 'percentage') {
      return Math.round(base * (1 - Number(discountValue) / 100))
    }
    return Math.max(0, base - Number(discountValue))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const error = validate()
    if (error) {
      toast.error(error)
      return
    }

    // Confirm before creating/updating
    if (!confirm(isEdit ? "Update this flash sale?" : "Create this flash sale?")) return

    setIsPending(true)
    try {
      const payload = {
        scope,
        product_id: scope === 'product' ? productId : undefined,
        variant_id: scope === 'product' ? productVariantId || undefined : undefined,
        category_id: scope === 'category' ? categoryId : undefined,
        brand: scope === 'brand' ? brand : undefined,
        discount_type: discountType,
        discount_value: Number(discountValue),
        label: label.trim() || undefined,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
      }

      const formData = new FormData()
      formData.append("payload", JSON.stringify(payload))

      const result = isEdit && initialData?.id
        ? await updateFlashSale(initialData.id, formData)
        : await createFlashSale(formData)

      if (!result.success) {
        toast.error(result.error || "Failed to save")
        return
      }

      toast.success(isEdit ? "Flash sale updated" : "Flash sale created")
      router.push("/admin/flash-sales")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Something went wrong")
    } finally {
      setIsPending(false)
    }
  }

  const getScopeConfig = () => SCOPES.find(s => s.value === scope)

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Scope Selector */}
      <div>
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-900">Scope</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
          {SCOPES.map((s) => {
            const Icon = s.icon
            return (
              <button
                type="button"
                key={s.value}
                onClick={() => setScope(s.value)}
                className={`relative h-24 md:h-28 rounded-xl border-2 transition-all p-4 flex flex-col items-center justify-center text-center ${
                  scope === s.value
                    ? 'border-rose-500 bg-rose-50 shadow-lg shadow-rose-100'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${
                  scope === s.value ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-400'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`font-bold text-[10px] uppercase tracking-wider ${scope === s.value ? 'text-rose-600' : 'text-slate-700'}`}>
                  {s.label}
                </span>
                <span className={`text-[9px] mt-1 ${scope === s.value ? 'text-rose-500' : 'text-slate-400'}`}>
                  {s.description}
                </span>
                {scope === s.value && (
                  <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-rose-500 text-white text-[9px] flex items-center justify-center">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Target Selection */}
      <div className="space-y-4">
        {/* Product Search */}
        {scope === 'product' && (
          <div ref={searchRef}>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5" />
              Product
            </label>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search product by name..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); handleSearch(e.target.value) }}
                onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
                className="w-full h-11 pl-9 pr-4 rounded-xl bg-slate-50 border-none font-bold text-slate-900 text-sm outline-none focus:ring-2 focus:ring-rose-500/20"
              />
              {productName && !searchOpen && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">{productName}</span>
                  <button type="button" onClick={clearProduct} className="text-slate-400 hover:text-slate-600 p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              {searchOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                  {searching ? (
                    <div className="p-4 text-center text-slate-400"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-sm">No products found</div>
                  ) : (
                    searchResults.map((p: any) => (
                      <button key={p.id} type="button" onClick={() => selectProduct(p)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left">
                        {p.thumbnail_url ? <img src={p.thumbnail_url} className="w-8 h-8 rounded-lg object-cover border border-slate-100" /> : <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center"><Zap className="w-3 h-3 text-slate-400" /></div>}
                        <span className="text-sm font-semibold text-slate-900">{p.name}</span>
                        {p.id === productId && <Check className="w-4 h-4 text-emerald-500 ml-auto" />}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            
            {/* Variant Selector */}
            {productId && variants.length > 0 && (
              <div className="mt-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  Variant (optional)
                </label>
                <button
                  type="button"
                  onClick={() => setVariantOpen(true)}
                  className="w-full h-11 px-4 mt-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm text-slate-900 outline-none focus:ring-2 focus:ring-rose-500/20 flex items-center justify-between"
                >
                  <span>{productVariantName || "Select variant (blank = all variants)"}</span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>
                {variantOpen && (
                  <div className="absolute z-50 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl w-full max-h-48 overflow-y-auto">
                    <button type="button" onClick={() => { setProductVariantId(""); setProductVariantName(""); setVariantOpen(false) }} className="w-full px-4 py-3 text-left hover:bg-slate-50">
                      <span className="text-sm font-semibold text-slate-900">All variants</span>
                      {!productVariantId && <Check className="w-4 h-4 text-emerald-500 ml-auto float-right" />}
                    </button>
                    {variants.map((v: any) => (
                      <button key={v.id} type="button" onClick={() => selectVariant(v)} className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center justify-between border-t border-slate-100">
                        <span className="text-sm text-slate-700">{v.title}</span>
                        <span className="text-sm font-semibold text-slate-900">₹{v.price}</span>
                        {v.id === productVariantId && <Check className="w-4 h-4 text-emerald-500 ml-2" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Category Search */}
        {scope === 'category' && (
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" />
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => {
                const cat = categories.find(c => c.id === e.target.value)
                setCategoryId(e.target.value)
                setCategoryName(cat?.name || "")
              }}
              className="w-full h-11 mt-2 px-4 rounded-xl bg-slate-50 border-none font-bold text-slate-900 text-sm outline-none focus:ring-2 focus:ring-rose-500/20"
              required
            >
              <option value="">Select a category</option>
              {categories?.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {categoryName && (
              <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-emerald-50/40 rounded-xl">
                <Shield className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-semibold text-slate-900">{categoryName}</span>
                <button type="button" onClick={clearCategory} className="ml-auto text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
            )}
          </div>
        )}

        {/* Brand Search */}
        {scope === 'brand' && (
          <div ref={brandRef}>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              Brand
            </label>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search brand..."
                value={brandSearch}
                onChange={(e) => { setBrandSearch(e.target.value); handleBrandSearch(e.target.value) }}
                onFocus={() => brandResults.length > 0 && setBrandOpen(true)}
                className="w-full h-11 pl-9 pr-4 rounded-xl bg-slate-50 border-none font-bold text-slate-900 text-sm outline-none focus:ring-2 focus:ring-rose-500/20"
              />
              {brand && !brandOpen && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">{brand}</span>
                  <button type="button" onClick={clearBrand} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-4 h-4" /></button>
                </div>
              )}
              {brandOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                  {brandSearching ? (
                    <div className="p-4 text-center text-slate-400"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></div>
                  ) : brandResults.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-sm">No brands found</div>
                  ) : (
                    brandResults.map((b: string) => (
                      <button key={b} type="button" onClick={() => selectBrand(b)} className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors">
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

        {/* All Products - no target needed */}
        {scope === 'all' && (
          <div className="p-6 bg-slate-50/50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Store-wide Flash Sale</p>
                <p className="text-sm text-slate-500 mt-0.5">All products in the store will receive this discount</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Discount Configuration */}
      <div className="space-y-6">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            Discount
          </label>
          <div className="flex gap-3 mt-2">
            {(['percentage', 'fixed'] as const).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setDiscountType(t)}
                className={`flex-1 h-12 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${discountType === t ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
              >
                {t === 'percentage' ? '% Off' : '₹ Fixed'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-900">Discount Value</label>
          <div className="relative mt-2">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
              {discountType === 'percentage' ? '%' : '₹'}
            </span>
            <input
              type="number"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              min="0"
              max={discountType === 'percentage' ? 100 : undefined}
              placeholder={discountType === 'percentage' ? "e.g. 25" : "e.g. 500"}
              className="w-full h-11 pl-8 pr-4 rounded-xl bg-slate-50 border-none font-bold text-slate-900 text-sm outline-none focus:ring-2 focus:ring-rose-500/20"
              required
            />
          </div>
        </div>
      </div>

      {/* Label */}
      <div>
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-900">Label <span className="text-slate-300 font-normal normal-case tracking-normal">(optional)</span></label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Weekend Blast, Summer Sale"
          className="w-full h-11 px-4 mt-2 rounded-xl bg-slate-50 border-none font-bold text-slate-900 text-sm outline-none focus:ring-2 focus:ring-rose-500/20"
        />
      </div>

      {/* Schedule */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" />
            Starts At
          </label>
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="w-full h-11 px-4 mt-2 rounded-xl bg-slate-50 border-none font-bold text-slate-900 text-sm outline-none focus:ring-2 focus:ring-rose-500/20"
            required
          />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            Ends At
          </label>
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className="w-full h-11 px-4 mt-2 rounded-xl bg-slate-50 border-none font-bold text-slate-900 text-sm outline-none focus:ring-2 focus:ring-rose-500/20"
            required
          />
        </div>
      </div>

      {/* Live Preview */}
      <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2 mb-3">
          <Eye className="w-4 h-4 text-slate-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Preview</span>
        </div>
        <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-slate-200">
          <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center">
            <Zap className="w-6 h-6 text-slate-400" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-slate-900 text-sm">
              {scope === 'product' ? (productName || "Selected Product") :
               scope === 'category' ? (categoryName ? `Category: ${categoryName}` : "Selected Category") :
               scope === 'brand' ? (brand ? `Brand: ${brand}` : "Selected Brand") :
               "All Products"}
            </p>
            {discountValue && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-rose-600 font-bold text-lg">
                  {getPreviewPrice() ? `₹${getPreviewPrice()}` : "—"}
                </span>
                <span className="text-slate-400 line-through text-sm">₹1,999</span>
                <span className="bg-rose-100 text-rose-600 px-2 py-0.5 rounded text-xs font-bold">
                  {discountType === 'percentage' ? `${discountValue}% OFF` : `₹${discountValue} OFF`}
                </span>
              </div>
            )}
          </div>
          <div className="text-right text-slate-500 text-xs">
            <p>{startsAt ? new Date(startsAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : "—"}</p>
            <p>→</p>
            <p>{endsAt ? new Date(endsAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : "—"}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
        <button type="button" onClick={() => router.back()} className="rounded-xl h-11 px-6 border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
        <button type="submit" disabled={isPending} className="rounded-xl h-11 px-8 bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors inline-flex items-center gap-2 disabled:opacity-50">
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isEdit ? 'Update Flash Sale' : 'Create Flash Sale'}
        </button>
      </div>
    </form>
  )
}