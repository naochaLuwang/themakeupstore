import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPurchaseDetail } from '@/app/actions/purchases'
import PurchaseDetailClient from './purchase-detail-client'

export default async function PurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    let purchase
    try {
        purchase = await getPurchaseDetail(id)
    } catch {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-black tracking-tight">Purchase</h1>
                <div role="alert" className="rounded-2xl border bg-white p-6 text-sm text-red-700 shadow-sm">
                    Unable to load this purchase.{' '}
                    <Link href={`/admin/purchase/${encodeURIComponent(id)}`} className="underline">
                        Retry
                    </Link>{' '}
                    or{' '}
                    <Link href="/admin/purchase/list" className="underline">
                        return to history
                    </Link>
                    .
                </div>
            </div>
        )
    }
    if (!purchase) notFound()
    return <PurchaseDetailClient key={`${purchase.id}:${purchase.version}`} initialPurchase={purchase} />
}
