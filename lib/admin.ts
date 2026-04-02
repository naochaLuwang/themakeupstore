import { createClient } from "@/utils/supabase/server"

export async function requireAdmin() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) throw new Error("Authentication required")

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

    if (error || !profile?.is_admin) {
        throw new Error("Unauthorized: Administrative access required")
    }

    return { user, supabase }
}
