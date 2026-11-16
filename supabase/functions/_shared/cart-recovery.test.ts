import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createRecoveryHandler, recoveryPayload, sendCartRecoveryEmail } from './cart-recovery'

const fetchMock = vi.fn()
const message = { email: 'anita@example.test', userName: 'Anita', itemCount: 3, itemNames: 'Lipstick', recoveryKey: 'cart-recovery/00000000-0000-0000-0000-000000000001' }
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal('fetch', fetchMock); fetchMock.mockResolvedValue(new Response('{}', { status: 200 })) })
afterEach(() => vi.unstubAllGlobals())
const handler = createRecoveryHandler({ serviceKey: 'service-secret', apiKey: 'provider-secret' })
function request(body: unknown = message, key = 'service-secret') { return new Request('https://function.test', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: JSON.stringify(body) }) }

it('rejects public/anonymous callers before parsing or sending', async () => {
    expect((await handler(request(message, 'public-anon-key'))).status).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
})
it('uses a stable duplicate-send key and canonical cart link', async () => {
    await sendCartRecoveryEmail(message, 'provider-secret')
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.resend.com/emails')
    expect(options.headers['Idempotency-Key']).toBe(message.recoveryKey)
    expect(JSON.parse(options.body).html).toContain('https://themakeupstorewangkhei.com/cart')
    expect((await handler(request())).status).toBe(200)
    expect(fetchMock.mock.calls[1][1].body).toBe(options.body)
})
it('escapes customer and product names in email HTML', () => {
    const payload = recoveryPayload({ ...message, userName: '<script>x</script>', itemNames: '<a href="x">Gift & more</a>' })
    expect(payload.html).not.toContain('<script>')
    expect(payload.html).toContain('&lt;script&gt;')
    expect(payload.html).toContain('Gift &amp; more')
})
it.each([null, { ...message, itemCount: 0 }, { ...message, itemCount: 1.5 }, { ...message, recoveryKey: 'arbitrary' }, { ...message, email: 'bad' }])('rejects malformed email requests', async body => {
    expect((await handler(request(body))).status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
})
it('reports provider rejection and ambiguous network failures', async () => {
    fetchMock.mockResolvedValueOnce(new Response('Rate limited', { status: 429 }))
    expect((await handler(request())).status).toBe(429)
    fetchMock.mockRejectedValueOnce(new Error('Connection lost'))
    expect((await handler(request())).status).toBe(503)
})
it('fails closed when service credentials or email settings are missing', async () => {
    expect((await createRecoveryHandler({})(request())).status).toBe(503)
    expect(fetchMock).not.toHaveBeenCalled()
})
