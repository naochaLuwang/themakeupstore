"use client"

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface ViewedProduct {
  id: string
  name: string
  slug: string
  base_price: number
  thumbnail_url: string
  brand: string
  discount_type: string | null
  discount_value: number | null
  has_variants: boolean
  status: string
  product_variants: any[]
}

interface RecentlyViewedStore {
  items: ViewedProduct[]
  addItem: (product: ViewedProduct) => void
  clear: () => void
}

const MAX_ITEMS = 20

export const useRecentlyViewed = create<RecentlyViewedStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product) => {
        const existing = get().items
        const filtered = existing.filter(i => i.id !== product.id)
        set({ items: [product, ...filtered].slice(0, MAX_ITEMS) })
      },
      clear: () => set({ items: [] }),
    }),
    {
      name: 'tms-recently-viewed',
      storage: createJSONStorage(() => localStorage),
      merge: (persisted, current) => {
        const raw = (persisted as any)?.items
        const items = Array.isArray(raw)
          ? raw.filter((item: any) => item && typeof item.id === "string" && typeof item.name === "string")
          : []
        return { ...current, items }
      },
    }
  )
)
