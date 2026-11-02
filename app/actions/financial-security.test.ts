// @vitest-environment node
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { purchaseGiftCard, completeGiftCardPurchase } from './gift-cards'
import { getAvailableBalance, releasePendingPoints } from './loyalty'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(), requireAdmin: vi.fn(), from: vi.fn(), insert: vi.fn(), single: vi.fn(), rpc: vi.fn(),
  createPaymentOrder: vi.fn(), verifyCapturedPayment: vi.fn(),
}))
vi.mock('@/utils/supabase/server', () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser } }) }))
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: async () => ({ from: mocks.from, rpc: mocks.rpc }) }))
vi.mock('@/lib/admin', () => ({ requireAdmin: mocks.requireAdmin }))
vi.mock('@/lib/verified-payment', () => ({ paymentClient: () => ({ orders: { create: mocks.createPaymentOrder } }), verifyCapturedPayment: mocks.verifyCapturedPayment }))

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'customer' } } })
  const chain = { select: vi.fn(), eq: vi.fn(), single: mocks.single, maybeSingle: mocks.single, insert: mocks.insert }
  chain.select.mockReturnValue(chain); chain.eq.mockReturnValue(chain)
  mocks.from.mockReturnValue(chain)
  mocks.insert.mockResolvedValue({ error: null })
  mocks.single.mockResolvedValue({ data: { id: '00000000-0000-4000-8000-000000000001', amount: 500, provider_order_id: 'order_test', gift_card_id: null }, error: null })
  mocks.createPaymentOrder.mockResolvedValue({ id: 'order_test', amount: 50000 })
  mocks.verifyCapturedPayment.mockResolvedValue(undefined)
  mocks.rpc.mockResolvedValue({ data: { id: 'card', code: 'PAID-CARD' }, error: null })
  mocks.requireAdmin.mockResolvedValue({ user: { id: 'admin' }, supabase: { rpc: mocks.rpc } })
})
afterEach(() => vi.restoreAllMocks())

it('creates a pending purchase without issuing a gift card or spendable balance', async () => {
  const form = new FormData(); form.set('amount','500')
  expect(await purchaseGiftCard(form)).toMatchObject({ success: true, orderId: 'order_test', amountPaise: 50000 })
  expect(mocks.from).toHaveBeenCalledWith('gift_card_purchases')
  expect(mocks.from).not.toHaveBeenCalledWith('gift_cards')
  expect(mocks.insert.mock.calls[0][0]).not.toHaveProperty('remaining_balance')
})
it('does not create a gift card when server payment verification fails', async () => {
  mocks.verifyCapturedPayment.mockRejectedValue(new Error('Payment has not been captured'))
  expect(await completeGiftCardPurchase({ purchaseId:'00000000-0000-4000-8000-000000000001', paymentId:'pay_test', signature:'sig' })).toMatchObject({ success:false })
  expect(mocks.rpc).not.toHaveBeenCalled()
})
it('activates only the authenticated customer purchase after verifying its stored amount', async () => {
  expect(await completeGiftCardPurchase({ purchaseId:'00000000-0000-4000-8000-000000000001', paymentId:'pay_test', signature:'sig' })).toMatchObject({ success:true, giftCard:{code:'PAID-CARD'} })
  expect(mocks.verifyCapturedPayment).toHaveBeenCalledWith(expect.objectContaining({ userId:'customer', amountPaise:50000, purpose:'gift_card', orderId:'order_test' }))
  expect(mocks.rpc).toHaveBeenCalledWith('activate_paid_gift_card',expect.objectContaining({ p_user_id:'customer',p_payment_id:'pay_test' }))
})
it('rejects unauthenticated gift card purchases', async () => {
  mocks.getUser.mockResolvedValue({ data:{user:null} })
  const form=new FormData();form.set('amount','500')
  expect(await purchaseGiftCard(form)).toMatchObject({success:false})
  expect(mocks.createPaymentOrder).not.toHaveBeenCalled()
})
it('denies loyalty release to callers who are not admins before touching the ledger', async () => {
  mocks.requireAdmin.mockRejectedValue(new Error('Admin access required'))
  await expect(releasePendingPoints('order')).rejects.toThrow('Admin access required')
  expect(mocks.rpc).not.toHaveBeenCalled()
})
it('delegates authorized release to the fulfillment-checking database transaction', async () => {
  await releasePendingPoints('order')
  expect(mocks.rpc).toHaveBeenCalledWith('release_fulfilled_order_points',{p_order_id:'order'})
})
it('rejects reading another user’s loyalty balance', async () => {
  await expect(getAvailableBalance('someone-else')).rejects.toThrow('own M Coin balance')
  expect(mocks.from).not.toHaveBeenCalled()
})
