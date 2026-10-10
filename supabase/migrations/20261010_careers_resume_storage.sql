-- Careers: resume storage bucket (Supabase Storage instead of Cloudinary)
-- Run in Supabase SQL Editor. Idempotent — the bucket was already created
-- via the Storage API on 2026-10-10; this keeps other environments in sync.
--
-- Why: the Cloudinary account blocks PDF delivery (Settings > Security >
-- "PDF and ZIP files delivery" restricted), so resume PDFs 401'd on view.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'career-resumes',
  'career-resumes',
  false,
  5242880, -- 5MB, matches MAX_RESUME_SIZE validation
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Private bucket: no public SELECT policy.
-- All access goes through the service-role client (upload in
-- app/actions/careers.ts, signed URLs in admin applications page),
-- so no storage.objects RLS policies are required.
