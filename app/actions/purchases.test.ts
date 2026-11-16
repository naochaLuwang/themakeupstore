import { beforeEach, expect, it, vi } from 'vitest'
import {
    exportPurchases,
    getPurchaseDetail,
    getPurchaseDirectory,
    receivePurchase,
    savePurchase,
    searchPurchaseProducts,
    searchPurchaseSuppliers,
    transitionPurchase,
} from './purchases'
import {
    purchaseDetail,
    purchaseDirectory,
    purchaseDraft,
    purchaseProduct,
} from '@/lib/purchases.test-fixtures'
const mocks = vi.hoisted(() => ({ admin: vi.fn(), rpc: vi.fn(), from: vi.fn() }))
vi.mock('@/lib/admin', () => ({ requireAdmin: mocks.admin }))
beforeEach(() => {
    vi.clearAllMocks()
    mocks.admin.mockResolvedValue({ supabase: { rpc: mocks.rpc, from: mocks.from }, user: { id: 'actor' } })
    mocks.rpc.mockResolvedValue({ data: purchaseDetail, error: null })
})
it('requires authorization before all purchase reads and writes', async () => {
    mocks.admin.mockRejectedValue(new Error('Unauthorized'))
    for (const operation of [
        () => searchPurchaseProducts('LIP'),
        () => searchPurchaseSuppliers(),
        () => getPurchaseDirectory(),
        () => getPurchaseDetail(purchaseDetail.id),
        () => savePurchase(purchaseDetail.id, 0, purchaseDraft),
        () => transitionPurchase(purchaseDetail.id, 1, 'ordered'),
        () =>
            receivePurchase(purchaseDetail.id, 2, purchaseDetail.id, {
                received_on: '2026-11-13',
                notes: '',
                lines: [],
            }),
        () => exportPurchases({}),
    ])
        await expect(operation()).rejects.toThrow('Unauthorized')
    expect(mocks.rpc).not.toHaveBeenCalled()
    expect(mocks.from).not.toHaveBeenCalled()
})
it('saves the entire draft in one database call using authenticated actor and stable ID', async () => {
    expect(await savePurchase(purchaseDetail.id, 0, purchaseDraft)).toEqual({
        ok: true,
        purchase: purchaseDetail,
    })
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('admin_purchase_save', {
        p_id: purchaseDetail.id,
        p_version: 0,
        p_payload: purchaseDraft,
        p_actor: 'actor',
    })
    expect(mocks.from).not.toHaveBeenCalled()
})
it('rejects invalid draft values before issuing a write', async () => {
    await expect(
        savePurchase(purchaseDetail.id, 0, {
            ...purchaseDraft,
            items: [{ ...purchaseDraft.items[0], quantity: 0 }],
        })
    ).rejects.toThrow('Quantities')
    expect(mocks.rpc).not.toHaveBeenCalled()
})
it('distinguishes stale reviews from uncertain writes without exposing raw database messages', async () => {
    mocks.rpc.mockResolvedValueOnce({
        error: { code: 'P0001', message: 'Purchase changed. Reload before saving.' },
    })
    expect(await savePurchase(purchaseDetail.id, 1, purchaseDraft)).toMatchObject({
        ok: false,
        uncertain: false,
        error: 'Purchase changed. Reload before saving.',
    })
    mocks.rpc.mockResolvedValueOnce({ error: { code: 'XX000', message: 'private supplier data' } })
    const result = await savePurchase(purchaseDetail.id, 1, purchaseDraft)
    expect(result).toMatchObject({ ok: false, uncertain: true })
    expect(JSON.stringify(result)).not.toContain('private supplier')
})
it('passes receipt ID and expected version together to the transactional receiving function', async () => {
    const payload = {
        received_on: '2026-11-13',
        notes: 'Damaged packaging',
        lines: [{ item_id: purchaseDetail.items[0].id, accepted: 3, damaged: 1 }],
    }
    await receivePurchase(purchaseDetail.id, 2, purchaseProduct.variant_id, payload)
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('admin_purchase_receive', {
        p_id: purchaseDetail.id,
        p_version: 2,
        p_receipt: purchaseProduct.variant_id,
        p_payload: payload,
        p_actor: 'actor',
    })
})
it('never marks an item received through a separate stock or status update', async () => {
    mocks.rpc.mockResolvedValueOnce({ error: { code: '23503' } })
    expect(
        await receivePurchase(purchaseDetail.id, 2, purchaseProduct.variant_id, {
            received_on: '2026-11-13',
            notes: '',
            lines: [{ item_id: purchaseDetail.items[0].id, accepted: 1, damaged: 0 }],
        })
    ).toMatchObject({ ok: false })
    expect(mocks.from).not.toHaveBeenCalled()
})
it('uses database filters and pagination for the whole purchase dataset', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: purchaseDirectory })
    await getPurchaseDirectory({
        q: 'Supplier',
        status: 'partial',
        from: '2026-11-01',
        to: '2026-11-13',
        page: '3',
    })
    expect(mocks.rpc).toHaveBeenCalledWith('admin_purchase_list', {
        p_search: 'Supplier',
        p_status: 'partial',
        p_from: '2026-11-01',
        p_to: '2026-11-13',
        p_page: 3,
        p_size: 25,
    })
})
it('exports filtered rows in one snapshot and refuses truncated exports', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: { ...purchaseDirectory, total: 1 } })
    expect(await exportPurchases({ status: 'draft' })).toContain('PO-TEST')
    expect(mocks.rpc).toHaveBeenLastCalledWith(
        'admin_purchase_list',
        expect.objectContaining({ p_status: 'draft', p_size: 5001, p_page: 1 })
    )
    mocks.rpc.mockResolvedValueOnce({ data: { ...purchaseDirectory, total: 5002 } })
    await expect(exportPurchases({})).rejects.toThrow('Narrow the filters')
})
