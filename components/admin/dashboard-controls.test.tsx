import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { RecentOrdersTable } from './recent-orders-table'
import { DateRangePicker } from './date-range-picker'
import { DashboardOrderFilter, DashboardRefresh } from '@/app/admin/dashboard-refresh'
import { dashboardOrder } from '@/lib/admin-dashboard.test-fixtures'

const mocks = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), params: new URLSearchParams() }))
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
    useSearchParams: () => mocks.params,
}))
let container: HTMLDivElement, root: Root
beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    mocks.params = new URLSearchParams('from=2026-11-01&to=2026-11-13&queue=refund&page=3')
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
})
afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
    vi.useRealTimers()
})
function button(label: string) {
    const element = [...document.querySelectorAll('button')].find(
        (element) => element.textContent?.trim() === label || element.getAttribute('aria-label') === label
    )
    if (!element) throw new Error(`Missing button: ${label}`)
    return element
}
async function openOrder() {
    await act(async () => button('Quick view order 10000000').click())
}

it('shows saved shades, gifts, charges, credits and payment balances in the existing quick view', async () => {
    await act(async () => root.render(<RecentOrdersTable orders={[dashboardOrder]} />))
    await openOrder()
    const dialog = document.querySelector('[role=dialog]')!
    expect(dialog).toHaveTextContent('Rose · Qty 2')
    expect(dialog).toHaveTextContent('Free gift')
    expect(dialog).toHaveTextContent('Local delivery')
    expect(dialog).toHaveTextContent('BXGY discount')
    expect(dialog).toHaveTextContent('Gift card')
    expect(dialog).toHaveTextContent('Coins')
    expect(dialog).toHaveTextContent('Payments retained')
    expect(dialog).toHaveTextContent('Refund due')
    expect(dialog.querySelector(`a[href="/admin/orders/${dashboardOrder.id}"]`)).toHaveTextContent(
        'Open order'
    )
    expect(dialog.querySelector(`a[href="/admin/orders/${dashboardOrder.id}/edit"]`)).toHaveTextContent(
        'Edit order'
    )
})
it('does not invent a discount from delivery charges and suppresses editing after cancellation', async () => {
    const order = {
        ...dashboardOrder,
        status: 'cancelled',
        total: 650,
        promo_discount_amount: 0,
        bxgy_discount_amount: 0,
        gift_card_discount: 0,
        coin_discount_amount: 0,
    }
    await act(async () => root.render(<RecentOrdersTable orders={[order]} />))
    await openOrder()
    const dialog = document.querySelector('[role=dialog]')!
    const coupon = [...dialog.querySelectorAll('div')].find((element) =>
        element.firstElementChild?.textContent?.startsWith('Coupon discount')
    )!
    expect(coupon).toHaveTextContent('₹0')
    expect(dialog.querySelector('a[href$="/edit"]')).not.toBeInTheDocument()
})
it('keeps unknown payment balances explicit and refreshes the selected order by ID', async () => {
    await act(async () => root.render(<RecentOrdersTable orders={[{ ...dashboardOrder, retained: null }]} />))
    await openOrder()
    expect(document.querySelector('[role=dialog]')).toHaveTextContent('Unknown')
    await act(async () =>
        root.render(<RecentOrdersTable orders={[{ ...dashboardOrder, total: 700, retained: 700 }]} />)
    )
    expect(document.querySelector('[role=dialog]')).toHaveTextContent('₹700')
    await act(async () => root.render(<RecentOrdersTable orders={[]} />))
    expect(document.querySelector('[role=dialog]')).not.toBeInTheDocument()
})
it('includes readable pickup statuses and a proper empty state', async () => {
    await act(async () =>
        root.render(<RecentOrdersTable orders={[{ ...dashboardOrder, status: 'ready_for_pickup' }]} />)
    )
    expect(container).toHaveTextContent('Ready for Pickup')
    await act(async () => root.render(<RecentOrdersTable orders={[]} />))
    expect(container).toHaveTextContent('No orders')
})
it('applies exact IST date presets while preserving queue filters and resetting the page', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-12T20:00:00Z'))
    await act(async () => root.render(<DateRangePicker from="2026-11-01" to="2026-11-13" />))
    await act(async () => button('Date range: 2026-11-01 to 2026-11-13').click())
    await act(async () => button('7 days').click())
    expect(mocks.push).toHaveBeenCalledWith('/admin?from=2026-11-07&to=2026-11-13&queue=refund')
})
it('refreshes the dashboard without losing the active URL and exposes the request time', async () => {
    await act(async () => root.render(<DashboardRefresh asOf="2026-11-12T18:30:00Z" />))
    expect(container).toHaveTextContent('13 Nov 2026')
    await act(async () => button('Refresh').click())
    expect(mocks.refresh).toHaveBeenCalledOnce()
    expect(mocks.push).not.toHaveBeenCalled()
})

it('switches order statuses in place while preserving dates and clearing queues/pages', async () => {
    await act(async () =>
        root.render(
            <DashboardOrderFilter
                params={{ from: '2026-11-01', to: '2026-11-13', queue: 'refund', page: '3' }}
                statuses={[{ value: 'confirmed', label: 'Confirmed', count: 7 }]}
                status=""
                queueLabel="Refunds due"
            />
        )
    )
    const select = container.querySelector('select')!
    expect(select).toHaveValue('__queue__')
    await act(async () => {
        select.value = 'confirmed'
        select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(mocks.push).toHaveBeenLastCalledWith('/admin?from=2026-11-01&to=2026-11-13&status=confirmed')
    await act(async () => {
        select.value = ''
        select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(mocks.push).toHaveBeenLastCalledWith('/admin?from=2026-11-01&to=2026-11-13')
})
