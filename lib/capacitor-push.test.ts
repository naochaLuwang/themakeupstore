import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  listeners: {} as Record<string, (event: unknown) => void>,
  schedule: vi.fn(),
  deleteToken: vi.fn(),
  getToken: vi.fn(),
  unsubscribeFromTopic: vi.fn(),
  insert: vi.fn(),
  cleanup: vi.fn(),
  getSession: vi.fn(),
}))

vi.mock('@capacitor/core', () => ({ Capacitor: {
  isNativePlatform: () => true, getPlatform: () => 'android',
} }))
vi.mock('@capacitor-firebase/messaging', () => ({ FirebaseMessaging: {
  isSupported: async () => ({ isSupported: true }),
  checkPermissions: async () => ({ receive: 'granted' }),
  getToken: mocks.getToken, deleteToken: mocks.deleteToken,
  unsubscribeFromTopic: mocks.unsubscribeFromTopic,
  addListener: async (name: string, listener: (event: unknown) => void) => {
    mocks.listeners[name] = listener
    return { remove: async () => {} }
  },
} }))
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: {
  listChannels: async () => ({ channels: [{ id: 'push-notifications' }] }),
  checkPermissions: async () => ({ display: 'granted' }),
  schedule: mocks.schedule,
  addListener: async () => ({ remove: async () => {} }),
} }))
vi.mock('@/utils/supabase/client', () => ({ createClient: () => ({
  auth: { getSession: mocks.getSession },
  from: () => ({ delete: () => ({ eq: mocks.cleanup }), insert: mocks.insert }),
}) }))

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  window.localStorage.clear()
  mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-a' } } } })
  mocks.getToken.mockResolvedValue({ token: 'device-token' })
  mocks.cleanup.mockResolvedValue({ error: null })
  mocks.insert.mockResolvedValue({ error: null })
  mocks.deleteToken.mockResolvedValue(undefined)
  mocks.schedule.mockResolvedValue(undefined)
})
afterEach(() => vi.restoreAllMocks())

it('uses a valid Android integer ID for foreground notifications', async () => {
  const { setupFCMListeners } = await import('./capacitor-push')
  setupFCMListeners()
  mocks.listeners.notificationReceived({ notification: { title: 'Order confirmed', body: 'Thank you' } })
  await vi.waitFor(() => expect(mocks.schedule).toHaveBeenCalledOnce())
  const notification = mocks.schedule.mock.calls[0][0].notifications[0]
  expect(Number.isInteger(notification.id)).toBe(true)
  expect(notification.id).toBeGreaterThanOrEqual(0)
  expect(notification.id).toBeLessThanOrEqual(2147483647)
})

it('keeps notification opt-out across module reloads until explicitly enabled', async () => {
  const push = await import('./capacitor-push')
  await push.unregisterFCM()
  vi.resetModules()
  const reloaded = await import('./capacitor-push')
  expect((await reloaded.registerForFCM()).ok).toBe(false)
  expect(mocks.getToken).not.toHaveBeenCalled()
  expect((await reloaded.registerForFCM({ enable: true })).ok).toBe(true)
  expect(reloaded.isPushDisabled()).toBe(false)
  expect(mocks.unsubscribeFromTopic).toHaveBeenCalledWith({ topic: 'admin' })
})

it('does not restore opted-out registration when Firebase refreshes a token', async () => {
  const push = await import('./capacitor-push')
  push.setupFCMListeners()
  await push.unregisterFCM()
  mocks.listeners.tokenReceived({ token: 'new-token' })
  expect(mocks.getToken).not.toHaveBeenCalled()
})

it('revokes the token on sign-out without persisting an explicit opt-out', async () => {
  const push = await import('./capacitor-push')
  await push.unregisterFCM({ disable: false })
  expect(mocks.deleteToken).toHaveBeenCalledOnce()
  expect(push.isPushDisabled()).toBe(false)
})

it('stops registration if the account changes while Firebase gets the token', async () => {
  const push = await import('./capacitor-push')
  mocks.getSession.mockResolvedValueOnce({ data: { session: { user: { id: 'user-a' } } } })
  mocks.getSession.mockResolvedValueOnce({ data: { session: { user: { id: 'user-b' } } } })
  expect((await push.registerForFCM()).ok).toBe(false)
  expect(mocks.insert).not.toHaveBeenCalled()
})

it('reports database cleanup errors instead of continuing a broken registration', async () => {
  const push = await import('./capacitor-push')
  mocks.cleanup.mockResolvedValue({ error: { message: 'permission denied' } })
  expect(await push.registerForFCM()).toEqual({ ok: false, reason: 'Could not replace device registration: permission denied' })
  expect(mocks.insert).not.toHaveBeenCalled()
})
