import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import PurchaseClient from './purchase-client'
import PurchaseListClient from './list/list-client'
import PurchaseDetailClient from './[id]/purchase-detail-client'
import {
    purchaseDetail,
    purchaseDirectory,
    purchaseProduct,
    purchaseSupplier,
} from '@/lib/purchases.test-fixtures'
const mocks = vi.hoisted(() => ({
    search: vi.fn(),
    suppliers: vi.fn(),
    save: vi.fn(),
    receive: vi.fn(),
    transition: vi.fn(),
    push: vi.fn(),
    refresh: vi.fn(),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }) }))
vi.mock('@/app/actions/purchases', () => ({
    searchPurchaseProducts: mocks.search,
    searchPurchaseSuppliers: mocks.suppliers,
    savePurchase: mocks.save,
    receivePurchase: mocks.receive,
    transitionPurchase: mocks.transition,
    createPurchaseSupplier: vi.fn(),
    exportPurchases: vi.fn(),
}))
let container: HTMLDivElement, root: Root
beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    mocks.search.mockResolvedValue([purchaseProduct])
    mocks.suppliers.mockResolvedValue([purchaseSupplier])
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
const button = (text: string) =>
    [...container.querySelectorAll('button')].find((element) => element.textContent === text)!
async function click(text: string) {
    await act(async () => button(text).click())
}
async function change(label: string, value: string) {
    const input = container.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        `[aria-label="${label}"]`
    )!
    const proto =
        input.tagName === 'SELECT'
            ? HTMLSelectElement.prototype
            : input.tagName === 'TEXTAREA'
            ? HTMLTextAreaElement.prototype
            : HTMLInputElement.prototype
    await act(async () => {
        Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(input, value)
        input.dispatchEvent(new Event(input.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }))
    })
}
async function newDraft() {
    await act(async () => root.render(<PurchaseClient initialSuppliers={[purchaseSupplier]} />))
    await change('Supplier', purchaseSupplier.id)
    await change('Search purchase products', 'LIP-ROSE')
    await act(async () => {
        await vi.advanceTimersByTimeAsync(250)
    })
    const result = container.querySelector('[aria-label="Product results"] button') as HTMLButtonElement
    await act(async () => result.click())
}
it('searches exact SKUs and uses received cost rather than selling price', async () => {
    await newDraft()
    expect(mocks.search).toHaveBeenCalledWith('LIP-ROSE')
    expect(container.querySelector('[aria-label="Unit cost LIP-ROSE"]')).toHaveValue(125)
    expect(container).toHaveTextContent('Selling price ₹500')
    await change('Quantity LIP-ROSE', '0')
    expect(button('Save draft')).toBeDisabled()
})
it('requires explicit supplier cost when no received cost exists', async () => {
    mocks.search.mockResolvedValueOnce([{ ...purchaseProduct, last_cost: null }])
    await newDraft()
    expect(container.querySelector('[aria-label="Unit cost LIP-ROSE"]')).toHaveValue(null)
    expect(button('Save draft')).toBeDisabled()
    await change('Unit cost LIP-ROSE', '0')
    expect(button('Save draft')).toBeEnabled()
})
it('locks an uncertain creation request and retries the exact same ID and payload', async () => {
    mocks.save
        .mockResolvedValueOnce({ ok: false, uncertain: true, error: 'Unable to confirm save.' })
        .mockResolvedValueOnce({ ok: true, purchase: purchaseDetail })
    await newDraft()
    await click('Save draft')
    expect(container.querySelector('[aria-label="Quantity LIP-ROSE"]')).toBeDisabled()
    await click('Retry same save')
    expect(mocks.save.mock.calls[1]).toEqual(mocks.save.mock.calls[0])
    expect(mocks.push).toHaveBeenCalledWith(`/admin/purchase/${purchaseDetail.id}`)
})
it('keeps edits visible and never shows saved success when the transactional save fails', async () => {
    mocks.save.mockResolvedValueOnce({
        ok: false,
        uncertain: false,
        error: 'Purchase changed. Reload before saving.',
    })
    await act(async () => root.render(<PurchaseDetailClient initialPurchase={purchaseDetail} />))
    await click('Edit draft')
    await change('Draft quantity 1', '12')
    await click('Save draft changes')
    expect(container.querySelector('[role="alert"]')).toHaveTextContent('Purchase changed')
    expect(container.querySelector('[aria-label="Draft quantity 1"]')).toHaveValue(12)
    expect(container).not.toHaveTextContent('Draft saved.')
})
it('requires review, notes for damaged units and preserves receipt identity across uncertain retries', async () => {
    const ordered = { ...purchaseDetail, status: 'ordered' as const, version: 2 }
    mocks.receive
        .mockResolvedValueOnce({ ok: false, uncertain: true, error: 'Unable to confirm receipt.' })
        .mockResolvedValueOnce({
            ok: true,
            purchase: {
                ...ordered,
                status: 'partial',
                received_units: 3,
                damaged_units: 1,
                items: ordered.items.map((item) => ({ ...item, received_quantity: 3, damaged_quantity: 1 })),
            },
        })
    await act(async () => root.render(<PurchaseDetailClient initialPurchase={ordered} />))
    await change('Accepted quantity 1', '3')
    await change('Damaged quantity 1', '1')
    await click('Review delivery')
    expect(container.querySelector('[role="alert"]')).toHaveTextContent('Add a note')
    expect(mocks.receive).not.toHaveBeenCalled()
    await change('Delivery notes', 'Broken packaging')
    await click('Review delivery')
    expect(container).toHaveTextContent('Add 3 to stock · 1 damaged')
    expect(mocks.receive).not.toHaveBeenCalled()
    await click('Confirm delivery and update stock')
    await click('Retry same receipt')
    expect(mocks.receive.mock.calls[1]).toEqual(mocks.receive.mock.calls[0])
    expect(container).toHaveTextContent('Partially received')
    expect(container).toHaveTextContent('6 remaining')
})
it('does not offer receiving or editing actions on historical received purchases', async () => {
    await act(async () =>
        root.render(
            <PurchaseDetailClient
                initialPurchase={{ ...purchaseDetail, status: 'received', legacy_receipt: true }}
            />
        )
    )
    expect(container).toHaveTextContent('Previous stock updates have not been rechecked or replayed')
    expect(button('Edit draft')).toBeUndefined()
    expect(button('Review delivery')).toBeUndefined()
})
it('preserves the applied filter scope in history pagination and offers a real details link', async () => {
    await act(async () =>
        root.render(
            <PurchaseListClient
                report={purchaseDirectory}
                filters={{ q: 'Supplier', status: 'partial', from: '2026-11-01', to: '2026-11-13', page: 2 }}
            />
        )
    )
    const next = [...container.querySelectorAll('a')].find((a) => a.textContent === 'Next')!
    expect(Object.fromEntries(new URL(next.href).searchParams)).toEqual({
        q: 'Supplier',
        status: 'partial',
        from: '2026-11-01',
        to: '2026-11-13',
        page: '3',
    })
    expect(container.querySelector('tbody a')).toHaveAttribute('href', `/admin/purchase/${purchaseDetail.id}`)
    expect(container).toHaveTextContent('52 matching purchases')
})
