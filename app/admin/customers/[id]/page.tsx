import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import { getCustomerHistory } from '@/app/actions/admin-directory'
import { customerStatus, directoryDateLabel, directoryHref } from '@/lib/admin-directory'
import { STATUS_LABELS } from '@/lib/order-status'

export default async function CustomerHistoryPage({ params, searchParams }: {
    params: Promise<{ id: string }>; searchParams: Promise<{ page?: string }>
}) {
    const { id } = await params
    const { page } = await searchParams
    const result = await getCustomerHistory(id, page)
    if (!result) notFound()
    const { customer, orders, total, totalPages } = result
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/admin/customers" aria-label="Back to customers" className="rounded-xl h-10 w-10 border border-slate-200 bg-white inline-flex items-center justify-center shrink-0"><ArrowLeft className="h-4 w-4" /></Link>
                <div className="min-w-0 space-y-1"><h1 className="text-2xl font-black tracking-tight break-words">{customer.full_name || 'Unnamed customer'}</h1><p className="text-sm text-slate-500">Customer order history</p></div>
            </div>
            <div className="rounded-2xl border bg-white p-6 md:p-8 shadow-sm grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="min-w-0"><p className="text-xs text-slate-500 mb-2">Contact</p><p className="text-sm break-words">{customer.email ? <a href={`mailto:${customer.email}`} className="hover:underline">{customer.email}</a> : 'No email'}</p>{customer.phone && <a className="text-sm text-slate-600 hover:underline" href={`tel:${customer.phone.replace(/[^+\d]/g, '')}`}>{customer.phone}</a>}</div>
                <div><p className="text-xs text-slate-500 mb-2">Customer status</p><p className="text-sm font-semibold">{customerStatus(customer.order_count)}</p><p className="text-xs text-slate-500 mt-1">Joined {directoryDateLabel(customer.created_at)}</p></div>
                <div><p className="text-xs text-slate-500 mb-2">Non-cancelled orders</p><p className="text-2xl font-semibold">{customer.order_count}</p></div>
                <div><p className="text-xs text-slate-500 mb-2">Order value</p><p className="text-2xl font-semibold">₹{Number(customer.order_value).toLocaleString('en-IN')}</p></div>
            </div>
            <p className="text-xs text-slate-500">History includes cancelled orders. Summary values exclude them. View individual orders for payment and refund balances. Dates use IST.</p>
            <div className="rounded-2xl border bg-white overflow-x-auto shadow-sm min-w-0 max-w-full">
                <table className="w-full text-sm"><thead className="bg-slate-50"><tr>
                    {['Order', 'Placed', 'Status', 'Payment', 'Total', ''].map((label, index) => <th key={index} className="py-4 px-6 text-left text-xs font-semibold text-slate-500">{label}</th>)}
                </tr></thead><tbody className="divide-y divide-slate-100">
                    {orders.length === 0 && <tr><td colSpan={6} className="py-12 px-6 text-center text-slate-500">This customer has no orders yet.</td></tr>}
                    {orders.map(order => <tr key={order.id}>
                        <td className="py-4 px-6 font-mono"><Link href={`/admin/orders/${order.id}`} className="hover:underline">#{order.id.slice(0, 8)}</Link></td>
                        <td className="py-4 px-6 whitespace-nowrap text-slate-600">{directoryDateLabel(order.created_at, true)}</td>
                        <td className="py-4 px-6 whitespace-nowrap">{STATUS_LABELS[order.status] || order.status.replaceAll('_', ' ')}</td>
                        <td className="py-4 px-6 capitalize whitespace-nowrap">{(order.payment_status || 'Unknown').replaceAll('_', ' ')}</td>
                        <td className="py-4 px-6 tabular-nums font-semibold">₹{Number(order.total).toLocaleString('en-IN')}</td>
                        <td className="py-4 px-6"><Link href={`/admin/orders/${order.id}`} aria-label={`View order ${order.id.slice(0, 8)}`} className="rounded-lg h-9 w-9 border border-slate-200 inline-flex items-center justify-center"><ArrowUpRight className="h-4 w-4" /></Link></td>
                    </tr>)}
                </tbody></table>
            </div>
            <nav aria-label="Customer order pages" className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <p className="text-slate-500">{total} order{total !== 1 ? 's' : ''} · Page {result.page} of {totalPages}</p>
                <div className="flex gap-3">
                    {result.page > 1 && <Link href={directoryHref(`/admin/customers/${id}`, {}, result.page - 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-2">Previous</Link>}
                    {result.page < totalPages && <Link href={directoryHref(`/admin/customers/${id}`, {}, result.page + 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-2">Next</Link>}
                </div>
            </nav>
        </div>
    )
}
