export type DirectoryParams = { q?: string; from?: string; to?: string; page?: string }
export type CustomerSummary = {
    id: string; full_name: string | null; phone: string | null; email: string | null;
    created_at: string; order_count: number; order_value: number;
}
export type CustomerDirectory = {
    customers: CustomerSummary[]; total: number; active30d: number;
    page: number; pageSize: number; totalPages: number;
}
export type RecoveryCart = {
    id: string; user_id: string; full_name: string | null; phone: string | null;
    email: string | null; updated_at: string; abandoned_email_sent_at: string | null; item_count: number;
}
export type RecoveryDirectory = {
    carts: RecoveryCart[]; stats: { pending: number; sent: number; recent: number; unreachable: number };
    total: number; page: number; pageSize: number; totalPages: number;
}
export type RecoveryResult = {
    sent: number; failed: number; skipped: number; unconfirmed: number;
    outcomes: { id: string; status: 'sent' | 'failed' | 'skipped' | 'unconfirmed'; message?: string }[];
}
export type CustomerOrder = {
    id: string; total: number | string; status: string; payment_status: string | null; created_at: string;
}

export function directoryPage(value?: string) {
    const page = Number(value)
    return Number.isSafeInteger(page) && page > 0 ? Math.min(page, 1_000_000) : 1
}

export function directoryDate(value?: string) {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
    const date = new Date(`${value}T00:00:00Z`)
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null
}

export function customerDateRange(params: DirectoryParams) {
    const from = directoryDate(params.from)
    const to = directoryDate(params.to)
    if ((params.from && !from) || (params.to && !to)) throw new Error('Choose valid joined dates.')
    if (from && to && from > to) throw new Error('Joined from must be on or before joined to.')
    const before = to ? new Date(new Date(`${to}T00:00:00+05:30`).getTime() + 86_400_000).toISOString() : null
    return { from: from ? new Date(`${from}T00:00:00+05:30`).toISOString() : null, before }
}

export function directoryHref(path: string, params: Record<string, string | undefined>, page: number) {
    const search = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) if (value) search.set(key, value)
    if (page > 1) search.set('page', String(page))
    return `${path}${search.size ? `?${search}` : ''}`
}

export function directoryDateLabel(value: string, includeTime = false) {
    return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric',
        ...(includeTime ? { hour: '2-digit', minute: '2-digit' } as const : {}),
    }).format(new Date(value))
}

export function customerStatus(orderCount: number) {
    return orderCount === 0 ? 'Lead' : orderCount === 1 ? 'First-time' : 'Repeat'
}
