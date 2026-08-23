export interface FlashSaleLike {
  product_id: string | null
  category_id: string | null
  brand: string | null
  scope: string
}

export function flashSaleMatchesTarget(
  flashSale: FlashSaleLike,
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
