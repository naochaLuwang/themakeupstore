"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { createClient } from "@/utils/supabase/client"
import type { ActiveFlashSale } from "@/lib/active-flash-sales"

interface FlashSalesData {
    sales: ActiveFlashSale[]
    categoryMap: Map<string, string[]>
}

const FlashSalesContext = createContext<FlashSalesData>({ sales: [], categoryMap: new Map() })

export function FlashSalesProvider({ children }: { children: ReactNode }) {
    const [data, setData] = useState<FlashSalesData>({ sales: [], categoryMap: new Map() })

    useEffect(() => {
        let cancelled = false
        const fetchSales = async () => {
            try {
                const supabase = createClient()
                const now = new Date().toISOString()
                const { data: sales } = await supabase
                    .from("flash_sales")
                    .select("*")
                    .eq("is_active", true)
                    .gte("ends_at", now)
                if (!sales || cancelled) return
                const activeSales = sales as ActiveFlashSale[]

                // Category-scoped sales need product -> category links,
                // since many pages don't embed product_categories in their queries
                let categoryMap = new Map<string, string[]>()
                if (activeSales.some((s) => s.scope === "category" && s.category_id)) {
                    const { data: junction } = await supabase
                        .from("product_categories")
                        .select("product_id, category_id")
                    if (junction && !cancelled) {
                        for (const row of junction) {
                            const list = categoryMap.get(row.product_id) || []
                            list.push(row.category_id)
                            categoryMap.set(row.product_id, list)
                        }
                    }
                }

                if (!cancelled) setData({ sales: activeSales, categoryMap })
            } catch {}
        }
        fetchSales()
        const interval = setInterval(fetchSales, 30000)
        return () => {
            cancelled = true
            clearInterval(interval)
        }
    }, [])

    return <FlashSalesContext.Provider value={data}>{children}</FlashSalesContext.Provider>
}

export function useFlashSales() {
    return useContext(FlashSalesContext)
}
