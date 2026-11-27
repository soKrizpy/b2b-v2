-- Extend the existing announcements table to match the fields used by the
-- Bits2Bytes announcement manager. All changes are additive; legacy columns
-- (id, content, duration_days, expires_at, created_at) remain unchanged.

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS target text NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS urgency text NOT NULL DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

UPDATE public.announcements
SET title = left(content, 120)
WHERE btrim(title) = '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.announcements'::regclass
      AND conname = 'announcements_target_check'
  ) THEN
    ALTER TABLE public.announcements
      ADD CONSTRAINT announcements_target_check
      CHECK (target IN ('all', 'students', 'teachers'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.announcements'::regclass
      AND conname = 'announcements_urgency_check'
  ) THEN
    ALTER TABLE public.announcements
      ADD CONSTRAINT announcements_urgency_check
      CHECK (urgency IN ('info', 'warning', 'urgent'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS announcements_active_expiry_idx
  ON public.announcements (expires_at)
  WHERE is_active = true;

COMMENT ON COLUMN public.announcements.title IS 'Announcement heading shown in the Bits2Bytes UI';
COMMENT ON COLUMN public.announcements.image_url IS 'Optional announcement image URL';
COMMENT ON COLUMN public.announcements.target IS 'Audience: all, students, or teachers';
COMMENT ON COLUMN public.announcements.urgency IS 'Visual priority: info, warning, or urgent';
COMMENT ON COLUMN public.announcements.is_active IS 'Whether the announcement is currently published';
