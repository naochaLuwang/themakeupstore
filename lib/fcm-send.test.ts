// @vitest-environment node
import { generateKeyPairSync } from 'node:crypto'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const credentials = JSON.stringify({
  project_id: 'the-makeup-store-7dad3',
  client_email: 'test@example.test',
  private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
})
let fetchMock: ReturnType<typeof vi.fn>
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('FIREBASE_SERVICE_ACCOUNT_KEY', credentials)
  fetchMock = vi.fn().mockResolvedValue(response({ name: 'accepted' }))
  fetchMock.mockResolvedValueOnce(response({ access_token: 'test-access-token', expires_in: 3600 }))
  vi.stubGlobal('fetch', fetchMock)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('FCM HTTP v1 sender', () => {
  it.each(['device', 'topic', 'multicast'])('sends valid Android wire fields for %s messages', async kind => {
    const fcm = await import('./fcm-send')
    if (kind === 'device') await fcm.sendFcmNotification('token', 'Order', 'Confirmed', '/profile/orders/123')
    if (kind === 'topic') await fcm.sendFcmToTopic('announcements', 'Order', 'Confirmed', '/profile/orders/123')
    if (kind === 'multicast') await fcm.sendFcmMulticast(['token'], 'Order', 'Confirmed', '/profile/orders/123')
    const payload = JSON.parse(fetchMock.mock.calls[1][1].body)
    expect(payload.message.android).toEqual({
      priority: 'HIGH',
      notification: {
        sound: 'default', notification_priority: 'PRIORITY_HIGH', default_sound: true,
        channel_id: 'push-notifications', icon: 'ic_stat_icon',
      },
    })
    expect(payload.message.data.url).toBe('/profile/orders/123')
  })

  it('deduplicates tokens and reuses the OAuth access token', async () => {
    const { sendFcmMulticast } = await import('./fcm-send')
    expect((await sendFcmMulticast(['a', 'a', 'b', ''], 'Title', 'Body')).sentCount).toBe(2)
    await sendFcmMulticast(['c'], 'Title', 'Body')
    expect(fetchMock).toHaveBeenCalledTimes(4) // one OAuth request, three device requests
  })

  it('does not turn a rejected payload into a successful zero-device broadcast', async () => {
    const { sendFcmMulticast } = await import('./fcm-send')
    fetchMock.mockResolvedValueOnce(response({ error: { status: 'INVALID_ARGUMENT', message: 'Unknown field' } }, 400))
    await expect(sendFcmMulticast(['a'], 'Title', 'Body')).rejects.toThrow('Unknown field')
  })

  it('does not delete device tokens for generic project/endpoint 404s', async () => {
    const { sendFcmMulticast } = await import('./fcm-send')
    fetchMock.mockResolvedValueOnce(response({ error: { status: 'NOT_FOUND', message: 'Project not found' } }, 404))
    await expect(sendFcmMulticast(['a'], 'Title', 'Body')).rejects.toThrow('Project not found')
  })

  it('marks only explicitly unregistered tokens for deletion and counts partial failures', async () => {
    const { sendFcmMulticast } = await import('./fcm-send')
    fetchMock.mockResolvedValueOnce(response({ name: 'accepted' }))
    fetchMock.mockResolvedValueOnce(response({ error: { details: [{
      '@type': 'type.googleapis.com/google.firebase.fcm.v1.FcmError', errorCode: 'UNREGISTERED',
    }] } }, 404))
    fetchMock.mockResolvedValueOnce(response({ error: { status: 'UNAVAILABLE' } }, 503))
    expect(await sendFcmMulticast(['good', 'expired', 'retry'], 'Title', 'Body')).toEqual({
      sentCount: 1, invalidTokens: ['expired'], failedCount: 2,
    })
  })

  it('does not authenticate when no tokens exist', async () => {
    const { sendFcmMulticast } = await import('./fcm-send')
    expect(await sendFcmMulticast([], 'Title', 'Body')).toEqual({ sentCount: 0, invalidTokens: [], failedCount: 0 })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
