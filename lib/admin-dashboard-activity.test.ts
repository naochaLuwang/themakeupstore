import type { SupabaseClient } from '@supabase/supabase-js'
import { beforeEach, expect, it, vi } from 'vitest'
import { isLegacyDashboardActivityError, readDashboardActivity } from './admin-dashboard-activity'

const responses: { data?: unknown; error: unknown; count?: number | null }[] = []
const queries: { table: string; select: ReturnType<typeof vi.fn>; limit: ReturnType<typeof vi.fn> }[] = []
const client = {
    from(table: string) {
        const response = responses.shift()
        const query = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            then: (resolve: (value: unknown) => unknown) => Promise.resolve(response).then(resolve),
        }
        queries.push({ table, select: query.select, limit: query.limit })
        return query
    },
} as unknown as SupabaseClient
beforeEach(() => {
    responses.length = 0
    queries.length = 0
})

it('uses business_name and full counts, then combines the latest six activity events', async () => {
    responses.push(
        { count: 1500, error: null },
        { count: 20, error: null },
        {
            data: Array.from({ length: 6 }, (_, index) => ({
                id: `m${index}`,
                name: 'Customer',
                subject: 'Question',
                created_at: `2026-11-12T0${index}:00:00Z`,
            })),
            error: null,
        },
        {
            data: Array.from({ length: 6 }, (_, index) => ({
                id: `w${index}`,
                business_name: `Studio ${index}`,
                created_at: `2026-11-13T0${index}:00:00Z`,
            })),
            error: null,
        }
    )
    const result = await readDashboardActivity(client)
    expect(result.unread).toBe(1500)
    expect(result.wholesale).toBe(20)
    expect(result.events).toHaveLength(6)
    expect(result.events[0]).toMatchObject({ name: 'Studio 5', kind: 'wholesale' })
    expect(queries[3].table).toBe('wholesale_applications')
    expect(queries[3].select).toHaveBeenCalledWith('id,business_name,created_at')
    expect(queries[2].limit).toHaveBeenCalledWith(6)
    expect(queries[3].limit).toHaveBeenCalledWith(6)
})
it('does not fabricate zero counts when a read fails', async () => {
    responses.push(
        { error: { code: '42501' }, count: null },
        { count: 1, error: null },
        { data: [], error: null },
        { data: [], error: null }
    )
    await expect(readDashboardActivity(client)).rejects.toEqual({ code: '42501' })
})
it('rejects incomplete count responses while accepting genuine empty activity', async () => {
    responses.push(
        { count: null, error: null },
        { count: 0, error: null },
        { data: [], error: null },
        { data: [], error: null }
    )
    await expect(readDashboardActivity(client)).rejects.toThrow('Incomplete activity')
    responses.push(
        { count: 0, error: null },
        { count: 0, error: null },
        { data: [], error: null },
        { data: [], error: null }
    )
    expect(await readDashboardActivity(client)).toEqual({ unread: 0, wholesale: 0, events: [] })
})
it('limits compatibility to the confirmed legacy column error', () => {
    expect(
        isLegacyDashboardActivityError({ code: '42703', message: 'column "company_name" does not exist' })
    ).toBe(true)
    expect(
        isLegacyDashboardActivityError({ code: '42703', message: 'column "business_name" does not exist' })
    ).toBe(false)
    expect(isLegacyDashboardActivityError({ code: '42501', message: 'company_name permission denied' })).toBe(
        false
    )
    expect(isLegacyDashboardActivityError(null)).toBe(false)
})
