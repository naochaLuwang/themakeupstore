export interface OrderDiscountFields {
  promo_code?: string | null
  promo_discount_amount?: number | null
  discount_remark?: string | null
  manual_discount_amount?: number | null
  manual_discount_requested?: number | null
  manual_discount_reason?: string | null
}

// Historical orders used the coupon column for manual discounts. Read them
// without rewriting records; the next reviewed amendment separates the amounts.
export function orderDiscounts(order: OrderDiscountFields) {
  const legacy = order.promo_code ? 0 : Number(order.promo_discount_amount || 0)
  const manual = Number(order.manual_discount_amount || 0)
  return {
    coupon: order.promo_code ? Number(order.promo_discount_amount || 0) : 0,
    manual: manual + legacy,
    requested: Number(order.manual_discount_requested ?? manual) + legacy,
    reason: order.manual_discount_reason ||
      (legacy > 0 ? order.discount_remark || 'Retained existing manual discount' : ''),
  }
}

export function validManualDiscountAmount(amount: number) {
  return Number.isFinite(amount) && amount >= 0 && amount <= 100_000_000 &&
    amount === Number(amount.toFixed(2))
}
