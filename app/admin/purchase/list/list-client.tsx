'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Plus, ArrowUpRight, FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { exportPurchases } from '@/app/actions/purchases'
import {
    PURCHASE_STATUSES,
    purchaseDate,
    purchaseMoney,
    purchaseToday,
    type PurchaseDirectory,
    type PurchaseParams,
} from '@/lib/purchases'

export default function PurchaseListClient({
    report,
    filters,
}: {
    report: PurchaseDirectory
    filters: ReturnType<typeof import('@/lib/purchases').purchaseFilters>
}) {
    const [exporting, setExporting] = useState(false)
    const [error, setError] = useState('')
    const href = (page: number) => {
        const params = new URLSearchParams()
        for (const key of ['q', 'status', 'from', 'to'] as const)
            if (filters[key]) params.set(key, filters[key])
        params.set('page', String(page))
        return `/admin/purchase/list?${params}`
    }
    async function download() {
        setExporting(true)
        setError('')
        try {
            const csv = await exportPurchases({ ...filters, page: '1' } as PurchaseParams)
            const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
            const anchor = document.createElement('a')
            anchor.href = url
            anchor.download = `purchases-${purchaseToday()}.csv`
            anchor.click()
            URL.revokeObjectURL(url)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unable to export purchases.')
        } finally {
            setExporting(false)
        }
    }
    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">Purchase history</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Review supplier orders and record incoming stock.
                    </p>
                </div>
                <Link
                    href="/admin/purchase"
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white"
                >
                    <Plus className="h-4 w-4" /> New purchase
                </Link>
            </header>
            <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                    ['Purchase value', purchaseMoney(report.summary.value)],
                    ['Awaiting deliveries', report.summary.open],
                    ['Accepted units', report.summary.received],
                    ['Damaged units', report.summary.damaged],
                ].map(([label, value]) => (
                    <div key={label} className="min-w-0 rounded-2xl border bg-white p-5 shadow-sm">
                        <dt className="text-xs text-slate-500">{label}</dt>
                        <dd className="mt-2 break-words text-xl font-semibold tabular-nums">{value}</dd>
                    </div>
                ))}
            </dl>
            <section
                className="rounded-2xl border bg-white p-5 shadow-sm space-y-4"
                aria-label="Purchase filters"
            >
                <form
                    action="/admin/purchase/list"
                    method="get"
                    className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(180px,1fr)_150px_160px_160px_auto]"
                >
                    <label className="min-w-0 space-y-2 text-xs font-medium text-slate-600">
                        Reference or supplier
                        <Input
                            key={`q-${filters.q}`}
                            name="q"
                            defaultValue={filters.q}
                            placeholder="Search purchases"
                            maxLength={200}
                            className="h-10 border-slate-200"
                        />
                    </label>
                    <label className="min-w-0 space-y-2 text-xs font-medium text-slate-600">
                        Status
                        <select
                            key={`status-${filters.status}`}
                            name="status"
                            defaultValue={filters.status}
                            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                        >
                            <option value="">All statuses</option>
                            {Object.entries(PURCHASE_STATUSES).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="min-w-0 space-y-2 text-xs font-medium text-slate-600">
                        From (IST)
                        <Input
                            key={`from-${filters.from}`}
                            name="from"
                            type="date"
                            defaultValue={filters.from}
                            className="h-10 w-full min-w-0 border-slate-200"
                        />
                    </label>
                    <label className="min-w-0 space-y-2 text-xs font-medium text-slate-600">
                        To (IST)
                        <Input
                            key={`to-${filters.to}`}
                            name="to"
                            type="date"
                            defaultValue={filters.to}
                            className="h-10 w-full min-w-0 border-slate-200"
                        />
                    </label>
                    <Button type="submit" className="h-10 self-end bg-slate-900 text-white">
                        Apply filters
                    </Button>
                </form>
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                    <span>
                        {report.total} matching purchases · summaries use these filters · value includes
                        cancelled orders
                    </span>
                    <div className="flex items-center gap-4">
                        <Link href="/admin/purchase/list" className="underline">
                            Clear filters
                        </Link>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={exporting || !report.total}
                            onClick={download}
                        >
                            <FileDown className="h-4 w-4" />
                            {exporting ? 'Exporting…' : 'Export filtered CSV'}
                        </Button>
                    </div>
                </div>
                {error && (
                    <p role="alert" className="text-sm text-red-700">
                        {error}
                    </p>
                )}
            </section>
            <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[740px] text-left text-sm">
                        <thead className="border-b bg-slate-50 text-xs text-slate-500">
                            <tr>
                                {[
                                    'Reference / date',
                                    'Supplier',
                                    'Status',
                                    'Units accepted / ordered',
                                    'Total cost',
                                    '',
                                ].map((label, i) => (
                                    <th key={i} className="px-6 py-4 font-medium">
                                        {label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {report.orders.length ? (
                                report.orders.map((order) => (
                                    <tr key={order.id} className="hover:bg-slate-50/50">
                                        <td className="px-6 py-4">
                                            <Link
                                                href={`/admin/purchase/${order.id}`}
                                                className="font-semibold hover:underline break-all"
                                            >
                                                {order.reference_number || 'No reference'}
                                            </Link>
                                            <p className="mt-1 text-xs text-slate-500">
                                                {purchaseDate(order.created_at)}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            {order.supplier?.name || 'Supplier unavailable'}
                                            {order.expected_on && (
                                                <p className="mt-1 text-xs text-slate-500">
                                                    Expected{' '}
                                                    {purchaseDate(`${order.expected_on}T00:00:00+05:30`)}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`inline-block whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium ${
                                                    order.status === 'received'
                                                        ? 'bg-emerald-50 text-emerald-800'
                                                        : order.status === 'partial'
                                                        ? 'bg-amber-50 text-amber-800'
                                                        : 'bg-slate-100 text-slate-700'
                                                }`}
                                            >
                                                {PURCHASE_STATUSES[order.status] || order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 tabular-nums">
                                            {order.received_units} / {order.units}
                                            {order.damaged_units > 0 && (
                                                <p className="mt-1 text-xs text-rose-700">
                                                    {order.damaged_units} damaged
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-semibold tabular-nums whitespace-nowrap">
                                            {purchaseMoney(order.total_cost)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Link
                                                href={`/admin/purchase/${order.id}`}
                                                aria-label={`Open purchase ${
                                                    order.reference_number || order.id
                                                }`}
                                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200"
                                            >
                                                <ArrowUpRight className="h-4 w-4" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        No purchases match these filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <nav
                    aria-label="Purchase pages"
                    className="flex flex-wrap items-center justify-between gap-3 border-t p-5 text-sm"
                >
                    <span className="text-slate-500">
                        Page {report.page} of {report.totalPages} · {report.total} purchases
                    </span>
                    <div className="flex gap-3">
                        {report.page > 1 && (
                            <Link href={href(report.page - 1)} className="rounded-lg border px-3 py-2">
                                Previous
                            </Link>
                        )}
                        {report.page < report.totalPages && (
                            <Link href={href(report.page + 1)} className="rounded-lg border px-3 py-2">
                                Next
                            </Link>
                        )}
                    </div>
                </nav>
            </div>
        </div>
    )
}
