// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
import { previewOrderEdit, saveOrderEdit, settleOrderEdit } from './order-edits'
import type { OrderEditContext } from '@/lib/order-edit'

const mocks = vi.hoisted(() => ({
  admin: vi.fn(),
  calculate: vi.fn(),
  load: vi.fn(),
  finish: vi.fn(),
  rpc: vi.fn(),
  prior: vi.fn(),
  fetchPayment: vi.fn(),
}))
vi.mock('@/lib/admin', () => ({ requireAdmin: mocks.admin }))
vi.mock('@/lib/order-edit-server', () => ({
  calculateOrderEdit: mocks.calculate,
  loadOrderEditContext: mocks.load,
  finishEditSettlement: mocks.finish,
}))
vi.mock('@/lib/verified-payment', async (original) => ({
  ...(await original<typeof import('@/lib/verified-payment')>()),
  paymentClient: () => ({ payments: { fetch: mocks.fetchPayment } }),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('./back-in-stock-notify', () => ({ notifyBackInStock: vi.fn() }))
const id = '00000000-0000-4000-8000-000000000001',
  key = '00000000-0000-4000-8000-000000000002'
const request = {
  orderId: id,
  revision: 'a'.repeat(32),
  pricingMode: 'preserve' as const,
  items: [{ variantId: id, quantity: 1 }],
}
const save = {
  ...request,
  requestKey: key,
  reviewHash: 'b'.repeat(64),
  reason: 'Customer requested replacement',
}
const context = {
  order: { id, order_items: [], razorpay_payment_id: 'pay_original' },
  settlements: [],
} as unknown as OrderEditContext
const db = {
  rpc: mocks.rpc,
  from: () => ({
    select: () => ({ eq: () => ({ maybeSingle: mocks.prior }), in: async () => ({ data: [] }) }),
  }),
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.admin.mockResolvedValue({ supabase: db, user: { id: 'admin' } })
  mocks.prior.mockResolvedValue({ data: null, error: null })
  mocks.rpc.mockResolvedValue({ data: {}, error: null })
  mocks.calculate.mockResolvedValue({
    quote: { total: 100 },
    reviewHash: save.reviewHash,
    context,
    ids: [id],
    catalogRevision: 'catalog',
  })
  mocks.load.mockResolvedValue(context)
  mocks.finish.mockResolvedValue(undefined)
  mocks.fetchPayment.mockResolvedValue({ amount: 20000, amount_refunded: 10000 })
})
it('authorizes before previewing, saving or moving money', async () => {
  mocks.admin.mockRejectedValue(new Error('Admin required'))
  await expect(previewOrderEdit(request)).rejects.toThrow('Admin required')
  await expect(saveOrderEdit(save)).rejects.toThrow('Admin required')
  expect(mocks.calculate).not.toHaveBeenCalled()
  expect(mocks.rpc).not.toHaveBeenCalled()
})
it('rejects duplicate variants and invalid quantities before calculating', async () => {
  expect((await previewOrderEdit({ ...request, items: [request.items[0], request.items[0]] })).success).toBe(
    false
  )
  expect((await previewOrderEdit({ ...request, items: [{ variantId: id, quantity: 0 }] })).success).toBe(
    false
  )
  expect(mocks.calculate).not.toHaveBeenCalled()
})
it('recalculates the saved quote and passes only trusted amounts to the transaction', async () => {
  expect((await saveOrderEdit({ ...save, total: 1 } as typeof save)).success).toBe(true)
  expect(mocks.rpc).toHaveBeenCalledWith(
    'commit_order_amendment',
    expect.objectContaining({ p_quote: { total: 100 }, p_revision: request.revision, p_actor: 'admin' })
  )
})
it('requires another explicit review if canonical totals changed', async () => {
  mocks.calculate.mockResolvedValue({ quote: { total: 150 }, reviewHash: 'c'.repeat(64) })
  expect(await saveOrderEdit(save)).toMatchObject({
    success: false,
    quote: { total: 150 },
    reviewHash: 'c'.repeat(64),
  })
  expect(mocks.rpc).not.toHaveBeenCalled()
})
it('replays a successful save after its response was lost without recalculating a changed order', async () => {
  const { requestFingerprint } = await import('@/lib/verified-payment')
  mocks.prior.mockResolvedValue({
    data: {
      order_id: id,
      actor_id: 'admin',
      request_hash: requestFingerprint({ request, reason: save.reason, reviewHash: save.reviewHash }),
    },
    error: null,
  })
  expect((await saveOrderEdit(save)).success).toBe(true)
  expect(mocks.calculate).not.toHaveBeenCalled()
  expect(mocks.rpc).not.toHaveBeenCalled()
})
it('rejects a save key belonging to a different edit', async () => {
  mocks.prior.mockResolvedValue({
    data: { order_id: id, actor_id: 'admin', request_hash: 'other' },
    error: null,
  })
  expect((await saveOrderEdit(save)).success).toBe(false)
  expect(mocks.rpc).not.toHaveBeenCalled()
})
it('reports transaction failure without claiming the order was saved', async () => {
  mocks.rpc.mockResolvedValue({ error: { message: 'Insufficient stock' } })
  expect(await saveOrderEdit(save)).toMatchObject({ success: false, message: 'Insufficient stock' })
  expect(mocks.load).not.toHaveBeenCalled()
})
it('rejects an excessive gateway refund before creating a pending reservation', async () => {
  expect(
    (
      await settleOrderEdit({
        orderId: id,
        requestKey: key,
        kind: 'refund',
        method: 'razorpay',
        amount: 101,
        reason: 'Return difference',
        reference: '',
      })
    ).success
  ).toBe(false)
  expect(mocks.rpc).not.toHaveBeenCalled()
  expect(mocks.finish).not.toHaveBeenCalled()
})
it('retries a reserved gateway refund without rechecking the now-reduced provider balance', async () => {
  mocks.load.mockResolvedValue({ ...context, settlements: [{ request_key: key }] })
  mocks.rpc.mockResolvedValue({ data: { id: 'reserved', status: 'reserved' }, error: null })
  expect(
    (
      await settleOrderEdit({
        orderId: id,
        requestKey: key,
        kind: 'refund',
        method: 'razorpay',
        amount: 100,
        reason: 'Return difference',
        reference: '',
      })
    ).success
  ).toBe(true)
  expect(mocks.fetchPayment).not.toHaveBeenCalled()
  expect(mocks.finish).toHaveBeenCalledWith(db, { id: 'reserved', status: 'reserved' })
})
