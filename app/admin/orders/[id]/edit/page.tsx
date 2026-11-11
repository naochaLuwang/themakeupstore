import Link from 'next/link'
import { getOrderEdit } from '@/app/actions/order-edits'
import { OrderEditor } from './order-editor'

export default async function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await getOrderEdit(id)
  if (!result.success)
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-black tracking-tight">Edit order</h1>
        <div role="alert" className="rounded-2xl border bg-white p-6 shadow-sm">
          <p className="text-sm text-rose-700">{result.message}</p>
          <Link href="/admin/orders" className="mt-4 inline-block text-sm font-semibold underline">
            Back to orders
          </Link>
        </div>
      </div>
    )
  return <OrderEditor initialContext={result.context} />
}
