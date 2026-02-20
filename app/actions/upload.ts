"use server"

import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function uploadEditorImage(formData: FormData) {
    const file = formData.get('file') as File
    if (!file) throw new Error("No file provided")

    const buffer = Buffer.from(await file.arrayBuffer())

    try {
        const upload: any = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream({
                folder: 'products/description-assets',
            }, (err, res) => err ? reject(err) : resolve(res)).end(buffer)
        })

        return { url: upload.secure_url }
    } catch (error) {
        console.error("Cloudinary Upload Error:", error)
        throw new Error("Upload failed")
    }
}