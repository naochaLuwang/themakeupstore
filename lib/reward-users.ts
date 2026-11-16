export const MAX_ADMIN_CREDIT = 100000
export type RewardUser = {
    user_id: string
    full_name: string
    phone: string | null
    email: string | null
    balance: number
    lifetime_earned: number
    lifetime_spent: number
    pending: number
    tier: string
    last_activity: string | null
}
export type RewardParams = {
    q?: string
    tier?: string
    spent?: string
    hideZero?: string
    sort?: string
    page?: string
}
export type RewardTxParams = { type?: string; status?: string; from?: string; to?: string; page?: string }
export type RewardSummary = {
    balance: number
    earned: number
    spent: number
    pending: number
    active: number
}
export type RewardDirectory = {
    users: RewardUser[]
    total: number
    page: number
    totalPages: number
    summary: RewardSummary
}
export type RewardTransaction = {
    id: string
    type: string
    amount: number
    status: string
    note: string | null
    created_at: string
    reference_type: string | null
    reference_id: string | null
    balance_before: number
    balance_after: number
    admin_actor_id: string | null
    actor_name: string | null
}
export type RewardUserDetail = {
    user: RewardUser
    summary: { recordedEarned: number; spent: number; pending: number; expired: number }
    transactions: RewardTransaction[]
    total: number
    page: number
    totalPages: number
}
export type CreditRequest = {
    requestId: string
    userId: string
    amount: number
    note: string
    expectedBalance: number
}
export type CreditReceipt = {
    id: string
    user_id: string
    amount: number
    balance_before: number
    balance_after: number
    created_at: string
}
export const rewardNumber = (value: number) => Number(value).toLocaleString('en-IN')
export const rewardDate = (value: string) =>
    new Date(value).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }) + ' IST'
export function rewardId(id: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}
const pageNumber = (page?: string) => Math.min(1000000, Math.max(1, Number.parseInt(page || '1', 10) || 1))
export function rewardFilters(params: RewardParams) {
    const tier = params.tier || 'all',
        spent = params.spent || 'all',
        sort = params.sort || 'balance'
    if (
        !['all', 'gold', 'silver', 'bronze'].includes(tier) ||
        !['all', 'spent', 'no-spent'].includes(spent) ||
        !['balance', 'earned', 'spent', 'pending', 'name', 'activity'].includes(sort)
    )
        throw new Error('Choose valid reward filters.')
    return {
        q: (params.q || '').trim().slice(0, 200),
        tier,
        spent,
        hideZero: params.hideZero === '1',
        sort,
        page: pageNumber(params.page),
    }
}
export function rewardTxFilters(params: RewardTxParams) {
    const type = params.type || 'all',
        status = params.status || 'all'
    if (
        !['all', 'earn', 'bonus', 'spend', 'expired'].includes(type) ||
        !['all', 'pending', 'available', 'cancelled'].includes(status)
    )
        throw new Error('Choose valid transaction filters.')
    const validDate = (value: string) =>
        /^\d{4}-\d{2}-\d{2}$/.test(value) &&
        value >= '1900-01-01' &&
        value <= '2200-12-31' &&
        Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
        new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
    if (
        (params.from && !validDate(params.from)) ||
        (params.to && !validDate(params.to)) ||
        (params.from && params.to && params.from > params.to)
    )
        throw new Error('Choose valid transaction dates.')
    return { type, status, from: params.from || '', to: params.to || '', page: pageNumber(params.page) }
}
export function validateCredit(request: CreditRequest) {
    if (!rewardId(request.requestId) || !rewardId(request.userId))
        throw new Error('Invalid credit request. Reload this customer.')
    if (!Number.isSafeInteger(request.amount) || request.amount < 1 || request.amount > MAX_ADMIN_CREDIT)
        throw new Error(`Credit between 1 and ${rewardNumber(MAX_ADMIN_CREDIT)} whole coins.`)
    if (
        typeof request.note !== 'string' ||
        request.note.trim().length < 3 ||
        request.note.trim().length > 500
    )
        throw new Error('Enter a reason between 3 and 500 characters.')
    if (
        !Number.isSafeInteger(request.expectedBalance) ||
        request.expectedBalance < 0 ||
        request.expectedBalance > 2147483647 - request.amount
    )
        throw new Error('Balance is outside the supported range. Reload before crediting.')
}
export function rewardHref(base: string, params: Record<string, string | undefined>, page: number) {
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) if (value && key !== 'page') query.set(key, value)
    query.set('page', String(page))
    return `${base}?${query}`
}
export function rewardCSV(rows: (string | number | null)[][]) {
    const escape = (value: string | number | null) => {
        const text = String(value ?? '')
        return `"${(/^[\s]*[=+\-@\t\r]/.test(text) ? "'" + text : text).replaceAll('"', '""')}"`
    }
    return '\uFEFF' + rows.map((row) => row.map(escape).join(',')).join('\r\n')
}
