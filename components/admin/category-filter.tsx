"use client"

import { Suspense } from "react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useRouter, useSearchParams, usePathname } from "next/navigation"

function CategoryFilterInner({ categories }: { categories: { id: string; name: string }[] }) {
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const { replace } = useRouter()

    const onCategoryChange = (value: string) => {
        const params = new URLSearchParams(searchParams)
        if (value && value !== "all") {
            params.set("category", value)
        } else {
            params.delete("category")
        }
        params.delete("page")
        replace(`${pathname}?${params.toString()}`)
    }

    return (
        <Select
            defaultValue={searchParams.get("category") || "all"}
            onValueChange={onCategoryChange}
        >
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}

export function CategoryFilter({ categories }: { categories: { id: string; name: string }[] }) {
    return (
        <Suspense fallback={<div className="h-9 w-[180px] bg-slate-100 rounded-lg animate-pulse" />}>
            <CategoryFilterInner categories={categories} />
        </Suspense>
    )
}