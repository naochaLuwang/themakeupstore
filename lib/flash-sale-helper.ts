export interface FlashTargets {
  product_ids: string[]
  variant_ids: { product_id: string; variant_id: string }[]
  category_ids: string[]
  brands: string[]
  exclude_product_ids: string[]
  exclude_variant_ids: string[]
  exclude_category_ids: string[]
  exclude_brands: string[]
}
export type FlashLifecycle = 'draft' | 'published' | 'paused' | 'ended'
export interface FlashSaleOverride {
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  label: string
  ends_at: string
  starts_at?: string
}
export interface FlashSaleRow {
  id?: string
  name?: string
  product_id: string | null
  category_id: string | null
  brand: string | null
  scope: string
  discount_type: string
  discount_value: number
  label: string
  starts_at: string
  ends_at: string
  is_active?: boolean
  lifecycle?: FlashLifecycle
  target_config?: FlashTargets | null
}
export const emptyFlashTargets = (): FlashTargets => ({ product_ids: [], variant_ids: [], category_ids: [], brands: [],
  exclude_product_ids: [], exclude_variant_ids: [], exclude_category_ids: [], exclude_brands: [] })
export function flashTargets(sale: Pick<FlashSaleRow, 'target_config' | 'product_id' | 'category_id' | 'brand'>): FlashTargets {
  const legacy = { ...emptyFlashTargets(), product_ids: sale.product_id ? [sale.product_id] : [],
    category_ids: sale.category_id ? [sale.category_id] : [], brands: sale.brand ? [sale.brand] : [] }
  return { ...legacy, ...(sale.target_config || {}) }
}
export function flashSaleMatchesTarget(sale: Pick<FlashSaleRow, 'scope' | 'product_id' | 'category_id' | 'brand' | 'target_config'>,
  productId: string, categoryIds: string[], brand: string | null, variantId?: string): boolean {
  const target = flashTargets(sale)
  if (target.exclude_product_ids.includes(productId) || target.exclude_brands.includes(brand || '') ||
    categoryIds.some(id => target.exclude_category_ids.includes(id)) || (variantId && target.exclude_variant_ids.includes(variantId))) return false
  return sale.scope === 'all' || (sale.scope === 'product' && (target.product_ids.includes(productId) ||
    target.variant_ids.some(v => v.product_id === productId && (!variantId || v.variant_id === variantId)))) ||
    (sale.scope === 'category' && categoryIds.some(id => target.category_ids.includes(id))) ||
    (sale.scope === 'brand' && target.brands.includes(brand || ''))
}
export function flashSaleStatus(sale: Pick<FlashSaleRow, 'is_active' | 'lifecycle' | 'starts_at' | 'ends_at'>, now = Date.now()) {
  if (sale.lifecycle === 'draft') return 'draft'
  if (sale.lifecycle === 'ended' || Date.parse(sale.ends_at) <= now) return 'ended'
  if (sale.lifecycle === 'paused' || sale.is_active === false) return 'paused'
  return Date.parse(sale.starts_at) > now ? 'scheduled' : 'live'
}
export function flashSaleMatchesProduct(sale: FlashSaleRow, productId: string, categoryIds: string[], brand: string | null, variantId?: string, now = Date.now()): boolean {
  return flashSaleStatus(sale, now) === 'live' && Number.isFinite(Date.parse(sale.starts_at)) && Number.isFinite(Date.parse(sale.ends_at)) &&
    flashSaleMatchesTarget(sale, productId, categoryIds, brand, variantId)
}
export function calculateDiscountedPrice(basePrice: number, discountType: string, discountValue: number): number {
  const base = Number.isFinite(Number(basePrice)) ? Math.max(0, Number(basePrice)) : 0
  const value = Number.isFinite(Number(discountValue)) ? Math.max(0, Number(discountValue)) : 0
  return Math.round(discountType === 'percentage' ? base * (1 - Math.min(value, 100) / 100)
    : (discountType === 'fixed' || discountType === 'amount') ? Math.max(0, base - value) : base)
}
export function applyFlashSaleToPrice(basePrice: number, flashSale: FlashSaleOverride | null, regularDiscountType: string, regularDiscountValue: number) {
  const regularPrice = calculateDiscountedPrice(basePrice, regularDiscountType, regularDiscountValue)
  const flashPrice = flashSale ? calculateDiscountedPrice(basePrice, flashSale.discount_type, flashSale.discount_value) : Infinity
  return flashSale && flashPrice < regularPrice
    ? { salePrice: flashPrice, discountType: flashSale.discount_type, discountValue: flashSale.discount_value, isFlashSale: true }
    : { salePrice: regularPrice, discountType: regularDiscountType, discountValue: regularDiscountValue, isFlashSale: false }
}
// Compare actual prices for this variant, not percentages with rupee amounts.
export function pickBestFlashSale(sales: FlashSaleRow[], productId: string, categoryIds: string[], brand: string | null,
  basePrice: number, variantId?: string, now = Date.now()): FlashSaleRow | null {
  const matching = sales.filter(s => flashSaleMatchesProduct(s, productId, categoryIds, brand, variantId, now))
  return matching.sort((a, b) => calculateDiscountedPrice(basePrice, a.discount_type, a.discount_value) - calculateDiscountedPrice(basePrice, b.discount_type, b.discount_value)
    || (a.id || '').localeCompare(b.id || ''))[0] || null
}
export interface PricingVariant { id: string; price: number; discount_type?: string | null; discount_value?: number | null }
export interface PricingProduct { id: string; brand?: string | null; category_id?: string | null; categoryIds?: string[];
  product_categories?: { category_id: string }[]; discount_type?: string | null; discount_value?: number | null }
export function variantFlashPricing(variant: PricingVariant, product: PricingProduct, sales: FlashSaleRow[], now = Date.now()) {
  const categoryIds = [...new Set([product.category_id, ...(product.categoryIds || []), ...(product.product_categories || []).map(c => c.category_id)].filter((id): id is string => !!id))]
  const ownDiscount = !!variant.discount_type && variant.discount_type !== 'none'
  const type = ownDiscount ? variant.discount_type! : product.discount_type || 'none'
  const value = Number(ownDiscount ? variant.discount_value ?? 0 : product.discount_value ?? 0)
  const best = pickBestFlashSale(sales, product.id, categoryIds, product.brand || null, Number(variant.price), variant.id, now)
  const result = applyFlashSaleToPrice(Number(variant.price), best ? { ...best, discount_type: best.discount_type as 'percentage' | 'fixed' } : null, type, value)
  return { ...result, mrp: Number(variant.price), regularPrice: calculateDiscountedPrice(Number(variant.price), type, value), flashSale: result.isFlashSale ? best : null }
}

export interface CatalogPricingProduct extends PricingProduct {
  name?: string
  created_at?: string
  base_price?: number | null
  product_variants?: (PricingVariant & { stock?: number; title?: string })[]
}
export function productFlashPricing(product: CatalogPricingProduct, sales: FlashSaleRow[], now = Date.now()) {
  const all = product.product_variants?.length ? product.product_variants : [{ id: product.id, price: Number(product.base_price || 0), stock: 0, title: 'Default' }]
  const available = all.filter(v => Number(v.stock || 0) > 0)
  const variants = available.length ? available : all
  const best = variants.map(variant => ({ ...variantFlashPricing(variant, product, sales, now), variant }))
    .sort((a,b) => a.salePrice-b.salePrice || a.variant.id.localeCompare(b.variant.id))[0]
  const discountAmount = Math.max(0,best.mrp-best.salePrice)
  return { ...best, discountAmount, discountPercentage: best.mrp>0?Math.round(discountAmount/best.mrp*100):0, hasDiscount:discountAmount>0 }
}
export function pricedFlashCatalog<T extends CatalogPricingProduct>(items:T[], sales:FlashSaleRow[], now:number,
  options:{sort?:string;min?:number;max?:number;outOfStockLast?:boolean}={}) {
  return items.map(p=>({...p,_effectivePrice:productFlashPricing(p,sales,now).salePrice,
    _outOfStock:!!p.product_variants?.length&&p.product_variants.every(v=>v.stock!=null&&Number(v.stock)<=0)}))
    .filter(p=>p._effectivePrice>=(options.min??0)&&p._effectivePrice<(options.max??Infinity))
    .sort((a,b)=>{
      const stock=options.outOfStockLast===false?0:Number(a._outOfStock)-Number(b._outOfStock)
      if(stock)return stock
      if(options.sort==='price_asc')return a._effectivePrice-b._effectivePrice
      if(options.sort==='price_desc')return b._effectivePrice-a._effectivePrice
      if(options.sort==='name')return (a.name||'').localeCompare(b.name||'')
      if(options.sort==='newest')return Date.parse(b.created_at||'')-Date.parse(a.created_at||'')
      return 0
    })
}
