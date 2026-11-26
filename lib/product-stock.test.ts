import { expect, it } from 'vitest'
import { outOfStockLast, productInStock } from './product-stock'

it.each([
  { product_variants: [{ stock: 0 }], expected: false },
  { product_variants: [{ stock: -4 }], expected: false },
  { product_variants: [{ stock: 2 }, { stock: -20 }], expected: true },
  { product_variants: [{ stock: '3' }], expected: true },
  { product_variants: [{ stock: null }, { stock: undefined }], expected: false },
  { product_variants: [{ stock: NaN }, { stock: Infinity }], expected: false },
  { product_variants: [], expected: false },
  { product_variants: null, expected: false },
])('uses only positive finite variant stock: %j', ({ expected, ...product }) => {
  expect(productInStock(product)).toBe(expected)
})

it('uses the default variant for a non-shade product and ignores a legacy product stock field', () => {
  const product = { stock: 999, has_variants: false, product_variants: [{ title: 'Default', stock: 0 }] }
  expect(productInStock(product)).toBe(false)
  expect(productInStock({ ...product, product_variants: [{ stock: 1 }] })).toBe(true)
  expect(productInStock({ ...product, product_variants: undefined })).toBe(false)
})

it('preserves both groups and does not mutate frozen state or products', () => {
  const products = Object.freeze([0, 2, -1, 1, 0].map((stock, id) => Object.freeze({ id, product_variants: [{ stock }] })))
  const result = outOfStockLast(products)
  expect(result.map(p => p.id)).toEqual([1, 3, 0, 2, 4])
  expect(products.map(p => p.id)).toEqual([0, 1, 2, 3, 4])
  expect(result[0]).toBe(products[1])
})

it('orders the whole list before a recently-viewed or recommendation display cap', () => {
  const products = Array.from({ length: 20 }, (_, id) => ({ id, product_variants: [{ stock: id < 12 ? 0 : 1 }] }))
  expect(outOfStockLast(products).slice(0, 8).map(p => p.id)).toEqual([12, 13, 14, 15, 16, 17, 18, 19])
})
