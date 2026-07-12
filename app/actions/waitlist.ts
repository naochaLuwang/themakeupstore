"use server"

import { createClient } from "@/utils/supabase/server"
import { rateLimit } from "@/lib/rate-limit"

const waitlistLimiter = rateLimit("waitlist", { windowMs: 60_000, max: 3 })

export async function joinWaitlistAction(email: string) {
    const { success } = waitlistLimiter.check(`email:${email}`)
    if (!success) return { error: "Too many requests. Please try again later." }

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