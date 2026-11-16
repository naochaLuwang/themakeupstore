'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { exportRewardHistory } from '@/app/actions/loyalty'
import {
    rewardDate,
    rewardNumber,
    rewardHref,
    type rewardTxFilters,
    type RewardUserDetail,
    type RewardTxParams,
} from '@/lib/reward-users'
import { AdjustPointsForm } from './adjust-points-form'

export function RewardUserDetailClient({
    data,
    filters,
}: {
    data: RewardUserDetail
    filters: ReturnType<typeof rewardTxFilters>
}) {
    const router = useRouter(),
        user = data.user
    const base = `/admin/rewards/users/${user.user_id}`
    const params: RewardTxParams = { ...filters, page: String(filters.page) }
    const [exporting, setExporting] = useState(false),
        [error, setError] = useState('')
    async function download() {
        setExporting(true)
        setError('')
        try {
            const csv = await exportRewardHistory(user.user_id, params),
                url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
            const a = document.createElement('a')
            a.href = url
            a.download = `reward-history-${user.user_id}.csv`
            a.click()
            URL.revokeObjectURL(url)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unable to export history.')
        } finally {
            setExporting(false)
        }
    }
    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                    <Link
                        href="/admin/rewards/users"
                        aria-label="Back to reward users"
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <div className="min-w-0">
                        <h1 className="text-2xl font-black tracking-tight break-words">{user.full_name}</h1>
                        <p className="mt-1 text-sm text-slate-500 break-words">
                            {[user.email, user.phone].filter(Boolean).join(' · ') || 'Reward account'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 break-all">{user.user_id}</p>
                    </div>
                </div>
                <Button variant="outline" onClick={() => router.refresh()}>
                    Refresh balances
                </Button>
            </header>
            <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                    ['Available coins', user.balance],
                    ['Lifetime earned (stored)', user.lifetime_earned],
                    ['Coins spent', data.summary.spent],
                    ['Pending coins', data.summary.pending],
                ].map(([label, value]) => (
                    <div key={label} className="min-w-0 rounded-2xl border bg-white p-5 shadow-sm">
                        <dt className="text-xs text-slate-500">{label}</dt>
                        <dd className="mt-2 break-words text-xl font-semibold tabular-nums">
                            {rewardNumber(Number(value))}
                        </dd>
                    </div>
                ))}
            </dl>
            <p className="text-xs text-slate-500">
                All-time account figures · stored tier: <span className="capitalize">{user.tier}</span> ·
                recorded available earnings: {rewardNumber(data.summary.recordedEarned)} · expired:{' '}
                {rewardNumber(data.summary.expired)}. Historical balance and lifetime discrepancies are
                retained for review.
            </p>
            <div className="grid items-start gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
                <AdjustPointsForm
                    userId={user.user_id}
                    customerName={user.full_name}
                    currentBalance={user.balance}
                />
                <section
                    aria-label="Reward transaction history"
                    className="min-w-0 overflow-hidden rounded-2xl border bg-white shadow-sm"
                >
                    <div className="space-y-4 border-b p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h2 className="text-sm font-semibold">Transaction history</h2>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={exporting || !data.total}
                                onClick={download}
                            >
                                <Download className="h-4 w-4" />
                                {exporting ? 'Exporting…' : 'Export filtered CSV'}
                            </Button>
                        </div>
                        {error && (
                            <p role="alert" className="text-sm text-red-700">
                                {error}
                            </p>
                        )}
                        <form action={base} method="get" className="grid gap-3 sm:grid-cols-2">
                            <label className="space-y-2 text-xs font-medium text-slate-600">
                                Type
                                <select
                                    key={filters.type}
                                    name="type"
                                    defaultValue={filters.type}
                                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                                >
                                    <option value="all">All types</option>
                                    {['earn', 'bonus', 'spend', 'expired'].map((value) => (
                                        <option key={value} value={value}>
                                            {value}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="space-y-2 text-xs font-medium text-slate-600">
                                Status
                                <select
                                    key={filters.status}
                                    name="status"
                                    defaultValue={filters.status}
                                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                                >
                                    <option value="all">All statuses</option>
                                    {['available', 'pending', 'cancelled'].map((value) => (
                                        <option key={value} value={value}>
                                            {value}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="min-w-0 space-y-2 text-xs font-medium text-slate-600">
                                From (IST)
                                <Input
                                    key={filters.from}
                                    type="date"
                                    name="from"
                                    defaultValue={filters.from}
                                    className="h-10 w-full min-w-0 border-slate-200"
                                />
                            </label>
                            <label className="min-w-0 space-y-2 text-xs font-medium text-slate-600">
                                To (IST)
                                <Input
                                    key={filters.to}
                                    type="date"
                                    name="to"
                                    defaultValue={filters.to}
                                    className="h-10 w-full min-w-0 border-slate-200"
                                />
                            </label>
                            <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
                                <Link href={base} className="text-xs underline">
                                    Clear filters
                                </Link>
                                <Button type="submit" className="h-10 bg-slate-900 text-white">
                                    Apply transaction filters
                                </Button>
                            </div>
                        </form>
                        <p className="text-xs text-slate-500">
                            {rewardNumber(data.total)} matching transactions. Account summaries above cover
                            all dates and types.
                        </p>
                    </div>
                    <div className="divide-y">
                        {data.transactions.length ? (
                            data.transactions.map((tx) => (
                                <div key={tx.id} className="space-y-3 p-5">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold capitalize">
                                                {tx.type}{' '}
                                                <span className="ml-1 text-xs font-normal text-slate-500">
                                                    {tx.status}
                                                </span>
                                            </p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                {rewardDate(tx.created_at)}
                                            </p>
                                        </div>
                                        <p
                                            className={`text-sm font-semibold tabular-nums ${
                                                tx.status === 'cancelled'
                                                    ? 'text-slate-400'
                                                    : 'text-slate-900'
                                            }`}
                                        >
                                            {tx.status === 'cancelled'
                                                ? 'Voided '
                                                : tx.status === 'pending'
                                                ? 'Pending '
                                                : ''}
                                            {tx.status === 'available'
                                                ? ['earn', 'bonus'].includes(tx.type)
                                                    ? '+'
                                                    : '−'
                                                : ''}
                                            {rewardNumber(tx.amount)} coins
                                        </p>
                                    </div>
                                    <p className="whitespace-pre-wrap break-words text-sm text-slate-700">
                                        {tx.note || 'No reason recorded'}
                                    </p>
                                    <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-500">
                                        <span>
                                            {tx.status === 'available'
                                                ? 'Recorded balance'
                                                : 'Historical snapshot'}
                                            : {rewardNumber(tx.balance_before)} →{' '}
                                            {rewardNumber(tx.balance_after)}
                                        </span>
                                        <span>
                                            {tx.admin_actor_id
                                                ? `Admin: ${tx.actor_name || tx.admin_actor_id}`
                                                : tx.reference_type === 'admin'
                                                ? 'Historical credit: operator not recorded'
                                                : tx.reference_type || 'Other'}
                                        </span>
                                    </div>
                                    <p className="break-all text-xs text-slate-400">Transaction {tx.id}</p>
                                    {tx.reference_type === 'order' && tx.reference_id && (
                                        <Link
                                            href={`/admin/orders/${tx.reference_id}`}
                                            className="inline-block text-xs font-medium underline"
                                        >
                                            View order
                                        </Link>
                                    )}
                                </div>
                            ))
                        ) : (
                            <p className="p-8 text-center text-sm text-slate-500">
                                No transactions match these filters.
                            </p>
                        )}
                    </div>
                    <nav
                        aria-label="Reward transaction pages"
                        className="flex flex-wrap items-center justify-between gap-3 border-t p-5 text-sm"
                    >
                        <span className="text-slate-500">
                            Page {data.page} of {data.totalPages}
                        </span>
                        <div className="flex gap-3">
                            {data.page > 1 && (
                                <Link
                                    href={rewardHref(base, params, data.page - 1)}
                                    className="rounded-lg border px-3 py-2"
                                >
                                    Previous
                                </Link>
                            )}
                            {data.page < data.totalPages && (
                                <Link
                                    href={rewardHref(base, params, data.page + 1)}
                                    className="rounded-lg border px-3 py-2"
                                >
                                    Next
                                </Link>
                            )}
                        </div>
                    </nav>
                </section>
            </div>
        </div>
    )
}
