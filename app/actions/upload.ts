"use server"

import { requireAdmin } from "@/lib/admin"
import { uploadStoreImage } from "@/lib/storage"

export async function uploadEditorImage(formData: FormData) {
    await requireAdmin()
    const file = formData.get('file') as File
    if (!file) throw new Error("No file provided")

    try {
        const url = await uploadStoreImage('products/description-assets', file)
        return { url }
    } catch (error) {
        console.error("Editor image upload failed:", error)
        throw new Error(error instanceof Error ? error.message : "Upload failed")
    }
}
