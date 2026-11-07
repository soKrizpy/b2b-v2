-- 0011_admin_assessment_overrides.sql
-- Per-student, per-module admin exam unlocks and auditable manual certificates.

CREATE TABLE IF NOT EXISTS public.student_assessment_unlocks (
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  module_id INTEGER NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  unlocked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL DEFAULT 'Dibuka manual oleh admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (student_id, module_id)
);

ALTER TABLE public.student_assessment_unlocks ENABLE ROW LEVEL SECURITY;

-- This table is server-only: the app accesses it through the authenticated
-- Server Actions using the service-role client. No anon/authenticated grants.
REVOKE ALL ON TABLE public.student_assessment_unlocks FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.student_assessment_unlocks TO service_role;

ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS issue_source TEXT NOT NULL DEFAULT 'assessment',
  ADD COLUMN IF NOT EXISTS issued_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS admin_note TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'certificates_issue_source_check'
      AND conrelid = 'public.certificates'::regclass
  ) THEN
    ALTER TABLE public.certificates
      ADD CONSTRAINT certificates_issue_source_check
      CHECK (issue_source IN ('assessment', 'manual'));
  END IF;
END $$;

COMMENT ON TABLE public.student_assessment_unlocks IS
  'Admin-only per-student overrides for module final assessment mastery gates.';
COMMENT ON COLUMN public.certificates.issue_source IS
  'assessment = earned through final assessment; manual = issued by an admin.';
