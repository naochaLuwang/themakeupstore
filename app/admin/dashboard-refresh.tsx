'use client'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { directoryDateLabel } from '@/lib/admin-directory'
import { dashboardHref, type DashboardParams } from '@/lib/admin-dashboard'

export function DashboardRefresh({ asOf }: { asOf: string }) {
    const router = useRouter()
    const [pending, startTransition] = useTransition()
    const updated = `${directoryDateLabel(asOf)} · ${new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(asOf))} IST`
    return (
        <>
            <button
                onClick={() => startTransition(() => router.refresh())}
                disabled={pending}
                aria-label="Refresh"
                title={updated}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-900 disabled:opacity-50"
            >
                <RefreshCw className={`h-4 w-4 ${pending ? 'animate-spin' : ''}`} />
            </button>
            <span className="sr-only" role="status">
                {pending ? 'Refreshing' : updated}
            </span>
        </>
    )
}

export function DashboardOrderFilter({
    params,
    statuses,
    status,
    queueLabel,
    disabled,
}: {
    params: DashboardParams
    statuses: { value: string; label: string; count: number }[]
    status: string
    queueLabel?: string
    disabled?: boolean
}) {
    const router = useRouter()
    return (
        <select
            aria-label="Order status"
            value={queueLabel ? '__queue__' : status}
            disabled={disabled}
            onChange={(event) =>
                router.push(
                    dashboardHref(params, {
                        status: event.target.value || undefined,
                        queue: undefined,
                        page: undefined,
                    })
                )
            }
            className="h-9 max-w-[210px] rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-600 disabled:opacity-50"
        >
            {queueLabel && (
                <option value="__queue__" disabled>
                    {queueLabel}
                </option>
            )}
            <option value="">Recent orders</option>
            {statuses.map((item) => (
                <option key={item.value} value={item.value}>
                    {item.label} ({item.count})
                </option>
            ))}
        </select>
    )
}
