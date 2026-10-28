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
  lookup: vi.fn(),
  permission: vi.fn(),
  areEnabled: vi.fn(),
  listChannels: vi.fn(),
}))

vi.mock('@capacitor/core', () => ({ Capacitor: {
  isNativePlatform: () => true, getPlatform: () => 'android',
} }))
vi.mock('@capacitor-firebase/messaging', () => ({ FirebaseMessaging: {
  isSupported: async () => ({ isSupported: true }),
  checkPermissions: mocks.permission,
  getToken: mocks.getToken, deleteToken: mocks.deleteToken,
  unsubscribeFromTopic: mocks.unsubscribeFromTopic,
  addListener: async (name: string, listener: (event: unknown) => void) => {
    mocks.listeners[name] = listener
    return { remove: async () => {} }
  },
} }))
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: {
  listChannels: mocks.listChannels,
  areEnabled: mocks.areEnabled,
  checkPermissions: async () => ({ display: 'granted' }),
  schedule: mocks.schedule,
  addListener: async () => ({ remove: async () => {} }),
} }))
vi.mock('@/utils/supabase/client', () => ({ createClient: () => ({
  auth: { getSession: mocks.getSession },
  from: () => ({
    delete: () => ({ eq: mocks.cleanup, match: mocks.cleanup }), insert: mocks.insert,
    select: () => ({ eq: () => ({ eq: mocks.lookup }) }),
  }),
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
  mocks.permission.mockResolvedValue({ receive: 'granted' })
  mocks.areEnabled.mockResolvedValue({ value: true })
  mocks.listChannels.mockResolvedValue({ channels: [{ id: 'push-notifications', importance: 4 }] })
  mocks.lookup.mockResolvedValue({ data: [{ fcm_token: 'device-token' }], error: null })
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

it('reports enabled only when this exact device token is saved for the signed-in user', async () => {
  const { getPushStatus } = await import('./capacitor-push')
  expect((await getPushStatus()).state).toBe('enabled')
  mocks.lookup.mockResolvedValue({ data: [], error: null })
  expect((await getPushStatus()).state).toBe('unregistered')
})

it('reports database lookup failures as unknown, not disabled', async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  const { getPushStatus } = await import('./capacitor-push')
  mocks.lookup.mockResolvedValue({ data: null, error: { message: 'network error' } })
  expect((await getPushStatus()).state).toBe('error')
})

it('detects OS-level blocking even when Android runtime permission reports granted', async () => {
  const { getPushStatus } = await import('./capacitor-push')
  mocks.areEnabled.mockResolvedValue({ value: false })
  expect((await getPushStatus()).state).toBe('blocked')
  expect(mocks.getToken).not.toHaveBeenCalled()
})

it('detects a disabled Android notification channel', async () => {
  const { getPushStatus } = await import('./capacitor-push')
  mocks.listChannels.mockResolvedValue({ channels: [{ id: 'push-notifications', importance: 0 }] })
  expect(await getPushStatus()).toMatchObject({ state: 'blocked', message: expect.stringContaining('category is off') })
})

it('reads the persisted opt-out without creating a token', async () => {
  const push = await import('./capacitor-push')
  await push.unregisterFCM()
  expect((await push.getPushStatus()).state).toBe('disabled')
  expect(mocks.getToken).not.toHaveBeenCalled()
})

it('disables only the current user and device, preserving other device rows', async () => {
  const push = await import('./capacitor-push')
  await push.disablePushForCurrentDevice()
  expect(mocks.cleanup).toHaveBeenCalledWith({ user_id: 'user-a', fcm_token: 'device-token' })
  expect(mocks.deleteToken).toHaveBeenCalledOnce()
  expect(push.isPushDisabled()).toBe(true)
})
