import { createAdminClient } from "@/utils/supabase/admin"

// Shared Supabase Storage helper for all storefront/admin imagery.
// Replaces the per-file Cloudinary upload_stream calls (2026-10-22).
//
// Bucket `store-media` is PUBLIC (see
// supabase/migrations/20261022_create_store_media_bucket.sql): anonymous
// storefront <img>, next/image, and transactional email HTML all fetch
// public URLs directly. Uploads/deletes always go through the
// service-role client, so no storage.objects write policies exist.

export const STORE_MEDIA_BUCKET = "store-media"

// Kept under the 10mb server-action body limit (next.config.ts) to leave
// room for the JSON payload riding in the same FormData.
export const MAX_IMAGE_SIZE = 8 * 1024 * 1024

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]

export function validateImageFile(file: File): void {
  if (!file || file.size === 0) throw new Error("No file provided")
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Invalid file type. Allowed: JPEG, PNG, WebP, AVIF, GIF")
  }
  if (file.size > MAX_IMAGE_SIZE) throw new Error("File too large. Max 8MB")
}

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(0, 80)
}

export function publicUrlForPath(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${STORE_MEDIA_BUCKET}/${path}`
}

// Uploads one image under `folder` and returns its public URL.
// Path layout mirrors the old Cloudinary folders (products/<id>/...,
// categories/..., etc.) so migrated and new assets stay consistent.
export async function uploadStoreImage(folder: string, file: File): Promise<string> {
  validateImageFile(file)
  const admin = await createAdminClient()
  const path = `${folder}/${Date.now()}-${safeFileName(file.name)}`
  const buffer = Buffer.from(await file.arrayBuffer())
  const { error } = await admin.storage.from(STORE_MEDIA_BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  })
  if (error) throw new Error(`Upload failed: ${error.message}`)
  return publicUrlForPath(path)
}

// Extracts the object path from a store-media public URL, or null when
// the URL points somewhere else (e.g. a legacy Cloudinary URL).
export function storagePathFromPublicUrl(url: string): string | null {
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${STORE_MEDIA_BUCKET}/`
  if (!url.startsWith(base)) return null
  const path = url.slice(base.length)
  return path.length > 0 ? path : null
}

// Deletes the asset behind a store-media public URL. No-op for foreign
// URLs (e.g. legacy Cloudinary) so callers can pass any DB URL safely.
export async function deleteStoreImage(url: string): Promise<void> {
  const path = storagePathFromPublicUrl(url)
  if (!path) return
  const admin = await createAdminClient()
  const { error } = await admin.storage.from(STORE_MEDIA_BUCKET).remove([path])
  if (error) throw new Error(`Delete failed: ${error.message}`)
}
