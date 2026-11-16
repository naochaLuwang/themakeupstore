'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin'
import {
    purchaseCSV,
    purchaseFilters,
    validatePurchaseDraft,
    validPurchaseDate,
    type PurchaseDirectory,
    type PurchaseDraft,
    type PurchaseDetail,
    type PurchaseParams,
    type PurchaseProduct,
    type Supplier,
} from '@/lib/purchases'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function assertId(id: string) {
    if (!uuid.test(id)) throw new Error('Invalid purchase reference.')
}
function failure(error: { code?: string; message?: string } | null) {
    if (error?.code === 'P0001')
        return { ok: false as const, error: error.message || 'Review this purchase.', uncertain: false }
    if (error?.code === '23505')
        return {
            ok: false as const,
            error: 'This reference is already in use. Choose another reference.',
            uncertain: false,
        }
    if (error?.code === 'P0002')
        return { ok: false as const, error: 'Purchase not found. Reload the page.', uncertain: false }
    return {
        ok: false as const,
        error: 'Unable to confirm the save. Retry the same request or reload to check its saved state.',
        uncertain: true,
    }
}

export async function searchPurchaseProducts(search: string): Promise<PurchaseProduct[]> {
    const { supabase } = await requireAdmin()
    const q = search.trim().slice(0, 200)
    if (q.length < 2) return []
    const { data, error } = await supabase.rpc('admin_purchase_catalog', { p_search: q })
    if (error) throw new Error('Unable to search products. Try again.')
    return data as PurchaseProduct[]
}

export async function searchPurchaseSuppliers(search = ''): Promise<Supplier[]> {
    const { supabase } = await requireAdmin()
    const q = search
        .trim()
        .slice(0, 200)
        .replace(/[\\%_]/g, '\\$&')
    const { data, error } = await supabase
        .from('suppliers')
        .select('id,name,email,phone,address,contact_person')
        .ilike('name', `%${q}%`)
        .order('name')
        .order('id')
        .limit(25)
    if (error) throw new Error('Unable to load suppliers. Try again.')
    return data || []
}

export async function createPurchaseSupplier(input: Supplier) {
    const { supabase } = await requireAdmin()
    assertId(input.id)
    const value = {
        id: input.id,
        name: input.name.trim(),
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        address: input.address?.trim() || null,
        contact_person: input.contact_person?.trim() || null,
    }
    if (
        !value.name ||
        value.name.length > 150 ||
        (value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) ||
        (value.email?.length || 0) > 254 ||
        (value.phone?.length || 0) > 40 ||
        (value.address?.length || 0) > 1000 ||
        (value.contact_person?.length || 0) > 150
    )
        throw new Error('Check the supplier name and contact details.')
    const { error } = await supabase
        .from('suppliers')
        .upsert(value, { onConflict: 'id', ignoreDuplicates: true })
    if (error) throw new Error('Unable to save supplier. Retry to check the same request.')
    const result = await supabase
        .from('suppliers')
        .select('id,name,email,phone,address,contact_person')
        .eq('id', value.id)
        .single()
    if (
        result.error ||
        !result.data ||
        (Object.keys(value) as (keyof typeof value)[]).some((key) => result.data[key] !== value[key])
    )
        throw new Error('Unable to confirm supplier details. Retry the same request.')
    return result.data as Supplier
}

export async function getPurchaseDirectory(
    params: PurchaseParams = {},
    exportRows = false
): Promise<PurchaseDirectory> {
    const { supabase } = await requireAdmin()
    const filters = purchaseFilters(params)
    const { data, error } = await supabase.rpc('admin_purchase_list', {
        p_search: filters.q,
        p_status: filters.status,
        p_from: filters.from || null,
        p_to: filters.to || null,
        p_page: exportRows ? 1 : filters.page,
        p_size: exportRows ? 5001 : 25,
    })
    if (error) throw new Error('Unable to load purchases. Refresh to try again.')
    return data as PurchaseDirectory
}

export async function exportPurchases(params: PurchaseParams) {
    const report = await getPurchaseDirectory(params, true)
    if (report.total > 5000)
        throw new Error('Narrow the filters to 5,000 purchases or fewer before exporting.')
    return purchaseCSV(report.orders)
}

export async function getPurchaseDetail(id: string): Promise<PurchaseDetail | null> {
    const { supabase } = await requireAdmin()
    assertId(id)
    const { data, error } = await supabase.rpc('admin_purchase_detail', { p_id: id })
    if (error) throw new Error('Unable to load this purchase. Refresh to try again.')
    return data as PurchaseDetail | null
}

export async function savePurchase(id: string, version: number, payload: PurchaseDraft) {
    const { supabase, user } = await requireAdmin()
    assertId(id)
    if (!Number.isSafeInteger(version) || version < 0) throw new Error('Reload the purchase before saving.')
    validatePurchaseDraft(payload)
    const { data, error } = await supabase.rpc('admin_purchase_save', {
        p_id: id,
        p_version: version,
        p_payload: payload,
        p_actor: user.id,
    })
    if (error) return failure(error)
    revalidatePath('/admin/purchase/list')
    revalidatePath(`/admin/purchase/${id}`)
    return { ok: true as const, purchase: data as PurchaseDetail }
}

export async function transitionPurchase(id: string, version: number, status: 'ordered' | 'cancelled') {
    const { supabase, user } = await requireAdmin()
    assertId(id)
    if (!Number.isSafeInteger(version) || version < 1 || !['ordered', 'cancelled'].includes(status))
        throw new Error('Invalid purchase status change.')
    const { data, error } = await supabase.rpc('admin_purchase_transition', {
        p_id: id,
        p_version: version,
        p_status: status,
        p_actor: user.id,
    })
    if (error) return failure(error)
    revalidatePath('/admin/purchase/list')
    return { ok: true as const, purchase: data as PurchaseDetail }
}

export async function receivePurchase(
    id: string,
    version: number,
    receipt: string,
    payload: {
        received_on: string
        notes: string
        lines: { item_id: string; accepted: number; damaged: number }[]
    }
) {
    const { supabase, user } = await requireAdmin()
    assertId(id)
    assertId(receipt)
    if (
        !Number.isSafeInteger(version) ||
        version < 1 ||
        !validPurchaseDate(payload.received_on) ||
        payload.notes.length > 2000 ||
        !Array.isArray(payload.lines) ||
        !payload.lines.length ||
        payload.lines.length > 500 ||
        payload.lines.some(
            (line) =>
                !uuid.test(line.item_id) ||
                !Number.isSafeInteger(line.accepted) ||
                !Number.isSafeInteger(line.damaged) ||
                line.accepted < 0 ||
                line.damaged < 0 ||
                line.accepted + line.damaged > 1000000
        )
    )
        throw new Error('Check the delivery date, notes and whole-unit quantities.')
    const { data, error } = await supabase.rpc('admin_purchase_receive', {
        p_id: id,
        p_version: version,
        p_receipt: receipt,
        p_payload: payload,
        p_actor: user.id,
    })
    if (error) return failure(error)
    revalidatePath('/admin/purchase/list')
    revalidatePath('/admin/inventory')
    revalidatePath('/admin')
    return { ok: true as const, purchase: data as PurchaseDetail }
}
