import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { OrderEditor } from './order-editor'
import type { EditRequest, OrderEditContext, OrderEditQuote } from '@/lib/order-edit'
const mocks = vi.hoisted(() => ({
  preview: vi.fn(),
  save: vi.fn(),
  search: vi.fn(),
  get: vi.fn(),
  settle: vi.fn(),
  reopen: vi.fn(),
  cancel: vi.fn(),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }))
vi.mock('@/app/actions/orders', () => ({ cancelOrderAndRestoreStock: mocks.cancel }))
vi.mock('@/app/actions/order-edits', () => ({
  previewOrderEdit: mocks.preview,
  saveOrderEdit: mocks.save,
  searchOrderEditProducts: mocks.search,
  getOrderEdit: mocks.get,
  settleOrderEdit: mocks.settle,
  reopenOrderPacking: mocks.reopen,
}))
const id = '00000000-0000-4000-8000-000000000001',
  a = '00000000-0000-4000-8000-000000000002',
  b = '00000000-0000-4000-8000-000000000003'
const fixture = (): OrderEditContext => ({
  revision: 'a'.repeat(32),
  history: [],
  settlements: [],
  hasRefunds: false,
  order: {
    id,
    user_id: id,
    status: 'pending',
    order_type: 'delivery',
    payment_method: 'razorpay',
    payment_status: 'paid',
    razorpay_payment_id: 'pay_fixture',
    total: 2000,
    shipping_price: 0,
    shipping_method_id: null,
    shipping_label: '',
    shipping_address: { full_name: 'Test customer' },
    promo_code: null,
    promo_discount_amount: 0,
    bxgy_discount_amount: 0,
    gift_card_discount: 0,
    coin_discount_amount: 0,
    additional_charges: 0,
    additional_charges_label: '',
    checkout_key: id,
    edit_version: 0,
    edit_paid_amount: null,
    edit_balance_due: 0,
    edit_refund_due: 0,
    cancellation_started_at: null,
    offer_snapshot: null,
    order_items: [a, b].map((variantId, index) => ({
      id: `line-${index}`,
      product_id: variantId,
      product_variant_id: variantId,
      gift_product_id: null,
      product_name: index ? 'Lipstick' : 'Foundation',
      variant_title: index ? 'Rose' : 'Warm',
      quantity: index ? 2 : 1,
      unit_price: index ? 500 : 1000,
      mrp: index ? 500 : 1000,
      is_gift: false,
      line_discount_amount: 0,
      refunded_quantity: 0,
      stock_restored_quantity: 0,
      promotion_allocations: [],
    })),
  },
})
function quote(request: EditRequest): OrderEditQuote {
  const total = request.items.reduce((sum, i) => sum + (i.variantId === a ? 1000 : 500) * i.quantity, 0)
  return {
    lines: request.items.map((i) => ({
      source_item_id: null,
      product_id: i.variantId,
      product_variant_id: i.variantId,
      gift_product_id: null,
      product_name: i.variantId === a ? 'Foundation' : 'Lipstick',
      variant_title: '',
      quantity: i.quantity,
      unit_price: i.variantId === a ? 1000 : 500,
      mrp: 1000,
      is_gift: false,
      line_discount_amount: 0,
      promotion_allocations: [],
    })),
    subtotal: total,
    promoDiscount: 0,
    bxgyDiscount: 0,
    shippingPrice: 0,
    giftCardDiscount: 0,
    coinDiscount: 0,
    additionalCharges: 0,
    total,
    cashReceived: 2000,
    balanceDue: Math.max(0, total - 2000),
    refundDue: Math.max(0, 2000 - total),
    giftCreditReturned: 0,
    coinsReturned: 0,
    warnings: [],
    promotions: [],
    priceContext: {
      snapshot: {
        ownerId: id,
        bxgyRules: [],
        giftRules: [],
        giftOptions: [],
        usedBXGY: [],
        usedGifts: [],
        expiresAt: 0,
      },
      coupon: null,
      bases: {},
    },
    pricingMode: request.pricingMode,
    validUntil: Date.now() + 60000,
  }
}
let root: Root, container: HTMLDivElement
beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  mocks.preview.mockImplementation(async (request: EditRequest) => ({
    success: true,
    quote: quote(request),
    reviewHash: 'b'.repeat(64),
  }))
  mocks.search.mockResolvedValue({ success: true, products: [] })
  mocks.save.mockResolvedValue({ success: true, context: fixture() })
  mocks.get.mockResolvedValue({ success: true, context: fixture() })
  mocks.settle.mockResolvedValue({ success: true, context: fixture() })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})
async function render(context = fixture()) {
  await act(async () => root.render(<OrderEditor initialContext={context} />))
}
async function tick(ms = 400) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}
function button(label: string, scope: ParentNode = document.body) {
  const result = [...scope.querySelectorAll('button')].find(
    (b) => b.textContent === label || b.getAttribute('aria-label') === label
  )
  if (!result) throw new Error('Missing button: ' + label)
  return result
}
async function click(label: string, scope?: ParentNode) {
  await act(async () => button(label, scope).click())
}
async function input(selector: string, value: string) {
  const element = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!
  await act(async () => {
    const proto = element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
it('keeps removals in a draft and discards them without a database write', async () => {
  await render()
  await click('Remove Foundation Warm')
  expect(container.querySelector('[aria-label="Quantity for Foundation Warm"]')).toBeNull()
  expect(mocks.save).not.toHaveBeenCalled()
  await click('Discard draft')
  expect(container.querySelector('[aria-label="Quantity for Foundation Warm"]')).toHaveValue(1)
  expect(mocks.save).not.toHaveBeenCalled()
})
it('requires a fresh quote, reason and explicit review before saving', async () => {
  await render()
  await click('Remove Foundation Warm')
  expect(button('Review changes')).toBeDisabled()
  await input('#order-edit-reason', 'Customer replacement')
  await tick()
  expect(button('Review changes')).toBeEnabled()
  await click('Review changes')
  const dialog = document.querySelector('[role="dialog"]')!
  expect(dialog).toHaveTextContent('New total')
  expect(mocks.save).not.toHaveBeenCalled()
  await click('Save changes', dialog)
  expect(mocks.save).toHaveBeenCalledOnce()
  expect(mocks.save).toHaveBeenCalledWith(
    expect.objectContaining({
      reason: 'Customer replacement',
      items: [{ variantId: b, quantity: 2 }],
      reviewHash: 'b'.repeat(64),
      requestKey: expect.any(String),
    })
  )
})
it('ignores an older preview that completes after the draft changes', async () => {
  const pending: ((result: unknown) => void)[] = []
  mocks.preview.mockImplementation(() => new Promise((resolve) => pending.push(resolve)))
  await render()
  await input('[aria-label="Quantity for Foundation Warm"]', '2')
  await tick()
  expect(pending).toHaveLength(1)
  await input('[aria-label="Quantity for Foundation Warm"]', '3')
  await tick()
  expect(pending).toHaveLength(2)
  const first = mocks.preview.mock.calls[0][0],
    second = mocks.preview.mock.calls[1][0]
  await act(async () => pending[0]({ success: true, quote: quote(first), reviewHash: 'old' }))
  expect(container).toHaveTextContent('Calculating prices and offers…')
  await act(async () => pending[1]({ success: true, quote: quote(second), reviewHash: 'new' }))
  expect(container).toHaveTextContent('₹4,000')
  expect(container).not.toHaveTextContent('Calculating prices and offers…')
})
it('offers cancellation rather than saving an empty order', async () => {
  await render()
  await click('Remove Foundation Warm')
  await click('Remove Lipstick Rose')
  expect(button('Review changes')).toBeDisabled()
  await click('Cancel order')
  expect(document.querySelector('[role="dialog"]')).toHaveTextContent('Cancel the entire order?')
  expect(mocks.cancel).not.toHaveBeenCalled()
})
it('records a refund only after the admin confirms the actual transaction', async () => {
  const context = fixture()
  context.order.edit_version = 1
  context.order.edit_paid_amount = 2000
  context.order.total = 1500
  context.order.edit_refund_due = 500
  await render(context)
  await input('#settlement-reference', 'UPI-1234')
  await input('#settlement-reason', 'Refund already sent')
  await click('Record refund already sent')
  expect(mocks.settle).not.toHaveBeenCalled()
  await click('Confirm transaction', document.querySelector('[role="dialog"]')!)
  expect(mocks.settle).toHaveBeenCalledWith(
    expect.objectContaining({ kind: 'refund', amount: 500, method: 'upi', reference: 'UPI-1234' })
  )
})
it('retries a pending refund with its original request key', async () => {
  const context = fixture()
  context.order.edit_version = 1
  context.order.edit_refund_due = 500
  context.settlements = [
    {
      id,
      request_key: a,
      kind: 'refund',
      method: 'razorpay',
      amount: 500,
      status: 'reserved',
      reference: null,
      reason: 'Saved refund reason',
      created_at: '2026-11-10T10:00:00Z',
    },
  ]
  await render(context)
  await click('Retry pending settlement')
  await click('Issue refund', document.querySelector('[role="dialog"]')!)
  expect(mocks.settle).toHaveBeenCalledWith(
    expect.objectContaining({ requestKey: a, amount: 500, method: 'razorpay', reason: 'Saved refund reason' })
  )
})
