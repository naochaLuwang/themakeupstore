import { beforeEach, expect, it, vi } from 'vitest'
import { getCartRecoveryDirectory, getCustomerDirectory, getCustomerHistory } from './admin-directory'
import { customerDateRange, directoryDate, directoryHref, directoryPage } from '@/lib/admin-directory'

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), rpc: vi.fn(), from: vi.fn() }))
vi.mock('@/lib/admin', () => ({ requireAdmin: mocks.requireAdmin }))
beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAdmin.mockResolvedValue({ supabase: { rpc: mocks.rpc, from: mocks.from } })
    mocks.rpc.mockResolvedValue({ data: { customers: [] }, error: null })
})

it.each([
    () => getCustomerDirectory({}), () => getCartRecoveryDirectory(),
    () => getCustomerHistory('00000000-0000-0000-0000-000000000001'),
])('rejects non-admin reads before accessing reports', async read => {
    mocks.requireAdmin.mockRejectedValueOnce(new Error('Unauthorized'))
    await expect(read()).rejects.toThrow('Unauthorized')
    expect(mocks.rpc).not.toHaveBeenCalled()
    expect(mocks.from).not.toHaveBeenCalled()
})

it('passes literal search, bounded pagination and inclusive IST joined dates to the service-only report', async () => {
    await getCustomerDirectory({ q: '  a,b@example.test  ', from: '2026-11-12', to: '2026-11-12', page: '2' })
    expect(mocks.rpc).toHaveBeenCalledWith('admin_customer_directory', {
        p_search: 'a,b@example.test', p_from: '2026-11-11T18:30:00.000Z', p_before: '2026-11-12T18:30:00.000Z', p_page: 2, p_page_size: 25,
    })
})

it('validates reversed or impossible dates instead of querying a misleading empty list', async () => {
    await expect(getCustomerDirectory({ from: '2026-11-13', to: '2026-11-12' })).rejects.toThrow('on or before')
    await expect(getCustomerDirectory({ from: '2026-02-30' })).rejects.toThrow('valid joined dates')
    expect(mocks.rpc).not.toHaveBeenCalled()
})

it('surfaces report errors rather than pretending that the directory is empty', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: 'PGRST202' } })
    await expect(getCustomerDirectory({})).rejects.toThrow('Unable to load customers')
})

it('normalizes invalid recovery status and page values', async () => {
    await getCartRecoveryDirectory({ status: 'not-a-status', page: '-2' })
    expect(mocks.rpc).toHaveBeenCalledWith('admin_cart_recovery_directory', { p_page: 1, p_page_size: 25, p_status: 'all' })
})

it('loads every history page with an exact customer restriction and clamps removed last pages', async () => {
    const id = '00000000-0000-0000-0000-000000000001'
    const customer = { id, full_name: 'Anita', order_count: 26, order_value: 260 }
    mocks.rpc.mockResolvedValueOnce({ data: { customers: [customer] }, error: null })
    const count = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ count: 26, error: null }) }
    const rows = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), range: vi.fn().mockResolvedValue({ data: [{ id: 'last' }], error: null }) }
    mocks.from.mockReturnValueOnce(count).mockReturnValueOnce(rows)
    const result = await getCustomerHistory(id, '9')
    expect(mocks.rpc).toHaveBeenCalledWith('admin_customer_directory', { p_customer_id: id, p_page_size: 1 })
    expect(count.eq).toHaveBeenCalledWith('user_id', id)
    expect(rows.eq).toHaveBeenCalledWith('user_id', id)
    expect(rows.range).toHaveBeenCalledWith(25, 49)
    expect(result).toMatchObject({ total: 26, page: 2, totalPages: 2, orders: [{ id: 'last' }] })
})

it('returns no history for an invalid or deleted customer', async () => {
    expect(await getCustomerHistory('bad-id')).toBeNull()
    expect(mocks.rpc).not.toHaveBeenCalled()
    mocks.from.mockReturnValue({ select: () => ({ eq: async () => ({ count: 0, error: null }) }) })
    expect(await getCustomerHistory('00000000-0000-0000-0000-000000000001')).toBeNull()
})

it('preserves search and dates in pagination links without interpolating query syntax', () => {
    expect(directoryHref('/admin/customers', { q: 'a+b@example.test', from: '2026-11-12' }, 2))
        .toBe('/admin/customers?q=a%2Bb%40example.test&from=2026-11-12&page=2')
    expect(directoryPage('Infinity')).toBe(1)
    expect(directoryDate('2026-02-30')).toBeNull()
    expect(customerDateRange({ to: '2026-11-12' }).before).toBe('2026-11-12T18:30:00.000Z')
})
