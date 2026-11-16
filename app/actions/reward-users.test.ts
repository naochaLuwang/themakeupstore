import { beforeEach, expect, it, vi } from 'vitest'
import {
    adminAdjustPoints,
    adminGetAllUsersPoints,
    adminGetUserTransactions,
    backfillDeliveredOrderPoints,
    exportRewardHistory,
    exportRewardUsers,
} from './loyalty'
import { rewardDetail, rewardDirectory, rewardRequest } from '@/lib/reward-users.test-fixtures'
const mocks = vi.hoisted(() => ({ admin: vi.fn(), rpc: vi.fn(), from: vi.fn() }))
vi.mock('@/lib/admin', () => ({ requireAdmin: mocks.admin }))
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }))
beforeEach(() => {
    vi.clearAllMocks()
    mocks.admin.mockResolvedValue({
        supabase: { rpc: mocks.rpc, from: mocks.from },
        user: { id: 'actual-admin' },
    })
    mocks.rpc.mockResolvedValue({
        data: { id: rewardRequest.requestId, amount: 50, balance_before: 100, balance_after: 150 },
        error: null,
    })
})
it('authorizes every rewards read, credit, export and backfill before accessing data', async () => {
    mocks.admin.mockRejectedValue(new Error('Unauthorized'))
    for (const call of [
        () => adminGetAllUsersPoints(),
        () => adminGetUserTransactions(rewardRequest.userId),
        () => adminAdjustPoints(rewardRequest),
        () => exportRewardUsers({}),
        () => exportRewardHistory(rewardRequest.userId, {}),
        () => backfillDeliveredOrderPoints(),
    ])
        await expect(call()).rejects.toThrow('Unauthorized')
    expect(mocks.rpc).not.toHaveBeenCalled()
    expect(mocks.from).not.toHaveBeenCalled()
})
it('credits through one RPC with stable identity, reviewed balance and authenticated actor', async () => {
    expect(await adminAdjustPoints(rewardRequest)).toMatchObject({
        success: true,
        receipt: { amount: 50, balance_after: 150 },
    })
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('credit_reward_user', {
        p_request: rewardRequest.requestId,
        p_user: rewardRequest.userId,
        p_actor: 'actual-admin',
        p_amount: 50,
        p_note: rewardRequest.note,
        p_expected: 100,
    })
    expect(mocks.from).not.toHaveBeenCalled()
})
it('rejects invalid amounts and missing reasons before issuing any write', async () => {
    expect(await adminAdjustPoints({ ...rewardRequest, amount: 1.5 })).toMatchObject({
        success: false,
        uncertain: false,
    })
    expect(await adminAdjustPoints({ ...rewardRequest, note: ' ' })).toMatchObject({
        success: false,
        uncertain: false,
    })
    expect(mocks.rpc).not.toHaveBeenCalled()
})
it('distinguishes stale reviews from uncertain writes and hides raw database errors', async () => {
    mocks.rpc.mockResolvedValueOnce({
        error: { code: 'P0001', message: 'Balance changed. Reload and review the credit again.' },
    })
    expect(await adminAdjustPoints(rewardRequest)).toMatchObject({
        success: false,
        uncertain: false,
        message: expect.stringContaining('Balance changed'),
    })
    mocks.rpc.mockResolvedValueOnce({ error: { code: 'XX000', message: 'private customer details' } })
    const result = await adminAdjustPoints(rewardRequest)
    expect(result).toMatchObject({ success: false, uncertain: true })
    expect(JSON.stringify(result)).not.toContain('private customer')
    mocks.rpc.mockRejectedValueOnce(new Error('Network timeout'))
    expect(await adminAdjustPoints(rewardRequest)).toMatchObject({ success: false, uncertain: true })
})
it('filters and paginates the full directory in the database', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: rewardDirectory })
    expect(
        await adminGetAllUsersPoints({
            q: 'anita@example.test',
            hideZero: '1',
            tier: 'gold',
            spent: 'spent',
            sort: 'pending',
            page: '3',
        })
    ).toEqual(rewardDirectory)
    expect(mocks.rpc).toHaveBeenCalledWith('admin_reward_users', {
        p_search: 'anita@example.test',
        p_tier: 'gold',
        p_spent: 'spent',
        p_hide_zero: true,
        p_sort: 'pending',
        p_page: 3,
        p_size: 25,
    })
})
it('returns actual unavailable states instead of zero balances or empty reports', async () => {
    mocks.rpc.mockResolvedValue({ error: { code: 'missing' } })
    await expect(adminGetAllUsersPoints()).rejects.toThrow('Unable to load reward users')
    await expect(adminGetUserTransactions(rewardRequest.userId)).rejects.toThrow(
        'Unable to load reward history'
    )
})
it('returns null for missing/invalid customers and preserves full transaction summary with filtered rows', async () => {
    expect(await adminGetUserTransactions('bad')).toBeNull()
    expect(mocks.rpc).not.toHaveBeenCalled()
    mocks.rpc.mockResolvedValueOnce({ data: null })
    expect(await adminGetUserTransactions(rewardRequest.userId)).toBeNull()
    mocks.rpc.mockResolvedValueOnce({ data: rewardDetail })
    expect(
        await adminGetUserTransactions(rewardRequest.userId, {
            type: 'spend',
            status: 'available',
            from: '2026-11-01',
            to: '2026-11-13',
            page: '2',
        })
    ).toEqual(rewardDetail)
    expect(mocks.rpc).toHaveBeenLastCalledWith(
        'admin_reward_user',
        expect.objectContaining({
            p_type: 'spend',
            p_status: 'available',
            p_from: '2026-11-01',
            p_to: '2026-11-13',
            p_page: 2,
            p_size: 25,
        })
    )
})
it('exports one complete filtered snapshot and refuses truncation', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: rewardDirectory })
    expect(await exportRewardUsers({ hideZero: '1' })).toContain('anita@example.test')
    expect(mocks.rpc).toHaveBeenLastCalledWith(
        'admin_reward_users',
        expect.objectContaining({ p_hide_zero: true, p_size: 5001, p_page: 1 })
    )
    mocks.rpc.mockResolvedValueOnce({ data: { ...rewardDirectory, total: 5002 } })
    await expect(exportRewardUsers({})).rejects.toThrow('Narrow')
    mocks.rpc.mockResolvedValueOnce({ data: rewardDetail })
    expect(await exportRewardHistory(rewardRequest.userId, { type: 'bonus' })).toContain(
        'Fixture Administrator'
    )
})
it('backfills through the locked transaction without a second balance increment', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: { backfilled: 2, remaining: 5 } })
    expect(await backfillDeliveredOrderPoints()).toEqual({ backfilled: 2, remaining: 5 })
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('backfill_reward_orders', {
        p_actor: 'actual-admin',
        p_limit: 100,
    })
    expect(mocks.from).not.toHaveBeenCalled()
})
