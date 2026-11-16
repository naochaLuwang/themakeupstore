'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { exportRewardUsers } from '@/app/actions/loyalty'
import {
    rewardDate,
    rewardNumber,
    rewardHref,
    type rewardFilters,
    type RewardDirectory,
    type RewardParams,
} from '@/lib/reward-users'

export function AdminRewardsUsersClient({
    report,
    filters,
}: {
    report: RewardDirectory
    filters: ReturnType<typeof rewardFilters>
}) {
    const [exporting, setExporting] = useState(false),
        [error, setError] = useState('')
    const params: RewardParams = {
        q: filters.q,
        tier: filters.tier,
        spent: filters.spent,
        hideZero: filters.hideZero ? '1' : '',
        sort: filters.sort,
    }
    async function download() {
        setExporting(true)
        setError('')
        try {
            const csv = await exportRewardUsers(params),
                url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
            const anchor = document.createElement('a')
            anchor.href = url
            anchor.download = 'reward-users.csv'
            anchor.click()
            URL.revokeObjectURL(url)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unable to export reward users.')
        } finally {
            setExporting(false)
        }
    }
    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">Reward users</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        {rewardNumber(report.total)} matching customers ·{' '}
                        {rewardNumber(report.summary.active)} with available coins
                    </p>
                </div>
                <Button variant="outline" disabled={exporting || !report.total} onClick={download}>
                    <Download className="h-4 w-4" />
                    {exporting ? 'Exporting…' : 'Export filtered CSV'}
                </Button>
            </header>
            {error && (
                <p
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                    {error}
                </p>
            )}
            <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                    ['Available coins', report.summary.balance],
                    ['Lifetime earned (stored)', report.summary.earned],
                    ['Coins spent', report.summary.spent],
                    ['Pending coins', report.summary.pending],
                ].map(([label, value]) => (
                    <div key={label} className="min-w-0 rounded-2xl border bg-white p-5 shadow-sm">
                        <dt className="text-xs text-slate-500">{label}</dt>
                        <dd className="mt-2 break-words text-xl font-semibold tabular-nums">
                            {rewardNumber(Number(value))}
                        </dd>
                    </div>
                ))}
            </dl>
            <section
                aria-label="Reward user filters"
                className="rounded-2xl border bg-white p-5 shadow-sm space-y-4"
            >
                <form
                    action="/admin/rewards/users"
                    method="get"
                    className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
                >
                    <label className="min-w-0 space-y-2 text-xs font-medium text-slate-600 sm:col-span-2 xl:col-span-2">
                        Name, email, phone or user ID
                        <Input
                            key={filters.q}
                            name="q"
                            defaultValue={filters.q}
                            maxLength={200}
                            placeholder="Search customers"
                            className="h-10 border-slate-200"
                        />
                    </label>
                    <label className="space-y-2 text-xs font-medium text-slate-600">
                        Stored tier
                        <select
                            key={filters.tier}
                            name="tier"
                            defaultValue={filters.tier}
                            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                        >
                            <option value="all">All tiers</option>
                            <option value="gold">Gold</option>
                            <option value="silver">Silver</option>
                            <option value="bronze">Bronze</option>
                        </select>
                    </label>
                    <label className="space-y-2 text-xs font-medium text-slate-600">
                        Redemptions
                        <select
                            key={filters.spent}
                            name="spent"
                            defaultValue={filters.spent}
                            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                        >
                            <option value="all">All customers</option>
                            <option value="spent">Have spent coins</option>
                            <option value="no-spent">Never spent coins</option>
                        </select>
                    </label>
                    <label className="space-y-2 text-xs font-medium text-slate-600">
                        Sort by
                        <select
                            key={filters.sort}
                            name="sort"
                            defaultValue={filters.sort}
                            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                        >
                            {[
                                ['balance', 'Highest balance'],
                                ['earned', 'Highest earned'],
                                ['spent', 'Highest spent'],
                                ['pending', 'Highest pending'],
                                ['name', 'Name A–Z'],
                                ['activity', 'Latest activity'],
                            ].map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2 xl:col-span-5">
                        <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                            <input
                                key={String(filters.hideZero)}
                                type="checkbox"
                                name="hideZero"
                                value="1"
                                defaultChecked={filters.hideZero}
                                className="h-4 w-4 accent-pink-700"
                            />
                            Hide zero balances
                        </label>
                        <div className="flex items-center gap-4">
                            <Link href="/admin/rewards/users" className="text-xs text-slate-600 underline">
                                Clear filters
                            </Link>
                            <Button type="submit" className="h-10 bg-slate-900 text-white">
                                Apply filters
                            </Button>
                        </div>
                    </div>
                </form>
                <p className="text-xs text-slate-500">
                    Summaries use all matching customers. Stored lifetime earnings and tiers are retained;
                    historical discrepancies require review.
                </p>
            </section>
            <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] text-left text-sm">
                        <thead className="border-b bg-slate-50 text-xs text-slate-500">
                            <tr>
                                {[
                                    'Customer',
                                    'Balance',
                                    'Earned (stored)',
                                    'Spent',
                                    'Pending',
                                    'Tier',
                                    'Last reward activity / joined',
                                    '',
                                ].map((label, index) => (
                                    <th key={index} className="px-6 py-4 font-medium">
                                        {label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {report.users.length ? (
                                report.users.map((user) => (
                                    <tr key={user.user_id} className="hover:bg-slate-50/50">
                                        <td className="px-6 py-4">
                                            <Link
                                                href={`/admin/rewards/users/${user.user_id}`}
                                                className="font-semibold hover:underline"
                                            >
                                                {user.full_name}
                                            </Link>
                                            <p className="mt-1 text-xs text-slate-500 break-words">
                                                {user.email || 'No email'}
                                            </p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                {user.phone || 'No phone'}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 font-semibold tabular-nums">
                                            {rewardNumber(user.balance)}
                                        </td>
                                        <td className="px-6 py-4 tabular-nums">
                                            {rewardNumber(user.lifetime_earned)}
                                        </td>
                                        <td className="px-6 py-4 tabular-nums">
                                            {rewardNumber(user.lifetime_spent)}
                                        </td>
                                        <td className="px-6 py-4 tabular-nums">
                                            {rewardNumber(user.pending)}
                                        </td>
                                        <td className="px-6 py-4 capitalize">{user.tier}</td>
                                        <td className="px-6 py-4 text-xs text-slate-500">
                                            {user.last_activity ? rewardDate(user.last_activity) : '—'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Link
                                                href={`/admin/rewards/users/${user.user_id}`}
                                                aria-label={`View rewards for ${user.full_name}`}
                                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200"
                                            >
                                                <ArrowUpRight className="h-4 w-4" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                                        No customers match these filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <nav
                    aria-label="Reward user pages"
                    className="flex flex-wrap items-center justify-between gap-3 border-t p-5 text-sm"
                >
                    <span className="text-slate-500">
                        Page {report.page} of {report.totalPages} · {rewardNumber(report.total)} customers
                    </span>
                    <div className="flex gap-3">
                        {report.page > 1 && (
                            <Link
                                href={rewardHref('/admin/rewards/users', params, report.page - 1)}
                                className="rounded-lg border px-3 py-2"
                            >
                                Previous
                            </Link>
                        )}
                        {report.page < report.totalPages && (
                            <Link
                                href={rewardHref('/admin/rewards/users', params, report.page + 1)}
                                className="rounded-lg border px-3 py-2"
                            >
                                Next
                            </Link>
                        )}
                    </div>
                </nav>
            </div>
        </div>
    )
}
