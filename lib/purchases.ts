export type PurchaseStatus = 'draft' | 'ordered' | 'partial' | 'received' | 'cancelled'
export const PURCHASE_STATUSES: Record<PurchaseStatus, string> = {
    draft: 'Draft',
    ordered: 'Ordered',
    partial: 'Partially received',
    received: 'Received',
    cancelled: 'Cancelled',
}
export type Supplier = {
    id: string
    name: string
    email: string | null
    phone: string | null
    address: string | null
    contact_person: string | null
}
export type PurchaseProduct = {
    variant_id: string
    product_id: string
    name: string
    title: string | null
    sku: string | null
    brand: string | null
    stock: number
    selling_price: number
    last_cost: number | null
    status: string
}
export type PurchaseLine = {
    id: string
    product_id: string
    variant_id: string
    name: string
    title: string | null
    sku: string | null
    quantity: number
    unit_cost: number
    received_quantity: number
    damaged_quantity: number
}
export type PurchaseRow = {
    id: string
    reference_number: string
    status: PurchaseStatus
    total_cost: number
    created_at: string
    expected_on: string | null
    version: number
    supplier: Supplier
    units: number
    received_units: number
    damaged_units: number
}
export type PurchaseDetail = PurchaseRow & {
    notes: string
    items: PurchaseLine[]
    legacy_receipt: boolean
    receipts: {
        id: string
        received_on: string
        notes: string
        created_at: string
        lines: { item_id: string; accepted: number; damaged: number }[]
    }[]
    events: { id: string; action: string; created_at: string }[]
}
export type PurchaseParams = { q?: string; status?: string; from?: string; to?: string; page?: string }
export type PurchaseDirectory = {
    orders: PurchaseRow[]
    total: number
    page: number
    totalPages: number
    summary: { value: number; open: number; received: number; damaged: number }
}
export type PurchaseDraft = {
    supplier_id: string
    reference_number: string
    expected_on: string
    notes: string
    items: { variant_id: string; quantity: number; unit_cost: number }[]
}
export const purchaseMoney = (value: number) =>
    `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
export const purchaseToday = () =>
    new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date())
export function purchaseDate(value: string) {
    return new Date(value).toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    })
}
export function validPurchaseDate(value: string) {
    return (
        /^\d{4}-\d{2}-\d{2}$/.test(value) &&
        Number(value.slice(0, 4)) >= 1900 &&
        Number(value.slice(0, 4)) <= 2200 &&
        Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
        new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
    )
}
export function purchaseFilters(params: PurchaseParams) {
    if (
        (params.from && !validPurchaseDate(params.from)) ||
        (params.to && !validPurchaseDate(params.to)) ||
        (params.from && params.to && params.from > params.to)
    )
        throw new Error('Choose valid purchase dates.')
    if (params.status && !Object.hasOwn(PURCHASE_STATUSES, params.status))
        throw new Error('Choose a valid purchase status.')
    return {
        q: (params.q || '').trim().slice(0, 200),
        status: params.status || '',
        from: params.from || '',
        to: params.to || '',
        page: Math.max(1, Math.min(1000000, Number.parseInt(params.page || '1', 10) || 1)),
    }
}
export function validatePurchaseDraft(draft: PurchaseDraft) {
    if (!draft.supplier_id) throw new Error('Choose a supplier.')
    if (draft.reference_number.length > 100 || draft.notes.length > 2000)
        throw new Error('Reference or notes are too long.')
    if (draft.expected_on && !validPurchaseDate(draft.expected_on))
        throw new Error('Choose a valid expected delivery date.')
    if (!Array.isArray(draft.items) || !draft.items.length || draft.items.length > 500)
        throw new Error('Add between 1 and 500 items.')
    const ids = new Set<string>()
    let total = 0
    for (const item of draft.items) {
        if (!item.variant_id || ids.has(item.variant_id)) throw new Error('Each shade can only appear once.')
        ids.add(item.variant_id)
        if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 1000000)
            throw new Error('Quantities must be whole numbers from 1 to 1,000,000.')
        if (
            !Number.isFinite(item.unit_cost) ||
            item.unit_cost < 0 ||
            item.unit_cost > 10000000 ||
            Math.abs(item.unit_cost * 100 - Math.round(item.unit_cost * 100)) > 0.00001
        )
            throw new Error('Enter a non-negative unit cost with at most two decimals.')
        total += item.quantity * Math.round(item.unit_cost * 100)
    }
    if (total > 100000000000000) throw new Error('Purchase total is too large.')
    return Math.round(total) / 100
}
export function purchaseCSV(orders: PurchaseRow[]) {
    const cell = (value: unknown) => {
        const raw = String(value ?? '')
        const safe = /^[\s]*[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw
        return `"${safe.replaceAll('"', '""')}"`
    }
    return (
        '\uFEFF' +
        [
            [
                'Reference',
                'Supplier',
                'Date (IST)',
                'Status',
                'Total (INR)',
                'Ordered units',
                'Accepted units',
                'Damaged units',
            ],
            ...orders.map((order) => [
                order.reference_number,
                order.supplier.name,
                purchaseDate(order.created_at),
                PURCHASE_STATUSES[order.status],
                order.total_cost,
                order.units,
                order.received_units,
                order.damaged_units,
            ]),
        ]
            .map((row) => row.map(cell).join(','))
            .join('\r\n')
    )
}
