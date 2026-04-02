import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validatePromoCode, getPromosForProduct } from './promo'
import { createClient } from '@/utils/supabase/server'

// Mock the Supabase client
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Mock admin helper
vi.mock('@/lib/admin', () => ({
  requireAdmin: vi.fn(),
}))

describe('Promo Actions', () => {
  let mockSupabase: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = {
      from: vi.fn(),
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    }

    const createChain = (data: any = null, error: any = null) => {
      const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        single: vi.fn(() => chain),
        order: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        // This makes the chain 'awaitable'
        then: (resolve: any) => resolve({ data, error }),
      }
      return chain
    }

    mockSupabase.from.mockImplementation(() => createChain())

    ;(createClient as any).mockResolvedValue(mockSupabase)
  })

  // Helper to set mock data for a supabase call
  const setMockData = (data: any, error: any = null) => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      then: (resolve: any) => resolve({ data, error }),
    }
    mockSupabase.from.mockReturnValueOnce(chain)
  }


  describe('validatePromoCode', () => {
    it('returns error for invalid promo code', async () => {
      setMockData(null, { message: 'Not found' })

      const result = await validatePromoCode('INVALID', [])
      expect(result.success).toBe(false)
      expect(result.message).toBe('Invalid promo code')
    })

    it('returns error if promo is not active yet', async () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      setMockData({ starts_at: tomorrow.toISOString(), is_active: true })

      const result = await validatePromoCode('LATE', [])
      expect(result.success).toBe(false)
      expect(result.message).toBe('This promo code is not active yet')
    })

    it('returns error if promo has expired', async () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      setMockData({ expires_at: yesterday.toISOString(), is_active: true })

      const result = await validatePromoCode('EXPIRED', [])
      expect(result.success).toBe(false)
      expect(result.message).toBe('This promo code has expired')
    })

    it('returns error if once_per_user is true and user already redeemed', async () => {
      const mockUser = { id: 'user-123' }
      const mockPromo = { id: 'promo-456', code: 'ONCE', once_per_user: true, is_active: true }
      
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      
      // Call 1: Fetch promoData
      setMockData(mockPromo)
      // Call 2: Check for redemption
      setMockData({ id: 'redemption-1' })

      const result = await validatePromoCode('ONCE', [])
      expect(result.success).toBe(false)
      expect(result.message).toBe('This coupon can only be used once per customer')
    })

    it('validates successfully if once_per_user is true but no previous redemption', async () => {
      const mockUser = { id: 'user-123' }
      const mockPromo = { 
        id: 'promo-456', 
        code: 'ONCE', 
        once_per_user: true, 
        is_active: true,
        apply_to: 'all',
        discount_type: 'percentage',
        discount_value: 10
      }
      
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      
      setMockData(mockPromo)
      setMockData(null) // Not redeemed

      const cartItems = [{ productId: 'p1', price: 100, quantity: 1 }]
      const result = await validatePromoCode('ONCE', cartItems)
      
      expect(result.success).toBe(true)
      expect(result.code).toBe('ONCE')
    })
  })

  describe('getPromosForProduct', () => {
    it('filters out once_per_user promos already used by the user', async () => {
      const promos = [
        { id: 'p1', code: 'PROMO1', once_per_user: true, is_active: true },
        { id: 'p2', code: 'PROMO2', once_per_user: true, is_active: true },
      ]
      
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
      
      setMockData(promos)
      setMockData([{ promo_id: 'p1' }])

      const result = await getPromosForProduct('prod-1', [])
      
      const p1 = result.find(p => p.id === 'p1')
      const p2 = result.find(p => p.id === 'p2')
      
      expect(p1?.is_eligible).toBe(false)
      expect(p1?.reasons).toContain('Already redeemed by you')
    })
  })
})
