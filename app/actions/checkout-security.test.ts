// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { placeOrder } from './orders'
import { quoteFingerprint,requestFingerprint } from '@/lib/verified-payment'

const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), quote: vi.fn(), verify: vi.fn(), push: vi.fn(), prior: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'customer' } } }) } }) }))
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: async () => ({ from: mocks.from, rpc: mocks.rpc }) }))
vi.mock('@/lib/checkout-pricing', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/checkout-pricing')>(), checkoutQuote: mocks.quote }))
vi.mock('@/lib/verified-payment', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/verified-payment')>(), verifyCapturedPayment: mocks.verify }))
vi.mock('@/lib/order-push', () => ({ sendOrderPush: mocks.push }))

const key = '00000000-0000-4000-8000-000000000001'
const address = { pincode: '795001' }
const items = [{ variantId: key, quantity: 3, price: 1 }]
const shipping = { total: 1, price: 0, methodName: 'Untrusted', shipping_method_id: key,quoteFingerprint:'' }
const quote = {
  items: [{ productId: key, variantId: key, name: 'Canonical product', variantTitle: '', price: 100, mrp: 100, quantity: 3 }],
  discounts:[{rule_id:key,variant_id:key,free_quantity:1,discount_amount:100}],freeItems: [], promotions: [], subtotal: 300, promoDiscount: 0, bxgyDiscount: 100, shippingPrice: 50,
  shippingLabel: 'Verified shipping', deliveryTimeLabel: '', giftCardDiscount: 0, coinDiscount: 0, total: 250,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mocks.prior.mockResolvedValue({ data: null, error: null })
  mocks.from.mockImplementation((table: string) => {
    const chain = { select: vi.fn(), eq: vi.fn(), maybeSingle: table === 'orders' ? mocks.prior : vi.fn().mockResolvedValue({ data: null }) }
    chain.select.mockReturnValue(chain); chain.eq.mockReturnValue(chain)
    return chain
  })
  shipping.quoteFingerprint=quoteFingerprint(quote as unknown as Parameters<typeof quoteFingerprint>[0],{shippingMethodId:key,pincode:'795001'})
  mocks.quote.mockResolvedValue(quote)
  mocks.rpc.mockResolvedValue({ data: { order_id: 'committed-order', replayed: false }, error: null })
  mocks.verify.mockResolvedValue(undefined)
  mocks.push.mockResolvedValue({ success: true })
})
afterEach(() => vi.restoreAllMocks())

it('ignores supplied totals and BXGY discounts and commits the canonical server quote', async () => {
  const result = await placeOrder(address, items, shipping, undefined, { discount: 999999 }, undefined, undefined, undefined, undefined, key)
  expect(result).toMatchObject({ success: true, orderId: 'committed-order' })
  expect(mocks.rpc).toHaveBeenCalledWith('commit_secure_checkout', expect.objectContaining({
    p_order: expect.objectContaining({ total: 250, bxgy_discount_amount: 100, shipping_price: 50, payment_status: 'unpaid' }),
    p_items: [expect.objectContaining({ unit_price: 100, product_name: 'Canonical product' })],
  }))
})
it('fails checkout when the transaction rejects a balance debit and sends no success notification', async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: { message: 'Insufficient M Coins' } })
  expect(await placeOrder(address, items, shipping, undefined, undefined, undefined, undefined, { amount: 100 }, undefined, key)).toMatchObject({ success: false, message: 'Insufficient M Coins' })
  expect(mocks.push).not.toHaveBeenCalled()
  expect(mocks.from.mock.calls.map(([table]) => table)).not.toContain('carts')
})
it('rejects a forged paid status and incomplete Razorpay proof before committing', async () => {
  expect(await placeOrder(address, items, shipping, undefined, undefined, undefined, undefined, undefined, { method: 'COD', status: 'paid' }, key)).toMatchObject({ success: false })
  expect(await placeOrder(address, items, shipping, undefined, undefined, undefined, undefined, undefined, { method: 'razorpay', status: 'paid', payment_id: 'pay_test' }, key)).toMatchObject({ success: false })
  expect(mocks.rpc).not.toHaveBeenCalled()
})
it('does not commit a checkout with a foreign or uncaptured payment', async () => {
  mocks.verify.mockRejectedValue(new Error('Payment does not belong to this purchase'))
  const proof = { method: 'razorpay', status: 'paid', payment_id: 'pay_test', order_id: 'order_test', signature: 'proof' }
  expect(await placeOrder(address, items, shipping, undefined, undefined, undefined, undefined, undefined, proof, key)).toMatchObject({ success: false })
  expect(mocks.rpc).not.toHaveBeenCalled()
})
it('requires verified capture for the exact canonical amount before marking paid', async () => {
  const proof = { method: 'razorpay', status: 'unpaid', payment_id: 'pay_test', order_id: 'order_test', signature: 'proof' }
  await placeOrder(address, items, shipping, undefined, undefined, undefined, undefined, undefined, proof, key)
  expect(mocks.verify).toHaveBeenCalledWith(expect.objectContaining({ userId: 'customer', amountPaise: 25000, purpose: 'checkout' }))
  expect(mocks.rpc).toHaveBeenCalledWith('commit_secure_checkout', expect.objectContaining({ p_order: expect.objectContaining({ payment_status: 'paid' }) }))
})
it('returns the previously committed order on a retry without repricing, paying or spending again', async () => {
  const hash = requestFingerprint({ address, items: items.map(i => ({ variantId: i.variantId, quantity: i.quantity, gift: false, bxgy: false })), shipping: key, promo: null, giftCard: null, coins: 0, payment: null,quote:shipping.quoteFingerprint })
  mocks.prior.mockResolvedValue({ data: { id: 'original-order', checkout_request_hash: hash } })
  expect(await placeOrder(address, items, shipping, undefined, undefined, undefined, undefined, undefined, undefined, key)).toMatchObject({ success: true, orderId: 'original-order' })
  expect(mocks.quote).not.toHaveBeenCalled()
  expect(mocks.rpc).not.toHaveBeenCalled()
  expect(mocks.push).not.toHaveBeenCalled()
})
