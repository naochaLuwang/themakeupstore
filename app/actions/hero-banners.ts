"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin"

export async function createHeroBanner(formData: FormData) {
    const { supabase } = await requireAdmin()

    const title = formData.get("title")
    const subtitle = formData.get("subtitle")
    if (!title || typeof title !== 'string' || title.trim().length === 0) throw new Error("Title is required")

    const { error } = await supabase.from("hero_banners").insert({
        title: formData.get("title") as string,
        subtitle: formData.get("subtitle") as string,
        description: formData.get("description") as string,
        image_url: formData.get("image_url") as string || null,
        route: formData.get("route") as string || "/exclusive",
        position: parseInt(formData.get("position") as string) || 0,
        is_active: formData.get("is_active") === "on",
    })

    if (error) return { success: false, message: error.message }
    revalidatePath("/admin/hero-banners")
    return { success: true }
}

export async function updateHeroBanner(id: string, formData: FormData) {
    const { supabase } = await requireAdmin()

    const { error } = await supabase.from("hero_banners").update({
        title: formData.get("title") as string,
        subtitle: formData.get("subtitle") as string,
        description: formData.get("description") as string,
        image_url: formData.get("image_url") as string || null,
        route: formData.get("route") as string || "/exclusive",
        position: parseInt(formData.get("position") as string) || 0,
        is_active: formData.get("is_active") === "on",
        updated_at: new Date().toISOString(),
    }).eq("id", id)

    if (error) return { success: false, message: error.message }
    revalidatePath("/admin/hero-banners")
    return { success: true }
}

export async function deleteHeroBanner(id: string) {
    const { supabase } = await requireAdmin()

    const { error } = await supabase.from("hero_banners").delete().eq("id", id)
    if (error) return { success: false, message: error.message }
    revalidatePath("/admin/hero-banners")
    return { success: true }
}

export async function toggleHeroBanner(id: string, current: boolean) {
    const { supabase } = await requireAdmin()

    const { error } = await supabase.from("hero_banners").update({
        is_active: !current,
        updated_at: new Date().toISOString(),
    }).eq("id", id)

    if (error) return { success: false, message: error.message }
    revalidatePath("/admin/hero-banners")
    return { success: true }
}
