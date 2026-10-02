"use server"

import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"
import { revalidatePath } from "next/cache"

type DeleteAccountVerify = {
    password?: string
    confirmEmail?: string
}

export async function deleteAccount(verify: DeleteAccountVerify = {}): Promise<{ success: boolean; message?: string }> {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, message: "Authentication required" }

        // ── Re-authentication ──
        const providers = user.identities?.map((i) => i.provider) ?? []
        const hasPassword = providers.includes("email") || user.app_metadata?.provider === "email"

        if (hasPassword) {
            if (!verify.password) return { success: false, message: "Enter your current password to confirm" }
            const { error } = await supabase.auth.signInWithPassword({
                email: user.email!,
                password: verify.password,
            })
            if (error) return { success: false, message: "Current password is incorrect" }
        } else {
            const expected = user.email?.trim().toLowerCase()
            if (!expected) return { success: false, message: "No email on this account — please contact support to delete it" }
            if (verify.confirmEmail?.trim().toLowerCase() !== expected) {
                return { success: false, message: "Email does not match your account email" }
            }
        }

        const admin = await createAdminClient()

        // ── Guard: admin accounts must not self-delete ──
        const { data: profile } = await admin
            .from("profiles")
            .select("is_admin")
            .eq("id", user.id)
            .maybeSingle()
        if (profile?.is_admin) return { success: false, message: "Admin accounts cannot be deleted here" }

        // ── Atomic erasure of personal data (migration 20261001_account_deletion.sql) ──
        // Kept: orders, returns, refunds, gift cards (financial records, FK to tombstone profile)
        // Erased: addresses, wishlist, push tokens, loyalty ledger, coupons, reviews, etc.
        const { error: cleanupErr } = await admin.rpc("delete_account_data", { p_user_id: user.id })
        if (cleanupErr) {
            console.error("ACCOUNT_DELETE_CLEANUP_ERROR:", cleanupErr)
            return { success: false, message: "Could not erase account data — account was not deleted. If this keeps happening, contact support." }
        }

        // ── Remove the login itself (reward_coupons also cascade here as a safety net) ──
        const { error } = await admin.auth.admin.deleteUser(user.id)
        if (error) {
            console.error("ACCOUNT_DELETE_AUTH_ERROR:", error)
            return { success: false, message: "Could not delete login — account data was erased but the account still exists. Please contact support." }
        }

        revalidatePath("/profile")
        revalidatePath("/")
        return { success: true }
    } catch (err) {
        console.error("DELETE_ACCOUNT_ERROR:", err)
        return { success: false, message: err instanceof Error ? err.message : "Failed to delete account" }
    }
}
