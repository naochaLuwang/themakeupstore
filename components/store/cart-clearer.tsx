"use client"

import { useEffect } from "react"
import { useCart } from "@/components/store/use-cart"

export function CartClearer() {
    const clearCart = useCart(s => s.clearCart)
    useEffect(() => { clearCart() }, [clearCart])
    return null
}
