"use server"

import { v2 as cloudinary } from 'cloudinary'
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin"

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

/**
 * CREATE PRODUCT
 */
export async function createProduct(formData: FormData) {
    const { supabase } = await requireAdmin()
    const payload = JSON.parse(formData.get("payload") as string)
    if (!payload || typeof payload !== 'object') throw new Error("Invalid product payload")
    if (!payload.name || typeof payload.name !== 'string') throw new Error("Product name is required")
    const files = formData.getAll("files") as File[]

    try {
        // 1. Insert Main Product
        const { data: product, error: pError } = await supabase
            .from("products")
            .insert([{
                name: payload.name,
                slug: payload.slug,
                brand: payload.brand,
                description: payload.description,
                has_variants: payload.has_variants,
                base_price: payload.has_variants ? null : Number(payload.base_price),
                discount_type: payload.has_variants ? 'none' : payload.discount_type,
                discount_value: payload.has_variants ? 0 : Number(payload.discount_value),
            }])
            .select().single()

        if (pError) throw pError

        // 2. Insert Category Links
        if (payload.category_ids?.length > 0) {
            await supabase.from("product_categories").insert(
                payload.category_ids.map((catId: string) => ({ product_id: product.id, category_id: catId }))
            )
        }

        // 2b. Insert Concern Links
        if (payload.concern_ids?.length > 0) {
            await supabase.from("product_concerns").insert(
                payload.concern_ids.map((concernId: string) => ({ product_id: product.id, concern_id: concernId }))
            )
        }

        // 3. Image Uploads & Store URLs
        const uploadedUrls: string[] = []
        for (let i = 0; i < files.length; i++) {
            const buffer = Buffer.from(await files[i].arrayBuffer())
            const upload: any = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream({
                    folder: `products/${product.id}`
                }, (err, res) => err ? reject(err) : resolve(res)).end(buffer)
            })
            uploadedUrls.push(upload.secure_url)

            // Insert into product_images
            await supabase.from("product_images").insert({
                product_id: product.id,
                url: upload.secure_url,
                position: i
            })
        }

        if (uploadedUrls.length > 0) {
            await supabase.from("products").update({ thumbnail_url: uploadedUrls[0] }).eq("id", product.id)
        }

        // 4. Create Variants & Link Images
        if (payload.has_variants) {
            for (const v of payload.variants) {
                const { data: variant, error: vError } = await supabase.from("product_variants").insert([{
                    product_id: product.id,
                    title: v.title,
                    price: Number(v.price),
                    stock: Number(v.stock),
                    sku: v.sku || `${payload.slug}-${Math.random().toString(36).substring(2, 7)}`,
                    hex_code: v.hex_code,
                    discount_type: v.discount_type,
                    discount_value: Number(v.discount_value),
                    image_url: v.image_indices?.length > 0 ? uploadedUrls[v.image_indices[0]] : null, // Set Primary Variant Image
                    is_default: false
                }]).select().single()

                if (vError) throw vError

                // 5. LINK VARIANT IMAGES (NEW LOGIC)
                if (v.image_indices?.length > 0) {
                    const variantImageLinks = v.image_indices.map((idx: number) => ({
                        product_variant_id: variant.id, // FIX: Match your schema column name
                        url: uploadedUrls[idx]
                    }))
                    await supabase.from("variant_images").insert(variantImageLinks)
                }
            }
        } else {
            // Simple product default variant
            await supabase.from("product_variants").insert({
                product_id: product.id,
                sku: `${payload.slug}-std`,
                title: "Standard",
                price: Number(payload.base_price),
                stock: Number(payload.stock ?? 0),
                is_default: true,
                discount_type: payload.discount_type,
                discount_value: Number(payload.discount_value)
            })
        }

        revalidatePath("/admin/products")
        return { success: true }
    } catch (error: any) {
        console.error("Create Product Error:", error)
        return { success: false, error: error.message }
    }
}

/**
 * UPDATE PRODUCT
 */
export async function updateProduct(productId: string, formData: FormData) {
    const { supabase } = await requireAdmin()
    const payload = JSON.parse(formData.get("payload") as string)
    const files = formData.getAll("files") as File[]

    try {
        // 1. Sync Categories
        await supabase.from("product_categories").delete().eq("product_id", productId)
        if (payload.category_ids?.length > 0) {
            await supabase.from("product_categories").insert(
                payload.category_ids.map((id: string) => ({ product_id: productId, category_id: id }))
            )
        }

        // 1b. Sync Concerns
        await supabase.from("product_concerns").delete().eq("product_id", productId)
        if (payload.concern_ids?.length > 0) {
            await supabase.from("product_concerns").insert(
                payload.concern_ids.map((id: string) => ({ product_id: productId, concern_id: id }))
            )
        }

        // 2. Image Management (Cloudinary sync)
        const { data: oldImages } = await supabase.from("product_images").select("url").eq("product_id", productId)
        const oldUrls = oldImages?.map(img => img.url) || []
        const keptUrls = payload.existing_images || []
        const urlsToRemove = oldUrls.filter(url => !keptUrls.includes(url))

        for (const url of urlsToRemove) {
            const fileName = url.split('/').pop()?.split('.')[0]
            if (fileName) await cloudinary.uploader.destroy(`products/${productId}/${fileName}`).catch(() => null)
        }

        // 3. Upload New Files
        const newUrls: string[] = []
        for (const file of files) {
            const buffer = Buffer.from(await file.arrayBuffer())
            const res: any = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream({ folder: `products/${productId}` }, (err, r) => err ? reject(err) : resolve(r)).end(buffer)
            })
            newUrls.push(res.secure_url)
        }

        // Map indices to final array: [Existing Images, New Images]
        const finalGallery = [...keptUrls, ...newUrls]

        // 4. Update Main Product & Gallery
        await supabase.from("products").update({
            name: payload.name, slug: payload.slug, description: payload.description,
            brand: payload.brand, has_variants: payload.has_variants,
            base_price: payload.has_variants ? null : Number(payload.base_price),
            discount_type: payload.has_variants ? 'none' : payload.discount_type,
            discount_value: payload.has_variants ? 0 : Number(payload.discount_value),
            thumbnail_url: finalGallery[0] || null,
            updated_at: new Date().toISOString()
        }).eq("id", productId)

        await supabase.from("product_images").delete().eq("product_id", productId)
        if (finalGallery.length > 0) {
            await supabase.from("product_images").insert(finalGallery.map((url, i) => ({
                product_id: productId, url, position: i
            })))
        }

        // 5. Sync Variants
        if (payload.has_variants) {
            const { data: existingVariants } = await supabase
                .from("product_variants")
                .select("id")
                .eq("product_id", productId)
                .eq("is_default", false)

            const existingIds = existingVariants?.map(v => v.id) || []
            const incomingIds = payload.variants
                .map((v: any) => v.id)
                .filter((id: string) => id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
            const idsToRemove = existingIds.filter(id => !incomingIds.includes(id))

            if (idsToRemove.length > 0) {
                await supabase.from("variant_images").delete().in("product_variant_id", idsToRemove)
                await supabase.from("product_variant_values").delete().in("product_variant_id", idsToRemove)
                await supabase.from("cart_items").delete().in("product_variant_id", idsToRemove)
                await supabase.from("back_in_stock_notifications").delete().in("product_variant_id", idsToRemove)
                await supabase.from("product_variants").delete().in("id", idsToRemove)
            }

            for (const v of payload.variants) {
                // Determine primary image for this variant based on indices
                const variantPrimaryImage = v.image_indices?.length > 0 ? finalGallery[v.image_indices[0]] : null;

                const { data: upsertedVariant, error: vError } = await supabase.from("product_variants").upsert({
                    id: v.id || undefined,
                    product_id: productId,
                    title: v.title,
                    price: Number(v.price),
                    stock: Number(v.stock ?? 0),
                    hex_code: v.hex_code,
                    discount_type: v.discount_type,
                    discount_value: Number(v.discount_value),
                    image_url: variantPrimaryImage, // Main image for selection
                    is_default: false,
                    sku: v.sku || `${payload.slug}-${Math.random().toString(36).substring(2, 5)}`
                }).select().single()

                if (vError) throw vError

                // 6. SYNC VARIANT IMAGES (Join Table)
                await supabase.from("variant_images").delete().eq("product_variant_id", upsertedVariant.id)
                if (v.image_indices?.length > 0) {
                    const variantImageLinks = v.image_indices.map((idx: number) => ({
                        product_variant_id: upsertedVariant.id, // FIX: Match your schema column name
                        url: finalGallery[idx]
                    }))
                    await supabase.from("variant_images").insert(variantImageLinks)
                }
            }
        } else {
            await supabase.from("product_variants").update({
                stock: Number(payload.stock ?? 0),
                price: Number(payload.base_price),
                discount_type: payload.discount_type,
                discount_value: Number(payload.discount_value),
            }).eq("product_id", productId).eq("is_default", true)
        }

        revalidatePath("/admin/products")
        revalidatePath(`/products/${payload.slug}`)
        return { success: true }
    } catch (error: any) {
        console.error("Update Action Error:", error)
        return { success: false, error: error.message }
    }
}


// 4. Server Action for Deletion
