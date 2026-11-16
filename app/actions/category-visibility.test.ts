import { beforeEach, expect, it, vi } from 'vitest'
import { setCategoryVisibility } from './category-visibility'

const mocks = vi.hoisted(() => ({ admin: vi.fn(), rpc: vi.fn(), path: vi.fn(), tag: vi.fn() }))
vi.mock('@/lib/admin', () => ({ requireAdmin: mocks.admin }))
vi.mock('next/cache', () => ({ revalidatePath: mocks.path, revalidateTag: mocks.tag }))
const id = '00000000-0000-4000-8000-000000000001'
beforeEach(() => {
    vi.clearAllMocks()
    mocks.admin.mockResolvedValue({ supabase: { rpc: mocks.rpc } })
    mocks.rpc.mockResolvedValue({ data: { products: 4, categories: 2 }, error: null })
})
it('requires admin authorization before updating the catalog', async () => {
    mocks.admin.mockRejectedValue(new Error('Unauthorized'))
    await expect(setCategoryVisibility(id, false, true)).rejects.toThrow('Unauthorized')
    expect(mocks.rpc).not.toHaveBeenCalled()
})
it('rejects malformed IDs and non-boolean status values', async () => {
    expect(await setCategoryVisibility('bad', false, true)).toHaveProperty('error')
    expect(await setCategoryVisibility(id, 'false' as unknown as boolean, true)).toHaveProperty('error')
    expect(mocks.rpc).not.toHaveBeenCalled()
})
it('sends an explicit desired status and stale-state guard in one transaction', async () => {
    expect(await setCategoryVisibility(id, false, true)).toEqual({ success: true, products: 4, categories: 2 })
    expect(mocks.rpc).toHaveBeenCalledWith('set_category_visibility', {
        p_category: id, p_active: false, p_expected_active: true,
    })
    expect(mocks.path).toHaveBeenCalledWith('/', 'layout')
    expect(mocks.tag).toHaveBeenCalledWith('store-promotion-definitions', { expire: 0 })
})
it.each(['Category changed. Refresh before trying again.', 'Activate the parent category first.', 'Category not found.'])(
    'returns an actionable conflict: %s', async message => {
        mocks.rpc.mockResolvedValue({ error: { message } })
        expect(await setCategoryVisibility(id, false, true)).toEqual({ error: message })
        expect(mocks.path).not.toHaveBeenCalled()
    }
)
it('does not expose database internals or report success when a write fails', async () => {
    mocks.rpc.mockResolvedValue({ error: { message: 'secret SQL detail' } })
    expect(await setCategoryVisibility(id, false, true)).toEqual({ error: 'Unable to update category status. Refresh and try again.' })
    mocks.rpc.mockRejectedValue(new Error('network'))
    expect(await setCategoryVisibility(id, false, true)).toEqual({ error: 'Unable to confirm the update. Refresh before trying again.' })
    expect(mocks.path).not.toHaveBeenCalled()
})
