"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin"
import { uploadStoreImage } from "@/lib/storage"

async function uploadToShowcaseImage(file: File): Promise<string> {
    return uploadStoreImage('showcase', file)
}

export async function createShowcaseItem(formData: FormData) {
    const { supabase } = await requireAdmin()

    const file = formData.get("image") as File | null
    let image_url = formData.get("image_url") as string | null

    if (file && file.size > 0) {
        image_url = await uploadToShowcaseImage(file)
    }

    if (!image_url) return { success: false, message: "Image is required" }

    const { error } = await supabase.from("showcase_items").insert({
        title: formData.get("title") as string,
        subtitle: formData.get("subtitle") as string || null,
        image_url,
        link_url: formData.get("link_url") as string || null,
        position: parseInt(formData.get("position") as string) || 0,
        is_active: formData.get("is_active") === "on",
    })

    if (error) return { success: false, message: error.message }
    revalidatePath("/admin/showcase")
    revalidatePath("/")
    return { success: true }
}

export async function updateShowcaseItem(id: string, formData: FormData) {
    const { supabase } = await requireAdmin()

    const file = formData.get("image") as File | null
    let image_url = formData.get("image_url") as string | null

    if (file && file.size > 0) {
        image_url = await uploadToShowcaseImage(file)
    }

    const updateData: Record<string, any> = {
        title: formData.get("title") as string,
        subtitle: formData.get("subtitle") as string || null,
        link_url: formData.get("link_url") as string || null,
        position: parseInt(formData.get("position") as string) || 0,
        is_active: formData.get("is_active") === "on",
        updated_at: new Date().toISOString(),
    }

    if (image_url) updateData.image_url = image_url

    const { error } = await supabase.from("showcase_items").update(updateData).eq("id", id)

    if (error) return { success: false, message: error.message }
    revalidatePath("/admin/showcase")
    revalidatePath("/")
    return { success: true }
}

export async function deleteShowcaseItem(id: string) {
    const { supabase } = await requireAdmin()

    const { error } = await supabase.from("showcase_items").delete().eq("id", id)
    if (error) return { success: false, message: error.message }
    revalidatePath("/admin/showcase")
    revalidatePath("/")
    return { success: true }
}

export async function toggleShowcaseItem(id: string, current: boolean) {
    const { supabase } = await requireAdmin()

    const { error } = await supabase.from("showcase_items").update({
        is_active: !current,
        updated_at: new Date().toISOString(),
    }).eq("id", id)

    if (error) return { success: false, message: error.message }
    revalidatePath("/admin/showcase")
    revalidatePath("/")
    return { success: true }
}
