-- Preserve the admin-confirmed list of learning topics on manual certificates.
-- Existing certificates remain NULL and continue to use recorded topic_progress.
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS learning_record jsonb;

COMMENT ON COLUMN public.certificates.learning_record IS
  'Snapshot of admin-confirmed learning topics for manual certificates; null uses tracked topic_progress.';
