"use server"

import { requireAdmin } from "@/lib/admin"

export async function getDeliveryPartners() {
    const { supabase } = await requireAdmin()
    const { data, error } = await supabase
        .from('delivery_partners')
        .select('*')
        .order('name', { ascending: true })
    if (error) throw new Error(error.message)
    return data
}

export async function createDeliveryPartner(payload: { name: string }) {
    const { supabase } = await requireAdmin()
    const { error } = await supabase.from('delivery_partners').insert([payload])
    if (error) throw new Error(error.message)
}

export async function updateDeliveryPartner(id: string, payload: { name: string; is_active: boolean }) {
    const { supabase } = await requireAdmin()
    const { error } = await supabase.from('delivery_partners').update(payload).eq('id', id)
    if (error) throw new Error(error.message)
}

export async function deleteDeliveryPartner(id: string) {
    const { supabase } = await requireAdmin()
    await supabase.from('orders').update({ delivery_partner_id: null }).eq('delivery_partner_id', id)
    const { error } = await supabase.from('delivery_partners').delete().eq('id', id)
    if (error) throw new Error(error.message)
}
