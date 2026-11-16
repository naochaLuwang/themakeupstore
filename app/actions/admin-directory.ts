"use server"

import { requireAdmin } from '@/lib/admin'
import {
    customerDateRange, directoryPage,
    type DirectoryParams, type CustomerDirectory, type CustomerOrder, type RecoveryDirectory,
} from '@/lib/admin-directory'

export async function getCustomerDirectory(params: DirectoryParams) {
    const { supabase } = await requireAdmin()
    const dates = customerDateRange(params)
    const { data, error } = await supabase.rpc('admin_customer_directory', {
        p_search: (params.q || '').trim().slice(0, 200), p_from: dates.from, p_before: dates.before,
        p_page: directoryPage(params.page), p_page_size: 25,
    })
    if (error) {
        console.error('[Customer directory] Read failed', { code: error.code })
        throw new Error('Unable to load customers. Please try again.')
    }
    return data as CustomerDirectory
}

export async function getCustomerHistory(id: string, requestedPage?: string) {
    const { supabase } = await requireAdmin()
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null
    const [directory, ordersCount] = await Promise.all([
        supabase.rpc('admin_customer_directory', { p_customer_id: id, p_page_size: 1 }),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('user_id', id),
    ])
    if (directory.error || ordersCount.error) throw new Error('Unable to load customer history. Please try again.')
    const customer = (directory.data as CustomerDirectory).customers[0]
    if (!customer) return null
    const total = ordersCount.count || 0
    const totalPages = Math.max(1, Math.ceil(total / 25))
    const page = Math.min(directoryPage(requestedPage), totalPages)
    const { data, error } = await supabase.from('orders')
        .select('id,total,status,payment_status,created_at').eq('user_id', id)
        .order('created_at', { ascending: false }).order('id', { ascending: false })
        .range((page - 1) * 25, page * 25 - 1)
    if (error) throw new Error('Unable to load customer orders. Please try again.')
    return { customer, orders: (data || []) as CustomerOrder[], total, page, totalPages }
}

export async function getCartRecoveryDirectory(params: { page?: string; status?: string } = {}) {
    const { supabase } = await requireAdmin()
    const status = ['pending', 'sent'].includes(params.status || '') ? params.status! : 'all'
    const { data, error } = await supabase.rpc('admin_cart_recovery_directory', {
        p_page: directoryPage(params.page), p_page_size: 25, p_status: status,
    })
    if (error) {
        console.error('[Cart recovery] Read failed', { code: error.code })
        throw new Error('Unable to load abandoned carts. Please try again.')
    }
    return data as RecoveryDirectory
}
