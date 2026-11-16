"use client"

import { Suspense, type FormEvent } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'

function CustomerFiltersInner() {
    const router = useRouter()
    const searchParams = useSearchParams()
    function apply(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const values = new FormData(event.currentTarget)
        const params = new URLSearchParams()
        for (const key of ['q', 'from', 'to']) {
            const value = String(values.get(key) || '').trim()
            if (value) params.set(key, value)
        }
        router.push(`/admin/customers${params.size ? `?${params}` : ''}`)
    }
    return (
        <form key={searchParams.toString()} onSubmit={apply} className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-end">
            <div className="flex-1 min-w-0 space-y-1.5">
                <label htmlFor="customer-search" className="text-xs font-medium text-slate-500">Customer search</label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 stroke-[1.5]" />
                    <Input id="customer-search" name="q" placeholder="Name, email or phone..." maxLength={200}
                        className="pl-10 h-10 rounded-xl border-slate-200" defaultValue={searchParams.get('q') || ''} />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 min-w-0">
                    <label htmlFor="customer-from" className="text-xs font-medium text-slate-500">Joined from</label>
                    <input id="customer-from" name="from" type="date" defaultValue={searchParams.get('from') || ''}
                        className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm sm:w-[150px]" />
                </div>
                <div className="space-y-1.5 min-w-0">
                    <label htmlFor="customer-to" className="text-xs font-medium text-slate-500">Joined to</label>
                    <input id="customer-to" name="to" type="date" defaultValue={searchParams.get('to') || ''}
                        className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm sm:w-[150px]" />
                </div>
            </div>
            <div className="flex items-center gap-3">
                <button type="submit" className="h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-medium">Search</button>
                {(searchParams.get('q') || searchParams.get('from') || searchParams.get('to')) && (
                    <Link href="/admin/customers" className="text-sm font-medium text-slate-600 hover:text-slate-900">Clear filters</Link>
                )}
            </div>
        </form>
    )
}

export function CustomerFilters() {
    return <Suspense fallback={<div className="h-10 w-full bg-slate-100 rounded-xl" />}><CustomerFiltersInner /></Suspense>
}
