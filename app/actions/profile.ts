"use server"

import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"
import { revalidatePath } from "next/cache"

export async function deleteAccount() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Authentication required")

    const admin = await createAdminClient()
    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) throw new Error("Failed to delete account")

    revalidatePath("/profile")
    revalidatePath("/")
    return { success: true }
}
