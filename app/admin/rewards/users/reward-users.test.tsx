import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AdjustPointsForm } from './[userId]/adjust-points-form'
import { AdminRewardsUsersClient } from './client'
import { RewardUserDetailClient } from './[userId]/user-detail-client'
import AdminRewardsUsersPage from './page'
import AdminRewardsUserDetailPage from './[userId]/page'
import { rewardDetail, rewardDirectory, rewardRequest, rewardUser } from '@/lib/reward-users.test-fixtures'
const mocks = vi.hoisted(() => ({ adjust: vi.fn(), refresh: vi.fn(), directory: vi.fn(), detail: vi.fn() }))
vi.mock('next/navigation', () => ({
    useRouter: () => ({ refresh: mocks.refresh }),
    notFound: () => {
        throw new Error('NEXT_NOT_FOUND')
    },
}))
vi.mock('@/app/actions/loyalty', () => ({
    adminAdjustPoints: mocks.adjust,
    adminGetAllUsersPoints: mocks.directory,
    adminGetUserTransactions: mocks.detail,
    exportRewardUsers: vi.fn(),
    exportRewardHistory: vi.fn(),
}))
let container: HTMLDivElement, root: Root
beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
})
afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
})
const button = (text: string) =>
    [...container.querySelectorAll('button')].find((b) => b.textContent === text)!
async function click(text: string) {
    await act(async () => button(text).click())
}
async function input(label: string, value: string) {
    const el = container.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[aria-label="${label}"]`)!
    await act(async () => {
        Object.getOwnPropertyDescriptor(
            el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
            'value'
        )!.set!.call(el, value)
        el.dispatchEvent(new Event('input', { bubbles: true }))
    })
}
async function form() {
    await act(async () =>
        root.render(
            <AdjustPointsForm
                userId={rewardUser.user_id}
                customerName={rewardUser.full_name}
                currentBalance={100}
            />
        )
    )
    await input('Coins to credit', '50')
    await input('Credit reason', 'Fixture reason')
    await act(async () =>
        container
            .querySelector('form')!
            .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    )
}
it('reviews the recipient, reason and before/after balance before issuing a credit', async () => {
    await form()
    expect(mocks.adjust).not.toHaveBeenCalled()
    expect(container).toHaveTextContent('Anita Fixture')
    expect(container).toHaveTextContent('100')
    expect(container).toHaveTextContent('150')
    expect(container).toHaveTextContent('Fixture reason')
})
it('recovers from rejected requests and retries the exact same credit without unlocking edit controls', async () => {
    mocks.adjust
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({
            success: true,
            receipt: {
                id: rewardRequest.requestId,
                user_id: rewardUser.user_id,
                amount: 50,
                balance_before: 100,
                balance_after: 150,
                created_at: '2026-11-13T08:00:00Z',
            },
        })
    await form()
    await click('Confirm credit')
    expect(button('Retry same credit')).toBeEnabled()
    expect(button('Edit credit')).toBeDisabled()
    expect(container.querySelector('[role="alert"]')).toHaveTextContent('Unable to confirm')
    await click('Retry same credit')
    expect(mocks.adjust.mock.calls[1]).toEqual(mocks.adjust.mock.calls[0])
    expect(container.querySelector('[role="status"]')).toHaveTextContent('Credited 50 coins')
    expect(container).toHaveTextContent(rewardRequest.requestId)
})
it('requires a new review after a known stale-balance rejection', async () => {
    mocks.adjust.mockResolvedValueOnce({
        success: false,
        uncertain: false,
        message: 'Balance changed. Reload and review the credit again.',
    })
    await form()
    await click('Confirm credit')
    expect(container.querySelector('form')).not.toBeNull()
    expect(container.querySelector('[role="alert"]')).toHaveTextContent('Balance changed')
    expect(mocks.refresh).toHaveBeenCalledOnce()
    expect(button('Review credit')).toBeEnabled()
})
it('prevents duplicate clicks while a credit is pending', async () => {
    let resolve!: (value: unknown) => void
    mocks.adjust.mockImplementation(
        () =>
            new Promise((r) => {
                resolve = r
            })
    )
    await form()
    await act(async () => {
        button('Confirm credit').click()
        button('Confirm credit').click()
    })
    expect(mocks.adjust).toHaveBeenCalledOnce()
    await act(async () => resolve({ success: false, uncertain: true, message: 'Check the credit history.' }))
    expect(button('Retry same credit')).toBeEnabled()
})
it('keeps zero filtering active with search and preserves all filters when paging', async () => {
    await act(async () =>
        root.render(
            <AdminRewardsUsersClient
                report={rewardDirectory}
                filters={{
                    q: 'anita@example.test',
                    hideZero: true,
                    tier: 'bronze',
                    spent: 'spent',
                    sort: 'name',
                    page: 2,
                }}
            />
        )
    )
    expect(container.querySelector('input[name="hideZero"]')).toBeChecked()
    const next = [...container.querySelectorAll('a')].find((a) => a.textContent === 'Next')!
    expect(Object.fromEntries(new URL(next.href).searchParams)).toEqual({
        q: 'anita@example.test',
        hideZero: '1',
        tier: 'bronze',
        spent: 'spent',
        sort: 'name',
        page: '3',
    })
    expect(container).toHaveTextContent('1,881 matching customers')
})
it('shows full-history totals and recorded admin identity independently of the visible page', async () => {
    await act(async () =>
        root.render(
            <RewardUserDetailClient
                data={rewardDetail}
                filters={{ type: 'bonus', status: 'available', from: '', to: '', page: 2 }}
            />
        )
    )
    const cards = [...container.querySelectorAll('dl>div')]
    expect(cards.find((card) => card.textContent?.includes('Coins spent'))).toHaveTextContent('50')
    expect(container).toHaveTextContent('252 matching transactions')
    expect(container).toHaveTextContent('Admin: Fixture Administrator')
    expect(container).toHaveTextContent('Page 2 of 11')
})
it('renders failed report states without inventing zero balances', async () => {
    mocks.directory.mockRejectedValueOnce(new Error('Unable to load reward users.'))
    await act(async () =>
        root.render(await AdminRewardsUsersPage({ searchParams: Promise.resolve({ q: 'Anita' }) }))
    )
    expect(container.querySelector('[role="alert"]')).toHaveTextContent('Unable to load')
    expect(container).not.toHaveTextContent('Available coins')
})
it('returns a real not-found state for missing customers', async () => {
    mocks.detail.mockResolvedValueOnce(null)
    await expect(
        AdminRewardsUserDetailPage({
            params: Promise.resolve({ userId: rewardUser.user_id }),
            searchParams: Promise.resolve({}),
        })
    ).rejects.toThrow('NEXT_NOT_FOUND')
})
