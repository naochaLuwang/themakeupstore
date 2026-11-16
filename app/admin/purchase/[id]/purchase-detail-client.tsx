'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Printer, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    receivePurchase,
    savePurchase,
    searchPurchaseProducts,
    transitionPurchase,
} from '@/app/actions/purchases'
import {
    PURCHASE_STATUSES,
    purchaseDate,
    purchaseMoney,
    purchaseToday,
    validatePurchaseDraft,
    type PurchaseDetail,
    type PurchaseDraft,
    type PurchaseLine,
    type PurchaseProduct,
} from '@/lib/purchases'

type EditLine = Omit<PurchaseLine, 'quantity' | 'unit_cost'> & { quantity: string; unit_cost: string }
type ReceiptPayload = Parameters<typeof receivePurchase>[3]
const field = 'h-10 rounded-lg border-slate-200 text-sm'

export default function PurchaseDetailClient({ initialPurchase }: { initialPurchase: PurchaseDetail }) {
    const router = useRouter()
    const [purchase, setPurchase] = useState(initialPurchase)
    const [editing, setEditing] = useState(false)
    const [editItems, setEditItems] = useState<EditLine[]>([])
    const [notes, setNotes] = useState(purchase.notes)
    const [expected, setExpected] = useState(purchase.expected_on || '')
    const [reference, setReference] = useState(purchase.reference_number || '')
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<PurchaseProduct[]>([])
    const [searchError, setSearchError] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')
    const [confirmStatus, setConfirmStatus] = useState<'ordered' | 'cancelled' | null>(null)
    const [receivedOn, setReceivedOn] = useState(purchaseToday)
    const [receiptNotes, setReceiptNotes] = useState('')
    const [quantities, setQuantities] = useState<Record<string, { accepted: string; damaged: string }>>({})
    const [review, setReview] = useState<ReceiptPayload | null>(null)
    const [uncertain, setUncertain] = useState(false)
    const pendingReceipt = useRef<{ id: string; payload: ReceiptPayload } | null>(null)
    const pendingDraft = useRef<{ version: number; payload: PurchaseDraft } | null>(null)
    const pendingTransition = useRef<{ version: number; status: 'ordered' | 'cancelled' } | null>(null)
    const locked = busy || uncertain
    const remaining = purchase.items.filter(
        (item) => item.quantity > item.received_quantity + item.damaged_quantity
    )
    const canReceive = ['ordered', 'partial'].includes(purchase.status)
    const canCancel =
        ['draft', 'ordered'].includes(purchase.status) &&
        !purchase.receipts.length &&
        !purchase.received_units &&
        !purchase.damaged_units

    useEffect(() => {
        let active = true
        setResults([])
        setSearchError('')
        if (query.trim().length < 2 || !editing) return
        const timer = setTimeout(
            () =>
                searchPurchaseProducts(query)
                    .then((data) => {
                        if (active) setResults(data)
                    })
                    .catch(() => {
                        if (active) setSearchError('Unable to search products. Change the search to retry.')
                    }),
            200
        )
        return () => {
            active = false
            clearTimeout(timer)
        }
    }, [query, editing])

    function updated(value: PurchaseDetail, text: string) {
        setPurchase(value)
        setEditing(false)
        setReview(null)
        setUncertain(false)
        setError('')
        setMessage(text)
        setNotes(value.notes)
        setExpected(value.expected_on || '')
        setReference(value.reference_number || '')
        setQuantities({})
        setReceiptNotes('')
        setConfirmStatus(null)
        pendingReceipt.current = null
        pendingDraft.current = null
        pendingTransition.current = null
    }
    async function commitDraft() {
        const payload: PurchaseDraft = {
            supplier_id: purchase.supplier?.id || '',
            reference_number: reference.trim(),
            expected_on: expected,
            notes: notes.trim(),
            items: editItems.map((item) => ({
                variant_id: item.variant_id,
                quantity: item.quantity.trim() ? Number(item.quantity) : NaN,
                unit_cost: item.unit_cost.trim() ? Number(item.unit_cost) : NaN,
            })),
        }
        try {
            validatePurchaseDraft(payload)
        } catch (e) {
            setError((e as Error).message)
            return
        }
        const request = pendingDraft.current || { version: purchase.version, payload }
        pendingDraft.current = request
        setBusy(true)
        setError('')
        setMessage('')
        try {
            const result = await savePurchase(purchase.id, request.version, request.payload)
            if (!result.ok) {
                setError(result.error)
                setUncertain(result.uncertain)
                if (!result.uncertain) pendingDraft.current = null
                return
            }
            updated(result.purchase, 'Draft saved.')
        } catch {
            setUncertain(true)
            setError('Unable to confirm this save. Retry the same request or reload to check.')
        } finally {
            setBusy(false)
        }
    }
    async function changeStatus(status: 'ordered' | 'cancelled') {
        const request = pendingTransition.current || { version: purchase.version, status }
        pendingTransition.current = request
        setBusy(true)
        setError('')
        setMessage('')
        try {
            const result = await transitionPurchase(purchase.id, request.version, request.status)
            if (!result.ok) {
                setError(result.error)
                setUncertain(result.uncertain)
                if (!result.uncertain) {
                    pendingTransition.current = null
                    setConfirmStatus(null)
                }
                return
            }
            updated(
                result.purchase,
                status === 'ordered'
                    ? 'Purchase marked ordered. Record deliveries as they arrive.'
                    : 'Purchase cancelled. No stock was changed.'
            )
        } catch {
            setUncertain(true)
            setError('Unable to confirm the status change. Retry or reload to check.')
        } finally {
            setBusy(false)
        }
    }
    function reviewDelivery() {
        const lines = remaining.map((item) => ({
            item_id: item.id,
            accepted: Number(quantities[item.id]?.accepted || '0'),
            damaged: Number(quantities[item.id]?.damaged || '0'),
        }))
        if (
            lines.some(
                (line) =>
                    !Number.isSafeInteger(line.accepted) ||
                    !Number.isSafeInteger(line.damaged) ||
                    line.accepted < 0 ||
                    line.damaged < 0 ||
                    line.accepted + line.damaged >
                        purchase.items.find((item) => item.id === line.item_id)!.quantity -
                            purchase.items.find((item) => item.id === line.item_id)!.received_quantity -
                            purchase.items.find((item) => item.id === line.item_id)!.damaged_quantity
            )
        ) {
            setError('Enter whole quantities within each item’s remaining units.')
            return
        }
        if (!lines.some((line) => line.accepted + line.damaged > 0)) {
            setError('Enter at least one accepted or damaged unit.')
            return
        }
        if (lines.some((line) => line.damaged > 0) && !receiptNotes.trim()) {
            setError('Add a note explaining the damaged units.')
            return
        }
        setError('')
        setReview({
            received_on: receivedOn,
            notes: receiptNotes.trim(),
            lines: lines.filter((line) => line.accepted + line.damaged > 0),
        })
    }
    async function recordDelivery() {
        if (!review) return
        const request = pendingReceipt.current || { id: crypto.randomUUID(), payload: review }
        pendingReceipt.current = request
        setBusy(true)
        setError('')
        setMessage('')
        try {
            const result = await receivePurchase(purchase.id, purchase.version, request.id, request.payload)
            if (!result.ok) {
                setError(result.error)
                setUncertain(result.uncertain)
                if (!result.uncertain) {
                    pendingReceipt.current = null
                    setReview(null)
                }
                return
            }
            updated(result.purchase, 'Delivery recorded. Accepted units were added to stock.')
        } catch {
            setUncertain(true)
            setError('Unable to confirm this receipt. Retry the same receipt or reload to check stock.')
        } finally {
            setBusy(false)
        }
    }
    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-start justify-between gap-4 no-print">
                <div className="flex min-w-0 items-start gap-3">
                    <Link
                        href="/admin/purchase/list"
                        aria-label="Back to purchase history"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <div className="min-w-0">
                        <h1 className="text-2xl font-black tracking-tight break-all">
                            {purchase.reference_number || 'Purchase order'}
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            {PURCHASE_STATUSES[purchase.status]} · Created {purchaseDate(purchase.created_at)}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" disabled={busy} onClick={() => router.refresh()}>
                        Reload
                    </Button>
                    <Button variant="outline" disabled={editing} onClick={() => window.print()}>
                        <Printer className="h-4 w-4" />
                        Print PO
                    </Button>
                </div>
            </header>
            {error && (
                <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 no-print"
                >
                    {error}
                </div>
            )}
            {message && (
                <p
                    role="status"
                    className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 no-print"
                >
                    {message}
                </p>
            )}
            {purchase.legacy_receipt && (
                <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 no-print">
                    Historical receipt: accepted quantities reflect the original received status. Previous
                    stock updates have not been rechecked or replayed.
                </p>
            )}
            {!editing && (
                <div className="flex flex-wrap gap-3 no-print">
                    {purchase.status === 'draft' && (
                        <>
                            <Button
                                variant="outline"
                                disabled={locked}
                                onClick={() => {
                                    setEditItems(
                                        purchase.items.map((item) => ({
                                            ...item,
                                            quantity: String(item.quantity),
                                            unit_cost: String(item.unit_cost),
                                        }))
                                    )
                                    setEditing(true)
                                    setMessage('')
                                }}
                            >
                                Edit draft
                            </Button>
                            <Button
                                disabled={locked}
                                className="bg-slate-900 text-white"
                                onClick={() => setConfirmStatus('ordered')}
                            >
                                Mark ordered
                            </Button>
                        </>
                    )}
                    {canCancel && (
                        <Button
                            variant="outline"
                            disabled={locked}
                            onClick={() => setConfirmStatus('cancelled')}
                        >
                            Cancel purchase
                        </Button>
                    )}
                </div>
            )}
            {confirmStatus && (
                <section
                    aria-label="Confirm purchase status"
                    className="rounded-2xl border bg-white p-5 shadow-sm space-y-3 no-print"
                >
                    <p className="text-sm">
                        {confirmStatus === 'ordered'
                            ? 'Mark this draft as ordered? Item quantities and costs will be locked for receiving.'
                            : 'Cancel this purchase? It will remain in history, and no stock will change.'}
                    </p>
                    <div className="flex flex-wrap gap-3">
                        <Button
                            disabled={busy}
                            onClick={() => changeStatus(confirmStatus)}
                            className="bg-slate-900 text-white"
                        >
                            {uncertain
                                ? 'Retry status change'
                                : confirmStatus === 'ordered'
                                ? 'Confirm ordered'
                                : 'Confirm cancellation'}
                        </Button>
                        <Button variant="outline" disabled={locked} onClick={() => setConfirmStatus(null)}>
                            Keep current status
                        </Button>
                    </div>
                </section>
            )}
            {editing ? (
                <section
                    aria-label="Edit purchase draft"
                    className="rounded-2xl border bg-white p-6 shadow-sm space-y-5 no-print"
                >
                    <h2 className="text-sm font-semibold">Edit draft</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-2 text-xs font-medium">
                            Reference
                            <Input
                                value={reference}
                                maxLength={100}
                                disabled={locked}
                                onChange={(event) => setReference(event.target.value)}
                                className={field}
                            />
                        </label>
                        <label className="min-w-0 space-y-2 text-xs font-medium">
                            Expected delivery
                            <Input
                                type="date"
                                value={expected}
                                disabled={locked}
                                onChange={(event) => setExpected(event.target.value)}
                                className={`${field} w-full min-w-0`}
                            />
                        </label>
                    </div>
                    <label className="block space-y-2 text-xs font-medium">
                        Notes
                        <textarea
                            value={notes}
                            maxLength={2000}
                            disabled={locked}
                            onChange={(event) => setNotes(event.target.value)}
                            className="min-h-20 w-full rounded-lg border p-3 text-sm"
                        />
                    </label>
                    <Input
                        aria-label="Add draft product"
                        placeholder="Add product by SKU, name, shade or brand"
                        value={query}
                        disabled={locked}
                        onChange={(event) => setQuery(event.target.value)}
                        className={field}
                    />
                    {searchError && (
                        <p role="alert" className="text-sm text-red-700">
                            {searchError}
                        </p>
                    )}
                    {results.length > 0 && (
                        <div className="max-h-60 overflow-y-auto divide-y rounded-lg border">
                            {results.map((product) => (
                                <button
                                    key={product.variant_id}
                                    disabled={
                                        locked ||
                                        editItems.some((item) => item.variant_id === product.variant_id)
                                    }
                                    onClick={() => {
                                        setEditItems((list) => [
                                            ...list,
                                            {
                                                id: product.variant_id,
                                                product_id: product.product_id,
                                                variant_id: product.variant_id,
                                                name: product.name,
                                                title: product.title,
                                                sku: product.sku,
                                                quantity: '1',
                                                unit_cost:
                                                    product.last_cost === null
                                                        ? ''
                                                        : String(product.last_cost),
                                                received_quantity: 0,
                                                damaged_quantity: 0,
                                            },
                                        ])
                                        setQuery('')
                                    }}
                                    className="flex w-full items-center justify-between gap-3 p-3 text-left text-sm hover:bg-slate-50 disabled:opacity-40"
                                >
                                    <span className="break-words">
                                        {product.name} · {product.title || 'Default'} ·{' '}
                                        {product.sku || 'No SKU'}
                                        <span className="block text-xs text-slate-500">
                                            {product.last_cost === null
                                                ? 'Enter supplier cost'
                                                : `Last received cost ${purchaseMoney(product.last_cost)}`}
                                        </span>
                                    </span>
                                    <Plus className="h-4 w-4 shrink-0" />
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="divide-y">
                        {editItems.map((item, index) => (
                            <div key={item.variant_id} className="space-y-3 py-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold break-words">
                                            {item.name} · {item.title || 'Default'}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500 break-words">
                                            {item.sku || 'No SKU'}
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        aria-label={`Remove draft item ${index + 1}`}
                                        disabled={locked}
                                        className="h-9 w-9 shrink-0 rounded-lg border-slate-200"
                                        onClick={() =>
                                            setEditItems((list) => list.filter((_, i) => i !== index))
                                        }
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <label className="space-y-2 text-xs">
                                        Quantity
                                        <Input
                                            type="number"
                                            min="1"
                                            step="1"
                                            aria-label={`Draft quantity ${index + 1}`}
                                            value={item.quantity}
                                            disabled={locked}
                                            onChange={(event) =>
                                                setEditItems((list) =>
                                                    list.map((line, i) =>
                                                        i === index
                                                            ? { ...line, quantity: event.target.value }
                                                            : line
                                                    )
                                                )
                                            }
                                            className={field}
                                        />
                                    </label>
                                    <label className="space-y-2 text-xs">
                                        Unit cost (₹)
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            aria-label={`Draft cost ${index + 1}`}
                                            value={item.unit_cost}
                                            disabled={locked}
                                            onChange={(event) =>
                                                setEditItems((list) =>
                                                    list.map((line, i) =>
                                                        i === index
                                                            ? { ...line, unit_cost: event.target.value }
                                                            : line
                                                    )
                                                )
                                            }
                                            className={field}
                                        />
                                    </label>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Button disabled={busy} onClick={commitDraft} className="bg-slate-900 text-white">
                            {uncertain ? 'Retry draft save' : 'Save draft changes'}
                        </Button>
                        <Button
                            variant="outline"
                            disabled={locked}
                            onClick={() => {
                                setEditing(false)
                                setError('')
                                setQuery('')
                            }}
                        >
                            Discard changes
                        </Button>
                    </div>
                </section>
            ) : (
                <article className="purchase-document min-w-0 rounded-2xl border bg-white p-6 md:p-8 shadow-sm space-y-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold text-slate-500">THE MAKEUP STORE</p>
                            <h2 className="mt-2 text-xl font-bold">Purchase order</h2>
                            <p className="mt-1 text-sm break-all">{purchase.reference_number}</p>
                        </div>
                        <div className="text-sm">
                            <p className="font-semibold">{PURCHASE_STATUSES[purchase.status]}</p>
                            <p className="mt-1 text-slate-500">{purchaseDate(purchase.created_at)}</p>
                            {purchase.expected_on && (
                                <p className="mt-1 text-slate-500">
                                    Expected {purchaseDate(`${purchase.expected_on}T00:00:00+05:30`)}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="border-y py-4 text-sm space-y-1">
                        <h3 className="font-semibold">{purchase.supplier?.name || 'Supplier unavailable'}</h3>
                        {purchase.supplier?.contact_person && <p>{purchase.supplier.contact_person}</p>}
                        <p className="whitespace-pre-wrap break-words text-slate-600">
                            {purchase.supplier?.address || 'No supplier address saved'}
                        </p>
                        <p className="break-words text-slate-600">
                            {[purchase.supplier?.email, purchase.supplier?.phone].filter(Boolean).join(' · ')}
                        </p>
                    </div>
                    <div className="purchase-table overflow-x-auto">
                        <table className="w-full min-w-[620px] text-left text-sm">
                            <thead className="border-b text-xs text-slate-500">
                                <tr>
                                    {[
                                        'Product / shade',
                                        'Ordered',
                                        'Accepted',
                                        'Damaged',
                                        'Unit cost',
                                        'Total',
                                    ].map((label) => (
                                        <th key={label} className="px-3 py-3 first:pl-0 font-medium">
                                            {label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {purchase.items.map((item) => (
                                    <tr key={item.id}>
                                        <td className="py-4 pr-3">
                                            <p className="font-semibold">{item.name}</p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                {item.title || 'Default'} · {item.sku || 'No SKU'}
                                            </p>
                                        </td>
                                        <td className="p-3 tabular-nums">{item.quantity}</td>
                                        <td className="p-3 tabular-nums">{item.received_quantity}</td>
                                        <td className="p-3 tabular-nums">{item.damaged_quantity}</td>
                                        <td className="p-3 tabular-nums whitespace-nowrap">
                                            {purchaseMoney(item.unit_cost)}
                                        </td>
                                        <td className="p-3 font-medium tabular-nums whitespace-nowrap">
                                            {purchaseMoney(item.quantity * item.unit_cost)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex flex-wrap justify-between gap-4 border-t pt-5">
                        <p className="text-xs text-slate-500">
                            {purchase.received_units} accepted · {purchase.damaged_units} damaged ·{' '}
                            {purchase.units} ordered
                        </p>
                        <p className="text-lg font-semibold">
                            Total cost {purchaseMoney(purchase.total_cost)}
                        </p>
                    </div>
                    {purchase.notes && (
                        <div className="text-sm">
                            <h3 className="font-semibold">Notes</h3>
                            <p className="mt-2 whitespace-pre-wrap break-words text-slate-600">
                                {purchase.notes}
                            </p>
                        </div>
                    )}
                </article>
            )}
            {canReceive && !editing && (
                <section
                    aria-label="Record delivery"
                    className="rounded-2xl border bg-white p-6 shadow-sm space-y-5 no-print"
                >
                    <div>
                        <h2 className="text-sm font-semibold">Record delivery</h2>
                        <p className="mt-1 text-xs text-slate-500">
                            Only accepted units enter stock. Damaged units close that quantity on this order;
                            record replacements on a new purchase.
                        </p>
                    </div>
                    {review ? (
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold">
                                Review delivery · {purchaseDate(`${review.received_on}T00:00:00+05:30`)}
                            </h3>
                            <ul className="space-y-3 text-sm">
                                {review.lines.map((line) => {
                                    const item = purchase.items.find((item) => item.id === line.item_id)!
                                    return (
                                        <li key={line.item_id} className="rounded-lg bg-slate-50 p-3">
                                            <span className="font-medium break-words">
                                                {item.name} · {item.title || 'Default'}
                                            </span>
                                            <p className="mt-1">
                                                Add {line.accepted} to stock · {line.damaged} damaged
                                            </p>
                                        </li>
                                    )
                                })}
                            </ul>
                            {review.notes && (
                                <p className="whitespace-pre-wrap break-words text-sm text-slate-600">
                                    {review.notes}
                                </p>
                            )}
                            <div className="flex flex-wrap gap-3">
                                <Button
                                    disabled={busy}
                                    onClick={recordDelivery}
                                    className="bg-slate-900 text-white"
                                >
                                    {uncertain ? 'Retry same receipt' : 'Confirm delivery and update stock'}
                                </Button>
                                <Button
                                    variant="outline"
                                    disabled={locked}
                                    onClick={() => {
                                        setReview(null)
                                        pendingReceipt.current = null
                                    }}
                                >
                                    Back to quantities
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            <label className="block max-w-xs space-y-2 text-xs font-medium">
                                Delivery date (IST)
                                <Input
                                    aria-label="Delivery date"
                                    type="date"
                                    value={receivedOn}
                                    min={new Date(purchase.created_at).toLocaleDateString('en-CA', {
                                        timeZone: 'Asia/Kolkata',
                                    })}
                                    max={purchaseToday()}
                                    disabled={locked}
                                    onChange={(event) => setReceivedOn(event.target.value)}
                                    className={`${field} w-full min-w-0`}
                                />
                            </label>
                            <div className="divide-y">
                                {remaining.map((item, index) => {
                                    const left =
                                        item.quantity - item.received_quantity - item.damaged_quantity
                                    return (
                                        <div key={item.id} className="space-y-3 py-4">
                                            <div className="flex flex-wrap justify-between gap-2">
                                                <div className="min-w-0">
                                                    <h3 className="text-sm font-semibold break-words">
                                                        {item.name} · {item.title || 'Default'}
                                                    </h3>
                                                    <p className="mt-1 text-xs text-slate-500">
                                                        {left} remaining · {item.sku || 'No SKU'}
                                                    </p>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={locked}
                                                    onClick={() =>
                                                        setQuantities((values) => ({
                                                            ...values,
                                                            [item.id]: {
                                                                accepted: String(left),
                                                                damaged: '0',
                                                            },
                                                        }))
                                                    }
                                                >
                                                    Accept remaining
                                                </Button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <label className="space-y-2 text-xs">
                                                    Accepted now
                                                    <Input
                                                        aria-label={`Accepted quantity ${index + 1}`}
                                                        type="number"
                                                        min="0"
                                                        max={left}
                                                        step="1"
                                                        value={quantities[item.id]?.accepted ?? '0'}
                                                        disabled={locked}
                                                        onChange={(event) =>
                                                            setQuantities((values) => ({
                                                                ...values,
                                                                [item.id]: {
                                                                    accepted: event.target.value,
                                                                    damaged: values[item.id]?.damaged || '0',
                                                                },
                                                            }))
                                                        }
                                                        className={field}
                                                    />
                                                </label>
                                                <label className="space-y-2 text-xs">
                                                    Damaged now
                                                    <Input
                                                        aria-label={`Damaged quantity ${index + 1}`}
                                                        type="number"
                                                        min="0"
                                                        max={left}
                                                        step="1"
                                                        value={quantities[item.id]?.damaged ?? '0'}
                                                        disabled={locked}
                                                        onChange={(event) =>
                                                            setQuantities((values) => ({
                                                                ...values,
                                                                [item.id]: {
                                                                    accepted:
                                                                        values[item.id]?.accepted || '0',
                                                                    damaged: event.target.value,
                                                                },
                                                            }))
                                                        }
                                                        className={field}
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                            <label className="block space-y-2 text-xs font-medium">
                                Delivery notes (required for damaged units)
                                <textarea
                                    aria-label="Delivery notes"
                                    value={receiptNotes}
                                    maxLength={2000}
                                    disabled={locked}
                                    onChange={(event) => setReceiptNotes(event.target.value)}
                                    className="min-h-20 w-full rounded-lg border p-3 text-sm"
                                />
                            </label>
                            <Button
                                disabled={locked}
                                onClick={reviewDelivery}
                                className="bg-slate-900 text-white"
                            >
                                Review delivery
                            </Button>
                        </div>
                    )}
                </section>
            )}
            <div className="grid gap-6 lg:grid-cols-2 no-print">
                <section
                    className="rounded-2xl border bg-white p-5 shadow-sm space-y-4"
                    aria-label="Delivery history"
                >
                    <h2 className="text-sm font-semibold">Delivery history</h2>
                    {purchase.receipts.length ? (
                        purchase.receipts.map((receipt) => (
                            <div key={receipt.id} className="border-t pt-3 text-sm space-y-2">
                                <p className="font-medium">
                                    {purchaseDate(`${receipt.received_on}T00:00:00+05:30`)}
                                </p>
                                {receipt.lines.map((line) => {
                                    const item = purchase.items.find((item) => item.id === line.item_id)
                                    return (
                                        <p key={line.item_id} className="text-xs text-slate-600 break-words">
                                            {item?.name || 'Item'} · {item?.title || 'Default'}:{' '}
                                            {line.accepted} accepted, {line.damaged} damaged
                                        </p>
                                    )
                                })}
                                {receipt.notes && (
                                    <p className="text-xs whitespace-pre-wrap break-words text-slate-600">
                                        {receipt.notes}
                                    </p>
                                )}
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-slate-500">
                            {purchase.legacy_receipt
                                ? 'Detailed delivery records were not captured for this historical receipt.'
                                : 'No deliveries recorded.'}
                        </p>
                    )}
                </section>
                <section
                    className="rounded-2xl border bg-white p-5 shadow-sm space-y-4"
                    aria-label="Purchase history events"
                >
                    <h2 className="text-sm font-semibold">Activity</h2>
                    {purchase.events.length ? (
                        purchase.events.map((event) => (
                            <div
                                key={event.id}
                                className="flex flex-wrap justify-between gap-2 border-t pt-3 text-xs"
                            >
                                <span className="font-medium">{event.action}</span>
                                <time className="text-slate-500">
                                    {new Date(event.created_at).toLocaleString('en-IN', {
                                        timeZone: 'Asia/Kolkata',
                                    })}{' '}
                                    IST
                                </time>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-slate-500">No recorded changes yet.</p>
                    )}
                </section>
            </div>
            <style>{`@media print { @page { size: A4; margin: 12mm; } body, #app-scroller { position: static !important; height: auto !important; overflow: visible !important; } body * { visibility: hidden !important; } .purchase-document, .purchase-document * { visibility: visible !important; } .purchase-document { position: absolute !important; left: 0; top: 0; width: 100%; border: 0 !important; box-shadow: none !important; padding: 0 !important; } .purchase-document * { color: #000 !important; } .purchase-document .purchase-table { overflow: visible !important; } .purchase-document table { min-width: 0 !important; width: 100%; font-size: 10px; } .purchase-document tr { break-inside: avoid; } .no-print { display: none !important; } }`}</style>
        </div>
    )
}
