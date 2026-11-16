import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { transpileModule, ModuleKind, ScriptTarget } from 'typescript'
import { beforeEach, expect, it, vi } from 'vitest'

// Execute the real Deno entry point with its imports and environment supplied by
// the harness. No provider, database or HTTP server is contacted.
const source = transpileModule(readFileSync(resolve('supabase/functions/scheduled-abandoned-cart/index.ts'), 'utf8'), {
    compilerOptions: { module: ModuleKind.ESNext, target: ScriptTarget.ES2022 },
}).outputText.replace(/^import .*;?\r?\n/gm, '')
const id = '00000000-0000-0000-0000-000000000001'
const cart = { id, user_id: id, updated_at: '2026-01-01T00:00:00Z', profiles: { full_name: 'Anita' }, cart_items: [{ quantity: 3, products: { name: 'Lipstick' } }] }
const rpc = vi.fn(), from = vi.fn(), contact = vi.fn(), send = vi.fn(), createClient = vi.fn()
const replies: { data: unknown; error: unknown }[] = []
let env: Record<string, string>
let handler: (request: Request) => Promise<Response>
beforeEach(() => {
    vi.clearAllMocks(); replies.length = 0
    env = { CRON_SECRET: 'cron-secret', RESEND_API_KEY: 'provider', SUPABASE_URL: 'https://store.test', SUPABASE_SERVICE_ROLE_KEY: 'service' }
    rpc.mockResolvedValue({ data: { carts: [{ id }] }, error: null })
    contact.mockResolvedValue({ data: { user: { email: 'anita@example.test' } }, error: null })
    send.mockResolvedValue(new Response('{}', { status: 200 }))
    from.mockImplementation(() => {
        const builder: Record<string, unknown> = {}
        for (const method of ['select', 'in', 'lt', 'is', 'gt', 'order', 'limit', 'eq', 'update']) builder[method] = () => builder
        builder.maybeSingle = async () => replies.shift()
        builder.then = (resolve: (reply: unknown) => unknown) => Promise.resolve(replies.shift()).then(resolve)
        return builder
    })
    createClient.mockReturnValue({ rpc, from, auth: { admin: { getUserById: contact } } })
    new Function('serve', 'createClient', 'Deno', 'sendCartRecoveryEmail', source)(
        (callback: typeof handler) => { handler = callback }, createClient, { env: { get: (key: string) => env[key] } }, send,
    )
})
function request(secret = 'cron-secret') { return new Request('https://function.test', { method: 'POST', headers: { 'x-cron-secret': secret } }) }

it('requires the scheduler secret and fails closed when it is absent', async () => {
    expect((await handler(request('wrong'))).status).toBe(401)
    delete env.CRON_SECRET
    expect((await handler(request())).status).toBe(503)
    expect(createClient).not.toHaveBeenCalled()
})
it('uses reachable candidates, fresh cart checks and the same duplicate-send key as manual recovery', async () => {
    replies.push({ data: [cart], error: null }, { data: { id }, error: null }, { data: [{ id }], error: null })
    const response = await handler(request())
    expect(await response.json()).toEqual({ sent: 1, failed: 0, skipped: 0, unconfirmed: 0 })
    expect(rpc).toHaveBeenCalledWith('admin_cart_recovery_directory', { p_status: 'pending', p_page_size: 25, p_recoverable_only: true })
    expect(contact).toHaveBeenCalledWith(id)
    expect(send).toHaveBeenCalledWith({ email: 'anita@example.test', userName: 'Anita', itemCount: 3, itemNames: 'Lipstick', recoveryKey: `cart-recovery/${id}` }, 'provider')
})
it('does not send when a cart was emptied or changed', async () => {
    replies.push({ data: [cart], error: null }, { data: null, error: null })
    expect(await (await handler(request())).json()).toMatchObject({ skipped: 1, sent: 0 })
    expect(send).not.toHaveBeenCalled()
})
it('reports an email accepted but not marked in the database as unconfirmed', async () => {
    replies.push({ data: [cart], error: null }, { data: { id }, error: null }, { data: null, error: { code: 'failed' } })
    expect(await (await handler(request())).json()).toMatchObject({ sent: 0, unconfirmed: 1 })
})
it('reports provider timeouts as unconfirmed rather than sent', async () => {
    replies.push({ data: [cart], error: null }, { data: { id }, error: null })
    send.mockRejectedValueOnce(new Error('Timeout'))
    expect(await (await handler(request())).json()).toMatchObject({ sent: 0, unconfirmed: 1 })
})
it('returns a read error without sending', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { code: 'missing-migration' } })
    expect((await handler(request())).status).toBe(500)
    expect(send).not.toHaveBeenCalled()
})
