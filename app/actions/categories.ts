"use server"

import { categorySchema } from "@/lib/validations/category"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin"
import { uploadStoreImage } from "@/lib/storage"

export async function createCategory(formData: FormData) {
    const { supabase } = await requireAdmin()

    // 2. Extract and Validate
    const payloadRaw = formData.get("payload")
    if (!payloadRaw) return { error: "No data provided" }

    const payload = JSON.parse(payloadRaw as string)
    const file = formData.get("file") as File | null

    const validatedFields = categorySchema.safeParse(payload)
    if (!validatedFields.success) {
        return { error: "Validation failed" }
    }

    try {
        let imageUrl = validatedFields.data.image_url || ""

        // 3. Supabase Storage upload
        if (file && file.size > 0) {
            imageUrl = await uploadStoreImage("categories", file)
        }

        // 4. Insert into Supabase
        const { error } = await supabase
            .from("categories")
            .insert([{
                name: validatedFields.data.name,
                slug: validatedFields.data.slug,
                parent_id: validatedFields.data.parent_id || null,
                image_url: imageUrl
            }])

        if (error) throw error

        revalidatePath("/admin/categories")
        revalidatePath("/exclusive")
        return { success: true }

    } catch (error: any) {
        console.error("Category Action Error:", error)
        return { error: error.message }
    }
}

export async function updateCategory(categoryId: string, formData: FormData) {
    const { supabase } = await requireAdmin()

    try {
        const payloadRaw = formData.get("payload")
        if (!payloadRaw) return { error: "No data provided" }

        const payload = JSON.parse(payloadRaw as string)
        const file = formData.get("file") as File | null

        const validatedFields = categorySchema.safeParse(payload)
        if (!validatedFields.success) return { error: "Validation failed" }

        let imageUrl = payload.image_url

        if (file && file.size > 0) {
            imageUrl = await uploadStoreImage("categories", file)
        }

        const { error } = await supabase
            .from("categories")
            .update({
                name: validatedFields.data.name,
                slug: validatedFields.data.slug,
                parent_id: validatedFields.data.parent_id || null,
                image_url: imageUrl
            })
            .eq("id", categoryId)

        if (error) throw error

        revalidatePath("/admin/categories")
        revalidatePath(`/exclusive/${validatedFields.data.slug}`)
        return { success: true }
    } catch (error: any) {
        return { error: error.message }
    }
}

export async function deleteCategory(id: string) {
    try {
        const { supabase } = await requireAdmin()

        const { error } = await supabase
            .from("categories")
            .delete()
            .eq("id", id)

        if (error) {
            return { error: error.message }
        }

        revalidatePath("/admin/categories")
        revalidatePath("/exclusive")
        return { success: true }
    } catch (error: any) {
        return { error: error.message }
    }
}