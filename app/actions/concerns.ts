"use server"

import { v2 as cloudinary } from 'cloudinary'
import { concernSchema } from "@/lib/validations/concern"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin"

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function createConcern(formData: FormData) {
    const { supabase } = await requireAdmin()

    const payloadRaw = formData.get("payload")
    if (!payloadRaw) return { error: "No data provided" }

    const payload = JSON.parse(payloadRaw as string)
    const file = formData.get("file") as File | null

    const validatedFields = concernSchema.safeParse(payload)
    if (!validatedFields.success) {
        return { error: "Validation failed" }
    }

    try {
        let imageUrl = validatedFields.data.image_url || ""

        if (file && file.size > 0) {
            const buffer = Buffer.from(await file.arrayBuffer())
            const upload: any = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream(
                    { folder: "concerns" },
                    (err, res) => err ? reject(err) : resolve(res)
                ).end(buffer)
            })
            imageUrl = upload.secure_url
        }

        const { data: concern, error } = await supabase
            .from("concerns")
            .insert([{
                name: validatedFields.data.name,
                slug: validatedFields.data.slug,
                image_url: imageUrl,
            }])
            .select()
            .single()

        if (error) throw error

        if (validatedFields.data.product_ids?.length > 0) {
            const { error: linkError } = await supabase
                .from("product_concerns")
                .insert(
                    validatedFields.data.product_ids.map((productId: string) => ({
                        product_id: productId,
                        concern_id: concern.id,
                    }))
                )
            if (linkError) throw linkError
        }

        revalidatePath("/admin/concerns")
        return { success: true }
    } catch (error: any) {
        console.error("Create Concern Error:", error)
        return { error: error.message }
    }
}

export async function updateConcern(concernId: string, formData: FormData) {
    const { supabase } = await requireAdmin()

    const payloadRaw = formData.get("payload")
    if (!payloadRaw) return { error: "No data provided" }

    const payload = JSON.parse(payloadRaw as string)
    const file = formData.get("file") as File | null

    const validatedFields = concernSchema.safeParse(payload)
    if (!validatedFields.success) {
        return { error: "Validation failed" }
    }

    try {
        let imageUrl = payload.image_url

        if (file && file.size > 0) {
            const buffer = Buffer.from(await file.arrayBuffer())
            const upload: any = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream(
                    { folder: "concerns" },
                    (err, res) => err ? reject(err) : resolve(res)
                ).end(buffer)
            })
            imageUrl = upload.secure_url
        }

        const { error } = await supabase
            .from("concerns")
            .update({
                name: validatedFields.data.name,
                slug: validatedFields.data.slug,
                image_url: imageUrl,
            })
            .eq("id", concernId)

        if (error) throw error

        await supabase.from("product_concerns").delete().eq("concern_id", concernId)

        if (validatedFields.data.product_ids?.length > 0) {
            const { error: linkError } = await supabase
                .from("product_concerns")
                .insert(
                    validatedFields.data.product_ids.map((productId: string) => ({
                        product_id: productId,
                        concern_id: concernId,
                    }))
                )
            if (linkError) throw linkError
        }

        revalidatePath("/admin/concerns")
        return { success: true }
    } catch (error: any) {
        console.error("Update Concern Error:", error)
        return { error: error.message }
    }
}

export async function deleteConcern(id: string) {
    const { supabase } = await requireAdmin()

    const { error } = await supabase.from("concerns").delete().eq("id", id)

    if (error) {
        return { error: error.message }
    }

    revalidatePath("/admin/concerns")
    return { success: true }
}
