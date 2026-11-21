'use client'
import { useRef, useState } from 'react'
import Link from 'next/link'
import { Eye, ArrowUpRight, Pencil } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { orderDiscounts } from '@/lib/order-discounts'
import { STATUS_LABELS } from '@/lib/order-status'
import { directoryDateLabel } from '@/lib/admin-directory'
import type { DashboardOrder } from '@/lib/admin-dashboard'

const money = (value: number | null) =>
    value === null
        ? 'Unknown'
        : `${Number(value) < 0 ? '-' : ''}₹${Math.abs(Number(value) || 0).toLocaleString('en-IN', {
              maximumFractionDigits: 2,
          })}`
export function RecentOrdersTable({ orders }: { orders: DashboardOrder[] }) {
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const opener = useRef<HTMLButtonElement | null>(null)
    const selected = orders.find((order) => order.id === selectedId)
    return (
        <>
            <div className="w-full overflow-x-auto min-w-0 max-w-full">
                <table className="w-full text-sm">
                    <thead className="border-y border-slate-100 bg-slate-50">
                        <tr>
                            {['Order', 'Customer', 'Status', 'Total', 'View'].map((label) => (
                                <th
                                    key={label}
                                    className="py-4 px-4 text-left text-xs font-semibold text-slate-500"
                                >
                                    {label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {orders.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-sm text-slate-500">
                                    No orders
                                </td>
                            </tr>
                        )}
                        {orders.map((order) => (
                            <tr key={order.id}>
                                <td className="py-3 px-4">
                                    <Link
                                        href={`/admin/orders/${order.id}`}
                                        className="text-xs font-mono hover:underline"
                                    >
                                        #{order.id.slice(0, 8)}
                                    </Link>
                                </td>
                                <td className="py-3 px-4 text-[13px] font-medium min-w-32">
                                    {order.customer_name}
                                </td>
                                <td className="py-3 px-4 text-xs whitespace-nowrap">
                                    <span
                                        className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-medium ${
                                            ['delivered', 'picked_up'].includes(order.status)
                                                ? 'bg-emerald-50 text-emerald-700'
                                                : ['failed_delivery', 'no_show', 'cancelled'].includes(
                                                      order.status
                                                  )
                                                ? 'bg-rose-50 text-rose-700'
                                                : 'bg-slate-100 text-slate-600'
                                        }`}
                                    >
                                        {STATUS_LABELS[order.status] || order.status.replaceAll('_', ' ')}
                                    </span>
                                </td>
                                <td className="py-3 px-4 tabular-nums text-[13px] font-semibold whitespace-nowrap">
                                    {money(order.total)}
                                </td>
                                <td className="py-3 px-4">
                                    <button
                                        aria-label={`Quick view order ${order.id.slice(0, 8)}`}
                                        onClick={(event) => {
                                            opener.current = event.currentTarget
                                            setSelectedId(order.id)
                                        }}
                                        className="rounded-lg h-9 w-9 border border-slate-200 inline-flex items-center justify-center"
                                    >
                                        <Eye className="h-4 w-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Sheet
                open={!!selected}
                onOpenChange={(open) => {
                    if (!open) setSelectedId(null)
                }}
            >
                <SheetContent
                    onCloseAutoFocus={(event) => {
                        event.preventDefault()
                        if (opener.current?.isConnected) opener.current.focus()
                    }}
                    className="w-full sm:w-[480px] sm:max-w-[480px] p-0 overflow-y-auto [&>button]:flex [&>button]:h-9 [&>button]:w-9 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-lg [&>button]:border [&>button]:border-slate-200 [&>button]:bg-white"
                >
                    {selected && (
                        <div className="p-5 space-y-5">
                            <SheetHeader className="p-0 pr-8">
                                <SheetTitle>Order #{selected.id.slice(0, 8)}</SheetTitle>
                                <SheetDescription>
                                    {selected.customer_name} · {directoryDateLabel(selected.created_at, true)}{' '}
                                    IST
                                </SheetDescription>
                            </SheetHeader>
                            <div className="flex flex-wrap gap-2 text-xs">
                                <span className="rounded-lg bg-slate-100 px-2 py-1">
                                    {STATUS_LABELS[selected.status] || selected.status}
                                </span>
                                <span className="rounded-lg bg-slate-100 px-2 py-1">
                                    {selected.order_type === 'pickup' ? 'Pickup' : 'Delivery'}
                                </span>
                                <span className="rounded-lg bg-slate-100 px-2 py-1">
                                    {selected.payment_method || 'Unknown method'} ·{' '}
                                    {(selected.payment_status || 'Unknown').replaceAll('_', ' ')}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Link
                                    href={`/admin/orders/${selected.id}`}
                                    className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium"
                                >
                                    Open order
                                    <ArrowUpRight className="h-3 w-3" />
                                </Link>
                                {['pending', 'confirmed', 'packed'].includes(selected.status) &&
                                    !selected.cancellation_started_at && (
                                        <Link
                                            href={`/admin/orders/${selected.id}/edit`}
                                            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium"
                                        >
                                            Edit order
                                            <Pencil className="h-3 w-3" />
                                        </Link>
                                    )}
                            </div>
                            <section className="space-y-3">
                                <h3 className="text-sm font-semibold">Items and shades</h3>
                                {selected.items.map((item) => (
                                    <div
                                        key={item.id}
                                        className="rounded-xl border border-slate-200 p-3 text-sm"
                                    >
                                        <p className="font-medium break-words">
                                            {item.product_name}
                                            {item.is_gift && (
                                                <span className="ml-2 text-xs text-emerald-700">
                                                    Free gift
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1">
                                            {item.variant_title || 'Default'} · Qty {item.quantity} ·{' '}
                                            {money(item.unit_price)} each
                                        </p>
                                        <p className="text-xs text-slate-600 mt-1">
                                            {item.line_discount_amount === null ? 'Subtotal' : 'Line total'}:{' '}
                                            {money(
                                                Math.max(
                                                    0,
                                                    item.quantity * item.unit_price -
                                                        (item.line_discount_amount || 0)
                                                )
                                            )}
                                        </p>
                                        {item.refunded_quantity > 0 && (
                                            <p className="text-xs text-amber-700">
                                                {item.refunded_quantity} refunded
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </section>
                            <section className="space-y-2 text-sm">
                                <h3 className="font-semibold">Saved pricing</h3>
                                {[
                                    [
                                        'Item subtotal',
                                        selected.items.reduce(
                                            (sum, item) => sum + item.quantity * item.unit_price,
                                            0
                                        ),
                                    ],
                                    [
                                        `Coupon discount${
                                            selected.promo_code ? ` (${selected.promo_code})` : ''
                                        }`,
                                        -orderDiscounts(selected).coupon,
                                    ],
                                    ['Manual discount', -orderDiscounts(selected).manual],
                                    ['BXGY discount', -selected.bxgy_discount_amount],
                                    [selected.shipping_label || 'Delivery', selected.shipping_price],
                                    [
                                        selected.additional_charges_label || 'Additional charges',
                                        selected.additional_charges,
                                    ],
                                    ['Gift card', -selected.gift_card_discount],
                                    ['Coins', -selected.coin_discount_amount],
                                    ['Order total', selected.total],
                                ].map(([label, amount], index) => (
                                    <div key={index} className="flex justify-between gap-3">
                                        <span className="text-slate-500">{label}</span>
                                        <span className="tabular-nums shrink-0">{money(Number(amount))}</span>
                                    </div>
                                ))}
                            </section>
                            <section className="rounded-xl border bg-slate-50 p-4 space-y-2 text-sm">
                                {(
                                    [
                                        ['Payments retained', selected.retained],
                                        ['Recorded refunds', selected.refunded],
                                        ['Outstanding payment', selected.balance_due],
                                        ['Refund due', selected.refund_due],
                                    ] as [string, number | null][]
                                ).map(([label, value]) => (
                                    <div key={label} className="flex justify-between gap-3">
                                        <span className="text-slate-500">{label}</span>
                                        <strong className="tabular-nums shrink-0">{money(value)}</strong>
                                    </div>
                                ))}
                            </section>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </>
    )
}
