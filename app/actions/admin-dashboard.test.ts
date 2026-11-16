import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { getAdminDashboard } from './admin-dashboard'
import { dashboardChange, dashboardFilters, dashboardHref, dashboardRange } from '@/lib/admin-dashboard'

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), rpc: vi.fn(), readActivity: vi.fn() }))
vi.mock('@/lib/admin', () => ({ requireAdmin: mocks.requireAdmin }))
vi.mock('@/lib/admin-dashboard-activity', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/admin-dashboard-activity')>()),
    readDashboardActivity: mocks.readActivity,
}))
beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-12T20:00:00Z'))
    mocks.requireAdmin.mockResolvedValue({ supabase: { rpc: mocks.rpc } })
    mocks.rpc.mockResolvedValue({ data: { valid: true }, error: null })
    mocks.readActivity.mockReset()
})
afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
})

it('requires admin authorization before requesting dashboard data', async () => {
    mocks.requireAdmin.mockRejectedValueOnce(new Error('Unauthorized'))
    await expect(getAdminDashboard()).rejects.toThrow('Unauthorized')
    expect(mocks.rpc).not.toHaveBeenCalled()
})
it('uses one as-of timestamp and parallel, independent service-only sections', async () => {
    const result = await getAdminDashboard({
        from: '2026-11-12',
        to: '2026-11-12',
        status: 'picked_up',
        page: '2',
    })
    expect(mocks.rpc).toHaveBeenCalledTimes(5)
    expect(mocks.rpc).toHaveBeenCalledWith(
        'admin_dashboard_section',
        expect.objectContaining({
            p_from: '2026-11-11T18:30:00.000Z',
            p_before: '2026-11-12T18:30:00.000Z',
            p_as_of: '2026-11-12T20:00:00.000Z',
            p_status: 'picked_up',
            p_page: 2,
        })
    )
    expect(result.sections.inventory.error).toBeNull()
})
it('isolates both returned database errors and rejected requests without replacing failures with zero', async () => {
    mocks.rpc.mockImplementation(async (_name: string, args: { p_section: string }) => {
        if (args.p_section === 'orders') return { data: null, error: { code: 'missing-table' } }
        if (args.p_section === 'inventory') throw new Error('Timed out')
        return { data: { count: 12 }, error: null }
    })
    const result = await getAdminDashboard()
    expect(result.sections.orders.data).toBeNull()
    expect(result.sections.inventory.error).toContain('Unable to load')
    expect(result.sections.operations.data).toEqual({ count: 12 })
})
it('loads activity through the corrected read path when the deployed function still uses company_name', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {})
    const activity = { unread: 3, wholesale: 2, events: [] }
    mocks.rpc.mockImplementation(async (_name: string, args: { p_section: string }) =>
        args.p_section === 'activity'
            ? { data: null, error: { code: '42703', message: 'column "company_name" does not exist' } }
            : { data: { valid: true }, error: null }
    )
    mocks.readActivity.mockResolvedValueOnce(activity)
    const report = await getAdminDashboard()
    expect(report.sections.activity).toEqual({ data: activity, error: null })
    expect(mocks.readActivity).toHaveBeenCalledOnce()
    expect(warn).not.toHaveBeenCalled()
    expect(errorLog).not.toHaveBeenCalled()
})
it('logs a plain section/code diagnostic without serializing database messages or customer data', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.rpc.mockImplementation(async (_name: string, args: { p_section: string }) =>
        args.p_section === 'activity'
            ? {
                  data: null,
                  error: {
                      code: '42703',
                      message: 'column business_name does not exist: private@example.test',
                      details: 'sensitive',
                  },
              }
            : { data: { valid: true }, error: null }
    )
    const report = await getAdminDashboard()
    expect(report.sections.activity.data).toBeNull()
    expect(mocks.readActivity).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledExactlyOnceWith('[Admin dashboard] activity unavailable (42703)')
    expect(errorLog).not.toHaveBeenCalled()
})
it('keeps a real error state if the compatibility read also fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    mocks.rpc.mockImplementation(async (_name: string, args: { p_section: string }) =>
        args.p_section === 'activity'
            ? { data: null, error: { code: '42703', message: 'column "company_name" does not exist' } }
            : { data: { valid: true }, error: null }
    )
    mocks.readActivity.mockRejectedValueOnce({ code: '42501', message: 'permission denied' })
    const report = await getAdminDashboard()
    expect(report.sections.activity.data).toBeNull()
    expect(report.sections.activity.error).toContain('Unable to load')
})
it('defaults to exactly 30 IST calendar days and compares the preceding 30 full days', () => {
    const range = dashboardRange({}, new Date('2026-11-12T20:00:00Z'))
    expect(range.from).toBe('2026-10-15')
    expect(range.to).toBe('2026-11-13')
    expect(range.start).toBe('2026-10-14T18:30:00.000Z')
    expect(range.before).toBe('2026-11-13T18:30:00.000Z')
    expect(range.previousFrom).toBe('2026-09-15')
    expect(range.previousTo).toBe('2026-10-14')
})
it('handles single-day and leap-day ranges without dropping a prior day', () => {
    expect(dashboardRange({ from: '2024-02-29', to: '2024-02-29' })).toMatchObject({
        previousFrom: '2024-02-28',
        previousTo: '2024-02-28',
        start: '2024-02-28T18:30:00.000Z',
        before: '2024-02-29T18:30:00.000Z',
    })
})
it.each([
    { from: '2026-02-30' },
    { from: '2026-11-14', to: '2026-11-13' },
    { from: '1900-01-01', to: '2026-11-13' },
])('rejects invalid ranges before querying', async (params) => {
    await expect(getAdminDashboard(params)).rejects.toThrow()
    expect(mocks.rpc).not.toHaveBeenCalled()
})
it('represents zero-baseline growth without fabricated percentages', () => {
    expect(dashboardChange(10, 0)).toBe('New')
    expect(dashboardChange(0, 0)).toBe('—')
    expect(dashboardChange(50, 100)).toBe('-50.0%')
})
it('keeps dates while changing queues, and rejects invalid filter names', () => {
    expect(
        dashboardHref(
            { from: '2026-11-01', to: '2026-11-13', status: 'pending', page: '3' },
            { queue: 'refund', status: undefined, page: undefined }
        )
    ).toBe('/admin?from=2026-11-01&to=2026-11-13&queue=refund')
    expect(dashboardFilters({ status: 'anything', queue: '__proto__', page: 'Infinity' })).toEqual({
        status: '',
        queue: '',
        page: 1,
    })
})
