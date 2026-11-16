import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import AdminDashboard from './page'
import { dashboardOrder, dashboardSections } from '@/lib/admin-dashboard.test-fixtures'
import type { DashboardParams } from '@/lib/admin-dashboard'

const mocks = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@/app/actions/admin-dashboard', () => ({ getAdminDashboard: mocks.get }))
vi.mock('next/navigation', () => ({
    useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
    useSearchParams: () => new URLSearchParams(),
}))
vi.mock('next/dynamic', () => ({ default: () => () => <div>Trend chart</div> }))
let container: HTMLDivElement, root: Root
beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    mocks.get.mockResolvedValue({
        sections: structuredClone(dashboardSections),
        range: { from: '2026-11-01', to: '2026-11-13', previousFrom: '2026-10-19', previousTo: '2026-10-31' },
        asOf: '2026-11-13T10:00:00Z',
        filters: { status: '', queue: '', page: 2 },
    })
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
})
afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
})
async function render(params: DashboardParams = {}) {
    const page = await AdminDashboard({
        searchParams: Promise.resolve({ from: '2026-11-01', to: '2026-11-13', page: '2', ...params }),
    })
    await act(async () => root.render(page))
}

it('renders genuine comparison, distinct money figures, complete pipeline and scoped drilldowns', async () => {
    await render()
    expect(container).toHaveTextContent('Payments retained')
    expect(container).toHaveTextContent('+50.0%')
    expect(container).toHaveTextContent('Ready for Pickup')
    expect(container).toHaveTextContent('Picked Up')
    expect(container).toHaveTextContent('Out for Delivery')
    expect(container).toHaveTextContent('Failed Delivery')
    const links = [...container.querySelectorAll('a')].map((link) => link.getAttribute('href'))
    expect(links).toContain('/admin?from=2026-11-01&to=2026-11-13&queue=refund')
    expect(
        container.querySelector('[aria-label="Order status"] option[value="confirmed"]')
    ).toHaveTextContent('Confirmed')
    expect(links).toContain('/admin/inventory?stock=out&q=LIP-ROSE')
    expect(container).toHaveTextContent('Page views · 24h')
    expect(container).not.toHaveTextContent('Purchase conversion unavailable')
    expect(container).not.toHaveTextContent('Compared with')
    expect(container).not.toHaveTextContent('Order value excludes cancellations')
    expect(container.querySelector('details')).toBeNull()
    expect(container.querySelector('[aria-label="Payment methods"]')).toBeVisible()
    expect(container.querySelectorAll('table')).toHaveLength(1)
    expect(container.querySelectorAll('button[aria-label="Quick view order 10000000"]')).toHaveLength(1)
    expect(container.querySelector('[aria-label="Dashboard order pages"]')).toBeNull()
    const regions = [...container.querySelectorAll('section[aria-label]')].map((section) =>
        section.getAttribute('aria-label')
    )
    expect(regions.indexOf('Order trends')).toBeLessThan(regions.indexOf('Order queue'))
})
it('replaces recent orders with the selected queue and preserves dates when paging or clearing it', async () => {
    const response = await mocks.get()
    response.filters.queue = 'refund'
    response.sections.operations.data.orders = [{ ...dashboardOrder, customer_name: 'Refund customer' }]
    mocks.get.mockResolvedValueOnce(response)
    await render({ queue: 'refund' })
    expect(container.querySelectorAll('table')).toHaveLength(1)
    const table = container.querySelector('table')!
    expect(table).toHaveTextContent('Refund customer')
    expect(table).not.toHaveTextContent('Anita')
    expect(container.querySelector('[aria-label="Dashboard order pages"]')).toHaveTextContent('Page 2 of 3')
    const links = [...container.querySelectorAll('a')].map((link) => link.getAttribute('href'))
    const nextHref = [...container.querySelectorAll('a')]
        .find((link) => link.textContent === 'Next')!
        .getAttribute('href')!
    expect(Object.fromEntries(new URL(nextHref, 'https://store.test').searchParams)).toEqual({
        from: '2026-11-01',
        to: '2026-11-13',
        queue: 'refund',
        page: '3',
    })
    expect(links).toContain('/admin?from=2026-11-01&to=2026-11-13')
})
it('keeps recent orders available when the live operations report fails', async () => {
    const response = await mocks.get()
    response.sections.operations = { data: null, error: 'Live operations unavailable.' }
    mocks.get.mockResolvedValueOnce(response)
    await render()
    expect(container.querySelectorAll('table')).toHaveLength(1)
    expect(container.querySelector('table')).toHaveTextContent('Anita')
})
it('does not substitute unrelated recent orders when a selected queue fails', async () => {
    const response = await mocks.get()
    response.filters.queue = 'refund'
    response.sections.operations = { data: null, error: 'Live operations unavailable.' }
    mocks.get.mockResolvedValueOnce(response)
    await render({ queue: 'refund' })
    expect(container.querySelectorAll('table')).toHaveLength(0)
    expect(container).toHaveTextContent('Order filter unavailable')
    expect(container).not.toHaveTextContent('Anita')
})
it('keeps healthy sections visible when money data fails, without displaying a zero revenue card', async () => {
    const response = await mocks.get()
    response.sections.orders = { data: null, error: 'Unable to load this section. Refresh to try again.' }
    mocks.get.mockResolvedValueOnce(response)
    await render()
    expect(container.querySelector('[role=alert]')).toHaveTextContent('orders unavailable')
    expect(container).toHaveTextContent('Financial metrics unavailable')
    expect(container).toHaveTextContent('Out of stock')
    expect(container).not.toHaveTextContent('Today Revenue')
})
it('provides a reset state for invalid dates without making up dashboard numbers', async () => {
    mocks.get.mockRejectedValueOnce(new Error('Choose valid dashboard dates.'))
    await render()
    expect(container.querySelector('[role=alert]')).toHaveTextContent('Choose valid dashboard dates')
    expect(container.querySelector('a[href="/admin"]')).toHaveTextContent('Reset dashboard')
})

it('shows eight correctly formatted metrics and complete management shortcuts without explanatory copy', async () => {
    await render()
    const overview = container.querySelector('[aria-label="Financial overview"]')!
    expect(overview.children).toHaveLength(8)
    expect(overview).toHaveTextContent('Today’s order value')
    expect(overview).toHaveTextContent('12 orders')
    expect(overview).toHaveTextContent('66.7%')
    const actions = container.querySelector('nav[aria-label="Quick actions"]')!
    const hrefs = [...actions.querySelectorAll('a')].map((link) => link.getAttribute('href'))
    expect(hrefs).toEqual([
        '/admin/orders',
        '/admin/inventory',
        '/admin/products',
        '/admin/customers',
        '/admin/purchase',
        '/admin/abandoned-carts',
        '/admin/promos',
        '/admin/flash-sales',
        '/admin/rewards/users',
        '/admin/broadcast',
        '/admin/reports/sales',
        '/admin/shipping',
    ])
    const todayLink = [...overview.querySelectorAll('a')].find((link) =>
        link.textContent?.includes('Today’s order value')
    )!
    expect(todayLink.getAttribute('href')).toBe('/admin?from=2026-11-13&to=2026-11-13#dashboard-orders')
    expect(container).not.toHaveTextContent('Compared with')
})
it('links visible status counts to the one order table and preserves its date range', async () => {
    await render({ queue: 'refund' })
    const pipeline = container.querySelector('[aria-label="Order pipeline"]')!
    const confirmed = [...pipeline.querySelectorAll('a')].find((link) =>
        link.textContent?.includes('Confirmed')
    )!
    expect(confirmed).toHaveTextContent('7')
    expect(confirmed.getAttribute('href')).toBe(
        '/admin?from=2026-11-01&to=2026-11-13&status=confirmed#dashboard-orders'
    )
    expect(container.querySelectorAll('table')).toHaveLength(1)
})
