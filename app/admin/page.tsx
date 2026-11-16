import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
    ArrowDown,
    ArrowUp,
    ArrowUpRight,
    ChevronRight,
    Plus,
    Loader2,
    ClipboardList,
    PackageSearch,
    ShoppingBag,
    Users,
    Receipt,
    ShoppingCart,
    Tags,
    Zap,
    Award,
    Megaphone,
    BarChart3,
    Truck,
} from 'lucide-react'
import { getAdminDashboard } from '@/app/actions/admin-dashboard'
import { DASHBOARD_QUEUES, dashboardChange, dashboardHref, type DashboardParams } from '@/lib/admin-dashboard'
import { ALL_STATUSES, STATUS_LABELS } from '@/lib/order-status'
import { DateRangePicker } from '@/components/admin/date-range-picker'
import { RecentOrdersTable } from '@/components/admin/recent-orders-table'
import { DashboardOrderFilter, DashboardRefresh } from './dashboard-refresh'

const RevenueChart = dynamic(
    () => import('@/components/admin/revenue-chart').then((module) => module.RevenueChart),
    {
        loading: () => (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
        ),
    }
)
const money = (value: number) => `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const percent = (part: number, total: number) => (total > 0 ? (part / total) * 100 : 0)
const queueLabels: Record<keyof typeof DASHBOARD_QUEUES, string> = {
    confirmation: 'Unconfirmed',
    dispatch: 'Awaiting dispatch',
    failed: 'Failed deliveries',
    pickup: 'Missed pickups',
    payment: 'Outstanding payments',
    refund: 'Refunds due',
    settlement: 'Payment review',
}

const shortcuts = [
    { label: 'Orders', href: '/admin/orders', icon: ClipboardList },
    { label: 'Inventory', href: '/admin/inventory', icon: PackageSearch },
    { label: 'Products', href: '/admin/products', icon: ShoppingBag },
    { label: 'Customers', href: '/admin/customers', icon: Users },
    { label: 'Purchases', href: '/admin/purchase', icon: Receipt },
    { label: 'Cart recovery', href: '/admin/abandoned-carts', icon: ShoppingCart },
    { label: 'Promotions', href: '/admin/promos', icon: Tags },
    { label: 'Flash sales', href: '/admin/flash-sales', icon: Zap },
    { label: 'Rewards', href: '/admin/rewards/users', icon: Award },
    { label: 'Broadcast', href: '/admin/broadcast', icon: Megaphone },
    { label: 'Reports', href: '/admin/reports/sales', icon: BarChart3 },
    { label: 'Shipping', href: '/admin/shipping', icon: Truck },
]
type MetricCard = {
    label: string
    value: number
    display: string
    prior?: number
    href?: string
    detail?: string
}

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<DashboardParams> }) {
    const params = await searchParams
    let report
    try {
        report = await getAdminDashboard(params)
    } catch (error) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-black tracking-tight">Dashboard</h1>
                <div role="alert" className="rounded-2xl border bg-white p-5 shadow-sm">
                    <p className="text-sm text-red-700">
                        {error instanceof Error ? error.message : 'Dashboard unavailable.'}
                    </p>
                    <Link href="/admin" className="mt-3 inline-block text-sm underline">
                        Reset dashboard
                    </Link>
                </div>
            </div>
        )
    }
    const { sections, range, filters, asOf } = report
    const orders = sections.orders.data,
        operations = sections.operations.data,
        inventory = sections.inventory.data
    const audience = sections.audience.data,
        activity = sections.activity.data
    const current = orders?.current,
        previous = orders?.previous
    const filtered = Boolean(filters.queue || filters.status)
    const orderRows = filtered ? operations?.orders : orders?.recent
    const orderTitle = filters.queue
        ? queueLabels[filters.queue]
        : filters.status
        ? STATUS_LABELS[filters.status]
        : 'Recent orders'
    const statuses = [
        ...ALL_STATUSES,
        ...(operations?.statuses
            .map((item) => item.status)
            .filter((status) => !ALL_STATUSES.includes(status as (typeof ALL_STATUSES)[number])) || []),
    ]
    const queueHref = (queue: keyof typeof DASHBOARD_QUEUES) =>
        dashboardHref(params, { queue, status: undefined, page: undefined })
    const today = new Date(new Date(asOf).getTime() + 19_800_000).toISOString().slice(0, 10)
    const cards: MetricCard[] =
        current && previous && orders
            ? [
                  {
                      label: 'Order value',
                      value: current.orderValue,
                      display: money(current.orderValue),
                      prior: previous.orderValue,
                  },
                  {
                      label: 'Payments retained',
                      value: current.retained,
                      display: money(current.retained),
                      prior: previous.retained,
                  },
                  {
                      label: 'Outstanding payments',
                      value: current.outstanding,
                      display: money(current.outstanding),
                      href: queueHref('payment'),
                  },
                  {
                      label: 'Refunds due',
                      value: current.refundDue,
                      display: money(current.refundDue),
                      href: queueHref('refund'),
                  },
                  {
                      label: 'Today’s order value',
                      value: orders.today.orderValue,
                      display: money(orders.today.orderValue),
                      detail: orders.today.count + ' orders',
                      href:
                          dashboardHref(params, {
                              from: today,
                              to: today,
                              queue: undefined,
                              status: undefined,
                              page: undefined,
                          }) + '#dashboard-orders',
                  },
                  {
                      label: 'Orders',
                      value: current.count,
                      display: current.count.toLocaleString('en-IN'),
                      prior: previous.count,
                      href:
                          dashboardHref(params, { queue: undefined, status: undefined, page: undefined }) +
                          '#dashboard-orders',
                  },
                  {
                      label: 'Average order',
                      value: current.count ? current.orderValue / current.count : 0,
                      display: money(current.count ? current.orderValue / current.count : 0),
                      prior: previous.count ? previous.orderValue / previous.count : 0,
                  },
                  {
                      label: 'Fulfilled',
                      value: percent(current.completed, current.count),
                      display: percent(current.completed, current.count).toFixed(1) + '%',
                      detail: current.completed + ' / ' + current.count,
                  },
              ]
            : []
    return (
        <div className="space-y-6">
            <header className="grid grid-cols-[1fr_auto] items-center gap-3 sm:flex sm:flex-wrap">
                <h1 className="min-w-0 text-2xl font-black tracking-tight text-slate-900 sm:mr-auto">
                    Dashboard
                </h1>
                <Link
                    href="/admin/products/add"
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800 sm:order-last"
                >
                    <Plus className="h-4 w-4" />
                    New product
                </Link>
                <div className="col-span-2 flex items-center gap-2">
                    <DateRangePicker from={range.from} to={range.to} />
                    <DashboardRefresh asOf={asOf} />
                </div>
            </header>
            {Object.entries(sections).map(
                ([name, section]) =>
                    section.error && (
                        <div
                            key={name}
                            role="alert"
                            className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                        >
                            <span className="capitalize">{name} unavailable</span>
                            <Link href={dashboardHref(params)} className="text-xs font-medium underline">
                                Retry
                            </Link>
                        </div>
                    )
            )}
            <section aria-label="Financial overview" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                {cards.length ? (
                    cards.map((card) => {
                        const change =
                            card.prior !== undefined && card.value !== card.prior
                                ? dashboardChange(card.value, card.prior)
                                : null
                        const positive = card.prior !== undefined && card.value > card.prior
                        const content = (
                            <>
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-medium text-slate-500">{card.label}</span>
                                    {card.href && (
                                        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                    )}
                                </div>
                                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                    <strong className="break-all text-xl font-semibold tracking-tight tabular-nums text-slate-900 sm:text-2xl">
                                        {card.display}
                                    </strong>
                                    {change && (
                                        <span
                                            aria-label={`${change} versus previous period`}
                                            className={`inline-flex items-center gap-1 text-xs font-medium tabular-nums ${
                                                positive
                                                    ? 'text-emerald-700'
                                                    : card.prior !== undefined && card.value < card.prior
                                                    ? 'text-rose-700'
                                                    : 'text-slate-400'
                                            }`}
                                        >
                                            {positive ? (
                                                <ArrowUp className="h-3 w-3" />
                                            ) : card.prior !== undefined && card.value < card.prior ? (
                                                <ArrowDown className="h-3 w-3" />
                                            ) : null}
                                            {change}
                                        </span>
                                    )}
                                </div>
                                {card.detail && (
                                    <div className="mt-2 text-[11px] tabular-nums text-slate-400">
                                        {card.detail}
                                    </div>
                                )}
                            </>
                        )
                        return card.href ? (
                            <Link
                                key={card.label}
                                href={card.href}
                                className="min-w-0 rounded-2xl border bg-white p-5 shadow-sm hover:border-slate-300"
                            >
                                {content}
                            </Link>
                        ) : (
                            <div
                                key={card.label}
                                className="min-w-0 rounded-2xl border bg-white p-5 shadow-sm"
                            >
                                {content}
                            </div>
                        )
                    })
                ) : (
                    <div className="col-span-2 rounded-2xl border bg-white p-5 text-sm text-slate-500 xl:col-span-4">
                        Financial metrics unavailable.
                    </div>
                )}
            </section>

            <nav
                aria-label="Quick actions"
                className="grid grid-cols-3 gap-1 rounded-2xl border bg-white p-3 shadow-sm sm:grid-cols-4 xl:grid-cols-6"
            >
                {shortcuts.map(({ label, href, icon: Icon }) => (
                    <Link
                        key={href}
                        href={href}
                        className="group flex min-w-0 flex-col items-center justify-center gap-2 rounded-xl px-2 py-3 text-center hover:bg-pink-50 sm:flex-row sm:justify-start sm:gap-3 sm:px-3 sm:text-left"
                    >
                        <Icon className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-pink-700" />
                        <span className="text-[11px] font-medium text-slate-700 group-hover:text-pink-800 sm:text-xs">
                            {label}
                        </span>
                    </Link>
                ))}
            </nav>
            <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                <section
                    aria-label="Order trends"
                    className="min-w-0 overflow-hidden rounded-2xl border bg-white shadow-sm"
                >
                    <div className="p-5">
                        {orders ? (
                            <RevenueChart data={orders.trend} />
                        ) : (
                            <p className="py-24 text-center text-sm text-slate-500">Trends unavailable</p>
                        )}
                    </div>
                </section>
                <section
                    aria-label="Needs attention"
                    className="overflow-hidden rounded-2xl border bg-white shadow-sm"
                >
                    <div className="flex items-center justify-between gap-3 px-5 py-4">
                        <h2 className="text-sm font-semibold">Needs attention</h2>
                        <span className="text-[11px] text-slate-400">All dates</span>
                    </div>
                    {operations ? (
                        <div className="border-t divide-y divide-slate-100">
                            {Object.entries(queueLabels).map(([key, label]) => {
                                const queue = key as keyof typeof DASHBOARD_QUEUES,
                                    count = operations.attention[queue]
                                return (
                                    <Link
                                        key={queue}
                                        href={queueHref(queue)}
                                        aria-label={`${DASHBOARD_QUEUES[queue]}: ${count}`}
                                        aria-current={filters.queue === queue ? 'page' : undefined}
                                        className={`group flex items-center gap-3 px-5 py-3 text-sm transition-colors ${
                                            filters.queue === queue ? 'bg-pink-50' : 'hover:bg-slate-50'
                                        }`}
                                    >
                                        <span
                                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                                count
                                                    ? ['failed', 'pickup', 'refund'].includes(queue)
                                                        ? 'bg-rose-500'
                                                        : 'bg-amber-500'
                                                    : 'bg-slate-200'
                                            }`}
                                        />
                                        <span className="min-w-0 flex-1 text-xs text-slate-600">{label}</span>
                                        <strong
                                            className={`tabular-nums ${
                                                count ? 'text-slate-900' : 'text-slate-400'
                                            }`}
                                        >
                                            {count}
                                        </strong>
                                        <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-600" />
                                    </Link>
                                )
                            })}
                        </div>
                    ) : (
                        <p className="px-5 pb-5 text-sm text-slate-500">Unavailable</p>
                    )}
                </section>
            </div>
            <section
                aria-label="Order pipeline"
                className="rounded-2xl border bg-white p-5 shadow-sm space-y-4"
            >
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold">Order status</h2>
                    <span className="text-[11px] text-slate-400">All dates</span>
                </div>
                {operations ? (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
                        {statuses.map((status) => (
                            <Link
                                key={status}
                                href={
                                    dashboardHref(params, { status, queue: undefined, page: undefined }) +
                                    '#dashboard-orders'
                                }
                                aria-current={filters.status === status ? 'page' : undefined}
                                className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-3 hover:bg-slate-50 ${
                                    filters.status === status
                                        ? 'border-pink-200 bg-pink-50'
                                        : 'border-slate-100'
                                }`}
                            >
                                <span className="text-[11px] text-slate-600">
                                    {STATUS_LABELS[status] || status.replaceAll('_', ' ')}
                                </span>
                                <strong className="text-sm tabular-nums">
                                    {operations.statuses.find((item) => item.status === status)?.count || 0}
                                </strong>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-slate-500">Unavailable</p>
                )}
            </section>
            <section
                id="dashboard-orders"
                aria-label="Order queue"
                className="min-w-0 overflow-hidden rounded-2xl border bg-white shadow-sm"
            >
                <div className="flex flex-wrap items-center justify-between gap-3 p-5">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-semibold">{orderTitle}</h2>
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-500">
                            {filtered ? 'All dates' : 'Selected dates'}
                        </span>
                        {filtered && operations && (
                            <span className="text-xs text-slate-400">{operations.total}</span>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <DashboardOrderFilter
                            params={params}
                            statuses={statuses.map((status) => ({
                                value: status,
                                label: STATUS_LABELS[status] || status.replaceAll('_', ' '),
                                count:
                                    operations?.statuses.find((item) => item.status === status)?.count || 0,
                            }))}
                            status={filters.status}
                            queueLabel={filters.queue ? queueLabels[filters.queue] : undefined}
                            disabled={!operations}
                        />
                        {filtered && (
                            <Link
                                href={dashboardHref(params, {
                                    queue: undefined,
                                    status: undefined,
                                    page: undefined,
                                })}
                                className="text-xs text-slate-500 underline"
                            >
                                Clear filter
                            </Link>
                        )}
                        <Link
                            href="/admin/orders"
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-600"
                        >
                            View all
                            <ArrowUpRight className="h-3 w-3" />
                        </Link>
                    </div>
                </div>
                {orderRows ? (
                    <RecentOrdersTable orders={orderRows} />
                ) : (
                    <p className="px-5 pb-5 text-sm text-slate-500">
                        {filtered ? 'Order filter unavailable' : 'Recent orders unavailable'}
                    </p>
                )}
                {filtered && operations && (
                    <nav
                        aria-label="Dashboard order pages"
                        className="flex flex-wrap items-center justify-between gap-3 border-t p-4 text-xs"
                    >
                        <span className="text-slate-500">
                            Page {operations.page} of {operations.totalPages}
                        </span>
                        <div className="flex gap-3">
                            {operations.page > 1 && (
                                <Link
                                    href={dashboardHref(params, { page: String(operations.page - 1) })}
                                    className="rounded-lg border px-3 py-2"
                                >
                                    Previous
                                </Link>
                            )}
                            {operations.page < operations.totalPages && (
                                <Link
                                    href={dashboardHref(params, { page: String(operations.page + 1) })}
                                    className="rounded-lg border px-3 py-2"
                                >
                                    Next
                                </Link>
                            )}
                        </div>
                    </nav>
                )}
            </section>
            <div className="grid gap-4 lg:grid-cols-3">
                <section
                    aria-label="Stock alerts"
                    className="min-w-0 rounded-2xl border bg-white p-5 shadow-sm space-y-4"
                >
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="text-sm font-semibold">Stock alerts</h2>
                        <Link
                            href="/admin/inventory"
                            aria-label="View inventory"
                            className="text-slate-400 hover:text-slate-700"
                        >
                            <ArrowUpRight className="h-4 w-4" />
                        </Link>
                    </div>
                    {inventory ? (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                <Link
                                    href="/admin/inventory?stock=out"
                                    className="rounded-xl bg-rose-50 px-4 py-3"
                                >
                                    <span className="text-xs text-rose-700">Out of stock</span>
                                    <strong className="mt-1 block text-xl font-semibold tabular-nums text-rose-900">
                                        {inventory.out}
                                    </strong>
                                </Link>
                                <Link
                                    href="/admin/inventory?stock=low"
                                    className="rounded-xl bg-amber-50 px-4 py-3"
                                >
                                    <span className="text-xs text-amber-700">Low stock</span>
                                    <strong className="mt-1 block text-xl font-semibold tabular-nums text-amber-900">
                                        {inventory.low}
                                    </strong>
                                </Link>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {inventory.items.slice(0, 4).map((item) => (
                                    <Link
                                        key={item.id}
                                        href={`/admin/inventory?stock=${
                                            item.stock <= 0 ? 'out' : 'low'
                                        }&q=${encodeURIComponent(item.sku || item.name)}`}
                                        className="flex items-center justify-between gap-3 py-3"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate text-xs font-medium">{item.name}</p>
                                            <p className="mt-1 truncate text-[11px] text-slate-500">
                                                {item.title || 'Default'}
                                                {item.sku ? ` · ${item.sku}` : ''}
                                            </p>
                                        </div>
                                        <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-600">
                                            {item.stock <= 0 ? 'Out' : item.stock}
                                        </span>
                                    </Link>
                                ))}
                                {!inventory.items.length && (
                                    <p className="py-4 text-sm text-slate-500">No stock alerts</p>
                                )}
                            </div>
                            <div className="flex justify-between gap-3 border-t pt-3 text-xs text-slate-500">
                                <span>In stock</span>
                                <span className="tabular-nums">
                                    {inventory.available} / {inventory.total}
                                </span>
                            </div>
                        </>
                    ) : (
                        <p className="text-sm text-slate-500">Unavailable</p>
                    )}
                </section>
                <section
                    aria-label="Customer and cart summary"
                    className="rounded-2xl border bg-white p-5 shadow-sm space-y-4"
                >
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold">Customers</h2>
                        <Link
                            href="/admin/customers"
                            aria-label="View customers"
                            className="text-slate-400 hover:text-slate-700"
                        >
                            <ArrowUpRight className="h-4 w-4" />
                        </Link>
                    </div>
                    {audience ? (
                        <>
                            <dl className="grid grid-cols-2 gap-x-4 gap-y-5">
                                {[
                                    ['Ordered', audience.ordering],
                                    ['First-time', audience.new],
                                    ['Returning', audience.returning],
                                    ['Registered', audience.registered],
                                ].map(([label, value]) => (
                                    <div key={label}>
                                        <dt className="text-xs text-slate-500">{label}</dt>
                                        <dd className="mt-1 text-xl font-semibold tabular-nums">{value}</dd>
                                    </div>
                                ))}
                            </dl>
                            <div className="space-y-3 border-t pt-4">
                                <h3 className="text-xs font-semibold text-slate-600">
                                    Carts <span className="ml-1 font-normal text-slate-400">Live</span>
                                </h3>
                                {[
                                    [
                                        'Pending recovery',
                                        audience.carts.pending,
                                        '/admin/abandoned-carts?status=pending',
                                    ],
                                    [
                                        'Emails sent',
                                        audience.carts.sent,
                                        '/admin/abandoned-carts?status=sent',
                                    ],
                                    ['Active · 1h', audience.carts.recent, '/admin/live-carts'],
                                ].map(([label, value, href]) => (
                                    <Link
                                        key={label}
                                        href={String(href)}
                                        className="flex items-center justify-between gap-3 text-xs"
                                    >
                                        <span className="text-slate-500">{label}</span>
                                        <strong className="tabular-nums">{value}</strong>
                                    </Link>
                                ))}
                            </div>
                        </>
                    ) : (
                        <p className="text-sm text-slate-500">Unavailable</p>
                    )}
                </section>
                <section
                    aria-label="Recent activity"
                    className="rounded-2xl border bg-white p-5 shadow-sm space-y-4"
                >
                    <h2 className="text-sm font-semibold">Activity</h2>
                    {activity ? (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    ['Messages', activity.unread, '/admin/messages'],
                                    ['Wholesale', activity.wholesale, '/admin/wholesale'],
                                ].map(([label, value, href]) => (
                                    <Link
                                        key={label}
                                        href={String(href)}
                                        className="rounded-xl bg-slate-50 px-4 py-3"
                                    >
                                        <span className="text-xs text-slate-500">{label}</span>
                                        <strong className="mt-1 block text-xl font-semibold tabular-nums">
                                            {value}
                                        </strong>
                                    </Link>
                                ))}
                            </div>
                            <div className="divide-y divide-slate-100">
                                {activity.events.slice(0, 3).map((event) => (
                                    <Link
                                        key={`${event.kind}:${event.id}`}
                                        href={
                                            event.kind === 'message' ? '/admin/messages' : '/admin/wholesale'
                                        }
                                        className="flex items-start justify-between gap-3 py-3"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate text-xs font-medium">{event.name}</p>
                                            <p className="mt-1 truncate text-[11px] text-slate-500">
                                                {event.label}
                                            </p>
                                        </div>
                                        <time className="shrink-0 text-[10px] text-slate-400">
                                            {new Date(event.created_at).toLocaleDateString('en-IN', {
                                                timeZone: 'Asia/Kolkata',
                                                day: 'numeric',
                                                month: 'short',
                                            })}
                                        </time>
                                    </Link>
                                ))}
                                {!activity.events.length && (
                                    <p className="py-4 text-sm text-slate-500">No recent activity</p>
                                )}
                            </div>
                        </>
                    ) : (
                        <p className="text-sm text-slate-500">Unavailable</p>
                    )}
                </section>
            </div>
            <section aria-label="Store analytics" className="grid gap-4 lg:grid-cols-3">
                <section
                    aria-label="Weekday order value"
                    className="min-w-0 rounded-2xl border bg-white p-5 shadow-sm space-y-4"
                >
                    <h2 className="text-sm font-semibold">By weekday</h2>
                    {orders ? (
                        <div className="flex h-36 items-end gap-3 pt-4">
                            {Array.from({ length: 7 }, (_, day) => {
                                const bucket = orders.weekday.find((item) => item.day === day),
                                    value = bucket?.orderValue || 0,
                                    max = Math.max(1, ...orders.weekday.map((item) => item.orderValue)),
                                    label = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]
                                return (
                                    <div
                                        key={day}
                                        className="flex h-full min-w-0 flex-1 flex-col justify-end gap-2 text-center"
                                    >
                                        <div
                                            role="img"
                                            aria-label={`${label}: ${money(value)}`}
                                            title={money(value)}
                                            className="min-h-px rounded-t bg-slate-300"
                                            style={{ height: `${(value / max) * 100}%` }}
                                        />
                                        <span className="text-[10px] text-slate-500">{label}</span>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500">Unavailable</p>
                    )}
                </section>
                <section
                    aria-label="Payment methods"
                    className="rounded-2xl border bg-white p-5 shadow-sm space-y-4"
                >
                    <h2 className="text-sm font-semibold">Payment methods</h2>
                    {orders && current ? (
                        <>
                            {orders.payments.map((payment) => (
                                <div key={payment.method} className="space-y-2">
                                    <div className="flex justify-between gap-3 text-xs">
                                        <span className="capitalize text-slate-500">
                                            {(
                                                {
                                                    cod: 'Cash on delivery',
                                                    razorpay: 'Razorpay',
                                                    upi: 'UPI',
                                                    b2b_invoice: 'B2B invoice',
                                                } as Record<string, string>
                                            )[payment.method] || payment.method.replaceAll('_', ' ')}
                                        </span>
                                        <strong className="tabular-nums">
                                            {payment.count} ·{' '}
                                            {percent(payment.count, current.count).toFixed(1)}%
                                        </strong>
                                    </div>
                                    <div className="h-1 overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className="h-full rounded-full bg-slate-400"
                                            style={{ width: `${percent(payment.count, current.count)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                            <dl className="grid grid-cols-2 gap-3 border-t pt-3 text-xs">
                                {[
                                    [
                                        'Coupon use',
                                        `${percent(current.promoOrders, current.count).toFixed(1)}%`,
                                    ],
                                    [
                                        'Refund rate',
                                        `${percent(current.refundOrders, current.allCount).toFixed(1)}%`,
                                    ],
                                    ['Refunded', money(current.refunded)],
                                    ['Unknown payments', String(current.unknownPayments)],
                                ].map(([label, value]) => (
                                    <div key={label}>
                                        <dt className="text-slate-500">{label}</dt>
                                        <dd className="mt-1 font-semibold tabular-nums">{value}</dd>
                                    </div>
                                ))}
                            </dl>
                        </>
                    ) : (
                        <p className="text-sm text-slate-500">Unavailable</p>
                    )}
                </section>
                <section
                    aria-label="Top products and categories"
                    className="min-w-0 rounded-2xl border bg-white p-5 shadow-sm space-y-4"
                >
                    <h2 className="text-sm font-semibold">Top products</h2>
                    {orders ? (
                        <>
                            {orders.products.slice(0, 5).map((product, index) => (
                                <div
                                    key={`${product.id}:${index}`}
                                    className="flex items-start justify-between gap-3 text-xs"
                                >
                                    <span className="truncate text-slate-500">{product.name}</span>
                                    <strong className="shrink-0 tabular-nums">{product.quantity}</strong>
                                </div>
                            ))}
                            <h3 className="border-t pt-3 text-xs font-semibold">Categories</h3>
                            {orders.categories.slice(0, 3).map((category) => (
                                <div key={category.name} className="flex justify-between gap-3 text-xs">
                                    <span className="text-slate-500">{category.name}</span>
                                    <strong className="tabular-nums">{category.quantity}</strong>
                                </div>
                            ))}
                        </>
                    ) : (
                        <p className="text-sm text-slate-500">Unavailable</p>
                    )}
                </section>
                {audience && (
                    <dl className="grid grid-cols-2 gap-4 rounded-2xl border bg-white p-5 shadow-sm lg:col-span-3">
                        {[
                            ['Page views · 24h', audience.traffic.views],
                            ['Browsers · 24h', audience.traffic.browsers],
                        ].map(([label, value]) => (
                            <div key={label} className="space-y-2 text-xs">
                                <dt className="text-slate-500">{label}</dt>
                                <dd className="text-xl font-semibold tabular-nums">{value}</dd>
                            </div>
                        ))}
                    </dl>
                )}
            </section>
        </div>
    )
}
