import type { SupabaseClient } from '@supabase/supabase-js'
import type { DashboardActivity } from './admin-dashboard'

export function isLegacyDashboardActivityError(error: unknown) {
    if (!error || typeof error !== 'object') return false
    const value = error as { code?: unknown; message?: unknown }
    return (
        value.code === '42703' &&
        typeof value.message === 'string' &&
        value.message.includes('company_name') &&
        value.message.includes('does not exist')
    )
}

// Compatibility for databases that already applied the original reporting SQL.
// The corrected RPC remains the normal path once its follow-up migration is run.
export async function readDashboardActivity(supabase: SupabaseClient): Promise<DashboardActivity> {
    const [messageCount, wholesaleCount, messages, wholesale] = await Promise.all([
        supabase.from('contact_messages').select('id', { count: 'exact', head: true }).eq('status', 'unread'),
        supabase
            .from('wholesale_applications')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending'),
        supabase
            .from('contact_messages')
            .select('id,name,subject,created_at')
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })
            .limit(6),
        supabase
            .from('wholesale_applications')
            .select('id,business_name,created_at')
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })
            .limit(6),
    ])
    for (const response of [messageCount, wholesaleCount, messages, wholesale]) {
        if (response.error) throw response.error
    }
    if (messageCount.count === null || wholesaleCount.count === null || !messages.data || !wholesale.data) {
        throw new Error('Incomplete activity report')
    }
    const events: DashboardActivity['events'] = [
        ...messages.data.map((message) => ({
            id: String(message.id),
            name: message.name || 'Customer inquiry',
            label: message.subject || 'Customer inquiry',
            kind: 'message' as const,
            created_at: String(message.created_at),
        })),
        ...wholesale.data.map((application) => ({
            id: String(application.id),
            name: application.business_name || 'Wholesale application',
            label: 'Wholesale application',
            kind: 'wholesale' as const,
            created_at: String(application.created_at),
        })),
    ]
    events.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || b.id.localeCompare(a.id))
    return { unread: messageCount.count, wholesale: wholesaleCount.count, events: events.slice(0, 6) }
}
