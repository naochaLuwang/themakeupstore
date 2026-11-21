import { customerDateRange, directoryDate, directoryPage } from './admin-directory'
import { ALL_STATUSES } from './order-status'

export const DASHBOARD_QUEUES = {
    confirmation: 'Unconfirmed · placed over 2h ago',
    dispatch: 'Awaiting dispatch · placed over 24h ago',
    failed: 'Failed deliveries',
    pickup: 'Missed pickups',
    payment: 'Outstanding payments',
    refund: 'Refunds due',
    settlement: 'Payment or refund review',
} as const
export type DashboardParams = { from?: string; to?: string; status?: string; queue?: string; page?: string }
export type DashboardSection = 'orders' | 'operations' | 'inventory' | 'audience' | 'activity'
export type DashboardMetric = {
    count: number
    allCount: number
    orderValue: number
    retained: number
    outstanding: number
    refundDue: number
    refunded: number
    refundOrders: number
    completed: number
    customers: number
    unknownPayments: number
    promoOrders: number
}
export type DashboardTrend = {
    day: string
    orderValue: number
    retained: number
    previousOrderValue: number
    previousRetained: number
}
export type DashboardOrder = {
    id: string
    user_id: string | null
    created_at: string
    status: string
    order_type: string
    payment_status: string | null
    total: number
    retained: number | null
    refunded: number
    balance_due: number | null
    refund_due: number | null
    customer_name: string
    payment_method: string | null
    shipping_price: number
    shipping_label: string | null
    manual_discount_amount?: number
    promo_discount_amount: number
    bxgy_discount_amount: number
    gift_card_discount: number
    coin_discount_amount: number
    additional_charges: number
    additional_charges_label: string | null
    edit_version: number
    cancellation_started_at: string | null
    promo_code: string | null
    items: {
        id: string
        product_name: string
        variant_title: string | null
        quantity: number
        unit_price: number
        is_gift: boolean
        line_discount_amount: number | null
        refunded_quantity: number
    }[]
}
export type DashboardOrders = {
    current: DashboardMetric
    previous: DashboardMetric
    today: DashboardMetric
    trend: DashboardTrend[]
    recent: DashboardOrder[]
    products: { id: string | null; name: string; quantity: number }[]
    categories: { name: string; quantity: number }[]
    weekday: { day: number; orderValue: number; count: number }[]
    payments: { method: string; count: number }[]
}
export type DashboardOperations = {
    statuses: { status: string; count: number }[]
    attention: Record<keyof typeof DASHBOARD_QUEUES, number>
    orders: DashboardOrder[]
    total: number
    page: number
    totalPages: number
}
export type DashboardInventory = {
    total: number
    available: number
    out: number
    low: number
    items: { id: string; name: string; title: string | null; sku: string | null; stock: number }[]
}
export type DashboardAudience = {
    ordering: number
    new: number
    returning: number
    registered: number
    carts: { pending: number; sent: number; recent: number }
    traffic: { views: number; browsers: number }
}
export type DashboardActivity = {
    unread: number
    wholesale: number
    events: { id: string; name: string; label: string; kind: 'message' | 'wholesale'; created_at: string }[]
}
export type DashboardData = {
    orders: DashboardOrders
    operations: DashboardOperations
    inventory: DashboardInventory
    audience: DashboardAudience
    activity: DashboardActivity
}
export type DashboardResult = {
    [K in DashboardSection]: { data: DashboardData[K] | null; error: string | null }
}

export function dashboardRange(params: DashboardParams, now = new Date()) {
    const today = new Date(now.getTime() + 19_800_000).toISOString().slice(0, 10)
    const defaultStart = new Date(new Date(`${today}T00:00:00Z`).getTime() - 29 * 86_400_000)
        .toISOString()
        .slice(0, 10)
    const from = params.from || defaultStart,
        to = params.to || today
    if (
        !directoryDate(from) ||
        !directoryDate(to) ||
        Number(from.slice(0, 4)) < 1 ||
        Number(to.slice(0, 4)) < 1
    )
        throw new Error('Choose valid dashboard dates.')
    if (from > to) throw new Error('From date must be on or before the to date.')
    const dates = customerDateRange({ from, to })
    const duration = new Date(dates.before!).getTime() - new Date(dates.from!).getTime()
    if (duration > 3660 * 86_400_000) throw new Error('Choose a date range of 10 years or less.')
    return {
        from,
        to,
        start: dates.from!,
        before: dates.before!,
        previousFrom: new Date(new Date(`${from}T00:00:00Z`).getTime() - duration).toISOString().slice(0, 10),
        previousTo: new Date(new Date(`${from}T00:00:00Z`).getTime() - 86_400_000).toISOString().slice(0, 10),
    }
}
export function dashboardFilters(params: DashboardParams) {
    const status = ALL_STATUSES.includes(params.status as (typeof ALL_STATUSES)[number]) ? params.status! : ''
    const queue = Object.hasOwn(DASHBOARD_QUEUES, params.queue || '')
        ? (params.queue as keyof typeof DASHBOARD_QUEUES)
        : ''
    return { status, queue, page: directoryPage(params.page) } as const
}
export function dashboardHref(params: DashboardParams, changes: Partial<DashboardParams> = {}) {
    const search = new URLSearchParams()
    for (const [key, value] of Object.entries({ ...params, ...changes })) if (value) search.set(key, value)
    return `/admin${search.size ? `?${search}` : ''}`
}
export function dashboardChange(current: number, previous: number) {
    return previous === 0
        ? current > 0
            ? 'New'
            : '—'
        : `${((current - previous) / previous) * 100 >= 0 ? '+' : ''}${(
              ((current - previous) / previous) *
              100
          ).toFixed(1)}%`
}
