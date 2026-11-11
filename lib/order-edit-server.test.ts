// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { finishEditSettlement } from './order-edit-server'
const mocks = vi.hoisted(() => ({ refund: vi.fn(), fetch: vi.fn(), rpc: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/verified-payment', async (original) => ({
  ...(await original<typeof import('@/lib/verified-payment')>()),
  refundPaymentOnce: mocks.refund,
  paymentClient: () => ({ payments: { fetch: mocks.fetch } }),
}))
const record = {
  id: 'request',
  status: 'reserved',
  method: 'razorpay',
  kind: 'refund',
  amount: 100,
  payment_id: 'pay_original',
  reference: null,
}
const db = { rpc: mocks.rpc } as unknown as SupabaseClient
beforeEach(() => {
  vi.clearAllMocks()
  mocks.refund.mockResolvedValue('rfnd_original')
  mocks.rpc.mockResolvedValue({ error: null })
})
it('uses the same provider key after a confirmation failure', async () => {
  mocks.rpc.mockResolvedValueOnce({ error: { message: 'DB timeout' } })
  await expect(finishEditSettlement(db, record)).rejects.toThrow('DB timeout')
  await finishEditSettlement(db, record)
  expect(mocks.refund.mock.calls).toEqual([
    ['pay_original', 100, 'request'],
    ['pay_original', 100, 'request'],
  ])
  expect(mocks.fetch).not.toHaveBeenCalled()
})
it('never repeats a completed settlement', async () => {
  await finishEditSettlement(db, { ...record, status: 'complete' })
  expect(mocks.refund).not.toHaveBeenCalled()
  expect(mocks.rpc).not.toHaveBeenCalled()
})
it('does not finalize a timed-out gateway send', async () => {
  mocks.refund.mockRejectedValue(new Error('Provider timeout'))
  await expect(finishEditSettlement(db, record)).rejects.toThrow('Provider timeout')
  expect(mocks.rpc).not.toHaveBeenCalled()
})
it('records manual receipts without sending money', async () => {
  await finishEditSettlement(db, { ...record, kind: 'payment', method: 'upi', reference: 'UPI-123' })
  expect(mocks.refund).not.toHaveBeenCalled()
  expect(mocks.rpc).toHaveBeenCalledWith('finish_order_edit_settlement', {
    p_id: 'request',
    p_reference: 'UPI-123',
  })
})
