'use server'
import { createClient } from "@/utils/supabase/server"
import { requireAdmin } from "@/lib/admin"

export async function addShippingMethod(zoneId: string, name: string, price: number) {
    await requireAdmin()
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('shipping_methods')
        .insert([{
            zone_id: zoneId,
            name,
            price,
            is_active: true
        }])

    return { data, error }
}