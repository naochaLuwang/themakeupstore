import { afterEach, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { BXGYForm } from './bxgy-form'

const mocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), push: vi.fn(), refresh: vi.fn() }))
vi.mock('@/app/actions/promotions', () => ({ createBXGY: mocks.create, updateBXGY: mocks.update }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
let root: Root
let container: HTMLDivElement
const products = [{ id: 'a', name: 'Lipstick', brand: 'Milani' }, { id: 'b', name: 'Blush', brand: 'RELOVE' }]
async function render(initialData?: Record<string, unknown>) {
  container = document.createElement('div'); document.body.append(container)
  root = createRoot(container)
  await act(async () => root.render(<BXGYForm products={products} categories={[]} initialData={initialData} />))
}
afterEach(() => { act(() => root.unmount()); container.remove(); vi.clearAllMocks() })

it('creates a replacement-price offer with multiple brands from the actual selector', async () => {
  await render()
  expect(container.querySelector<HTMLInputElement>('[value="replace_discounts"]')).toBeChecked()
  await act(async () => [...container.querySelectorAll('button')].find(b => b.textContent === 'Specific Brands')!.click())
  await act(async () => {
    for (const label of [...container.querySelectorAll('label')].filter(l => ['Milani', 'RELOVE'].includes(l.textContent?.trim() || ''))) {
      label.querySelector('input')!.click()
    }
  })
  container.querySelector<HTMLInputElement>('[name="name"]')!.value = 'Mix any three'
  await act(async () => container.querySelector('form')!.requestSubmit())
  expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ pricing_mode: 'replace_discounts', buy_type: 'specific_brands', buy_brands: ['Milani', 'RELOVE'] }))
})
it('preserves a legacy offer mode when editing and saves the admin selection', async () => {
  await render({ id: 'rule', name: 'Legacy', buy_type: 'specific_brands', starts_at: '2026-11-01T00:00:00Z' })
  expect(container.querySelector<HTMLInputElement>('[value="combine_discounts"]')).toBeChecked()
  await act(async () => container.querySelector<HTMLInputElement>('[value="replace_discounts"]')!.click())
  await act(async () => container.querySelector('form')!.requestSubmit())
  expect(mocks.update).toHaveBeenCalledWith('rule', expect.objectContaining({ pricing_mode: 'replace_discounts' }))
})
