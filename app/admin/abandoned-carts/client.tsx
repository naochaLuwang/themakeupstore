"use client"

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { sendRecoveryEmails } from '@/app/actions/cart'
import { directoryDateLabel, directoryHref, type RecoveryDirectory, type RecoveryResult } from '@/lib/admin-directory'
import { Mail, Loader2, CheckCircle2, ShoppingBag, RefreshCw } from 'lucide-react'

export function AbandonedCartsClient({ directory, status }: { directory: RecoveryDirectory; status: string }) {
    const router = useRouter()
    const sendingRef = useRef(false)
    const [sending, setSending] = useState(false)
    const [refreshing, startRefresh] = useTransition()
    const [result, setResult] = useState<RecoveryResult | null>(null)
    const [error, setError] = useState('')
    const outcomes = new Map(result?.outcomes.map(outcome => [outcome.id, outcome]) || [])
    const pendingIds = directory.carts.filter(cart => !cart.abandoned_email_sent_at && cart.email &&
        !['sent', 'unconfirmed'].includes(outcomes.get(cart.id)?.status || '')).map(cart => cart.id)
    const busy = sending || refreshing
    const needsReview = [...outcomes.values()].some(outcome => outcome.status === 'unconfirmed' &&
        directory.carts.some(cart => cart.id === outcome.id && !cart.abandoned_email_sent_at))

    async function handleSend() {
        if (sendingRef.current || busy || pendingIds.length === 0) return
        sendingRef.current = true
        setSending(true)
        setError('')
        try {
            const response = await sendRecoveryEmails(pendingIds)
            setResult(previous => ({
                ...response,
                outcomes: [...(previous?.outcomes || []).filter(outcome => !pendingIds.includes(outcome.id)), ...response.outcomes],
            }))
        } catch {
            setError('Unable to confirm sending. Refresh and check email statuses before trying again.')
            setResult({ sent: 0, failed: 0, skipped: 0, unconfirmed: pendingIds.length,
                outcomes: pendingIds.map(id => ({ id, status: 'unconfirmed' })) })
        } finally {
            sendingRef.current = false
            setSending(false)
            startRefresh(() => router.refresh())
        }
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                {[
                    ['Pending recovery', directory.stats.pending], ['Emails sent', directory.stats.sent],
                    ['Active in last hour', directory.stats.recent], ['Pending without email', directory.stats.unreachable],
                ].map(([label, value]) => <div key={label} className="rounded-2xl border bg-white p-5 shadow-sm min-w-0"><p className="text-2xl font-semibold tracking-tight">{Number(value).toLocaleString('en-IN')}</p><p className="text-xs text-slate-500 mt-1">{label}</p></div>)}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <nav aria-label="Recovery status" className="flex flex-wrap gap-2">
                    {['all', 'pending', 'sent'].map(value => <Link key={value} href={directoryHref('/admin/abandoned-carts', { status: value === 'all' ? undefined : value }, 1)}
                        aria-current={status === value ? 'page' : undefined}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium ${status === value ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600'}`}>
                        {value === 'all' ? 'All abandoned' : value === 'pending' ? 'Pending' : 'Sent'}
                    </Link>)}
                </nav>
                <button onClick={() => startRefresh(() => router.refresh())} disabled={busy} className="inline-flex items-center gap-2 rounded-lg h-9 border border-slate-200 bg-white px-3 text-sm text-slate-600 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />Refresh</button>
            </div>
            <div className="flex flex-col items-start gap-2">
                <button onClick={handleSend} disabled={busy || pendingIds.length === 0}
                    className="inline-flex items-center gap-2 rounded-xl min-h-10 px-4 py-2 bg-slate-900 text-white text-sm font-medium disabled:opacity-50">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Mail className="w-4 h-4 shrink-0" />}
                    {sending ? 'Sending...' : refreshing ? 'Refreshing...' : `Send pending on this page (${pendingIds.length})`}
                </button>
                <p className="text-xs text-slate-500">Only sends to pending carts on this page that have an email. The server checks eligibility again before sending.</p>
            </div>
            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            {result && !error && <p role={result.failed || result.unconfirmed ? 'alert' : 'status'} className={`rounded-xl border p-3 text-sm ${result.failed || result.unconfirmed ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                Sent: {result.sent} · Failed: {result.failed} · Skipped: {result.skipped} · Unconfirmed: {result.unconfirmed}
                {result.unconfirmed > 0 && ' Check email statuses before retrying unconfirmed sends.'}
            </p>}
            {needsReview && <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                <p>Check whether the unconfirmed emails were accepted before enabling a retry.</p>
                <button disabled={busy} onClick={() => {
                    setError('')
                    setResult(previous => previous ? { ...previous, unconfirmed: 0, outcomes: previous.outcomes.filter(outcome => outcome.status !== 'unconfirmed') } : null)
                }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-medium disabled:opacity-50">Enable retry after checking</button>
            </div>}
            {directory.carts.length === 0 ? <div className="rounded-2xl border bg-white p-12 text-center shadow-sm"><ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-3" /><p className="text-sm text-slate-500">No abandoned carts match this view.</p></div> : (
                <div className="rounded-2xl border bg-white overflow-x-auto shadow-sm min-w-0 max-w-full">
                    <table className="w-full text-sm"><thead className="bg-slate-50"><tr>
                        {['Customer', 'Items', 'Last active (IST)', 'Recovery email'].map(label => <th key={label} className="text-left py-4 px-6 text-xs font-semibold text-slate-500">{label}</th>)}
                    </tr></thead><tbody className="divide-y divide-slate-100">
                        {directory.carts.map(cart => {
                            const outcome = outcomes.get(cart.id)
                            const sent = !!cart.abandoned_email_sent_at || outcome?.status === 'sent'
                            return <tr key={cart.id} className="hover:bg-slate-50/50">
                                <td className="py-4 px-6"><Link href={`/admin/customers/${cart.user_id}`} className="font-medium text-slate-900 hover:underline">{cart.full_name || 'Unnamed customer'}</Link><p className="text-xs text-slate-500">{cart.email || 'No email available'}</p>{cart.phone && <p className="text-xs text-slate-500">{cart.phone}</p>}</td>
                                <td className="py-4 px-6 tabular-nums whitespace-nowrap">{cart.item_count} item{cart.item_count !== 1 ? 's' : ''}</td>
                                <td className="py-4 px-6 text-slate-600 whitespace-nowrap">{directoryDateLabel(cart.updated_at, true)}</td>
                                <td className="py-4 px-6">
                                    {sent ? <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700"><CheckCircle2 className="w-4 h-4 shrink-0" />{cart.abandoned_email_sent_at ? `Sent ${directoryDateLabel(cart.abandoned_email_sent_at)}` : 'Sent just now'}</span>
                                        : outcome?.status === 'unconfirmed' ? <span className="text-xs text-amber-700">Send unconfirmed. Check before retrying.</span>
                                        : outcome?.status === 'failed' ? <span className="text-xs text-red-600">{outcome.message || 'Sending failed. Try again.'}</span>
                                        : outcome?.status === 'skipped' ? <span className="text-xs text-slate-500">No longer eligible</span>
                                        : !cart.email ? <span className="text-xs text-amber-700">Email unavailable</span> : <span className="text-xs text-slate-500">Pending</span>}
                                </td>
                            </tr>
                        })}
                    </tbody></table>
                </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <p className="text-slate-500">{directory.total ? `${(directory.page - 1) * directory.pageSize + 1}–${Math.min(directory.page * directory.pageSize, directory.total)} of ${directory.total}` : '0 carts'} · Counts above cover all carts.</p>
                <nav aria-label="Abandoned cart pages" className="flex items-center gap-3">
                    {directory.page > 1 && <Link href={directoryHref('/admin/abandoned-carts', { status: status === 'all' ? undefined : status }, directory.page - 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-2">Previous</Link>}
                    <span className="text-slate-500">Page {directory.page} of {directory.totalPages}</span>
                    {directory.page < directory.totalPages && <Link href={directoryHref('/admin/abandoned-carts', { status: status === 'all' ? undefined : status }, directory.page + 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-2">Next</Link>}
                </nav>
            </div>
        </div>
    )
}
