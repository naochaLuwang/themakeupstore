"use client"

import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useDebouncedCallback } from "use-debounce"

export function CustomerFilters() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const updateParams = useDebouncedCallback((key: string, value: string) => {
        const params = new URLSearchParams(searchParams)
        if (value) {
            params.set(key, value)
        } else {
            params.delete(key)
        }
        params.delete("page")
        router.push(`?${params.toString()}`)
    }, 300)

    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative max-w-sm flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder="Search customers..."
                    className="pl-10 h-11 rounded-xl border-slate-200"
                    defaultValue={searchParams.get("q")?.toString()}
                    onChange={(e) => updateParams("q", e.target.value)}
                />
            </div>
            <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400">From</span>
                <input
                    type="date"
                    defaultValue={searchParams.get("from")?.toString()}
                    onChange={(e) => updateParams("from", e.target.value)}
                    className="h-11 rounded-xl border border-slate-200 px-3 text-sm bg-white"
                />
                <span className="text-xs font-medium text-slate-400">To</span>
                <input
                    type="date"
                    defaultValue={searchParams.get("to")?.toString()}
                    onChange={(e) => updateParams("to", e.target.value)}
                    className="h-11 rounded-xl border border-slate-200 px-3 text-sm bg-white"
                />
            </div>
        </div>
    )
}