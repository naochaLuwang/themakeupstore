"use server"

import { createClient } from "@/utils/supabase/server"
import { requireAdmin } from "@/lib/admin"

export async function getDeliveryPartners() {
    await requireAdmin()
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('delivery_partners')
        .select('*')
        .order('name', { ascending: true })
    if (error) throw new Error(error.message)
    return data
}

export async function createDeliveryPartner(payload: { name: string }) {
    await requireAdmin()
    const supabase = await createClient()
    const { error } = await supabase.from('delivery_partners').insert([payload])
    if (error) throw new Error(error.message)
}

export async function updateDeliveryPartner(id: string, payload: { name: string; is_active: boolean }) {
    await requireAdmin()
    const supabase = await createClient()
    const { error } = await supabase.from('delivery_partners').update(payload).eq('id', id)
    if (error) throw new Error(error.message)
}

export async function deleteDeliveryPartner(id: string) {
    await requireAdmin()
    const supabase = await createClient()
    await supabase.from('orders').update({ delivery_partner_id: null }).eq('delivery_partner_id', id)
    const { error } = await supabase.from('delivery_partners').delete().eq('id', id)
    if (error) throw new Error(error.message)
}
