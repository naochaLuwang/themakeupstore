interface ProductStock {
  product_variants?: readonly { stock?: unknown }[] | null
}

// Non-shade products use their default variant too. Never read products.stock.
export function productInStock(product: ProductStock): boolean {
  return product.product_variants?.some(variant => {
    const stock = Number(variant.stock)
    return Number.isFinite(stock) && stock > 0
  }) ?? false
}

// Stable partition: retain the existing ranking within each availability group.
// Return a new array so React state, props and persisted history stay untouched.
export function outOfStockLast<T extends ProductStock>(products: readonly T[]): T[] {
  const available: T[] = [], unavailable: T[] = []
  for (const product of products) (productInStock(product) ? available : unavailable).push(product)
  return [...available, ...unavailable]
}
