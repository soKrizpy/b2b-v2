-- Lock enrollment and scheduling data behind trusted server-side access.
-- Application reads/writes these tables through createSupabaseAdminClient().
-- The live database had broad PUBLIC policies (USING/WITH CHECK true), which
-- allowed browser roles to alter module enrollments and meeting assignments.

-- The repository expects this relation, but it was missing from the live schema.
CREATE TABLE IF NOT EXISTS public.teacher_students (
  id BIGSERIAL PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  CONSTRAINT uq_teacher_student UNIQUE (teacher_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_students_teacher
  ON public.teacher_students(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_students_student
  ON public.teacher_students(student_id);

ALTER TABLE public.teacher_students ENABLE ROW LEVEL SECURITY;

-- Remove permissive policies regardless of their historical naming.
DROP POLICY IF EXISTS "Enable all for authenticated admin" ON public.meetings;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.meetings;
DROP POLICY IF EXISTS "Enable all for authenticated admin" ON public.meeting_students;
DROP POLICY IF EXISTS "teacher_students_read_all" ON public.teacher_students;
DROP POLICY IF EXISTS "teacher_students_modify_admin" ON public.teacher_students;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.student_modules;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.student_modules;

-- Browser roles do not need direct access: application access is server-side
-- and uses the service-role client. Revoke inherited and explicit grants.
REVOKE ALL PRIVILEGES ON TABLE public.student_modules, public.meetings, public.meeting_students
  FROM PUBLIC, anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.student_modules, public.meetings, public.meeting_students
  TO service_role;

REVOKE ALL PRIVILEGES ON TABLE public.teacher_students FROM PUBLIC, anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.teacher_students TO service_role;

DO $$
BEGIN
  IF to_regclass('public.teacher_students_id_seq') IS NOT NULL THEN
    GRANT USAGE, SELECT ON SEQUENCE public.teacher_students_id_seq TO service_role;
    REVOKE ALL ON SEQUENCE public.teacher_students_id_seq FROM PUBLIC, anon, authenticated;
  END IF;
END $$;
