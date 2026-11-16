import Link from 'next/link'
import { getPurchaseDirectory } from '@/app/actions/purchases'
import { purchaseFilters, type PurchaseParams } from '@/lib/purchases'
import PurchaseListClient from './list-client'

export default async function PurchaseListPage({ searchParams }: { searchParams: Promise<PurchaseParams> }) {
    const params = await searchParams
    let filters, report
    try {
        filters = purchaseFilters(params)
        report = await getPurchaseDirectory(params)
    } catch (error) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-black tracking-tight">Purchase history</h1>
                <div role="alert" className="rounded-2xl border bg-white p-6 shadow-sm">
                    <p className="text-sm text-red-700">
                        {error instanceof Error ? error.message : 'Unable to load purchases.'}
                    </p>
                    <Link href="/admin/purchase/list" className="mt-3 inline-block text-sm underline">
                        Reset and retry
                    </Link>
                </div>
            </div>
        )
    }
    return <PurchaseListClient report={report} filters={filters} />
}
