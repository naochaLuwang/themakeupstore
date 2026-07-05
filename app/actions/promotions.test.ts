import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@/utils/supabase/server'

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/admin', () => ({
  requireAdmin: vi.fn(),
}))

function createChain() {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    single: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    in: vi.fn(() => chain),
    lte: vi.fn(() => chain),
    or: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    update: vi.fn(() => chain),
    then: (resolve: any) => resolve({ data: null, error: null }),
  }
  return chain
}

describe('Promotions Server Actions', () => {
  let mockSupabase: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = {
      from: vi.fn(() => createChain()),
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    }
    ;(createClient as any).mockResolvedValue(mockSupabase)
  })

  function setMockData(data: any, error: any = null) {
    const chain = createChain()
    chain.then = (resolve: any) => resolve({ data, error })
    mockSupabase.from.mockReturnValueOnce(chain)
  }

  describe('evaluateFreeGifts', () => {
    it('returns empty when no active rules', async () => {
      setMockData(null, null)
      const { evaluateFreeGifts } = await import('./promotions')
      const result = await evaluateFreeGifts([])
      expect(result).toEqual([])
    })

    it('returns empty when cart is empty', async () => {
      const mockRule = {
        id: 'r1',
        name: 'Free Gift on Cart Total',
        gift_product_id: 'gp1',
        gift_variant_id: null,
        gift_quantity: 1,
        trigger_type: 'cart_total',
        trigger_threshold: 1000,
        min_cart_amount: null,
        apply_to: 'all',
        usage_limit: null,
        used_count: 0,
        once_per_user: false,
        max_per_order: null,
        starts_at: '2020-01-01',
        expires_at: null,
        is_active: true,
        gift_product: { name: 'Free Lipstick', thumbnail_url: null, base_price: 500 },
        gift_variant: null,
        qualifying_products: [],
        qualifying_categories: [],
        qualifying_brands: [],
      }
      setMockData([mockRule])
      const { evaluateFreeGifts } = await import('./promotions')
      const result = await evaluateFreeGifts([])
      expect(result).toEqual([])
    })

    it('triggers on cart_total when threshold is met', async () => {
      const mockRule = {
        id: 'r1', name: 'Free Gift on ₹1000', gift_product_id: 'gp1',
        gift_variant_id: null, gift_quantity: 1, trigger_type: 'cart_total',
        trigger_threshold: 1000, min_cart_amount: null, apply_to: 'all',
        usage_limit: null, used_count: 0, once_per_user: false, max_per_order: null,
        starts_at: '2020-01-01', expires_at: null, is_active: true,
        gift_product: { name: 'Free Lipstick', thumbnail_url: null, base_price: 500 },
        gift_variant: null,
        qualifying_products: [], qualifying_categories: [], qualifying_brands: [],
      }
      setMockData([mockRule])
      const { evaluateFreeGifts } = await import('./promotions')
      const result = await evaluateFreeGifts([
        { productId: 'p1', variantId: 'v1', price: 500, quantity: 2, name: 'Item' } as any,
      ])
      expect(result).toHaveLength(1)
      expect(result[0].rule_id).toBe('r1')
      expect(result[0].product_id).toBe('gp1')
    })

    it('does not trigger on cart_total when threshold is not met', async () => {
      const mockRule = {
        id: 'r1', name: 'Free Gift on ₹1000', gift_product_id: 'gp1',
        gift_variant_id: null, gift_quantity: 1, trigger_type: 'cart_total',
        trigger_threshold: 1000, min_cart_amount: null, apply_to: 'all',
        usage_limit: null, used_count: 0, once_per_user: false, max_per_order: null,
        starts_at: '2020-01-01', expires_at: null, is_active: true,
        gift_product: { name: 'Free Lipstick', thumbnail_url: null, base_price: 500 },
        gift_variant: null,
        qualifying_products: [], qualifying_categories: [], qualifying_brands: [],
      }
      setMockData([mockRule])
      const { evaluateFreeGifts } = await import('./promotions')
      const result = await evaluateFreeGifts([
        { productId: 'p1', variantId: 'v1', price: 500, quantity: 1, name: 'Item' } as any,
      ])
      expect(result).toHaveLength(0)
    })

    it('respects min_cart_amount for specific_products trigger', async () => {
      const mockRule = {
        id: 'r1', name: 'Free Gift on Products', gift_product_id: 'gp1',
        gift_variant_id: null, gift_quantity: 1, trigger_type: 'specific_products',
        trigger_threshold: 1, min_cart_amount: 1000, apply_to: 'all',
        usage_limit: null, used_count: 0, once_per_user: false, max_per_order: null,
        starts_at: '2020-01-01', expires_at: null, is_active: true,
        gift_product: { name: 'Free Lipstick', thumbnail_url: null, base_price: 500 },
        gift_variant: null,
        qualifying_products: [{ product_id: 'p1' }],
        qualifying_categories: [], qualifying_brands: [],
      }
      setMockData([mockRule])
      const { evaluateFreeGifts } = await import('./promotions')
      const result = await evaluateFreeGifts([
        { productId: 'p1', variantId: 'v1', price: 500, quantity: 1, name: 'Item' } as any,
      ])
      expect(result).toHaveLength(0)
    })

    it('skips gift if already in cart', async () => {
      const mockRule = {
        id: 'r1', name: 'Free Gift', gift_product_id: 'gp1',
        gift_variant_id: null, gift_quantity: 1, trigger_type: 'cart_total',
        trigger_threshold: 100, min_cart_amount: null, apply_to: 'all',
        usage_limit: null, used_count: 0, once_per_user: false, max_per_order: null,
        starts_at: '2020-01-01', expires_at: null, is_active: true,
        gift_product: { name: 'Free Lipstick', thumbnail_url: null, base_price: 500 },
        gift_variant: null,
        qualifying_products: [], qualifying_categories: [], qualifying_brands: [],
      }
      setMockData([mockRule])
      const { evaluateFreeGifts } = await import('./promotions')
      const result = await evaluateFreeGifts([
        { productId: 'p1', variantId: 'v1', price: 500, quantity: 2, name: 'Item' } as any,
        { productId: 'gp1', variantId: 'gp1', price: 0, quantity: 1, name: 'Free Lipstick', is_gift: true } as any,
      ])
      expect(result).toHaveLength(0)
    })
  })

  describe('evaluateBXGY', () => {
    it('returns empty when no active rules', async () => {
      setMockData(null, null)
      const { evaluateBXGY } = await import('./promotions')
      const result = await evaluateBXGY([])
      expect(result.discounts).toEqual([])
      expect(result.freeItems).toEqual([])
    })

    it('returns cheapest_free discount for 3 qualifying items (Buy 2 Get 1)', async () => {
      const mockRule = {
        id: 'r1', name: 'Buy 2 Get 1 Free', buy_type: 'specific_products',
        buy_quantity: 2, get_type: 'cheapest_free', get_product_id: null,
        get_variant_id: null, get_discount_type: 'free', get_discount_value: 100,
        apply_to: 'all', usage_limit: null, used_count: 0, once_per_user: false,
        max_per_order: null, starts_at: '2020-01-01', expires_at: null, is_active: true,
        buy_products: [{ product_id: 'p1' }], buy_categories: [], buy_brands: [],
        get_product: null, get_variant: null,
      }
      setMockData([mockRule])
      const { evaluateBXGY } = await import('./promotions')
      const result = await evaluateBXGY([
        { productId: 'p1', variantId: 'v1', price: 500, quantity: 2, name: 'Item A' } as any,
        { productId: 'p1', variantId: 'v2', price: 700, quantity: 1, name: 'Item B' } as any,
      ])
      expect(result.discounts).toHaveLength(1)
      // Cheapest is Item A (₹500), only 1 unit free (qty 2, free 1)
      expect(result.discounts[0].variant_id).toBe('v1')
      expect(result.discounts[0].discount_amount).toBe(500)
      expect(result.discounts[0].free_quantity).toBe(1)
    })

    it('cheapest_free: 3 items → 1 free unit for Buy 2 Get 1', async () => {
      const mockRule = {
        id: 'r1', name: 'Buy 2 Get 1 Free', buy_type: 'specific_products',
        buy_quantity: 2, get_type: 'cheapest_free', get_product_id: null,
        get_variant_id: null, get_discount_type: 'free', get_discount_value: 100,
        apply_to: 'all', usage_limit: null, used_count: 0, once_per_user: false,
        max_per_order: null, starts_at: '2020-01-01', expires_at: null, is_active: true,
        buy_products: [{ product_id: 'p1' }], buy_categories: [], buy_brands: [],
        get_product: null, get_variant: null,
      }
      setMockData([mockRule])
      const { evaluateBXGY } = await import('./promotions')
      const result = await evaluateBXGY([
        { productId: 'p1', variantId: 'v1', price: 700, quantity: 1, name: 'Item A' } as any,
        { productId: 'p1', variantId: 'v2', price: 2100, quantity: 1, name: 'Item B' } as any,
        { productId: 'p1', variantId: 'v3', price: 500, quantity: 1, name: 'Item C' } as any,
      ])
      expect(result.discounts).toHaveLength(1)
      expect(result.discounts[0].variant_id).toBe('v3')
    })
  })

  describe('createBXGY', () => {
    it('creates a rule and inserts junction tables', async () => {
      const { createBXGY } = await import('./promotions')

      const mockRule = createChain()
      mockRule.then = (resolve: any) => resolve({ data: { id: 'new-rule-1' }, error: null })
      mockSupabase.from.mockReturnValueOnce(mockRule)

      const buyProductsChain = createChain()
      buyProductsChain.then = (resolve: any) => resolve({ data: null, error: null })
      mockSupabase.from.mockReturnValueOnce(buyProductsChain)

      const buyCatsChain = createChain()
      buyCatsChain.then = (resolve: any) => resolve({ data: null, error: null })
      mockSupabase.from.mockReturnValueOnce(buyCatsChain)

      const buyBrandsChain = createChain()
      buyBrandsChain.then = (resolve: any) => resolve({ data: null, error: null })
      mockSupabase.from.mockReturnValueOnce(buyBrandsChain)

      const getProductsChain = createChain()
      getProductsChain.then = (resolve: any) => resolve({ data: null, error: null })
      mockSupabase.from.mockReturnValueOnce(getProductsChain)

      const result = await createBXGY({
        name: 'Test Rule', buy_type: 'specific_products', buy_quantity: 2,
        get_type: 'cheapest_free', get_discount_type: 'free', get_discount_value: 100,
        apply_to: 'all', starts_at: '2020-01-01',
        buy_product_ids: ['p1', 'p2'], buy_category_ids: ['c1'], buy_brands: ['BrandX'],
        get_product_ids: ['gp1'],
      })
      expect(result.id).toBe('new-rule-1')
    })
  })
})
