import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import type { CatalogCategory } from '@/lib/storefront-catalog'
import BrandsPage from './page'

const mocks = vi.hoisted(() => ({ categories: vi.fn(), search: vi.fn() }))
vi.mock('@/lib/storefront-catalog-server', () => ({ readStoreCategories: mocks.categories, searchStoreCatalog: mocks.search }))
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(location.search) }))
vi.mock('next/image', () => ({ default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} /> }))
const category = (id: string, name: string, parent_id: string | null = null, is_active = true): CatalogCategory => ({ id, name, slug: id, parent_id, is_active })

it('uses only category records, including empty brands, with the original groups, exclusions and links', async () => {
  mocks.categories.mockResolvedValue([
    category('exclusive', 'Exclusive'), category('essentials', 'Essentials'), category('tools', 'Tools'),
    { ...category('empty-brand', 'Empty Brand', 'exclusive'), image_url: '/logo.png' },
    category('daily-brand', 'Daily Brand', 'essentials'), category('other-brand', 'Other Brand', 'tools'),
    category('lipstick', 'Lipstick', 'tools'), category('foundation', 'FOUNDATION', 'tools'),
    category('inactive-brand', 'Inactive Brand', 'exclusive', false),
    category('hidden-parent', 'Hidden parent', null, false), category('hidden-child', 'Hidden child', 'hidden-parent'),
    category('orphan', 'Orphan', 'missing'), category('cycle', 'Cycle', 'cycle'),
  ])
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    window.history.replaceState(null, '', '/brands')
    await act(async () => root.render(await BrandsPage()))
    expect(mocks.search).not.toHaveBeenCalled()
    expect(host).toHaveTextContent('3 brands on The Makeup Store')
    expect(host.querySelector('[aria-label="EXCLUSIVE"] a')).toHaveAttribute('href', '/exclusive/empty-brand')
    expect(host.querySelector('img')).toHaveAttribute('src', '/logo.png')
    expect(host.querySelector('a[href="/essentials/daily-brand"]')).toHaveAccessibleName('Daily Brand')
    expect(host.querySelector('a[href="/categories/other-brand"]')).toHaveAccessibleName('Other Brand')
    for (const name of ['Empty Brand', 'Daily Brand', 'Other Brand']) expect(host).not.toHaveTextContent(name)
    for (const name of ['Lipstick', 'FOUNDATION', 'Inactive Brand', 'Hidden child', 'Orphan', 'Cycle']) expect(host).not.toHaveTextContent(name)
    window.history.replaceState(null, '', '/brands?q=empty+brand')
    await act(async () => root.render(await BrandsPage()))
    expect(host).toHaveTextContent('1 brands on The Makeup Store')
    expect(host.querySelectorAll('a')).toHaveLength(1)
  } finally {
    await act(async () => root.unmount())
    host.remove()
    window.history.replaceState(null, '', '/')
  }
})
