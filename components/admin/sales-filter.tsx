"use client"

import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar as CalendarIcon, Check } from "lucide-react"
import { useState } from "react"

function SalesFilterInner() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [range, setRange] = useState(searchParams.get("range") || "30d")
    const [tempFrom, setTempFrom] = useState(searchParams.get("from") || "")
    const [tempTo, setTempTo] = useState(searchParams.get("to") || "")

    const handleRangeChange = (value: string) => {
        setRange(value)
        if (value !== "custom") {
            const params = new URLSearchParams()
            params.set("range", value)
            router.push(`?${params.toString()}`)
        }
    }

    const applyCustomRange = () => {
        if (!tempFrom || !tempTo) return alert("Select both dates")
        const params = new URLSearchParams()
        params.set("range", "custom")
        params.set("from", tempFrom)
        params.set("to", tempTo)
        router.push(`?${params.toString()}`)
    }

    return (
        <div className="flex items-center gap-2">
            <Select value={range} onValueChange={handleRangeChange}>
                <SelectTrigger className="w-[130px] h-9 rounded-lg bg-slate-100 border-none font-semibold text-xs">
                    <CalendarIcon className="w-4 h-4 mr-2 stroke-[1.5]" />
                    <SelectValue placeholder="Range" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="today" className="text-xs font-semibold">Today</SelectItem>
                    <SelectItem value="7d" className="text-xs font-semibold">7 Days</SelectItem>
                    <SelectItem value="30d" className="text-xs font-semibold">30 Days</SelectItem>
                    <SelectItem value="last_month" className="text-xs font-semibold">Last Month</SelectItem>
                    <SelectItem value="all" className="text-xs font-semibold">All Time</SelectItem>
                    <SelectItem value="custom" className="text-xs font-semibold">Custom</SelectItem>
                </SelectContent>
            </Select>

            {range === "custom" && (
                <div className="flex items-center gap-1 animate-in slide-in-from-right-2 duration-300">
                    <input type="date" className="h-9 rounded-lg bg-slate-100 px-2 text-xs font-semibold border-none" value={tempFrom} onChange={(e) => setTempFrom(e.target.value)} />
                    <span className="text-xs font-semibold text-slate-400">to</span>
                    <input type="date" className="h-9 rounded-lg bg-slate-100 px-2 text-xs font-semibold border-none" value={tempTo} onChange={(e) => setTempTo(e.target.value)} />
                    <button onClick={applyCustomRange} className="h-9 w-9 flex items-center justify-center bg-slate-900 text-white rounded-lg hover:bg-black">
                        <Check className="w-4 h-4 stroke-[1.5]" />
                    </button>
                </div>
            )}
        </div>
    )
}

export function SalesFilter() {
    return (
        <Suspense fallback={<div className="h-9 w-[130px] bg-slate-100 rounded-lg" />}>
            <SalesFilterInner />
        </Suspense>
    )
}