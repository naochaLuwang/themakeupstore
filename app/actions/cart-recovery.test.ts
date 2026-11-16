import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { sendRecoveryEmails } from './cart'
import { sendLiveCartEmail } from './admin-carts'
import { revalidatePath } from 'next/cache'

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), from: vi.fn(), contact: vi.fn(), fetch: vi.fn() }))
vi.mock('@/lib/admin', () => ({ requireAdmin: mocks.requireAdmin }))
vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }))
const first = '00000000-0000-0000-0000-000000000001'
const second = '00000000-0000-0000-0000-000000000002'
const third = '00000000-0000-0000-0000-000000000003'
const candidate = (id = first) => ({ id, user_id: id, updated_at: '2026-01-01T00:00:00Z', profiles: { full_name: 'Anita' }, cart_items: [
    { quantity: 3, products: { name: 'Lipstick' } }, { quantity: 2, products: { name: 'Blush' } },
] })
const replies: { data: unknown; error: unknown }[] = []
const builders: Record<string, ReturnType<typeof vi.fn>>[] = []
function builder() {
    const query: Record<string, ReturnType<typeof vi.fn>> = {}
    for (const method of ['select', 'in', 'lt', 'is', 'gt', 'eq', 'update']) query[method] = vi.fn().mockReturnValue(query)
    query.maybeSingle = vi.fn(async () => replies.shift())
    query.single = vi.fn(async () => replies.shift())
    query.then = vi.fn((resolve: (value: unknown) => unknown) => Promise.resolve(replies.shift()).then(resolve))
    builders.push(query)
    return query
}
beforeEach(() => {
    vi.clearAllMocks()
    replies.length = 0; builders.length = 0
    vi.stubGlobal('fetch', mocks.fetch)
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://store.test')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'server-secret')
    mocks.requireAdmin.mockResolvedValue({ supabase: { from: mocks.from, auth: { admin: { getUserById: mocks.contact } } } })
    mocks.from.mockImplementation(builder)
    mocks.contact.mockResolvedValue({ data: { user: { email: 'anita@example.test' } }, error: null })
    mocks.fetch.mockResolvedValue(new Response('OK', { status: 200 }))
})
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })
function successReplies() { replies.push({ data: [candidate()], error: null }, { data: { id: first }, error: null }, { data: [{ id: first }], error: null }) }

it('requires admin authorization before looking up carts or sending', async () => {
    mocks.requireAdmin.mockRejectedValueOnce(new Error('Unauthorized'))
    await expect(sendRecoveryEmails([first])).rejects.toThrow('Unauthorized')
    expect(mocks.from).not.toHaveBeenCalled()
    expect(mocks.fetch).not.toHaveBeenCalled()
})

it.each([{ ids: ['bad-id'] }, { ids: Array(26).fill(first) }])('rejects invalid or oversized recipient selections', async ({ ids }) => {
    await expect(sendRecoveryEmails(ids)).rejects.toThrow('Select up to 25')
    expect(mocks.fetch).not.toHaveBeenCalled()
})

it('rechecks only requested non-empty, abandoned, unsent carts and counts actual units', async () => {
    successReplies()
    const result = await sendRecoveryEmails([first, first, second])
    expect(result).toMatchObject({ sent: 1, failed: 0, skipped: 1, unconfirmed: 0 })
    expect(builders[0].in).toHaveBeenCalledWith('id', [first, second])
    expect(builders[0].is).toHaveBeenCalledWith('abandoned_email_sent_at', null)
    expect(builders[0].is).toHaveBeenCalledWith('profiles.deleted_at', null)
    expect(builders[0].gt).toHaveBeenCalledWith('cart_items.quantity', 0)
    expect(builders[0].lt).toHaveBeenCalledWith('updated_at', expect.any(String))
    expect(builders[1].eq).toHaveBeenCalledWith('updated_at', candidate().updated_at)
    const [url, options] = mocks.fetch.mock.calls[0]
    expect(url).toBe('https://store.test/functions/v1/send-abandoned-cart')
    expect(options.headers.Authorization).toBe('Bearer server-secret')
    expect(JSON.parse(options.body)).toMatchObject({ email: 'anita@example.test', itemCount: 5, itemNames: 'Blush, Lipstick', recoveryKey: `cart-recovery/${first}` })
    expect(revalidatePath).toHaveBeenCalledWith('/admin/abandoned-carts')
    expect(result).not.toHaveProperty('debug')
})

it('does not send when a cart became active or was emptied after the first read', async () => {
    replies.push({ data: [candidate()], error: null }, { data: null, error: null })
    expect(await sendRecoveryEmails([first])).toMatchObject({ sent: 0, skipped: 1 })
    expect(mocks.fetch).not.toHaveBeenCalled()
})

it('skips carts without an Auth email', async () => {
    replies.push({ data: [candidate()], error: null })
    mocks.contact.mockResolvedValueOnce({ data: { user: { email: null } }, error: null })
    expect(await sendRecoveryEmails([first])).toMatchObject({ skipped: 1, sent: 0 })
    expect(mocks.fetch).not.toHaveBeenCalled()
})

it('fails the read without sending or fabricating an empty result', async () => {
    replies.push({ data: null, error: { code: 'PGRST200' } })
    await expect(sendRecoveryEmails([first])).rejects.toThrow('No emails were sent')
    expect(mocks.fetch).not.toHaveBeenCalled()
})

it('distinguishes provider rejection from an unconfirmed timeout and continues the batch', async () => {
    replies.push({ data: [candidate(first), candidate(second), candidate(third)], error: null },
        { data: { id: first }, error: null }, { data: { id: second }, error: null },
        { data: { id: third }, error: null }, { data: [{ id: third }], error: null })
    mocks.fetch.mockResolvedValueOnce(new Response('Rejected', { status: 429 }))
        .mockRejectedValueOnce(new Error('Timeout')).mockResolvedValueOnce(new Response('OK'))
    const result = await sendRecoveryEmails([first, second, third])
    expect(result).toMatchObject({ sent: 1, failed: 1, skipped: 0, unconfirmed: 1 })
    expect(result.outcomes.map(item => item.status)).toEqual(['failed', 'unconfirmed', 'sent'])
    expect(builders.filter(query => query.update.mock.calls.length)).toHaveLength(1)
})

it('does not claim success if the sent timestamp cannot be persisted', async () => {
    replies.push({ data: [candidate()], error: null }, { data: { id: first }, error: null }, { data: null, error: { code: 'write-failed' } })
    const result = await sendRecoveryEmails([first])
    expect(result).toMatchObject({ sent: 0, unconfirmed: 1 })
    expect(result.outcomes[0].message).toContain('Email accepted')
})

it('treats server failures as unconfirmed and never marks them sent', async () => {
    replies.push({ data: [candidate()], error: null }, { data: { id: first }, error: null })
    mocks.fetch.mockResolvedValueOnce(new Response('Unknown', { status: 503 }))
    expect(await sendRecoveryEmails([first])).toMatchObject({ sent: 0, unconfirmed: 1 })
    expect(builders).toHaveLength(2)
})

it('keeps the live-cart email action compatible with the server-authenticated endpoint', async () => {
    replies.push({ data: candidate(), error: null })
    expect(await sendLiveCartEmail(first)).toEqual({ success: true })
    const options = mocks.fetch.mock.calls[0][1]
    expect(options.headers.Authorization).toBe('Bearer server-secret')
    expect(JSON.parse(options.body)).toMatchObject({ itemCount: 5, email: 'anita@example.test', recoveryKey: `live-cart/${first}/${candidate().updated_at}` })
})
