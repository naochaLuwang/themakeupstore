export interface CartStockUpdate { variantId: string; stock: number }

// A rejected quote must still carry current inventory back to the cart.
export class CartStockError extends Error {
  constructor(message: string, public readonly stock: CartStockUpdate[]) {
    super(message)
    this.name = 'CartStockError'
  }
}

export function cartStockIssue(item: { stock?: number; quantity: number; is_gift?: boolean; is_bxgy_free?: boolean }) {
  if (item.is_gift || item.is_bxgy_free) return null
  if (typeof item.stock !== 'number' || !Number.isFinite(item.stock)) return 'Stock unavailable'
  if (item.stock <= 0) return 'Out of Stock'
  return item.quantity > item.stock ? `Only ${item.stock} available` : null
}
