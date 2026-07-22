export interface FlashSaleOverride {
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  label: string
  ends_at: string
}

export interface FlashSaleRow {
  product_id: string | null
  category_id: string | null
  brand: string | null
  scope: string
  discount_type: string
  discount_value: number
  label: string
  starts_at: string
  ends_at: string
}

export function calculateDiscountedPrice(basePrice: number, discountType: string, discountValue: number): number {
  if (discountType === 'percentage' && discountValue > 0) return basePrice * (1 - discountValue / 100)
  if ((discountType === 'fixed' || discountType === 'amount') && discountValue > 0) return Math.max(0, basePrice - discountValue)
  return basePrice
}

export function applyFlashSaleToPrice(
  basePrice: number,
  flashSale: FlashSaleOverride | null,
  regularDiscountType: string,
  regularDiscountValue: number
): { salePrice: number; discountType: string; discountValue: number; isFlashSale: boolean } {
  const regularPrice = calculateDiscountedPrice(basePrice, regularDiscountType, regularDiscountValue)

  if (!flashSale) {
    return { salePrice: regularPrice, discountType: regularDiscountType, discountValue: regularDiscountValue, isFlashSale: false }
  }

  const flashPrice = calculateDiscountedPrice(basePrice, flashSale.discount_type, flashSale.discount_value)

  if (flashPrice < regularPrice) {
    return { salePrice: flashPrice, discountType: flashSale.discount_type, discountValue: flashSale.discount_value, isFlashSale: true }
  }

  return { salePrice: regularPrice, discountType: regularDiscountType, discountValue: regularDiscountValue, isFlashSale: false }
}

export function flashSaleMatchesProduct(flashSale: FlashSaleRow, productId: string, categoryIds: string[], brand: string | null): boolean {
  const now = new Date()
  const start = new Date(flashSale.starts_at)
  const end = new Date(flashSale.ends_at)
  if (now < start || now > end) return false

  switch (flashSale.scope) {
    case 'all':
      return true
    case 'product':
      return flashSale.product_id === productId
    case 'category':
      return categoryIds.includes(flashSale.category_id || '')
    case 'brand':
      return brand === flashSale.brand
    default:
      return false
  }
}

export function pickBestFlashSale(
  flashSales: FlashSaleRow[],
  productId: string,
  categoryIds: string[],
  brand: string | null
): FlashSaleOverride | null {
  let best: FlashSaleOverride | null = null
  let bestDiscount = 0

  for (const fs of flashSales) {
    if (!flashSaleMatchesProduct(fs, productId, categoryIds, brand)) continue
    const discountValue = fs.discount_type === 'percentage' ? fs.discount_value : fs.discount_value * 100
    if (!best || discountValue > bestDiscount) {
      best = { discount_type: fs.discount_type as 'percentage' | 'fixed', discount_value: Number(fs.discount_value), label: fs.label, ends_at: fs.ends_at }
      bestDiscount = discountValue
    }
  }

  return best
}
