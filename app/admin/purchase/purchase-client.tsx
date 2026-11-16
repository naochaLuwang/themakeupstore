'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Trash2, Loader2, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
    createPurchaseSupplier,
    savePurchase,
    searchPurchaseProducts,
    searchPurchaseSuppliers,
} from '@/app/actions/purchases'
import {
    purchaseMoney,
    validatePurchaseDraft,
    type PurchaseDraft,
    type PurchaseProduct,
    type Supplier,
} from '@/lib/purchases'

type Item = PurchaseProduct & { quantity: string; unit_cost: string }
const field = 'h-10 rounded-lg border-slate-200 text-sm'

export default function PurchaseClient({ initialSuppliers }: { initialSuppliers: Supplier[] }) {
    const router = useRouter()
    const [suppliers, setSuppliers] = useState(initialSuppliers)
    const [supplierQuery, setSupplierQuery] = useState('')
    const [supplier, setSupplier] = useState<Supplier | null>(null)
    const [supplierError, setSupplierError] = useState('')
    const [query, setQuery] = useState('')
    const [products, setProducts] = useState<PurchaseProduct[]>([])
    const [searching, setSearching] = useState(false)
    const [searchError, setSearchError] = useState('')
    const [items, setItems] = useState<Item[]>([])
    const [reference, setReference] = useState('')
    const [expected, setExpected] = useState('')
    const [notes, setNotes] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [pending, setPending] = useState<{ id: string; payload: PurchaseDraft } | null>(null)
    const [vendorOpen, setVendorOpen] = useState(false)
    const [vendorBusy, setVendorBusy] = useState(false)
    const [vendorError, setVendorError] = useState('')
    const vendorRequest = useRef<Supplier | null>(null)
    const locked = busy || Boolean(pending)

    useEffect(() => {
        let current = true
        const timer = setTimeout(() => {
            setSupplierError('')
            searchPurchaseSuppliers(supplierQuery)
                .then((result) => {
                    if (current) setSuppliers(result)
                })
                .catch(() => {
                    if (current) setSupplierError('Unable to search suppliers. Change the search to retry.')
                })
        }, 200)
        return () => {
            current = false
            clearTimeout(timer)
        }
    }, [supplierQuery])
    useEffect(() => {
        let current = true
        setProducts([])
        setSearchError('')
        setSearching(query.trim().length >= 2)
        if (query.trim().length < 2) return
        const timer = setTimeout(() => {
            searchPurchaseProducts(query)
                .then((result) => {
                    if (current) setProducts(result)
                })
                .catch(() => {
                    if (current) setSearchError('Unable to search products. Change the search to retry.')
                })
                .finally(() => {
                    if (current) setSearching(false)
                })
        }, 200)
        return () => {
            current = false
            clearTimeout(timer)
        }
    }, [query])
    useEffect(() => {
        if (!items.length) return
        const warn = (event: BeforeUnloadEvent) => {
            event.preventDefault()
        }
        window.addEventListener('beforeunload', warn)
        return () => window.removeEventListener('beforeunload', warn)
    }, [items.length])

    const payload: PurchaseDraft = {
        supplier_id: supplier?.id || '',
        reference_number: reference.trim(),
        expected_on: expected,
        notes: notes.trim(),
        items: items.map((item) => ({
            variant_id: item.variant_id,
            quantity: item.quantity.trim() ? Number(item.quantity) : NaN,
            unit_cost: item.unit_cost.trim() ? Number(item.unit_cost) : NaN,
        })),
    }
    let validation = '',
        total: number | null = null
    try {
        total = validatePurchaseDraft(payload)
    } catch (e) {
        validation = (e as Error).message
    }

    async function save() {
        const request = pending || { id: crypto.randomUUID(), payload }
        try {
            validatePurchaseDraft(request.payload)
        } catch (e) {
            setError((e as Error).message)
            return
        }
        setBusy(true)
        setError('')
        try {
            const result = await savePurchase(request.id, 0, request.payload)
            if (!result.ok) {
                setPending(result.uncertain ? request : null)
                setError(result.error)
                return
            }
            setItems([])
            setPending(null)
            router.push(`/admin/purchase/${result.purchase.id}`)
        } catch {
            setPending(request)
            setError('Unable to confirm the save. Retry the same save or check the purchase below.')
        } finally {
            setBusy(false)
        }
    }
    async function newSupplier(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setVendorBusy(true)
        setVendorError('')
        const form = new FormData(event.currentTarget)
        const value = vendorRequest.current || {
            id: crypto.randomUUID(),
            name: String(form.get('name') || ''),
            email: String(form.get('email') || ''),
            phone: String(form.get('phone') || ''),
            address: String(form.get('address') || ''),
            contact_person: String(form.get('contact_person') || ''),
        }
        if (!value.name.trim()) {
            setVendorError('Enter a supplier name.')
            setVendorBusy(false)
            return
        }
        vendorRequest.current = value
        try {
            const created = await createPurchaseSupplier(value)
            setSupplier(created)
            setSuppliers((list) => [created, ...list.filter((item) => item.id !== created.id)])
            setVendorOpen(false)
            vendorRequest.current = null
        } catch (e) {
            if (e instanceof Error && e.message.startsWith('Check the supplier')) vendorRequest.current = null
            setVendorError(
                e instanceof Error ? e.message : 'Unable to save supplier. Retry the same request.'
            )
        } finally {
            setVendorBusy(false)
        }
    }

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">New purchase</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Build a supplier order. Stock changes only when a delivery is recorded.
                    </p>
                </div>
                <Link
                    href="/admin/purchase/list"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium"
                >
                    Purchase history <ArrowUpRight className="h-4 w-4" />
                </Link>
            </header>
            {error && (
                <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                >
                    {error}
                    {pending && (
                        <Link className="mt-2 block underline" href={`/admin/purchase/${pending.id}`}>
                            Check saved purchase
                        </Link>
                    )}
                </div>
            )}
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div className="min-w-0 space-y-6">
                    <section
                        className="rounded-2xl border bg-white p-6 shadow-sm space-y-5"
                        aria-label="Supplier and purchase details"
                    >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h2 className="text-sm font-semibold">Supplier</h2>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={locked}
                                onClick={() => {
                                    vendorRequest.current = null
                                    setVendorError('')
                                    setVendorOpen(true)
                                }}
                            >
                                <Plus className="h-4 w-4" /> Add supplier
                            </Button>
                        </div>
                        <Input
                            aria-label="Search suppliers"
                            placeholder="Search supplier name"
                            value={supplierQuery}
                            disabled={locked}
                            onChange={(event) => setSupplierQuery(event.target.value)}
                            className={field}
                        />
                        {supplierError && (
                            <p role="alert" className="text-sm text-red-700">
                                {supplierError}
                            </p>
                        )}
                        <select
                            aria-label="Supplier"
                            value={supplier?.id || ''}
                            disabled={locked}
                            onChange={(event) =>
                                setSupplier(suppliers.find((item) => item.id === event.target.value) || null)
                            }
                            className="h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm"
                        >
                            <option value="">Choose a supplier</option>
                            {supplier && !suppliers.some((item) => item.id === supplier.id) && (
                                <option value={supplier.id}>{supplier.name}</option>
                            )}
                            {suppliers.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.name}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-slate-500">
                            Up to 25 matches. Search to find another supplier.
                            {supplier?.phone ? ` Selected: ${supplier.phone}` : ''}
                        </p>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="space-y-2 text-xs font-medium text-slate-600">
                                Reference (optional)
                                <Input
                                    value={reference}
                                    maxLength={100}
                                    disabled={locked}
                                    onChange={(event) => setReference(event.target.value)}
                                    placeholder="Generated when left blank"
                                    className={field}
                                />
                            </label>
                            <label className="space-y-2 text-xs font-medium text-slate-600">
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
                        <label className="block space-y-2 text-xs font-medium text-slate-600">
                            Notes
                            <textarea
                                value={notes}
                                maxLength={2000}
                                disabled={locked}
                                onChange={(event) => setNotes(event.target.value)}
                                className="min-h-20 w-full rounded-lg border border-slate-200 p-3 text-sm"
                                placeholder="Supplier instructions or invoice reference"
                            />
                        </label>
                    </section>
                    <section
                        aria-label="Purchase items"
                        className="min-w-0 rounded-2xl border bg-white shadow-sm"
                    >
                        <div className="space-y-3 border-b p-5">
                            <h2 className="text-sm font-semibold">Order items</h2>
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <Input
                                    aria-label="Search purchase products"
                                    value={query}
                                    disabled={locked}
                                    onChange={(event) => setQuery(event.target.value)}
                                    placeholder="Search product, shade, SKU or brand"
                                    className={`${field} pl-9`}
                                />
                            </div>
                            {searching && (
                                <p role="status" className="text-xs text-slate-500">
                                    Searching products…
                                </p>
                            )}
                            {searchError && (
                                <p role="alert" className="text-sm text-red-700">
                                    {searchError}
                                </p>
                            )}
                            {!searching && !searchError && query.trim().length >= 2 && !products.length && (
                                <p className="text-sm text-slate-500">No matching products.</p>
                            )}
                            {products.length > 0 && (
                                <div
                                    className="max-h-72 overflow-y-auto divide-y rounded-lg border"
                                    aria-label="Product results"
                                >
                                    {products.map((product) => (
                                        <button
                                            key={product.variant_id}
                                            disabled={
                                                locked ||
                                                items.some((item) => item.variant_id === product.variant_id)
                                            }
                                            onClick={() => {
                                                setItems((list) => [
                                                    ...list,
                                                    {
                                                        ...product,
                                                        quantity: '1',
                                                        unit_cost:
                                                            product.last_cost === null
                                                                ? ''
                                                                : String(product.last_cost),
                                                    },
                                                ])
                                                setQuery('')
                                            }}
                                            className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-slate-50 disabled:opacity-40"
                                        >
                                            <span className="min-w-0">
                                                <span className="block text-sm font-medium break-words">
                                                    {product.name} · {product.title || 'Default'}
                                                </span>
                                                <span className="mt-1 block text-xs text-slate-500 break-words">
                                                    {product.sku || 'No SKU'} · {product.brand || 'No brand'}{' '}
                                                    · {product.stock} in stock
                                                    {product.status !== 'active'
                                                        ? ` · ${product.status}`
                                                        : ''}
                                                </span>
                                            </span>
                                            <Plus className="h-4 w-4 shrink-0" />
                                        </button>
                                    ))}
                                </div>
                            )}
                            {products.length === 30 && (
                                <p className="text-xs text-slate-500">
                                    Showing 30 matches. Refine your search for an exact shade.
                                </p>
                            )}
                        </div>
                        {!items.length ? (
                            <p className="p-8 text-center text-sm text-slate-500">
                                Search above to add the exact product shade.
                            </p>
                        ) : (
                            <div className="divide-y">
                                {items.map((item, index) => (
                                    <div key={item.variant_id} className="space-y-4 p-5">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <h3 className="text-sm font-semibold break-words">
                                                    {item.name} · {item.title || 'Default'}
                                                </h3>
                                                <p className="mt-1 text-xs text-slate-500 break-words">
                                                    {item.sku || 'No SKU'} · Selling price{' '}
                                                    {purchaseMoney(item.selling_price)}
                                                </p>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {item.last_cost === null
                                                        ? 'No received purchase cost yet. Enter the supplier cost.'
                                                        : `Last received purchase cost: ${purchaseMoney(
                                                              item.last_cost
                                                          )}`}
                                                </p>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                aria-label={`Remove ${item.name} ${item.title || 'Default'}`}
                                                className="h-9 w-9 shrink-0 rounded-lg border-slate-200"
                                                disabled={locked}
                                                onClick={() =>
                                                    setItems((list) =>
                                                        list.filter(
                                                            (row) => row.variant_id !== item.variant_id
                                                        )
                                                    )
                                                }
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                            <label className="space-y-2 text-xs text-slate-600">
                                                Quantity
                                                <Input
                                                    aria-label={`Quantity ${item.sku || index + 1}`}
                                                    type="number"
                                                    min="1"
                                                    max="1000000"
                                                    step="1"
                                                    value={item.quantity}
                                                    disabled={locked}
                                                    onChange={(event) =>
                                                        setItems((list) =>
                                                            list.map((row, i) =>
                                                                i === index
                                                                    ? { ...row, quantity: event.target.value }
                                                                    : row
                                                            )
                                                        )
                                                    }
                                                    className={field}
                                                />
                                            </label>
                                            <label className="space-y-2 text-xs text-slate-600">
                                                Unit cost (₹)
                                                <Input
                                                    aria-label={`Unit cost ${item.sku || index + 1}`}
                                                    type="number"
                                                    min="0"
                                                    max="10000000"
                                                    step="0.01"
                                                    value={item.unit_cost}
                                                    disabled={locked}
                                                    onChange={(event) =>
                                                        setItems((list) =>
                                                            list.map((row, i) =>
                                                                i === index
                                                                    ? {
                                                                          ...row,
                                                                          unit_cost: event.target.value,
                                                                      }
                                                                    : row
                                                            )
                                                        )
                                                    }
                                                    placeholder="Enter cost"
                                                    className={field}
                                                />
                                            </label>
                                            <div className="col-span-2 self-end text-sm sm:col-span-1 sm:text-right">
                                                <span className="text-xs text-slate-500 sm:block">
                                                    Line total{' '}
                                                </span>
                                                <strong className="tabular-nums">
                                                    {item.quantity &&
                                                    item.unit_cost &&
                                                    Number.isFinite(
                                                        Number(item.quantity) * Number(item.unit_cost)
                                                    )
                                                        ? purchaseMoney(
                                                              Number(item.quantity) * Number(item.unit_cost)
                                                          )
                                                        : '—'}
                                                </strong>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
                <aside className="h-fit rounded-2xl border bg-white p-5 shadow-sm xl:sticky xl:top-24 space-y-4">
                    <h2 className="text-sm font-semibold">Purchase summary</h2>
                    <div className="flex justify-between gap-3 text-sm">
                        <span className="text-slate-500">Product shades</span>
                        <strong>{items.length}</strong>
                    </div>
                    <div className="flex justify-between gap-3 border-t pt-4">
                        <span className="text-sm font-medium">Total cost</span>
                        <strong className="text-xl tabular-nums">
                            {total === null ? '—' : purchaseMoney(total)}
                        </strong>
                    </div>
                    <p className="text-xs text-slate-500">
                        Supplier costs only. Saving a draft does not change stock.
                    </p>
                    {validation && items.length > 0 && <p className="text-xs text-slate-600">{validation}</p>}
                    <Button
                        className="w-full bg-slate-900 text-white hover:bg-slate-800"
                        disabled={busy || (!pending && Boolean(validation))}
                        onClick={save}
                    >
                        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                        {pending ? 'Retry same save' : 'Save draft'}
                    </Button>
                </aside>
            </div>
            <Dialog
                open={vendorOpen}
                onOpenChange={(open) => {
                    if (!vendorBusy) setVendorOpen(open)
                }}
            >
                <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Add supplier</DialogTitle>
                        <DialogDescription>Save supplier contact details for purchase orders.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={newSupplier} className="space-y-4">
                        {vendorError && (
                            <p role="alert" className="text-sm text-red-700">
                                {vendorError}
                            </p>
                        )}
                        <fieldset
                            disabled={vendorBusy || Boolean(vendorRequest.current)}
                            className="space-y-4"
                        >
                            <label className="block space-y-2 text-sm">
                                Supplier name
                                <Input name="name" required maxLength={150} className={field} />
                            </label>
                            <label className="block space-y-2 text-sm">
                                Contact person
                                <Input name="contact_person" maxLength={150} className={field} />
                            </label>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="space-y-2 text-sm">
                                    Email
                                    <Input name="email" type="email" maxLength={254} className={field} />
                                </label>
                                <label className="space-y-2 text-sm">
                                    Phone
                                    <Input name="phone" type="tel" maxLength={40} className={field} />
                                </label>
                            </div>
                            <label className="block space-y-2 text-sm">
                                Address
                                <textarea
                                    name="address"
                                    maxLength={1000}
                                    className="min-h-20 w-full rounded-lg border p-3 text-sm"
                                />
                            </label>
                        </fieldset>
                        <Button
                            type="submit"
                            disabled={vendorBusy}
                            className="w-full bg-slate-900 text-white"
                        >
                            {vendorBusy
                                ? 'Saving…'
                                : vendorRequest.current
                                ? 'Retry supplier save'
                                : 'Save supplier'}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
