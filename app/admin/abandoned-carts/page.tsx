import Link from 'next/link'
import { getCartRecoveryDirectory } from '@/app/actions/admin-directory'
import { AbandonedCartsClient } from './client'

export default async function AbandonedCartsPage({ searchParams }: { searchParams: Promise<{ page?: string; status?: string }> }) {
    const params = await searchParams
    let directory
    try { directory = await getCartRecoveryDirectory(params) }
    catch { /* Show a retry state rather than an empty report. */ }
    const status = ['pending', 'sent'].includes(params.status || '') ? params.status! : 'all'
    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-2xl font-black tracking-tight text-slate-900">Abandoned Carts</h1>
                <p className="text-sm text-slate-500">Non-empty carts inactive for over 1 hour. Dates use IST.</p>
            </div>
            {directory ? <AbandonedCartsClient key={`${status}:${directory.page}`} directory={directory} status={status} /> : (
                <div role="alert" className="rounded-2xl border bg-white p-6 shadow-sm space-y-3 text-sm">
                    <p className="text-red-600">Unable to load abandoned carts. Please try again.</p>
                    <Link href="/admin/abandoned-carts" className="font-medium underline">Try again</Link>
                </div>
            )}
        </div>
    )
}
