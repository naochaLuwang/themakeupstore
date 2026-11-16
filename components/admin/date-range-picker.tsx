'use client'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format, subDays } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

function DateRangePickerInner({ from, to }: { from: string; to: string }) {
    const router = useRouter(),
        search = useSearchParams()
    const [date, setDate] = useState<DateRange | undefined>({
        from: new Date(`${from}T12:00:00`),
        to: new Date(`${to}T12:00:00`),
    })
    const [open, setOpen] = useState(false)
    function apply(start: string, end: string) {
        const params = new URLSearchParams(search)
        params.set('from', start)
        params.set('to', end)
        params.delete('page')
        router.push(`/admin?${params}`)
        setOpen(false)
    }
    function preset(days: number) {
        const today = new Date(Date.now() + 19_800_000).toISOString().slice(0, 10)
        apply(format(subDays(new Date(`${today}T12:00:00`), days - 1), 'yyyy-MM-dd'), today)
    }
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    aria-label={`Date range: ${from} to ${to}`}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs inline-flex items-center gap-2 text-slate-600"
                >
                    <CalendarIcon className="h-4 w-4 shrink-0" />
                    {format(
                        new Date(`${from}T12:00:00`),
                        from.slice(0, 4) === to.slice(0, 4) ? 'd MMM' : 'd MMM yyyy'
                    )}{' '}
                    – {format(new Date(`${to}T12:00:00`), 'd MMM yyyy')}
                </button>
            </PopoverTrigger>
            <PopoverContent
                align="end"
                className="w-auto max-w-[calc(100vw-2rem)] p-3 overflow-x-auto space-y-3"
            >
                <div className="flex flex-wrap gap-2">
                    {[
                        [1, 'Today'],
                        [7, '7 days'],
                        [30, '30 days'],
                    ].map(([days, label]) => (
                        <button
                            key={days}
                            onClick={() => preset(Number(days))}
                            className="rounded-lg border px-2 py-1 text-xs"
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <Calendar
                    mode="range"
                    selected={date}
                    onSelect={setDate}
                    defaultMonth={date?.from}
                    numberOfMonths={1}
                />
                <button
                    onClick={() => {
                        if (date?.from && date.to)
                            apply(format(date.from, 'yyyy-MM-dd'), format(date.to, 'yyyy-MM-dd'))
                    }}
                    disabled={!date?.from || !date.to}
                    className="w-full h-9 rounded-lg bg-slate-900 text-white text-sm font-medium disabled:opacity-50"
                >
                    Apply dates
                </button>
            </PopoverContent>
        </Popover>
    )
}
export function DateRangePicker(props: { from: string; to: string }) {
    return (
        <Suspense fallback={<div className="h-10 w-52 rounded-xl bg-slate-100" />}>
            <DateRangePickerInner key={`${props.from}:${props.to}`} {...props} />
        </Suspense>
    )
}
