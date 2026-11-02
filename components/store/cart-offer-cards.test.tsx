import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { CartOfferCards } from './cart-offer-cards'
import OfferProductsPanel from './offer-products-panel'
import { useCart, type CartItem } from './use-cart'
import type { BXGYRule } from '@/lib/promotion-engine'
import type { EligibleProductsPage } from '@/lib/eligible-offer-products'

const client = vi.hoisted(() => ({ first: vi.fn(), fetch: vi.fn(), success: vi.fn(), info: vi.fn() }))
vi.mock('@/lib/offer-products-client', () => ({ firstOfferProducts: client.first, fetchOfferProducts: client.fetch }))
vi.mock('sonner', () => ({ toast: { success: client.success, info: client.info } }))
const rule: BXGYRule = { id: 'r', is_active: true, name: 'Milani offer', buy_type: 'specific_brands', brands: ['Milani', 'RELOVE'],
  products: [], categories: [], buy_quantity: 2, get_type: 'cheapest_free', get_discount_type: 'free', get_discount_value: 100, pricing_mode: 'replace_discounts' }
const item: CartItem = { id: 'p', productId: 'p', name: 'Lipstick', variantId: 'v', variantTitle: 'Rose', categoryId: 'cat', categoryIds: ['cat'], brand: 'Milani',
  price: 800, regularPrice: 800, mrp: 1000, originalPrice: 1000, image: '', stock: 10, quantity: 2 }
function response(): EligibleProductsPage {
  return { rule, products: [{ id: 'p', name: 'Lipstick', brand: 'Milani', image: '', categoryIds: ['cat'],
    variants: [{ id: 'v', title: 'Rose', stock: 10, image: '', mrp: 1000, price: 800, regularPrice: 800 }] }],
    total: 1, page: 1, pages: 1, brands: ['Milani', 'RELOVE'], categories: [{ id: 'cat', name: 'Lipsticks' }], expiresAt: Date.now() + 30000 }
}
let container: HTMLDivElement, root: Root
function Cart() {
  const [selected, setSelected] = useState<string | null>(null)
  return <><CartOfferCards onShop={setSelected} />{selected && <OfferProductsPanel ruleId={selected} onClose={() => setSelected(null)} />}</>
}
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  client.first.mockImplementation(async () => response()); client.fetch.mockImplementation(async () => response())
  useCart.setState({ items: [{ ...item }], appliedPromo: null })
  useCart.getState().setOfferCatalog({ ownerId: null, bxgyRules: [rule], giftRules: [], giftOptions: [], usedBXGY: [], usedGifts: [], expiresAt: Date.now() + 30000 })
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount()); container.remove(); vi.useRealTimers(); vi.unstubAllGlobals()
})
const button = (label: string) => {
  const found = [...document.querySelectorAll('button')].find(b => b.textContent?.includes(label) || b.getAttribute('aria-label')?.includes(label))
  if (!found) throw new Error(`Button missing: ${label}`)
  return found
}
async function render() { await act(async () => root.render(<Cart />)) }
async function open() {
  await render()
  await act(async () => { button('Shop eligible products').focus(); button('Shop eligible products').click() })
  await act(async () => { await vi.advanceTimersByTimeAsync(1) })
}
it('shows the exact pooled brands and original-price terms without the old FREE sentence', async () => {
  await render()
  expect(container.textContent).toContain('Milani + RELOVE'); expect(container.textContent).toContain('Add 1 more')
  expect(container.textContent).not.toContain('Participating items use original prices')
  await act(async () => button('Offer details').click())
  expect(document.body.textContent).toContain('Participating items use original prices')
  expect(container.textContent).not.toContain('FREE:')
})
it('keeps applied rewards visible and updates progress instantly when quantity changes', async () => {
  await render()
  await act(async () => { useCart.getState().updateQuantity('v', 5) })
  expect(container.textContent).toContain('1 free applied')
  await act(async () => { useCart.getState().updateQuantity('v', 6) })
  expect(container.textContent).toContain('2 free applied')
})
it('opens an accessible dialog with original and normal prices and adds without leaving the cart', async () => {
  await open()
  const dialog = document.querySelector('[role="dialog"]')!
  expect(dialog).toHaveAccessibleName('Buy 2 Get 1 Free')
  expect(dialog.textContent).toContain('₹1,000'); expect(dialog.textContent).toContain('Original prices apply'); expect(dialog.textContent).toContain('Usually ₹800')
  await act(async () => button('+ Add').click())
  expect(useCart.getState().items[0].quantity).toBe(3)
  expect(dialog.textContent).toContain('1 free item applied'); expect(client.success).toHaveBeenCalledOnce()
})
it('requires a shade selection and carries complete promotion metadata into the cart', async () => {
  const data = response()
  data.products[0].variants.push({ ...data.products[0].variants[0], id: 'other', title: 'Nude' })
  client.first.mockResolvedValue(data)
  await open()
  await act(async () => button('Choose shade').click())
  expect(button('Add to bag')).toBeDisabled()
  const option = document.querySelector('input[type=radio][value=other]') as HTMLInputElement
  expect(document.querySelector('[role="dialog"] select')).toBeNull()
  await act(async () => option.click())
  await act(async () => button('Add to bag').click())
  expect(useCart.getState().items.find(i => i.variantId === 'other')).toMatchObject({ brand: 'Milani', categoryIds: ['cat'], mrp: 1000, regularPrice: 800 })
})
it('disables sold-out variants and items already at their stock limit', async () => {
  const data = response(); data.products[0].variants[0].stock = 2
  client.first.mockResolvedValue(data)
  await open()
  expect(button('All in bag')).toBeDisabled()
  await act(async () => button('View bag').click())
  data.products[0].variants[0].stock = 0
  await act(async () => button('Shop eligible products').click())
  await act(async () => { await vi.advanceTimersByTimeAsync(1) })
  expect(button('Sold out')).toBeDisabled()
})
it('preserves the cart and restores the opener focus when dismissed', async () => {
  await open()
  await act(async () => button('View bag').click())
  await act(async () => { await vi.advanceTimersByTimeAsync(1) })
  expect(document.querySelector('[role="dialog"]')).toBeNull()
  expect(useCart.getState().items[0].quantity).toBe(2)
  expect(document.activeElement).toBe(button('Shop eligible products'))
})
it('shows retry guidance when eligible products cannot load', async () => {
  client.first.mockRejectedValue(new Error('This offer is no longer available.'))
  await open()
  expect(document.querySelector('[role="alert"]')).toHaveTextContent('no longer available')
  await act(async () => button('Try again').click())
  await act(async () => { await vi.advanceTimersByTimeAsync(1) })
  expect(button('+ Add')).toBeEnabled()
})
it('does not add items after customer eligibility changes while the panel is open', async () => {
  await open()
  await act(async () => useCart.getState().setOfferCatalog({ ...useCart.getState().offerCatalog!, bxgyRules: [{ ...rule, once_per_user: true }], usedBXGY: ['r'] }))
  expect(button('+ Add')).toBeDisabled()
  expect(document.querySelector('[role="dialog"]')).toHaveTextContent('This offer is no longer available')
})
it('ignores older filter responses and aborts their request when the selection changes', async () => {
  await open()
  let resolveOld!: (data: EligibleProductsPage) => void, resolveNew!: (data: EligibleProductsPage) => void
  client.fetch.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve }))
    .mockImplementationOnce(() => new Promise(resolve => { resolveNew = resolve }))
  const brandButton = (name: string) => [...document.querySelectorAll('[aria-label="Filter by brand"] button')].find(b => b.textContent === name) as HTMLButtonElement
  await act(async () => brandButton('Milani').click())
  await act(async () => { await vi.advanceTimersByTimeAsync(1) })
  const signal = client.fetch.mock.calls[0][2] as AbortSignal
  await act(async () => brandButton('RELOVE').click())
  await act(async () => { await vi.advanceTimersByTimeAsync(1) })
  expect(signal.aborted).toBe(true)
  const newData = response(); newData.products[0].name = 'New RELOVE result'
  await act(async () => resolveNew(newData))
  const oldData = response(); oldData.products[0].name = 'Stale Milani result'
  await act(async () => resolveOld(oldData))
  expect(document.querySelector('[role="dialog"]')).toHaveTextContent('New RELOVE result')
  expect(document.querySelector('[role="dialog"]')).not.toHaveTextContent('Stale Milani result')
})
it('preserves the filtered product grid and returns focus when going back from shades', async () => {
  const data = response()
  data.products[0].variants.push({ ...data.products[0].variants[0], id: 'nude', title: 'Nude' })
  client.first.mockResolvedValue(data); client.fetch.mockResolvedValue(data)
  await open()
  const milani = [...document.querySelectorAll('[aria-label="Filter by brand"] button')].find(b => b.textContent === 'Milani') as HTMLButtonElement
  await act(async () => milani.click())
  await act(async () => { await vi.advanceTimersByTimeAsync(1) })
  await act(async () => button('Choose shade').click())
  expect(document.querySelector('[role="dialog"]')).toHaveAccessibleName('Choose shade')
  expect(document.querySelector('input[placeholder="Search products"]')).toBeNull()
  await act(async () => button('Products').click())
  expect(document.activeElement).toBe(button('Choose shade'))
  expect([...document.querySelectorAll('[aria-label="Filter by brand"] button')].find(b => b.textContent === 'Milani')).toHaveAttribute('aria-pressed', 'true')
})
it('uses labelled radio options, with sold-out shades disabled and no automatic selection', async () => {
  const data = response()
  data.products[0].variants.push({ ...data.products[0].variants[0], id: 'sold', title: 'Berry', stock: 0 })
  client.first.mockResolvedValue(data)
  await open()
  await act(async () => button('Choose shade').click())
  const radios = [...document.querySelectorAll<HTMLInputElement>('input[type="radio"]')]
  expect(radios.every(r => !r.checked)).toBe(true)
  expect(radios.find(r => r.getAttribute('aria-label') === 'Berry')).toBeDisabled()
  expect(button('Add to bag')).toBeDisabled()
  await act(async () => radios[0].click())
  expect(radios[0]).toBeChecked(); expect(button('Add to bag')).toBeEnabled()
})
it('shows the chosen variant price and blocks adding if its cart stock changes', async () => {
  const data = response()
  data.products[0].variants.push({ ...data.products[0].variants[0], id: 'premium', title: 'Nude', mrp: 1200, price: 900, stock: 1 })
  client.first.mockResolvedValue(data)
  await open()
  await act(async () => button('Choose shade').click())
  await act(async () => (document.querySelector('input[value="premium"]') as HTMLInputElement).click())
  expect(button('Add to bag')).toHaveTextContent('₹1,200')
  expect(document.querySelector('[role="dialog"]')).toHaveTextContent('Usually ₹900')
  await act(async () => useCart.setState({ items: [...useCart.getState().items, { ...item, variantId: 'premium', quantity: 1, stock: 1 }] }))
  expect(button('Add to bag')).toBeDisabled()
})
it('keeps category filters tucked away until requested', async () => {
  await open()
  expect(document.querySelector('[aria-label="Filter by category"]')).toBeNull()
  await act(async () => button('Filters').click())
  expect(button('Filters')).toHaveAttribute('aria-expanded', 'true')
  expect(document.querySelector('[aria-label="Filter by category"]')).toBeInTheDocument()
  await act(async () => button('Filters').click())
  expect(document.querySelector('[aria-label="Filter by category"]')).toBeNull()
})
it('shows existing selling prices in combination mode', async () => {
  const data = response(); data.rule = { ...rule, pricing_mode: 'combine_discounts' }
  client.first.mockResolvedValue(data)
  await open()
  const dialog = document.querySelector('[role="dialog"]')!
  expect(dialog).toHaveTextContent('Product discounts apply')
  expect(dialog).toHaveTextContent('₹800'); expect(dialog).not.toHaveTextContent('Usually')
})
it('updates grid stock limits even when the quantity stays the same', async () => {
  await open()
  expect(button('+ Add')).toBeEnabled()
  await act(async () => useCart.setState({ items: [{ ...item, stock: 2 }] }))
  expect(button('All in bag')).toBeDisabled()
})
it('updates the main photo to the selected variant image', async () => {
  const data = response()
  data.products[0].image = '/product.jpg'
  data.products[0].variants.push({ ...data.products[0].variants[0], id: 'photo', title: 'Nude', image: '/nude.jpg' })
  client.first.mockResolvedValue(data)
  await open()
  await act(async () => button('Choose shade').click())
  await act(async () => (document.querySelector('input[value="photo"]') as HTMLInputElement).click())
  expect(document.querySelector('img[alt="Lipstick"]')?.getAttribute('src')).toContain('nude.jpg')
})
