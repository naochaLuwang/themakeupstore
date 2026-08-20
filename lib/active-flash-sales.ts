import { createClient } from "@/utils/supabase/server"

export interface ActiveFlashSale {
  id: string
  scope: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  label: string
  starts_at: string
  ends_at: string
  product_id: string | null
  category_id: string | null
  brand: string | null
}

export async function getActiveFlashSales(): Promise<ActiveFlashSale[]> {
  const supabase = await createClient()
  const now = new Date().toISOString()
  
  const { data, error } = await supabase
    .from('flash_sales')
    .select('*')
    .eq('is_active', true)
    .lte('starts_at', now)
    .gte('ends_at', now)
  
  if (error) throw new Error(error.message)
  return data || []
}

export function flashSaleMatchesProduct(
  flashSale: ActiveFlashSale, 
  productId: string, 
  categoryIds: string[], 
  brand: string | null
): boolean {
  switch (flashSale.scope) {
    case 'all':
      return true
    case 'product':
      return flashSale.product_id === productId
    case 'category':
      return flashSale.category_id ? categoryIds.includes(flashSale.category_id) : false
    case 'brand':
      return flashSale.brand === brand
    default:
      return false
  }
}

export function pickBestFlashSale(
  flashSales: ActiveFlashSale[],
  productId: string,
  categoryIds: string[],
  brand: string | null
): { discount_type: 'percentage' | 'fixed'; discount_value: number; label: string; ends_at: string } | null {
  let best: { discount_type: 'percentage' | 'fixed'; discount_value: number; label: string; ends_at: string } | null = null
  let bestDiscount = 0

  for (const fs of flashSales) {
    if (!flashSaleMatchesProduct(fs, productId, categoryIds, brand)) continue
    const discountValue = fs.discount_type === 'percentage' ? fs.discount_value : fs.discount_value * 100
    if (!best || discountValue > bestDiscount) {
      best = { discount_type: fs.discount_type, discount_value: Number(fs.discount_value), label: fs.label, ends_at: fs.ends_at }
      bestDiscount = discountValue
    }
  }

  return best
}