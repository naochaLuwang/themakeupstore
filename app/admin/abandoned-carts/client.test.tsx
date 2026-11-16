import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { AbandonedCartsClient } from './client'
import type { RecoveryDirectory } from '@/lib/admin-directory'

const mocks = vi.hoisted(() => ({ send: vi.fn(), refresh: vi.fn() }))
vi.mock('@/app/actions/cart', () => ({ sendRecoveryEmails: mocks.send }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh }) }))
const directory: RecoveryDirectory = {
    carts: [
        { id: 'pending', user_id: 'customer1', full_name: 'Anita', phone: '9876543210', email: 'anita@example.test', item_count: 5, updated_at: '2026-11-11T18:30:00Z', abandoned_email_sent_at: null },
        { id: 'sent', user_id: 'customer2', full_name: 'Sent', phone: null, email: 'sent@example.test', item_count: 1, updated_at: '2026-11-11T18:30:00Z', abandoned_email_sent_at: '2026-11-12T00:00:00Z' },
        { id: 'no-email', user_id: 'customer3', full_name: 'No email', phone: null, email: null, item_count: 1, updated_at: '2026-11-11T18:30:00Z', abandoned_email_sent_at: null },
    ], stats: { pending: 103, sent: 15, recent: 80, unreachable: 2 }, total: 118, page: 2, pageSize: 25, totalPages: 5,
}
let container: HTMLDivElement, root: Root
beforeEach(() => {
    vi.clearAllMocks(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    container = document.createElement('div'); document.body.append(container); root = createRoot(container)
})
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals() })
async function render(data = directory, status = 'all') { await act(async () => root.render(<AbandonedCartsClient directory={data} status={status} />)) }
function sendButton() { return [...container.querySelectorAll('button')].find(button => /Send pending|Sending|Refreshing/.test(button.textContent || ''))! }
async function click() { await act(async () => sendButton().click()) }

it('shows global counts, actual units, IST dates and working customer links', async () => {
    await render()
    expect(container).toHaveTextContent('103')
    expect(container).toHaveTextContent('80')
    expect(container).toHaveTextContent('5 items')
    expect(container).toHaveTextContent('12 Nov 2026')
    expect(container.querySelector('a[href="/admin/customers/customer1"]')).toHaveTextContent('Anita')
    expect(sendButton()).toHaveTextContent('Send pending on this page (1)')
})

it('sends only eligible page IDs and immediately shows successful rows while refreshing server data', async () => {
    mocks.send.mockResolvedValueOnce({ sent: 1, failed: 0, skipped: 0, unconfirmed: 0, outcomes: [{ id: 'pending', status: 'sent' }] })
    await render(); await click()
    expect(mocks.send).toHaveBeenCalledWith(['pending'])
    expect(mocks.refresh).toHaveBeenCalledOnce()
    expect(container).toHaveTextContent('Sent just now')
    expect(sendButton()).toBeDisabled()
    expect(container.querySelector('[role=status]')).toHaveTextContent('Sent: 1')
    await render({ ...directory, stats: { ...directory.stats, pending: 102, sent: 16 }, carts: directory.carts.map(cart => cart.id === 'pending' ? { ...cart, abandoned_email_sent_at: '2026-11-12T01:00:00Z' } : cart) })
    expect(container).toHaveTextContent('102')
    expect(sendButton()).toBeDisabled()
})

it('shows partial failures as warnings and lets failed rows be retried', async () => {
    mocks.send.mockResolvedValueOnce({ sent: 0, failed: 1, skipped: 0, unconfirmed: 0, outcomes: [{ id: 'pending', status: 'failed', message: 'Rate limited. Try again.' }] })
    await render(); await click()
    expect(container.querySelector('[role=alert]')).toHaveTextContent('Failed: 1')
    expect(container).toHaveTextContent('Rate limited. Try again.')
    expect(sendButton()).toBeEnabled()
})

it('recovers from a rejected action and blocks automatic retry of unconfirmed sends', async () => {
    mocks.send.mockRejectedValueOnce(new Error('Connection lost'))
    await render(); await click()
    expect(container.querySelector('[role=alert]')).toHaveTextContent('Unable to confirm sending')
    expect(sendButton()).toBeDisabled()
    expect(mocks.refresh).toHaveBeenCalledOnce()
    const review = [...container.querySelectorAll('button')].find(button => button.textContent === 'Enable retry after checking')!
    await act(async () => review.click())
    expect(sendButton()).toBeEnabled()
    expect(mocks.send).toHaveBeenCalledOnce()
})

it('prevents repeated clicks while a send is pending', async () => {
    let finish!: (value: unknown) => void
    mocks.send.mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
    await render(); await click(); await click()
    expect(mocks.send).toHaveBeenCalledOnce()
    expect(sendButton()).toBeDisabled()
    await act(async () => finish({ sent: 1, failed: 0, skipped: 0, unconfirmed: 0, outcomes: [{ id: 'pending', status: 'sent' }] }))
})

it('preserves the table status filter in pagination links', async () => {
    await render(directory, 'pending')
    expect([...container.querySelectorAll('a')].map(link => link.getAttribute('href'))).toContain('/admin/abandoned-carts?status=pending&page=3')
    expect(container.querySelector('a[href="/admin/abandoned-carts?status=pending"]')).toBeInTheDocument()
})
