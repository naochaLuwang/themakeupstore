'use client'

import { useEffect } from 'react'
import { useCart } from '@/components/store/use-cart'
import { paidCartKey } from '@/lib/cart-key'
import { refreshPromotions, startPromotionSync } from '@/lib/promotion-client'

export function usePromotions() {
  const items = useCart(s => s.items)
  const status = useCart(s => s.offerStatus)
  const error = useCart(s => s.offerError)
  const readyKey = useCart(s => s.offerInputKey)
  useEffect(startPromotionSync, [])
  return { checking: !['ready', 'preview'].includes(status) || readyKey !== paidCartKey(items), error, refresh: refreshPromotions }
}
