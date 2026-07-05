"use client"

import { usePromotions } from "@/hooks/use-promotions"

export function PromotionProvider({ children }: { children: React.ReactNode }) {
    usePromotions()
    return <>{children}</>
}
