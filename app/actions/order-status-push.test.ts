// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { requireAdmin } from '@/lib/admin'
import { sendOrderPush } from '@/lib/order-push'
import { updateOrderStatus } from './orders'

vi.mock('@/lib/admin', () => ({ requireAdmin: vi.fn() }))
vi.mock('@/lib/order-push', () => ({ sendOrderPush: vi.fn() }))

beforeEach(() => {
  vi.clearAllMocks()
  const order = {
    id: 'order-123', user_id: 'customer-123', status: 'pending', order_type: 'delivery',
    order_items: [], payment_method: 'COD', customer_phone: null, profiles: null,
  }
  const database = { from: vi.fn(() => ({
    select: () => ({ eq: () => ({ single: async () => ({ data: order, error: null }) }) }),
    update: () => ({ eq: async () => ({ error: null }) }),
  })) }
  vi.mocked(requireAdmin).mockResolvedValue({ user: { id: 'admin-123' }, supabase: database } as unknown as Awaited<ReturnType<typeof requireAdmin>>)
})
afterEach(() => vi.restoreAllMocks())

it('awaits the customer push during confirmation and returns the Firebase result to admin', async () => {
  vi.mocked(sendOrderPush).mockResolvedValue({ state: 'accepted', sentCount: 1 })
  const result = await updateOrderStatus('order-123', 'confirmed')
  expect(sendOrderPush).toHaveBeenCalledWith(expect.anything(), 'order-123', 'customer-123', 'confirmed')
  expect(result).toMatchObject({ success: true, newStatus: 'confirmed', pushNotification: { state: 'accepted', sentCount: 1 } })
})

it('reports push failure separately while preserving a successful order confirmation', async () => {
  vi.mocked(sendOrderPush).mockResolvedValue({ state: 'failed', sentCount: 0, reason: 'Firebase rejected the push' })
  const result = await updateOrderStatus('order-123', 'confirmed')
  expect(result).toMatchObject({ success: true, pushNotification: { state: 'failed', reason: 'Firebase rejected the push' } })
})
