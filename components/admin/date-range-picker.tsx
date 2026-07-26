"use client"

import * as React from "react"
import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { format, subDays } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

function DateRangePickerInner() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [date, setDate] = React.useState<DateRange | undefined>({
        from: searchParams.get("from") ? new Date(searchParams.get("from")!) : subDays(new Date(), 30),
        to: searchParams.get("to") ? new Date(searchParams.get("to")!) : new Date(),
    })

    const applyFilter = (range: DateRange | undefined) => {
        if (range?.from && range?.to) {
            const params = new URLSearchParams()
            params.set("from", format(range.from, "yyyy-MM-dd"))
            params.set("to", format(range.to, "yyyy-MM-dd"))
            router.push(`?${params.toString()}`)
        }
        setDate(range)
    }

    return (
        <div className="grid gap-2">
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[300px] justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
                                </>
                            ) : (
                                format(date.from, "LLL dd, y")
                            )
                        ) : (
                            <span>Pick a date range</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={applyFilter}
                        numberOfMonths={2}
                    />
                </PopoverContent>
            </Popover>
        </div>
    )
}

export function DateRangePicker() {
    return (
        <Suspense fallback={<div className="h-10 w-[300px] bg-slate-100 rounded-lg animate-pulse" />}>
            <DateRangePickerInner />
        </Suspense>
    )
}