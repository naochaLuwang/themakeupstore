"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin"

export async function getGiftProducts() {
  const { supabase } = await requireAdmin()
  const { data, error } = await supabase
    .from('gift_products')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw new Error(error.message)
  return data
}

export async function getGiftProduct(id: string) {
  const { supabase } = await requireAdmin()
  const { data, error } = await supabase
    .from('gift_products')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function createGiftProduct(formData: FormData) {
  const { supabase } = await requireAdmin()
  const payload = JSON.parse(formData.get("payload") as string)

  let image_url = payload.image_url || null
  // Handle file upload if provided
  const files = formData.getAll("files") as File[]
  if (files.length > 0) {
    const { v2: cloudinary } = await import('cloudinary')
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    })
    const buffer = Buffer.from(await files[0].arrayBuffer())
    const upload: any = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream({ folder: 'gift-products' }, (err, res) => err ? reject(err) : resolve(res)).end(buffer)
    })
    image_url = upload.secure_url
  }

  try {
    const { error } = await supabase.from('gift_products').insert({
      name: payload.name,
      description: payload.description || null,
      image_url,
      price: Number(payload.price) || 0,
      stock: Number(payload.stock) || 0,
    })
    if (error) throw error
    revalidatePath('/admin/gift-products')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateGiftProduct(id: string, formData: FormData) {
  const { supabase } = await requireAdmin()
  const payload = JSON.parse(formData.get("payload") as string)

  let image_url = payload.image_url || null
  const files = formData.getAll("files") as File[]
  if (files.length > 0) {
    const { v2: cloudinary } = await import('cloudinary')
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    })
    const buffer = Buffer.from(await files[0].arrayBuffer())
    const upload: any = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream({ folder: 'gift-products' }, (err, res) => err ? reject(err) : resolve(res)).end(buffer)
    })
    image_url = upload.secure_url
  }

  try {
    const update: any = {
      name: payload.name,
      description: payload.description || null,
      price: Number(payload.price) || 0,
      stock: Number(payload.stock) || 0,
      is_active: payload.is_active,
      updated_at: new Date().toISOString(),
    }
    if (image_url) update.image_url = image_url

    const { error } = await supabase.from('gift_products').update(update).eq('id', id)
    if (error) throw error
    revalidatePath('/admin/gift-products')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteGiftProduct(id: string) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('gift_products').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/gift-products')
}
