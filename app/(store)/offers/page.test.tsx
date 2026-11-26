import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import OffersPage from './page'

const mocks = vi.hoisted(() => ({ client: vi.fn() }))
vi.mock('@/utils/supabase/client', () => ({ createClient: mocks.client }))
vi.mock('@/components/store/product-card', () => ({ ProductCard: ({ product }: { product: { id: string } }) => <span data-product={product.id}>{product.id}</span> }))
vi.mock('next/link', () => ({ default: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }))

let host: HTMLDivElement, root: Root
afterEach(async () => { if (root) await act(async () => root.unmount()); host?.remove(); vi.unstubAllGlobals() })

it('shows available offer cards beyond the old 40-row cap before selecting the four displayed products', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const rows = Array.from({ length: 275 }, (_, id) => ({ products: { id: String(id), product_variants: [{ stock: id >= 250 ? 1 : 0 }] } }))
  const range = vi.fn(async (from: number, to: number) => ({ data: rows.slice(from, to + 1), error: null }))
  const links = { select: vi.fn(), in: vi.fn(), order: vi.fn(), range }
  for (const method of ['select', 'in', 'order'] as const) links[method].mockReturnValue(links)
  const cats = { select: vi.fn(), eq: vi.fn().mockResolvedValue({ data: [{ id: 'lips', name: 'Lipstick' }], error: null }) }
  cats.select.mockReturnValue(cats)
  const client = { from: (table: string) => table === 'categories' ? cats : links }
  mocks.client.mockReturnValue(client)
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
  await act(async () => root.render(<OffersPage />))
  expect([...host.querySelectorAll('[data-product]')].map(el => el.getAttribute('data-product'))).toEqual(['250', '251', '252', '253'])
  expect(range.mock.calls).toEqual([[0, 249], [250, 499]])
})
