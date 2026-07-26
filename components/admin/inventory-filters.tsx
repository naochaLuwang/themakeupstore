"use client"

import { Suspense } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter, useSearchParams, usePathname } from "next/navigation"

function StockStatusFilterInner() {
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const { replace } = useRouter()

    const onChange = (value: string) => {
        const params = new URLSearchParams(searchParams)
        if (value && value !== "all") params.set("status", value)
        else params.delete("status")
        params.delete("page")
        replace(`${pathname}?${params.toString()}`)
    }

    return (
        <Select defaultValue={searchParams.get("status") || "all"} onValueChange={onChange}>
            <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Levels" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="out">Out of Stock</SelectItem>
                <SelectItem value="low">Low Stock (≤10)</SelectItem>
                <SelectItem value="in">In Stock (&gt;10)</SelectItem>
            </SelectContent>
        </Select>
    )
}

export function StockStatusFilter() {
    return (
        <Suspense fallback={<div className="h-9 w-[160px] bg-slate-100 rounded-lg animate-pulse" />}>
            <StockStatusFilterInner />
        </Suspense>
    )
}