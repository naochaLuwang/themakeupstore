'use client'
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useCart } from '@/components/store/use-cart'
import { useFlashSaleClock } from '@/hooks/use-flash-sale-clock'
import type { FlashSaleRow } from '@/lib/flash-sale-helper'
const emptySales: FlashSaleRow[] = []
const categoryMap = new Map<string, string[]>()
const FlashSalesContext = createContext({ sales: emptySales, categoryMap, now: 0, loaded: false })
export function FlashSalesProvider({ children }: { children: ReactNode }) {
  const catalog = useCart(s => s.offerCatalog)
  const sales = catalog?.flashSales || emptySales
  const now = useFlashSaleClock(sales)
  const value = useMemo(() => ({ sales, categoryMap, now, loaded: !!catalog?.flashSales }), [sales, now, catalog?.flashSales])
  return <FlashSalesContext.Provider value={value}>{children}</FlashSalesContext.Provider>
}
export function useFlashSales() { return useContext(FlashSalesContext) }
