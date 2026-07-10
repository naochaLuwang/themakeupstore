"use server"

import { createClient } from "@/utils/supabase/server"
import { requireAdmin } from "@/lib/admin"

export async function getZones() {
    await requireAdmin()
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('shipping_zones')
        .select('*, shipping_methods(*)')
        .order('pincode', { ascending: true })
    if (error) throw new Error(error.message)
    return data
}

export async function createZone(payload: { name: string; pincode: string; description: string | null }) {
    await requireAdmin()
    const supabase = await createClient()
    const { error } = await supabase.from('shipping_zones').insert([payload])
    if (error) throw new Error(error.message)
}

export async function updateZone(id: string, payload: { name: string; pincode: string }) {
    await requireAdmin()
    const supabase = await createClient()
    const { error } = await supabase.from('shipping_zones').update(payload).eq('id', id)
    if (error) throw new Error(error.message)
}

export async function deleteZone(id: string) {
    await requireAdmin()
    const supabase = await createClient()
    // Get all method IDs for this zone first
    const { data: methods } = await supabase
        .from('shipping_methods')
        .select('id')
        .eq('zone_id', id)
    const methodIds = methods?.map(m => m.id) || []
    // Nullify orders referencing these methods to avoid FK conflict
    if (methodIds.length > 0) {
        const { error: nullErr } = await supabase
            .from('orders')
            .update({ shipping_method_id: null })
            .in('shipping_method_id', methodIds)
        if (nullErr) throw new Error("Failed to detach orders: " + nullErr.message)
    }
    const { error: mErr } = await supabase.from('shipping_methods').delete().eq('zone_id', id)
    if (mErr) throw new Error("Failed to clear rates: " + mErr.message)
    const { error } = await supabase.from('shipping_zones').delete().eq('id', id)
    if (error) throw new Error(error.message)
}

export async function createMethod(payload: { zone_id: string; name: string; price: number; delivery_time_label: string }) {
    await requireAdmin()
    const supabase = await createClient()
    const { error } = await supabase.from('shipping_methods').insert([payload])
    if (error) throw new Error(error.message)
}

export async function updateMethod(id: string, payload: { name: string; price: number; delivery_time_label: string }) {
    await requireAdmin()
    const supabase = await createClient()
    const { error } = await supabase.from('shipping_methods').update(payload).eq('id', id)
    if (error) throw new Error(error.message)
}

export async function deleteMethod(id: string) {
    await requireAdmin()
    const supabase = await createClient()
    const { error: nullErr } = await supabase
        .from('orders')
        .update({ shipping_method_id: null })
        .eq('shipping_method_id', id)
    if (nullErr) throw new Error("Failed to detach orders: " + nullErr.message)
    const { error } = await supabase.from('shipping_methods').delete().eq('id', id)
    if (error) throw new Error(error.message)
}
