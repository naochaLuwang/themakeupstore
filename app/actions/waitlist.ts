"use server"

import { createClient } from "@/utils/supabase/server"

export async function joinWaitlistAction(email: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('waitlist')
        .insert([{ email }])

    if (error) {
        if (error.code === '23505') { // Unique violation
            return { error: "You're already on the list! ✨" }
        }
        return { error: "Something went wrong. Please try again." }
    }

    return { success: true }
}