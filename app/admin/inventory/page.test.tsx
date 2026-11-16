import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import InventoryPage from './page'

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), from: vi.fn(), range: vi.fn(), refresh: vi.fn() }))
vi.mock('@/lib/admin', () => ({ requireAdmin: mocks.requireAdmin }))
vi.mock('@/app/actions/inventory', () => ({ updateStock: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh }) }))
let container: HTMLDivElement, root: Root
const replies: unknown[] = []
beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    replies.length = 0
    mocks.requireAdmin.mockResolvedValue({ supabase: { from: mocks.from } })
    mocks.from.mockImplementation((table: string) => {
        const builder = {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            range: mocks.range.mockReturnThis(),
            returns: async () => replies.shift(),
            then: (resolve: (value: unknown) => unknown) =>
                Promise.resolve({ data: [{ id: 'category', name: 'Makeup' }], error: null }).then(resolve),
        }
        if (table === 'products')
            builder.range = vi.fn((...args: unknown[]) => {
                mocks.range(...args)
                return builder
            })
        return builder
    })
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
})
afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
})
async function render() {
    const page = await InventoryPage({ searchParams: Promise.resolve({ q: 'TAIL', stock: 'out' }) })
    await act(async () => root.render(page))
}
it('loads through the server row cap before applying dashboard shade links', async () => {
    replies.push(
        {
            data: [
                {
                    id: 'first',
                    name: 'First',
                    product_variants: [{ id: 'a', sku: 'FIRST', title: 'Red', stock: 5, price: 100 }],
                },
            ],
            count: 2,
            error: null,
        },
        {
            data: [
                {
                    id: 'last',
                    name: 'Last',
                    product_variants: [{ id: 'b', sku: 'TAIL', title: 'Rose', stock: 0, price: 100 }],
                },
            ],
            count: 2,
            error: null,
        }
    )
    await render()
    expect(mocks.range).toHaveBeenNthCalledWith(1, 0, 499)
    expect(mocks.range).toHaveBeenNthCalledWith(2, 1, 500)
    expect(container.querySelector<HTMLInputElement>('[aria-label="Search inventory"]')!.value).toBe('TAIL')
    expect(container).toHaveTextContent('Rose')
    expect(container).not.toHaveTextContent('Red')
})
it('does not present a partial catalog as complete if a later page fails', async () => {
    replies.push(
        { data: [{ id: 'first', name: 'First', product_variants: [] }], count: 2, error: null },
        { data: null, count: null, error: { code: 'network' } }
    )
    await render()
    expect(container.querySelector('[role=alert]')).toHaveTextContent('Unable to load the complete inventory')
    expect(container.querySelector('table')).not.toBeInTheDocument()
})
