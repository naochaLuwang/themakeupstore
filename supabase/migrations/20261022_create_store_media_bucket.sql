-- Store media bucket (Cloudinary -> Supabase Storage migration)
-- Run in Supabase SQL Editor. Idempotent.
--
-- Public bucket: storefront images (products, categories, concerns,
-- showcase, banners, editor description images, return proof photos)
-- are loaded by anonymous visitors via raw <img>, next/image, and
-- transactional email HTML, so public read is required.
--
-- Uploads go ONLY through the service-role client (lib/storage.ts),
-- so no storage.objects INSERT policy is required (service role
-- bypasses RLS). The SELECT policy below guarantees anonymous
-- public-URL reads of /storage/v1/object/public/store-media/...
--
-- Old images stay on Cloudinary until scripts/migrate-images.mjs has
-- copied them and rewritten the DB URLs; this bucket only receives
-- NEW uploads until then.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'store-media',
  'store-media',
  true,            -- public read via /storage/v1/object/public/store-media/...
  10485760,        -- 10MB per file
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'image/gif'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Public read for every object in this bucket (any role: anon,
-- authenticated, service). Write access stays service-role only.
DROP POLICY IF EXISTS "store-media public read" ON storage.objects;
CREATE POLICY "store-media public read"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'store-media' );
