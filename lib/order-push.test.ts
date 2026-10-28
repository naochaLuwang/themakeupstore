// @vitest-environment node
import type { SupabaseClient } from '@supabase/supabase-js'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { sendFcmMulticast } from '@/lib/fcm-send'
import { sendOrderPush } from './order-push'

vi.mock('@/lib/fcm-send', () => ({ sendFcmMulticast: vi.fn() }))
const query = { select: vi.fn(), eq: vi.fn(), not: vi.fn(), delete: vi.fn(), in: vi.fn() }
const db = { from: vi.fn(() => query) } as unknown as SupabaseClient

beforeEach(() => {
  vi.clearAllMocks()
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.delete.mockReturnValue(query)
  query.not.mockResolvedValue({ data: [{ fcm_token: 'customer-token' }], error: null })
  query.in.mockResolvedValue({ error: null })
  vi.mocked(sendFcmMulticast).mockResolvedValue({ sentCount: 1, invalidTokens: [], failedCount: 0 })
  vi.spyOn(console, 'info').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

it('sends confirmed updates to the order customer and links to that order', async () => {
  expect(await sendOrderPush(db, 'order-123', 'customer-123', 'confirmed')).toEqual({ state: 'accepted', sentCount: 1 })
  expect(query.eq).toHaveBeenCalledWith('user_id', 'customer-123')
  expect(sendFcmMulticast).toHaveBeenCalledWith(
    ['customer-token'], 'Order Update: Confirmed', expect.stringContaining('confirmed'), '/profile/orders/order-123',
  )
})

it('reports device lookup failures instead of treating them as no devices', async () => {
  query.not.mockResolvedValue({ data: null, error: { message: 'permission denied' } })
  expect((await sendOrderPush(db, 'order-123', 'customer-123', 'confirmed')).state).toBe('failed')
  expect(sendFcmMulticast).not.toHaveBeenCalled()
  expect(console.error).toHaveBeenCalledWith('[Order push] Failed', expect.objectContaining({ orderId: 'order-123', error: 'Device lookup failed: permission denied' }))
})

it('explains that a customer must register a device', async () => {
  query.not.mockResolvedValue({ data: [], error: null })
  expect(await sendOrderPush(db, 'order-123', 'customer-123', 'confirmed')).toMatchObject({ state: 'skipped', reason: expect.stringContaining('no registered app device') })
  expect(sendFcmMulticast).not.toHaveBeenCalled()
})

it('returns a visible failure without undoing the order update when Firebase rejects a push', async () => {
  vi.mocked(sendFcmMulticast).mockRejectedValue(new Error('FCM auth failed'))
  expect(await sendOrderPush(db, 'order-123', 'customer-123', 'confirmed')).toMatchObject({ state: 'failed', sentCount: 0 })
  expect(console.error).toHaveBeenCalledWith('[Order push] Failed', expect.objectContaining({ orderId: 'order-123', error: 'FCM auth failed' }))
})

it('cleans up expired tokens and tells the admin to re-register the device', async () => {
  vi.mocked(sendFcmMulticast).mockResolvedValue({ sentCount: 0, invalidTokens: ['expired-token'], failedCount: 1 })
  expect(await sendOrderPush(db, 'order-123', 'customer-123', 'confirmed')).toMatchObject({ state: 'failed', reason: expect.stringContaining('expired') })
  expect(query.in).toHaveBeenCalledWith('fcm_token', ['expired-token'])
})

it('does not send to an unlinked order or an unsupported status', async () => {
  expect((await sendOrderPush(db, 'order-123', null, 'confirmed')).state).toBe('skipped')
  expect((await sendOrderPush(db, 'order-123', 'customer-123', 'pending')).state).toBe('skipped')
  expect(sendFcmMulticast).not.toHaveBeenCalled()
})
