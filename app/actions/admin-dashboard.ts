'use server'

import { requireAdmin } from '@/lib/admin'
import { isLegacyDashboardActivityError, readDashboardActivity } from '@/lib/admin-dashboard-activity'
import {
    dashboardRange,
    dashboardFilters,
    type DashboardParams,
    type DashboardResult,
    type DashboardSection,
} from '@/lib/admin-dashboard'

export async function getAdminDashboard(params: DashboardParams = {}) {
    const { supabase } = await requireAdmin()
    const asOf = new Date().toISOString()
    const range = dashboardRange(params, new Date(asOf))
    const filters = dashboardFilters(params)
    const sections: DashboardSection[] = ['orders', 'operations', 'inventory', 'audience', 'activity']
    const entries = await Promise.all(
        sections.map(async (section) => {
            try {
                const { data, error } = await supabase.rpc('admin_dashboard_section', {
                    p_section: section,
                    p_from: range.start,
                    p_before: range.before,
                    p_as_of: asOf,
                    p_status: filters.status,
                    p_queue: filters.queue,
                    p_page: filters.page,
                })
                if (section === 'activity' && isLegacyDashboardActivityError(error)) {
                    return [section, { data: await readDashboardActivity(supabase), error: null }] as const
                }
                if (error || !data) throw error || new Error('Empty report')
                return [section, { data, error: null }] as const
            } catch (error) {
                const candidate = error && typeof error === 'object' && 'code' in error ? error.code : null
                const code =
                    typeof candidate === 'string' && /^[A-Z0-9]{5,12}$/.test(candidate)
                        ? candidate
                        : 'REQUEST_FAILED'
                console.warn(`[Admin dashboard] ${section} unavailable (${code})`)
                return [
                    section,
                    { data: null, error: 'Unable to load this section. Refresh to try again.' },
                ] as const
            }
        })
    )
    return { sections: Object.fromEntries(entries) as DashboardResult, range, filters, asOf }
}
