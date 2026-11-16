import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import InventoryRegistryWrapper from './inventory-registry-wrapper'

const mocks = vi.hoisted(() => ({ updateStock: vi.fn(), refresh: vi.fn(), success: vi.fn(), error: vi.fn() }))
vi.mock('@/app/actions/inventory', () => ({ updateStock: mocks.updateStock }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh }) }))
vi.mock('sonner', () => ({ toast: { success: mocks.success, error: mocks.error } }))

const products = [
    {
        id: 'lipstick', name: 'Lipstick', brand: 'FOREVER52', product_categories: [{ category_id: 'makeup' }],
        product_variants: [
            { id: 'rose', title: 'Rose', sku: 'LIP-ROSE', stock: 0, price: 500 },
            { id: 'nude', title: 'Nude', sku: 'LIP-NUDE', stock: 5, price: 500 },
            { id: 'berry', title: 'Berry', sku: 'LIP-BERRY', stock: 10, price: 500 },
            { id: 'coral', title: 'Coral', sku: 'LIP-CORAL', stock: 11, price: 500 },
        ],
    },
    {
        id: 'cleanser', name: 'Cleanser', brand: 'Care', product_categories: [{ category_id: 'skin' }],
        product_variants: [{ id: 'cleanser-default', title: '', sku: 'CLEAN', stock: 0, price: 200 }],
    },
    {
        id: 'blush', name: 'Blush', product_categories: [{ category_id: 'makeup' }],
        product_variants: [{ id: 'peach', title: 'Peach', sku: 'BLUSH-PEACH', stock: -1, price: 300 }],
    },
    { id: 'empty', name: 'No variants yet', product_categories: [], product_variants: [] },
]
const categories = [{ id: 'makeup', name: 'Makeup' }, { id: 'skin', name: 'Skincare' }]
let container: HTMLDivElement
let root: Root

beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    mocks.updateStock.mockReset().mockResolvedValue({ success: true })
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
})
afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
})

async function render(data = products) {
    await act(async () => root.render(<InventoryRegistryWrapper initialProducts={data} categories={categories} />))
}
function named<T extends HTMLElement>(label: string) {
    const element = [...document.querySelectorAll<HTMLElement>('[aria-label]')].find(el => el.getAttribute('aria-label') === label)
    if (!element) throw new Error(`Control not found: ${label}`)
    return element as T
}
function button(text: string) {
    const element = [...document.querySelectorAll('button')].find(el => el.textContent?.trim() === text)
    if (!element) throw new Error(`Button not found: ${text}`)
    return element
}
async function click(element: HTMLElement) { await act(async () => element.click()) }
async function changeFilter(label: string, value: string) {
    const element = named<HTMLSelectElement>(label)
    await act(async () => { element.value = value; element.dispatchEvent(new Event('change', { bubbles: true })) })
}
async function enter(element: HTMLInputElement, value: string) {
    await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, value)
        element.dispatchEvent(new Event('input', { bubbles: true }))
    })
}
function visibleVariants() {
    return [...container.querySelectorAll('tbody [role="checkbox"]')].map(el => el.getAttribute('aria-label'))
}
const roseLabel = 'Lipstick — Rose (LIP-ROSE)'
const nudeLabel = 'Lipstick — Nude (LIP-NUDE)'
async function openBulk() {
    await click(named('Select all visible variants'))
    await click(button(`Bulk (${visibleVariants().length})`))
}

it('finds sold-out shades inside mixed-stock products and default variants, without showing available siblings', async () => {
    await render()
    await changeFilter('Filter by stock', 'out')
    expect(visibleVariants()).toEqual([
        `Select ${roseLabel}`, 'Select Cleanser — Default (CLEAN)', 'Select Blush — Peach (BLUSH-PEACH)',
    ])
    expect(container.textContent).toContain('Showing 3 variants across 3 products')
    expect(container.textContent).toContain('1 of 4 variants')
    expect(container.textContent).not.toContain('No variants yet')
    expect(container.textContent).not.toContain('LIP-NUDE')
    expect(container.querySelectorAll('[title="Stock across the variants shown below"]')[2]).toHaveTextContent('Out')
})

it('includes only quantities 1–10 under low stock, with matching group totals', async () => {
    await render()
    await changeFilter('Filter by stock', 'low')
    expect(visibleVariants()).toEqual([`Select ${nudeLabel}`, 'Select Lipstick — Berry (LIP-BERRY)'])
    expect(container.querySelector('[title="Stock across the variants shown below"]')).toHaveTextContent('15')
    expect(container.textContent).toContain('2 of 4 variants')
})

it('includes low-stock and healthy shades under in stock and excludes zero or negative stock', async () => {
    await render()
    await changeFilter('Filter by stock', 'in')
    expect(visibleVariants()).toEqual([
        `Select ${nudeLabel}`, 'Select Lipstick — Berry (LIP-BERRY)', 'Select Lipstick — Coral (LIP-CORAL)',
    ])
})

it('matches SKU or shade on the same variant as the stock filter', async () => {
    await render()
    await enter(named('Search inventory'), '  lip-nude  ')
    expect(visibleVariants()).toEqual([`Select ${nudeLabel}`])
    await changeFilter('Filter by stock', 'out')
    expect(visibleVariants()).toEqual([])
    expect(container.textContent).toContain('No inventory items found')
    expect(named('Select all visible variants')).toBeDisabled()
    await enter(named('Search inventory'), 'rose')
    expect(visibleVariants()).toEqual([`Select ${roseLabel}`])
})

it('combines product and brand searches with category and stock filters', async () => {
    await render()
    await enter(named('Search inventory'), 'forever52')
    expect(visibleVariants()).toHaveLength(4)
    await changeFilter('Filter by stock', 'low')
    expect(visibleVariants()).toHaveLength(2)
    await changeFilter('Filter by category', 'skin')
    expect(visibleVariants()).toHaveLength(0)
    await click(button('Clear filters'))
    expect(visibleVariants()).toHaveLength(6)
    expect(named<HTMLSelectElement>('Filter by category').value).toBe('all')
})

it('selects the remaining visible rows from a partial selection, then deselects all', async () => {
    await render()
    await click(named(`Select ${roseLabel}`))
    expect(named('Select all visible variants')).toHaveAttribute('aria-checked', 'mixed')
    await click(named('Select all visible variants'))
    expect(named('Select all visible variants')).toHaveAttribute('aria-checked', 'true')
    expect(button('Bulk (6)')).toBeInTheDocument()
    await click(named('Select all visible variants'))
    expect(named('Select all visible variants')).toHaveAttribute('aria-checked', 'false')
    expect(container.textContent).not.toContain('Bulk (')
})

it.each(['search', 'category', 'stock'])('clears bulk selections when the %s filter changes', async (filter) => {
    await render()
    await click(named('Select all visible variants'))
    if (filter === 'search') await enter(named('Search inventory'), 'Rose')
    if (filter === 'category') await changeFilter('Filter by category', 'skin')
    if (filter === 'stock') await changeFilter('Filter by stock', 'out')
    expect(container.textContent).not.toContain('Bulk (')
    expect(named('Select all visible variants')).toHaveAttribute('aria-checked', 'false')
})

it('bulk updates only the visible sold-out variants and allows setting them to zero', async () => {
    await render()
    await changeFilter('Filter by stock', 'out')
    await openBulk()
    await enter(document.querySelector<HTMLInputElement>('#bulk-stock-value')!, '0')
    await click(button('Apply'))
    expect(mocks.updateStock.mock.calls).toEqual([['rose', 0], ['cleanser-default', 0], ['peach', 0]])
    expect(mocks.success).toHaveBeenCalledWith('Updated 3 variants')
    expect(document.querySelector('[role="dialog"]')).not.toBeInTheDocument()
})

it('drops rows hidden by fresh stock from the bulk target list', async () => {
    await render()
    await changeFilter('Filter by stock', 'out')
    await click(named('Select all visible variants'))
    await render(products.map(p => ({ ...p, product_variants: p.product_variants.map(v => v.id === 'rose' ? { ...v, stock: 4 } : v) })))
    await click(button('Bulk (2)'))
    await click(button('Apply'))
    expect(mocks.updateStock.mock.calls).toEqual([['cleanser-default', 10], ['peach', 10]])
})

it('reports partial failures and retries only failed rows, without reapplying confirmed additions', async () => {
    await render()
    await changeFilter('Filter by stock', 'low')
    await openBulk()
    await click(button('Add'))
    mocks.updateStock.mockResolvedValueOnce({ success: true }).mockResolvedValueOnce({ success: false, message: 'Save failed' })
    await click(button('Apply'))
    expect(mocks.updateStock.mock.calls).toEqual([['nude', 15], ['berry', 20]])
    expect(mocks.success).not.toHaveBeenCalled()
    expect(document.querySelector('[role="alert"]')).toHaveTextContent('1 updated; 1 could not be confirmed')
    expect(document.querySelector('[role="dialog"]')).toHaveTextContent('1 visible variant')
    expect(named(`Select ${nudeLabel}`)).toHaveAttribute('aria-checked', 'false')
    mocks.updateStock.mockClear()
    await click(button('Apply'))
    expect(mocks.updateStock.mock.calls).toEqual([['berry', 20]])
    expect(mocks.success).toHaveBeenCalledWith('Updated 1 variants')
})

it('recovers from a rejected bulk request and keeps its row selected', async () => {
    await render()
    await enter(named('Search inventory'), 'lip-rose')
    await openBulk()
    mocks.updateStock.mockRejectedValueOnce(new Error('Connection lost'))
    await click(button('Apply'))
    expect(document.querySelector('[role="alert"]')).toHaveTextContent('0 updated; 1 could not be confirmed')
    expect(button('Apply')).toBeEnabled()
    expect(button('Cancel')).toBeEnabled()
    await click(button('Cancel'))
    expect(named(`Select ${roseLabel}`)).toHaveAttribute('aria-checked', 'true')
    expect(mocks.success).not.toHaveBeenCalled()
})

it('locks bulk controls and dismissal while saving', async () => {
    await render()
    await enter(named('Search inventory'), 'lip-rose')
    await openBulk()
    let finish!: (value: { success: boolean }) => void
    mocks.updateStock.mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
    await click(button('Apply'))
    expect(button('Cancel')).toBeDisabled()
    expect(button('Add')).toBeDisabled()
    expect(document.querySelector('#bulk-stock-value')).toBeDisabled()
    expect(named('Search inventory')).toBeDisabled()
    await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    expect(document.querySelector('[role="dialog"]')).toBeInTheDocument()
    await act(async () => finish({ success: true }))
    expect(document.querySelector('[role="dialog"]')).not.toBeInTheDocument()
})

it.each(['abc', '2.5', '5items', '+', '1e3', '2147483648'])('rejects invalid row stock %s without writing', async value => {
    await render()
    const input = named<HTMLInputElement>(`Adjust stock for ${nudeLabel}`)
    await enter(input, value)
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(named(`Save stock for ${nudeLabel}`)).toBeDisabled()
    expect(mocks.updateStock).not.toHaveBeenCalled()
})

it('preserves the stock draft after a failed row save and clears it after success', async () => {
    await render()
    const input = named<HTMLInputElement>(`Adjust stock for ${nudeLabel}`)
    await enter(input, '+3')
    mocks.updateStock.mockResolvedValueOnce({ success: false, message: 'Save failed' })
    await click(named(`Save stock for ${nudeLabel}`))
    expect(input.value).toBe('+3')
    expect(mocks.error).toHaveBeenCalledWith('Save failed')
    await click(named(`Save stock for ${nudeLabel}`))
    expect(mocks.updateStock).toHaveBeenLastCalledWith('nude', 8)
    expect(input.value).toBe('')
    expect(mocks.refresh).toHaveBeenCalledOnce()
})

it('subtracts stock without allowing a negative quantity', async () => {
    await render()
    await enter(named(`Adjust stock for ${nudeLabel}`), '-20')
    await click(named(`Save stock for ${nudeLabel}`))
    expect(mocks.updateStock).toHaveBeenCalledWith('nude', 0)
})

it('rejects decimal bulk quantities instead of silently rounding them', async () => {
    await render()
    await openBulk()
    await enter(document.querySelector<HTMLInputElement>('#bulk-stock-value')!, '2.5')
    await click(button('Apply'))
    expect(mocks.updateStock).not.toHaveBeenCalled()
    expect(mocks.error).toHaveBeenCalledWith('Enter a whole number of 0 or more')
})
