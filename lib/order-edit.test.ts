import { describe, expect, it } from 'vitest'
import {
  contractualSnapshot,
  editBlockReason,
  priceOrderEdit,
  receivedCash,
  type EditableOrder,
  type EditRequest,
} from './order-edit'
import type { PricedItem } from './cart-quote'
import type { PromotionSnapshot } from './promotion-preview'
import type { BXGYRule } from './promotion-engine'

const item = (id: string, price = 100): PricedItem => ({
  variantId: id,
  productId: `product-${id}`,
  name: id,
  variantTitle: 'Rose',
  price,
  mrp: price,
  quantity: 1,
  stock: 10,
  image: '',
  categoryId: '',
  categoryIds: ['category'],
  brand: 'Brand',
})
const snapshot = (): PromotionSnapshot => ({
  ownerId: 'user',
  bxgyRules: [],
  giftRules: [],
  giftOptions: [],
  usedBXGY: [],
  usedGifts: [],
  expiresAt: Date.now() + 30000,
})
const order = (): EditableOrder => ({
  id: 'order',
  user_id: 'user',
  status: 'pending',
  order_type: 'delivery',
  payment_method: 'COD',
  payment_status: 'unpaid',
  razorpay_payment_id: null,
  total: 300,
  shipping_price: 0,
  shipping_method_id: null,
  shipping_label: '',
  shipping_address: {},
  promo_code: null,
  promo_discount_amount: 0,
  bxgy_discount_amount: 0,
  gift_card_discount: 0,
  coin_discount_amount: 0,
  additional_charges: 0,
  additional_charges_label: '',
  checkout_key: 'checkout',
  edit_version: 0,
  edit_paid_amount: null,
  edit_balance_due: 0,
  edit_refund_due: 0,
  cancellation_started_at: null,
  offer_snapshot: null,
  order_items: [
    {
      id: 'line-a',
      product_id: 'product-a',
      product_variant_id: 'a',
      gift_product_id: null,
      product_name: 'a',
      variant_title: 'Rose',
      quantity: 3,
      unit_price: 100,
      mrp: 100,
      is_gift: false,
      line_discount_amount: 0,
      refunded_quantity: 0,
      stock_restored_quantity: 0,
      promotion_allocations: [],
    },
  ],
})
const request = (
  items = [{ variantId: 'a', quantity: 2 }],
  pricingMode: EditRequest['pricingMode'] = 'preserve'
): EditRequest => ({ orderId: 'order', revision: 'revision', items, pricingMode })
const quote = (o = order(), r = request(), s = snapshot(), items = [item('a'), item('b', 200)]) =>
  priceOrderEdit(o, r, { items, snapshot: s, coupon: null, shippingPrice: 50 })
const bxgy: BXGYRule = {
  id: 'bxgy',
  name: 'Buy 2 Get 1',
  is_active: true,
  buy_type: 'specific_brands',
  buy_quantity: 2,
  get_type: 'cheapest_free',
  get_discount_type: 'free',
  get_discount_value: 100,
  products: [],
  categories: [],
  brands: ['Brand'],
  pricing_mode: 'combine_discounts',
}

describe('order amendment pricing', () => {
  it('removes quantities and prices added products automatically', () => {
    const q = quote(
      order(),
      request([
        { variantId: 'a', quantity: 1 },
        { variantId: 'b', quantity: 2 },
      ])
    )
    expect(q.total).toBe(550)
    expect(q.balanceDue).toBe(550)
    expect(q.lines.map((i) => [i.product_variant_id, i.quantity, i.unit_price])).toEqual([
      ['a', 1, 100],
      ['b', 2, 200],
    ])
    expect(q.lines[0].source_item_id).toBe('line-a')
  })
  it('preserves original units while added quantities use today’s prices', () => {
    const q = quote(order(), request([{ variantId: 'a', quantity: 4 }]), snapshot(), [item('a', 150)])
    expect(q.lines.map((i) => [i.quantity, i.unit_price])).toEqual([
      [3, 100],
      [1, 150],
    ])
    expect(q.total).toBe(500)
  })
  it('requires an explicit current-price choice for incomplete historical offer records', () => {
    const o = order()
    o.bxgy_discount_amount = 100
    expect(() => quote(o)).toThrow('original offer rules were not saved')
    expect(quote(o, request(undefined, 'current')).total).toBe(250)
  })
  it('reprices every quantity when the admin explicitly selects current prices', () => {
    const q = quote(order(), request(undefined, 'current'), snapshot(), [item('a', 150)])
    expect(q.lines[0].unit_price).toBe(150)
    expect(q.total).toBe(350)
  })
  it('does not introduce unrelated campaigns in preserve mode', () => {
    const s = snapshot()
    s.bxgyRules = [bxgy]
    expect(quote(order(), request([{ variantId: 'a', quantity: 3 }]), s).bxgyDiscount).toBe(0)
    expect(quote(order(), request([{ variantId: 'a', quantity: 3 }], 'current'), s).bxgyDiscount).toBe(100)
  })
  it('rechecks the original BXGY contract even after the campaign ends', () => {
    const o = order(),
      s = snapshot()
    s.bxgyRules = [
      {
        ...bxgy,
        is_active: false,
        expires_at: '2000-01-01',
        usage_limit: 1,
        used_count: 1,
        once_per_user: true,
      },
    ]
    o.bxgy_discount_amount = 100
    o.offer_snapshot = {
      pricing_context: {
        snapshot: s,
        coupon: null,
        bases: { 'variant:a': { price: 100, mrp: 100, categoryIds: ['category'], brand: 'Brand' } },
      },
    }
    expect(quote(o, request([{ variantId: 'a', quantity: 3 }]), s).bxgyDiscount).toBe(100)
    expect(quote(o).bxgyDiscount).toBe(0)
  })
  it('allocates replacement BXGY across old and new price lots without losing quantities', () => {
    const o = order(),
      s = snapshot()
    s.bxgyRules = [{ ...bxgy, pricing_mode: 'replace_discounts' }]
    o.order_items[0].quantity = 2
    o.order_items[0].unit_price = 80
    o.offer_snapshot = {
      pricing_context: {
        snapshot: s,
        coupon: null,
        bases: { 'variant:a': { price: 80, mrp: 100, categoryIds: ['category'], brand: 'Brand' } },
      },
    }
    const q = quote(o, request([{ variantId: 'a', quantity: 4 }]), s, [{ ...item('a', 90), mrp: 100 }])
    expect(q.lines.reduce((n, l) => n + l.quantity, 0)).toBe(4)
    expect(q.subtotal - q.bxgyDiscount).toBe(290)
    expect(q.lines.every((l) => l.product_variant_id === 'a')).toBe(true)
  })
  it('keeps paise and computes only the difference against cash already received', () => {
    const o = order()
    o.payment_method = 'razorpay'
    o.payment_status = 'paid'
    const q = quote(
      o,
      request([
        { variantId: 'a', quantity: 1 },
        { variantId: 'b', quantity: 1 },
      ]),
      snapshot(),
      [item('a'), item('b', 200.25)]
    )
    expect(q.total).toBe(350.25)
    expect(q.cashReceived).toBe(300)
    expect(q.balanceDue).toBe(50.25)
    expect(q.refundDue).toBe(0)
  })
  it('returns only unused credits without spending additional balances', () => {
    const o = order()
    o.gift_card_discount = 150
    o.coin_discount_amount = 100
    const q = quote(o, request([{ variantId: 'a', quantity: 1 }]))
    expect(q.giftCardDiscount).toBe(150)
    expect(q.coinDiscount).toBe(0)
    expect(q.coinsReturned).toBe(100)
    expect(q.total).toBe(0)
    const expensive = quote(o, request([{ variantId: 'b', quantity: 3 }]))
    expect(expensive.giftCardDiscount).toBe(150)
    expect(expensive.coinDiscount).toBe(100)
  })
  it('caps manual discounts and never produces a negative total', () => {
    const o = order()
    o.promo_discount_amount = 500
    const q = quote(o)
    expect(q.promoDiscount).toBe(200)
    expect(q.total).toBe(50)
  })
  it('rejects insufficient stock, missing products and an empty order', () => {
    expect(() => quote(order(), request([{ variantId: 'a', quantity: 11 }]))).toThrow('Only 10')
    expect(() => quote(order(), request([{ variantId: 'missing', quantity: 1 }]))).toThrow(
      'no longer available'
    )
    expect(() => quote(order(), request([]))).toThrow('Cancel order')
  })
  it('computes a refund from the remaining received cash after previous settlements', () => {
    const o = order()
    o.edit_version = 1
    o.edit_paid_amount = 350
    expect(quote(o).refundDue).toBe(100)
    expect(receivedCash(o)).toBe(350)
  })
  it('blocks returned, cancelled and dispatched orders and requires packing reopening', () => {
    const o = order()
    expect(editBlockReason(o)).toBeNull()
    o.status = 'packed'
    expect(editBlockReason(o)).toContain('Reopen packing')
    o.status = 'shipped'
    expect(editBlockReason(o)).toContain('before packing')
    o.status = 'cancelled'
    expect(editBlockReason(o)).toContain('cancelled')
    o.status = 'confirmed'
    expect(editBlockReason(o, true)).toContain('return or refund')
    o.order_items[0].refunded_quantity = 1
    expect(editBlockReason(o)).toContain('return or refund')
  })
  it('keeps contract activation separate from fresh inventory', () => {
    const s = snapshot()
    s.bxgyRules = [{ ...bxgy, is_active: false }]
    const active = contractualSnapshot(s)
    expect(active.bxgyRules[0].is_active).toBe(true)
    expect(s.bxgyRules[0].is_active).toBe(false)
  })
  it('removes a fixed gift when the revised order falls below its threshold', () => {
    const o = order(),
      s = snapshot()
    s.giftRules = [
      {
        id: 'gift',
        name: 'Gift',
        is_active: true,
        trigger_type: 'cart_total',
        trigger_threshold: 250,
        min_cart_amount: 0,
        gift_product_id: null,
        gift_product_ref_id: 'gift-product',
        gift_variant_id: null,
        gift_quantity: 1,
        products: [],
        categories: [],
        brands: [],
      },
    ]
    s.giftOptions = [
      {
        productId: null,
        variantId: null,
        giftProductId: 'gift-product',
        ruleId: 'gift',
        ruleName: 'Gift',
        quantity: 1,
        name: 'Gift brush',
        mrp: 100,
        image: '',
        stock: 1,
      },
    ]
    o.order_items.push({
      ...o.order_items[0],
      id: 'gift-line',
      product_id: null,
      product_variant_id: null,
      gift_product_id: 'gift-product',
      product_name: 'Gift brush',
      quantity: 1,
      unit_price: 0,
      is_gift: true,
    })
    o.offer_snapshot = { pricing_context: { snapshot: s, coupon: null, bases: {} } }
    const revised = quote(o, request(), s)
    expect(revised.lines.some((i) => i.is_gift)).toBe(false)
    expect(revised.warnings.some((w) => w.includes('Remove it from the parcel'))).toBe(true)
    o.offer_snapshot = { edit_context: revised.priceContext }
    expect(quote(o, request([{ variantId: 'a', quantity: 3 }]), s).lines.some((i) => i.is_gift)).toBe(true)
  })
  it('shares paid and gift variant stock instead of allocating a final unit twice', () => {
    const s = snapshot()
    s.giftRules = [
      {
        id: 'gift',
        name: 'Gift',
        is_active: true,
        trigger_type: 'cart_total',
        trigger_threshold: 1,
        min_cart_amount: 0,
        gift_product_id: 'product-a',
        gift_product_ref_id: null,
        gift_variant_id: 'a',
        gift_quantity: 1,
        products: [],
        categories: [],
        brands: [],
      },
    ]
    s.giftOptions = [
      {
        productId: 'product-a',
        variantId: 'a',
        giftProductId: null,
        ruleId: 'gift',
        ruleName: 'Gift',
        quantity: 1,
        name: 'a',
        mrp: 100,
        image: '',
        stock: 1,
      },
    ]
    expect(
      quote(order(), request([{ variantId: 'a', quantity: 1 }], 'current'), s).lines.some((l) => l.is_gift)
    ).toBe(false)
  })
  it('rechecks original coupon scope and minimum spend', () => {
    const o = order(),
      s = snapshot()
    o.promo_code = 'SAVE'
    o.promo_discount_amount = 30
    o.offer_snapshot = {
      pricing_context: {
        snapshot: s,
        bases: {},
        coupon: {
          id: 'coupon',
          code: 'SAVE',
          apply_to: 'all',
          discount_type: 'percentage',
          discount_value: 10,
          min_order_amount: 250,
          max_discount_amount: 50,
          promo_code_products: [],
          promo_code_categories: [],
        },
      },
    }
    expect(quote(o, request([{ variantId: 'a', quantity: 3 }]), s).promoDiscount).toBe(30)
    const smaller = quote(o)
    expect(smaller.promoDiscount).toBe(0)
    expect(smaller.warnings.some((w) => w.includes('no longer qualify'))).toBe(true)
  })
})
