// @vitest-environment node
import { expect, it } from 'vitest'
import { safePushUrl } from './push-url'

it.each([
  ['/profile/orders/123?source=push#status', '/profile/orders/123?source=push#status'],
  ['https://themakeupstorewangkhei.com/products/123', '/products/123'],
  ['https://themakeupstorewangkhei.com', '/'],
])('opens app notification link %s', (input, expected) => {
  expect(safePushUrl(input)).toBe(expected)
})

it.each([
  '//example.com', '/\\example.com', 'https://themakeupstorewangkhei.com.evil.test',
  'https://themakeupstorewangkhei.com@evil.test/', 'javascript:alert(1)', '/\nevil.test', undefined,
])('rejects unsafe notification link %s', input => {
  expect(safePushUrl(input)).toBeUndefined()
})
