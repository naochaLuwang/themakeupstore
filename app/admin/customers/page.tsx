import Link from 'next/link'
import { CustomerTable } from '@/components/admin/customers/customer-table'
import { CustomerFilters } from '@/components/admin/customers/customer-filters'
import { Users, UserCheck } from 'lucide-react'
import { getCustomerDirectory } from '@/app/actions/admin-directory'
import { directoryHref, type DirectoryParams } from '@/lib/admin-directory'

export default async function CustomersPage({ searchParams }: { searchParams: Promise<DirectoryParams> }) {
    const params = await searchParams
    let directory
    let message = ''
    try { directory = await getCustomerDirectory(params) }
    catch (error) { message = error instanceof Error ? error.message : 'Unable to load customers.' }
    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-slate-900 text-2xl font-black tracking-tight">Customers</h1>
                <p className="text-sm text-slate-500">Customer contacts and order history.</p>
            </div>
            {directory && <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3"><p className="text-xs font-medium text-slate-500">Matching customers</p><Users className="h-4 w-4 text-slate-500 stroke-[1.5]" /></div>
                    <div className="text-2xl font-semibold text-slate-900">{directory.total.toLocaleString('en-IN')}</div>
                </div>
                <div className="rounded-2xl border bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3"><p className="text-xs font-medium text-slate-500">Ordered in the last 30 days</p><UserCheck className="h-4 w-4 text-emerald-500 stroke-[1.5]" /></div>
                    <div className="text-2xl font-semibold text-slate-900">{directory.active30d.toLocaleString('en-IN')}</div>
                </div>
            </div>}
            <div className="rounded-2xl border bg-white shadow-sm min-w-0">
                <div className="p-4 border-b border-slate-100"><CustomerFilters /></div>
                {message ? <div role="alert" className="p-6 space-y-3 text-sm text-red-600"><p>{message}</p><Link href={directoryHref('/admin/customers', params, 1)} className="font-medium underline">Try again</Link></div> : directory && <div className="p-4 space-y-4">
                    <p className="text-xs text-slate-500">Order counts and values exclude cancelled orders. View individual orders for payment and refund balances. Dates use IST.</p>
                    <CustomerTable customers={directory.customers} />
                    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                        <p className="text-slate-500">{directory.total ? `${(directory.page - 1) * directory.pageSize + 1}–${Math.min(directory.page * directory.pageSize, directory.total)} of ${directory.total}` : '0 customers'}</p>
                        <nav aria-label="Customer pages" className="flex items-center gap-3">
                            {directory.page > 1 && <Link href={directoryHref('/admin/customers', params, directory.page - 1)} className="rounded-lg border border-slate-200 px-3 py-2">Previous</Link>}
                            <span className="text-slate-500">Page {directory.page} of {directory.totalPages}</span>
                            {directory.page < directory.totalPages && <Link href={directoryHref('/admin/customers', params, directory.page + 1)} className="rounded-lg border border-slate-200 px-3 py-2">Next</Link>}
                        </nav>
                    </div>
                </div>}
            </div>
        </div>
    )
}
