'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Minus, Plus, Search, Trash2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  getOrderEdit,
  previewOrderEdit,
  reopenOrderPacking,
  saveOrderEdit,
  searchOrderEditProducts,
  settleOrderEdit,
} from '@/app/actions/order-edits'
import { cancelOrderAndRestoreStock } from '@/app/actions/orders'
import {
  editBlockReason,
  formatOrderMoney as money,
  receivedCash,
  type EditPricingMode,
  type EditRequest,
  type OrderEditContext,
  type OrderEditQuote,
} from '@/lib/order-edit'

type Product = Awaited<ReturnType<typeof searchOrderEditProducts>>['products'][number]
type Review = { quote: OrderEditQuote; reviewHash: string }
const quantities = (context: OrderEditContext) => {
  const result: Record<string, number> = {}
  for (const item of context.order.order_items)
    if (!item.is_gift && item.product_variant_id)
      result[item.product_variant_id] = (result[item.product_variant_id] || 0) + item.quantity
  return result
}
const stamp = (value: string) =>
  new Date(value).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  })

export function OrderEditor({ initialContext }: { initialContext: OrderEditContext }) {
  const router = useRouter()
  const [context, setContext] = useState(initialContext)
  const [draft, setDraft] = useState(() => quantities(initialContext))
  const [pricingMode, setPricingMode] = useState<EditPricingMode>('preserve')
  const [reason, setReason] = useState('')
  const [review, setReview] = useState<Review | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [error, setError] = useState('')
  const [reviewOpen, setReviewOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [catalog, setCatalog] = useState<Record<string, Product>>({})
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [settling, setSettling] = useState(false)
  const [method, setMethod] = useState<'cash' | 'upi' | 'bank' | 'razorpay'>('upi')
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [settlementReason, setSettlementReason] = useState('')
  const [settlementError, setSettlementError] = useState('')
  const [settlementOpen, setSettlementOpen] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [leaveToOrder, setLeaveToOrder] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [reopening, setReopening] = useState(false)
  const requestSequence = useRef(0)
  const saveAttempt = useRef<{ fingerprint: string; key: string } | null>(null)
  const settlementAttempt = useRef<{ fingerprint: string; key: string } | null>(null)
  const summaryRef = useRef<HTMLDivElement>(null)
  const { order } = context
  const original = quantities(context)
  const dirty =
    pricingMode !== 'preserve' ||
    JSON.stringify(Object.entries(draft).sort()) !== JSON.stringify(Object.entries(original).sort())
  const pending = context.settlements.find((s) => s.status === 'reserved')
  const blocked =
    editBlockReason(order, context.hasRefunds) ||
    (pending ? 'Finish the pending payment or refund before editing.' : null)
  const hasItems = Object.keys(draft).length > 0
  const validQuantities = Object.values(draft).every((n) => Number.isSafeInteger(n) && n >= 1 && n <= 1000)
  const request: EditRequest = {
    orderId: order.id,
    revision: context.revision,
    pricingMode,
    items: Object.entries(draft)
      .sort()
      .map(([variantId, quantity]) => ({ variantId, quantity })),
  }
  const requestJson = JSON.stringify(request)
  const liveRequest = useRef(requestJson)
  liveRequest.current = requestJson
  const busy = saving || settling || reopening || cancelling

  function acceptContext(next: OrderEditContext) {
    requestSequence.current++
    setContext(next)
    setDraft(quantities(next))
    setReview(null)
    setPreviewing(false)
    setError('')
    setReviewOpen(false)
    setPricingMode('preserve')
    setReason('')
    setSettlementError('')
    saveAttempt.current = null
    setAmount('')
    setReference('')
    setSettlementReason('')
    settlementAttempt.current = null
  }

  useEffect(() => {
    if (!dirty) return
    const leave = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', leave)
    return () => window.removeEventListener('beforeunload', leave)
  }, [dirty])

  useEffect(() => {
    const sequence = ++requestSequence.current
    let active = true
    setReview(null)
    setError('')
    setReviewOpen(false)
    if (!dirty || blocked || !hasItems || !validQuantities) {
      setPreviewing(false)
      return
    }
    setPreviewing(true)
    const timer = setTimeout(() => {
      void previewOrderEdit(JSON.parse(requestJson) as EditRequest)
        .then((result) => {
          if (!active || sequence !== requestSequence.current || liveRequest.current !== requestJson) return
          if (result.success) setReview({ quote: result.quote, reviewHash: result.reviewHash })
          else setError(result.message)
          setPreviewing(false)
        })
        .catch(() => {
          if (!active || sequence !== requestSequence.current) return
          setError('Could not calculate the new total. Change a quantity or reload to retry.')
          setPreviewing(false)
        })
    }, 350)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [requestJson, dirty, blocked, hasItems, validQuantities])

  useEffect(() => {
    let active = true
    if (search.trim().length < 2) {
      setResults([])
      setSearching(false)
      setSearchError('')
      return
    }
    setSearching(true)
    setSearchError('')
    const timer = setTimeout(() => {
      void searchOrderEditProducts(search)
        .then((result) => {
          if (!active) return
          setResults(result.products)
          if (!result.success) setSearchError(result.message)
          setSearching(false)
        })
        .catch(() => {
          if (active) {
            setSearching(false)
            setSearchError('Catalog search failed. Try again.')
          }
        })
    }, 250)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [search])

  function changeQuantity(id: string, quantity: number) {
    setReview(null)
    setDraft((previous) => ({ ...previous, [id]: quantity }))
  }
  function remove(id: string) {
    setReview(null)
    setDraft((previous) => {
      const next = { ...previous }
      delete next[id]
      return next
    })
  }
  function add(product: Product) {
    setCatalog((previous) => ({ ...previous, [product.variantId]: product }))
    changeQuantity(product.variantId, (draft[product.variantId] || 0) + 1)
    toast.success(`${product.name} · ${product.variantTitle} added to draft`)
  }
  async function save() {
    if (!review || reason.trim().length < 3 || saving) return
    const payload = { ...request, reason: reason.trim(), reviewHash: review.reviewHash }
    const fingerprint = JSON.stringify(payload)
    if (saveAttempt.current?.fingerprint !== fingerprint)
      saveAttempt.current = { fingerprint, key: crypto.randomUUID() }
    setSaving(true)
    setError('')
    try {
      const result = await saveOrderEdit({ ...payload, requestKey: saveAttempt.current.key })
      if (result.success) {
        acceptContext(result.context)
        toast.success('Order changes saved')
        summaryRef.current?.focus()
      } else {
        setError(result.message)
        if ('quote' in result && result.quote && result.reviewHash) {
          setReview({ quote: result.quote, reviewHash: result.reviewHash })
          setReviewOpen(false)
        }
      }
    } catch {
      setError(
        'The save response was lost. Retry Save changes with the same draft to check its result safely.'
      )
    } finally {
      setSaving(false)
    }
  }
  async function reload() {
    setDiscardOpen(false)
    setError('')
    try {
      const result = await getOrderEdit(order.id)
      if (result.success) acceptContext(result.context)
      else setError(result.message)
    } catch {
      setError('Could not reload the order. Your draft is still here.')
    }
  }
  async function reopen() {
    if (reason.trim().length < 3 || reopening) return
    setReopening(true)
    try {
      const result = await reopenOrderPacking(order.id, context.revision, reason.trim())
      if (result.success) {
        acceptContext(result.context)
        toast.success('Packing reopened. Recheck the parcel after editing.')
      } else setError(result.message)
    } catch {
      setError('Could not reopen packing. Reload the order to check its status.')
    } finally {
      setReopening(false)
    }
  }
  async function cancelOrder() {
    if (reason.trim().length < 3 || cancelling) return
    setCancelling(true)
    try {
      const result = await cancelOrderAndRestoreStock(order.id, reason.trim())
      if (!result.success) {
        setError(result.message)
        setCancelOpen(false)
        return
      }
      const updated = await getOrderEdit(order.id)
      if (updated.success) acceptContext(updated.context)
      toast.success(result.message || 'Order cancelled')
      setCancelOpen(false)
    } catch {
      setError('Cancellation needs checking. Reload the order before retrying.')
      setCancelOpen(false)
    } finally {
      setCancelling(false)
    }
  }
  const kind = pending?.kind || (Number(order.edit_refund_due) > 0 ? 'refund' : 'payment')
  const due = kind === 'refund' ? Number(order.edit_refund_due) : Number(order.edit_balance_due)
  async function settle() {
    const payload = pending
      ? {
          orderId: order.id,
          kind: pending.kind,
          method: pending.method,
          amount: Number(pending.amount),
          reference: pending.reference || '',
          reason: pending.reason,
        }
      : {
          orderId: order.id,
          kind,
          method,
          amount: Number(amount || due),
          reference: reference.trim(),
          reason: settlementReason.trim(),
        }
    const fingerprint = JSON.stringify(payload)
    if (settlementAttempt.current?.fingerprint !== fingerprint)
      settlementAttempt.current = { fingerprint, key: crypto.randomUUID() }
    setSettling(true)
    setSettlementError('')
    try {
      const result = await settleOrderEdit({
        ...payload,
        requestKey: pending?.request_key || settlementAttempt.current.key,
      })
      if (result.success) {
        acceptContext(result.context)
        setSettlementOpen(false)
        toast.success('Payment balance updated')
      } else {
        setSettlementError(result.message)
        setSettlementOpen(false)
        const fresh = await getOrderEdit(order.id)
        if (fresh.success) setContext(fresh.context)
      }
    } catch {
      setSettlementError('The confirmation was lost. Retry this same settlement to check its result safely.')
      setSettlementOpen(false)
    } finally {
      setSettling(false)
    }
  }
  const quote = review?.quote
  const subtotal = order.order_items.reduce((n, i) => n + Number(i.unit_price) * i.quantity, 0)
  const rows: [string, number, number][] = [
    ['Merchandise', subtotal, quote?.subtotal ?? subtotal],
    [
      'BXGY savings',
      -Number(order.bxgy_discount_amount || 0),
      -(quote?.bxgyDiscount ?? Number(order.bxgy_discount_amount || 0)),
    ],
    [
      'Order discount',
      -Number(order.promo_discount_amount || 0),
      -(quote?.promoDiscount ?? Number(order.promo_discount_amount || 0)),
    ],
    [
      'Delivery',
      Number(order.shipping_price || 0),
      quote?.shippingPrice ?? Number(order.shipping_price || 0),
    ],
    [
      order.additional_charges_label || 'Extra charges',
      Number(order.additional_charges || 0),
      quote?.additionalCharges ?? Number(order.additional_charges || 0),
    ],
    [
      'Gift-card credit',
      -Number(order.gift_card_discount || 0),
      -(quote?.giftCardDiscount ?? Number(order.gift_card_discount || 0)),
    ],
    [
      'M Coins',
      -Number(order.coin_discount_amount || 0),
      -(quote?.coinDiscount ?? Number(order.coin_discount_amount || 0)),
    ],
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="icon" className="rounded-xl h-10 w-10 border-slate-200">
            <Link
              href={`/admin/orders/${order.id}`}
              aria-label="Back to order"
              onClick={(event) => {
                if (dirty) {
                  event.preventDefault()
                  setLeaveToOrder(true)
                  setDiscardOpen(true)
                }
              }}
            >
              <ArrowLeft className="h-4 w-4 stroke-[1.5]" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              Edit order <span className="text-slate-500">#{order.id.slice(0, 8).toUpperCase()}</span>
            </h1>
            <p className="text-sm text-slate-500">
              {order.shipping_address?.full_name || 'Customer order'} · {order.status.replaceAll('_', ' ')} ·{' '}
              {order.payment_method}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => {
            setLeaveToOrder(false)
            if (dirty) setDiscardOpen(true)
            else void reload()
          }}
          className="rounded-xl border-slate-200"
        >
          <RotateCcw className="mr-2 h-4 w-4 stroke-[1.5]" /> Reload order
        </Button>
      </div>
      {blocked && (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
          role="status"
        >
          <p className="font-semibold">{blocked}</p>
          {order.status === 'packed' && !order.cancellation_started_at && (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Input
                aria-label="Reason for reopening packing"
                placeholder="Why does packing need reopening?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={1000}
                className="bg-white"
              />
              <Button
                onClick={() => void reopen()}
                disabled={busy || reason.trim().length < 3}
                className="shrink-0 rounded-lg bg-slate-900"
              >
                Reopen packing
              </Button>
            </div>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </p>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <section className="rounded-2xl border bg-white p-6 md:p-8 shadow-sm">
            <h2 className="font-semibold text-slate-900">Order items</h2>
            <p className="mt-1 text-sm text-slate-500">
              Changes stay in this draft until you review and save.
            </p>
            <div className="mt-5 divide-y divide-slate-100">
              {Object.entries(draft).map(([id, quantity]) => {
                const item = order.order_items.find((i) => !i.is_gift && i.product_variant_id === id),
                  product = catalog[id]
                const name = item?.product_name || product?.name || 'Product',
                  shade = item?.variant_title || product?.variantTitle || 'Default'
                return (
                  <div key={id} className="flex flex-wrap items-center gap-3 py-4">
                    <div className="min-w-0 flex-1 basis-40">
                      <p className="text-sm font-semibold text-slate-900 break-words">{name}</p>
                      <p className="text-xs text-slate-500">{shade}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {original[id] ? `Originally ${original[id]}` : 'Added to draft'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={!!blocked || busy || quantity <= 1}
                        className="rounded-lg h-9 w-9 border-slate-200"
                        aria-label={`Decrease ${name} ${shade}`}
                        onClick={() => changeQuantity(id, quantity - 1)}
                      >
                        <Minus className="h-4 w-4 stroke-[1.5]" />
                      </Button>
                      <Input
                        type="number"
                        min={1}
                        max={1000}
                        step={1}
                        aria-label={`Quantity for ${name} ${shade}`}
                        aria-invalid={quantity < 1 || quantity > 1000}
                        disabled={!!blocked || busy}
                        value={quantity || ''}
                        onChange={(e) =>
                          changeQuantity(id, e.target.value === '' ? 0 : Number(e.target.value))
                        }
                        className="h-9 w-16 px-1 text-center"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={!!blocked || busy || quantity >= 1000}
                        className="rounded-lg h-9 w-9 border-slate-200"
                        aria-label={`Increase ${name} ${shade}`}
                        onClick={() => changeQuantity(id, quantity + 1)}
                      >
                        <Plus className="h-4 w-4 stroke-[1.5]" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={!!blocked || busy}
                        className="ml-1 rounded-lg h-9 w-9 border-slate-200 text-rose-600"
                        aria-label={`Remove ${name} ${shade}`}
                        onClick={() => remove(id)}
                      >
                        <Trash2 className="h-4 w-4 stroke-[1.5]" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
            {!hasItems && (
              <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                <p>
                  No paid items remain. Add a replacement, or cancel the order to return all stock and
                  credits.
                </p>
                <Button
                  variant="outline"
                  className="mt-3 border-rose-200 text-rose-700"
                  disabled={busy || !!blocked}
                  onClick={() => setCancelOpen(true)}
                >
                  Cancel order
                </Button>
              </div>
            )}
            {!validQuantities && (
              <p role="alert" className="mt-3 text-sm text-rose-700">
                Enter whole quantities from 1 to 1,000, or use Remove.
              </p>
            )}
            {Object.keys(original).some((id) => !draft[id]) && (
              <div className="mt-4 border-t pt-4">
                <p className="text-xs font-semibold text-slate-500">Removed from draft</p>
                {Object.keys(original)
                  .filter((id) => !draft[id])
                  .map((id) => (
                    <button
                      key={id}
                      type="button"
                      disabled={busy || !!blocked}
                      onClick={() => changeQuantity(id, original[id])}
                      className="mt-2 mr-3 text-sm font-medium text-pink-700 underline"
                    >
                      Restore {order.order_items.find((i) => i.product_variant_id === id)?.product_name}
                    </button>
                  ))}
              </div>
            )}
            {(quote?.lines.filter((i) => i.is_gift) || order.order_items.filter((i) => i.is_gift)).map(
              (gift, index) => (
                <div
                  key={index}
                  className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-900"
                >
                  <span className="font-semibold">Free gift:</span> {gift.product_name} × {gift.quantity}
                </div>
              )
            )}
          </section>
          {!blocked && (
            <section className="rounded-2xl border bg-white p-6 md:p-8 shadow-sm">
              <h2 className="font-semibold text-slate-900">Add a product</h2>
              <label htmlFor="order-product-search" className="mt-1 block text-sm text-slate-500">
                Search by product name or SKU, then choose the exact shade.
              </label>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500 stroke-[1.5]" />
                <Input
                  id="order-product-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  disabled={busy}
                  placeholder="Product name or SKU"
                  className="h-10 rounded-xl pl-10"
                  autoComplete="off"
                />
              </div>
              <div aria-live="polite" className="mt-3 text-sm text-slate-500">
                {searching
                  ? 'Searching catalog…'
                  : searchError ||
                    (search.trim().length >= 2 && !results.length ? 'No matching products or shades.' : '')}
              </div>
              <div className="mt-2 max-h-[440px] overflow-y-auto divide-y divide-slate-100">
                {results.map((product) => {
                  const available =
                      product.stock +
                      order.order_items
                        .filter((i) => i.product_variant_id === product.variantId)
                        .reduce((n, i) => n + i.quantity - Number(i.stock_restored_quantity || 0), 0),
                    full = available <= (draft[product.variantId] || 0)
                  return (
                    <div key={product.variantId} className="flex items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 break-words">{product.name}</p>
                        <p className="text-xs text-slate-500">
                          {product.variantTitle}
                          {product.sku ? ` · ${product.sku}` : ''}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {money(product.price)} ·{' '}
                          {available > 0 ? `${available} available including this order` : 'Out of stock'}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        className="h-9 rounded-lg border-slate-200"
                        disabled={full || busy}
                        onClick={() => add(product)}
                        aria-label={`Add ${product.name} ${product.variantTitle}`}
                      >
                        {full ? (available > 0 ? 'All added' : 'Sold out') : 'Add'}
                      </Button>
                    </div>
                  )
                })}
              </div>
              {results.length === 100 && (
                <p className="mt-3 text-xs text-slate-500">
                  Showing the first 100 shades. Refine your search to find another product.
                </p>
              )}
            </section>
          )}
        </div>
        <div className="space-y-4 lg:sticky lg:top-20" ref={summaryRef} tabIndex={-1}>
          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900">Review totals</h2>
            {!blocked && (
              <div className="mt-4 space-y-2">
                <label htmlFor="order-pricing-mode" className="text-xs font-semibold text-slate-600">
                  Pricing
                </label>
                <select
                  id="order-pricing-mode"
                  value={pricingMode}
                  onChange={(e) => {
                    setReview(null)
                    setPricingMode(e.target.value as EditPricingMode)
                  }}
                  disabled={busy}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="preserve">Keep existing prices and original offers</option>
                  <option value="current">Use current prices and offers</option>
                </select>
                <p className="text-xs leading-relaxed text-slate-500">
                  {pricingMode === 'preserve'
                    ? 'Existing quantities keep their price basis. Added quantities use current selling prices. Original offer eligibility is checked again.'
                    : 'Every item is recalculated using today’s selling prices and available offers.'}
                </p>
              </div>
            )}
            <div className="mt-5 grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-3 text-sm">
              <span />
              <span className="text-right text-xs text-slate-500">Saved</span>
              <span className="text-right text-xs text-slate-500">Revised</span>
              {rows.map(([label, before, after]) => (
                <div key={label} className="contents">
                  <span className="text-slate-600">{label}</span>
                  <span className="text-right tabular-nums text-slate-500">{money(before)}</span>
                  <span
                    className={`text-right tabular-nums ${
                      before !== after ? 'font-semibold text-pink-700' : 'text-slate-900'
                    }`}
                  >
                    {dirty && !quote ? '—' : money(after)}
                  </span>
                </div>
              ))}
              <span className="border-t pt-3 font-semibold">Order total</span>
              <span className="border-t pt-3 text-right tabular-nums text-slate-500">
                {money(order.total)}
              </span>
              <span className="border-t pt-3 text-right tabular-nums font-semibold">
                {dirty && !quote ? '—' : money(quote?.total ?? order.total)}
              </span>
            </div>
            <div aria-live="polite" className="mt-4 text-sm">
              {previewing ? (
                <p className="flex items-center gap-2 text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin stroke-[1.5]" /> Calculating prices and offers…
                </p>
              ) : (
                <>
                  <p className="text-slate-500">
                    Cash received:{' '}
                    <span className="font-semibold text-slate-900">{money(receivedCash(order))}</span>
                  </p>
                  {(quote?.refundDue ?? Number(order.edit_refund_due)) > 0 ? (
                    <p className="mt-1 font-semibold text-rose-700">
                      Refund due: {money(quote?.refundDue ?? order.edit_refund_due)}
                    </p>
                  ) : (quote?.balanceDue ?? Number(order.edit_balance_due)) > 0 ? (
                    <p className="mt-1 font-semibold text-amber-800">
                      To collect: {money(quote?.balanceDue ?? order.edit_balance_due)}
                    </p>
                  ) : null}
                </>
              )}
            </div>
            {quote?.warnings.length ? (
              <ul className="mt-4 space-y-2 rounded-xl bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
                {quote.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            ) : null}
            {!blocked && (
              <>
                <label
                  htmlFor="order-edit-reason"
                  className="mt-5 block text-xs font-semibold text-slate-600"
                >
                  Reason for changes
                </label>
                <textarea
                  id="order-edit-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={busy}
                  maxLength={1000}
                  rows={2}
                  placeholder="For example: customer requested a shade replacement"
                  className="mt-2 w-full rounded-lg border border-slate-200 p-3 text-sm focus-visible:outline-pink-600"
                />
                <Button
                  className="mt-4 w-full rounded-xl bg-slate-900 hover:bg-slate-800"
                  disabled={!dirty || !review || previewing || busy || reason.trim().length < 3}
                  onClick={() => setReviewOpen(true)}
                >
                  Review changes
                </Button>
                <Button
                  variant="ghost"
                  disabled={!dirty || busy}
                  className="mt-1 w-full rounded-xl"
                  onClick={() => {
                    setDraft(original)
                    setPricingMode('preserve')
                    setReason('')
                    setReview(null)
                    setError('')
                  }}
                >
                  Discard draft
                </Button>
              </>
            )}
          </section>
        </div>
      </div>
      {order.edit_version > 0 && (due > 0 || pending) && (
        <section className="rounded-2xl border bg-white p-6 md:p-8 shadow-sm">
          <h2 className="font-semibold text-slate-900">
            {kind === 'refund' ? 'Refund balance' : 'Collect outstanding balance'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {pending
              ? 'An earlier settlement is awaiting confirmation. Retry it to finish without creating another transaction.'
              : kind === 'refund'
              ? 'Issue a refund to the original Razorpay payment, or record money already returned by another method.'
              : 'Record an actual payment received from the customer. This does not charge a card or create a payment link.'}
          </p>
          {dirty && (
            <p className="mt-3 text-sm text-amber-800">
              Save or discard your item draft before settling the saved order.
            </p>
          )}
          {settlementError && (
            <p role="alert" className="mt-3 text-sm text-rose-700">
              {settlementError}
            </p>
          )}
          {pending ? (
            <p className="mt-4 text-sm font-semibold">
              {money(pending.amount)} · {pending.method} · {pending.reason}
            </p>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label htmlFor="settlement-method" className="text-xs font-semibold text-slate-600">
                  Method
                </label>
                <select
                  id="settlement-method"
                  value={method}
                  onChange={(e) => setMethod(e.target.value as typeof method)}
                  disabled={busy || dirty}
                  className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                >
                  <option value="upi">UPI</option>
                  <option value="cash">Cash</option>
                  <option value="bank">Bank transfer</option>
                  {kind === 'refund' && order.razorpay_payment_id && (
                    <option value="razorpay">Original Razorpay payment</option>
                  )}
                </select>
              </div>
              <div>
                <label htmlFor="settlement-amount" className="text-xs font-semibold text-slate-600">
                  Amount · due {money(due)}
                </label>
                <Input
                  id="settlement-amount"
                  type="number"
                  min="0.01"
                  max={due}
                  step="0.01"
                  value={amount || String(due)}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={busy || dirty}
                  className="mt-2 h-10"
                />
              </div>
              <div>
                <label htmlFor="settlement-reference" className="text-xs font-semibold text-slate-600">
                  {method === 'cash' ? 'Cash receipt reference' : 'Transaction reference'}
                </label>
                <Input
                  id="settlement-reference"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  disabled={busy || dirty || method === 'razorpay'}
                  placeholder={method === 'razorpay' ? 'Recorded automatically' : 'Required'}
                  maxLength={200}
                  className="mt-2 h-10"
                />
              </div>
              <div>
                <label htmlFor="settlement-reason" className="text-xs font-semibold text-slate-600">
                  Note
                </label>
                <Input
                  id="settlement-reason"
                  value={settlementReason}
                  onChange={(e) => setSettlementReason(e.target.value)}
                  disabled={busy || dirty}
                  placeholder="Reason / receipt note"
                  maxLength={1000}
                  className="mt-2 h-10"
                />
              </div>
            </div>
          )}
          <Button
            className="mt-4 rounded-xl bg-slate-900"
            disabled={
              busy ||
              dirty ||
              (!pending &&
                (settlementReason.trim().length < 3 ||
                  Number(amount || due) <= 0 ||
                  Number(amount || due) > due ||
                  (method !== 'razorpay' && reference.trim().length < 3)))
            }
            onClick={() => setSettlementOpen(true)}
          >
            {settling
              ? 'Confirming…'
              : pending
              ? 'Retry pending settlement'
              : method === 'razorpay' && kind === 'refund'
              ? 'Review Razorpay refund'
              : kind === 'refund'
              ? 'Record refund already sent'
              : 'Record payment received'}
          </Button>
        </section>
      )}
      {context.settlements.length > 0 && (
        <section className="rounded-2xl border bg-white overflow-hidden shadow-sm">
          <div className="px-6 py-4 font-semibold">Payment and refund receipts</div>
          <div className="overflow-x-auto min-w-0 max-w-full">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="py-3 px-6">Date</th>
                  <th className="py-3 px-6">Type / method</th>
                  <th className="py-3 px-6">Amount</th>
                  <th className="py-3 px-6">Reference</th>
                  <th className="py-3 px-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {context.settlements.map((s) => (
                  <tr key={s.id}>
                    <td className="py-4 px-6 whitespace-nowrap tabular-nums">{stamp(s.created_at)}</td>
                    <td className="py-4 px-6 tabular-nums">
                      {s.kind} · {s.method}
                    </td>
                    <td className="py-4 px-6 tabular-nums whitespace-nowrap">{money(s.amount)}</td>
                    <td className="py-4 px-6 break-all tabular-nums">{s.reference || 'Awaiting confirmation'}</td>
                    <td className="py-4 px-6 tabular-nums">{s.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <section className="rounded-2xl border bg-white p-6 md:p-8 shadow-sm">
        <h2 className="font-semibold text-slate-900">Order change history</h2>
        {!context.history.length ? (
          <p className="mt-2 text-sm text-slate-500">
            Saved edits will appear here with their original items, totals and reason.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-slate-100">
            {context.history.map((entry) => (
              <details key={entry.id} className="py-4">
                <summary className="cursor-pointer text-sm">
                  <span className="font-semibold">{entry.reason}</span>
                  <span className="ml-2 text-slate-500">
                    {stamp(entry.created_at)} · by {entry.actor_id.slice(0, 8)}
                  </span>
                </summary>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {[entry.before_state, entry.after_state].map((saved, index) => (
                    <div key={index} className="rounded-xl bg-slate-50 p-4 text-xs">
                      <p className="mb-2 font-semibold">
                        {index ? 'After' : 'Before'} · {money(saved.total)}
                      </p>
                      <p className="mb-2 text-slate-500">
                        Delivery {money(saved.shipping_price || 0)} · Gift card{' '}
                        {money(saved.gift_card_discount || 0)} · M Coins {saved.coin_discount_amount || 0}
                      </p>
                      {Number(saved.edit_version) > 0 && (
                        <p className="mb-2 text-slate-500">
                          Received {money(saved.edit_paid_amount || 0)} · To collect{' '}
                          {money(saved.edit_balance_due || 0)} · Refund due{' '}
                          {money(saved.edit_refund_due || 0)}
                        </p>
                      )}
                      {saved.order_items.map((item) => (
                        <p key={item.id} className="mt-1 break-words">
                          {item.product_name} · {item.variant_title} × {item.quantity} ·{' '}
                          {money(
                            Number(item.unit_price) * item.quantity - Number(item.line_discount_amount || 0)
                          )}
                          {item.is_gift ? ' · gift' : ''}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        )}
      </section>
      <Dialog
        open={reviewOpen}
        onOpenChange={(open) => {
          if (!saving) setReviewOpen(open)
        }}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirm order changes</DialogTitle>
            <DialogDescription>
              Review the revised items and total. Saving adjusts stock and returns any unused credits.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            {quote?.lines.map((line, index) => (
              <div key={index} className="flex justify-between gap-3 border-b py-2">
                <span>
                  {line.product_name} · {line.variant_title} × {line.quantity}
                  {line.is_gift ? ' · gift' : ''}
                </span>
                <span className="shrink-0 tabular-nums">
                  {money(line.unit_price * line.quantity - line.line_discount_amount)}
                </span>
              </div>
            ))}
            <p className="flex justify-between pt-3 font-semibold">
              <span>New total</span>
              <span>{money(quote?.total || 0)}</span>
            </p>
            {!!quote?.balanceDue && <p className="text-amber-800">To collect: {money(quote.balanceDue)}</p>}
            {!!quote?.refundDue && (
              <p className="text-rose-700">
                Refund due: {money(quote.refundDue)}. Issue or record it after saving.
              </p>
            )}
            {!!quote?.coinsReturned && <p>M Coins returned: {quote.coinsReturned}</p>}
            {!!quote?.giftCreditReturned && (
              <p>Gift-card credit returned: {money(quote.giftCreditReturned)}</p>
            )}
            {quote?.warnings.map((warning) => (
              <p key={warning} className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
                {warning}
              </p>
            ))}
            <p className="pt-2 text-slate-500">Reason: {reason}</p>
            {error && (
              <p role="alert" className="text-rose-700">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setReviewOpen(false)}>
              Back to draft
            </Button>
            <Button disabled={saving || !review} onClick={() => void save()} className="bg-slate-900">
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={settlementOpen}
        onOpenChange={(open) => {
          if (!settling) setSettlementOpen(open)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {(pending?.method || method) === 'razorpay'
                ? 'Issue Razorpay refund?'
                : 'Confirm recorded transaction'}
            </DialogTitle>
            <DialogDescription>
              {(pending?.method || method) === 'razorpay'
                ? 'This sends an actual refund to the original payment method.'
                : 'Confirm that this money has already been received or returned. Recording it updates the outstanding balance.'}
            </DialogDescription>
          </DialogHeader>
          <p className="text-lg font-semibold">
            {money(pending ? Number(pending.amount) : Number(amount || due))} · {pending?.method || method}
          </p>
          <DialogFooter>
            <Button variant="outline" disabled={settling} onClick={() => setSettlementOpen(false)}>
              Back
            </Button>
            <Button disabled={settling} onClick={() => void settle()} className="bg-slate-900">
              {settling
                ? 'Confirming…'
                : (pending?.method || method) === 'razorpay'
                ? 'Issue refund'
                : 'Confirm transaction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard this draft?</DialogTitle>
            <DialogDescription>Your item changes have not been saved.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscardOpen(false)}>
              Keep editing
            </Button>
            <Button
              onClick={() => (leaveToOrder ? router.push(`/admin/orders/${order.id}`) : void reload())}
              className="bg-slate-900"
            >
              {leaveToOrder ? 'Discard and leave' : 'Discard and reload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={cancelOpen}
        onOpenChange={(open) => {
          if (!cancelling) setCancelOpen(open)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel the entire order?</DialogTitle>
            <DialogDescription>
              This cancels the saved order, returns its inventory and credits, and starts any applicable
              original-payment refund. Additional receipts may need a recorded refund.
            </DialogDescription>
          </DialogHeader>
          <label htmlFor="cancel-order-reason" className="text-sm font-semibold">
            Reason
          </label>
          <Input
            id="cancel-order-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={1000}
            disabled={cancelling}
          />
          <DialogFooter>
            <Button variant="outline" disabled={cancelling} onClick={() => setCancelOpen(false)}>
              Keep order
            </Button>
            <Button
              className="bg-rose-700 hover:bg-rose-800"
              disabled={cancelling || reason.trim().length < 3}
              onClick={() => void cancelOrder()}
            >
              {cancelling ? 'Cancelling…' : 'Cancel entire order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
