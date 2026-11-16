import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { CustomerTable } from './customer-table'
import { CustomerFilters } from './customer-filters'
import type { CustomerSummary } from '@/lib/admin-directory'

const mocks = vi.hoisted(() => ({ push: vi.fn(), params: new URLSearchParams() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }), useSearchParams: () => mocks.params }))
let container: HTMLDivElement, root: Root
beforeEach(() => {
    vi.clearAllMocks(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    mocks.params = new URLSearchParams()
    container = document.createElement('div'); document.body.append(container); root = createRoot(container)
})
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals() })
const customer = (orders: number, name: string): CustomerSummary => ({
    id: String(orders), full_name: name, phone: '+91 9876543210', email: `${name}@example.test`,
    created_at: '2026-11-11T18:30:00Z', order_count: orders, order_value: orders * 100,
})

it('distinguishes leads, first-time and repeat customers using aggregate order counts', async () => {
    await act(async () => root.render(<CustomerTable customers={[customer(0, 'Lead'), customer(1, 'Anita'), customer(2, 'Repeat')]} />))
    const rows = container.querySelectorAll('tbody tr')
    expect(rows[0]).toHaveTextContent('Lead')
    expect(rows[1]).toHaveTextContent('First-time')
    expect(rows[1]).not.toHaveTextContent('Repeat')
    expect(rows[2]).toHaveTextContent('Repeat')
    expect(rows[1]).toHaveTextContent('Anita@example.test')
    expect(rows[1]).toHaveTextContent('+91 9876543210')
    expect(rows[1]).toHaveTextContent('12 Nov 2026')
    expect(rows[1].querySelector('a')).toHaveAttribute('href', '/admin/customers/1')
})

it('shows an explicit empty state', async () => {
    await act(async () => root.render(<CustomerTable customers={[]} />))
    expect(container).toHaveTextContent('No customers match these filters')
})

it('submits search and both joined dates together while resetting pagination', async () => {
    mocks.params = new URLSearchParams('page=9&q=old')
    await act(async () => root.render(<CustomerFilters />))
    container.querySelector<HTMLInputElement>('[name=q]')!.value = '  anita@example.test  '
    container.querySelector<HTMLInputElement>('[name=from]')!.value = '2026-11-01'
    container.querySelector<HTMLInputElement>('[name=to]')!.value = '2026-11-12'
    await act(async () => container.querySelector('form')!.requestSubmit())
    expect(mocks.push).toHaveBeenCalledWith('/admin/customers?q=anita%40example.test&from=2026-11-01&to=2026-11-12')
})

it('syncs filter fields after back/forward navigation and provides clear filters', async () => {
    mocks.params = new URLSearchParams('q=first')
    await act(async () => root.render(<CustomerFilters />))
    expect(container.querySelector<HTMLInputElement>('[name=q]')!.value).toBe('first')
    mocks.params = new URLSearchParams('q=second&from=2026-11-01')
    await act(async () => root.render(<CustomerFilters />))
    expect(container.querySelector<HTMLInputElement>('[name=q]')!.value).toBe('second')
    expect(container.querySelector('a')).toHaveAttribute('href', '/admin/customers')
})
