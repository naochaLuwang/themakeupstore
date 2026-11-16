import { searchPurchaseSuppliers } from '@/app/actions/purchases'
import Link from 'next/link'
import PurchaseClient from './purchase-client'

export default async function PurchasePage() {
    let suppliers
    try {
        suppliers = await searchPurchaseSuppliers()
    } catch {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-black tracking-tight">New purchase</h1>
                <div role="alert" className="rounded-2xl border bg-white p-6 text-sm text-red-700 shadow-sm">
                    Unable to load suppliers.{' '}
                    <Link href="/admin/purchase" className="underline">
                        Try again
                    </Link>
                </div>
            </div>
        )
    }
    return <PurchaseClient initialSuppliers={suppliers} />
}
