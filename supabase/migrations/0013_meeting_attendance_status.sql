ALTER TABLE public.meeting_students
  ADD COLUMN IF NOT EXISTS attendance_status text;

UPDATE public.meeting_students
SET attendance_status = CASE WHEN has_joined THEN 'hadir' ELSE 'absen' END
WHERE attendance_status IS NULL;

ALTER TABLE public.meeting_students
  ALTER COLUMN attendance_status SET DEFAULT 'absen',
  ALTER COLUMN attendance_status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.meeting_students'::regclass
      AND conname = 'meeting_students_attendance_status_check'
  ) THEN
    ALTER TABLE public.meeting_students
      ADD CONSTRAINT meeting_students_attendance_status_check
      CHECK (attendance_status IN ('hadir', 'telat', 'absen'));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_meeting_report(
  p_meeting_id bigint,
  p_progress_report text,
  p_attendance jsonb,
  p_mark_completed boolean,
  p_completion_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  roster_count integer;
  submitted_count integer;
  unique_count integer;
  updated_count integer;
  updated_meeting_count integer;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role'
    AND NOT EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'teacher')
    ) THEN
    RAISE EXCEPTION 'Admin or teacher access required';
  END IF;

  IF p_attendance IS NULL OR jsonb_typeof(p_attendance) <> 'array' THEN
    RAISE EXCEPTION 'Attendance must be an array';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_attendance) AS item(student_id text, status text)
    WHERE item.student_id IS NULL
      OR btrim(item.student_id) = ''
      OR item.status IS NULL
      OR item.status NOT IN ('hadir', 'telat', 'absen')
  ) THEN
    RAISE EXCEPTION 'Attendance contains an invalid student or status';
  END IF;

  SELECT count(*), count(DISTINCT item.student_id)
  INTO submitted_count, unique_count
  FROM jsonb_to_recordset(p_attendance) AS item(student_id text, status text);

  SELECT count(*)
  INTO roster_count
  FROM public.meeting_students
  WHERE meeting_id = p_meeting_id;

  IF submitted_count <> roster_count OR unique_count <> roster_count THEN
    RAISE EXCEPTION 'Attendance must include every student exactly once';
  END IF;

  UPDATE public.meeting_students AS ms
  SET attendance_status = item.status,
      has_joined = item.status IN ('hadir', 'telat')
  FROM jsonb_to_recordset(p_attendance) AS item(student_id text, status text)
  WHERE ms.meeting_id = p_meeting_id
    AND ms.student_id::text = item.student_id;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> roster_count THEN
    RAISE EXCEPTION 'Attendance does not match the meeting roster';
  END IF;

  IF p_mark_completed THEN
    UPDATE public.meetings
    SET is_completed = true,
        progress_report = p_progress_report,
        completion_status = COALESCE(p_completion_status, 'selesai')
    WHERE id = p_meeting_id;
  ELSE
    UPDATE public.meetings
    SET progress_report = p_progress_report
    WHERE id = p_meeting_id AND is_completed = true;
  END IF;

  GET DIAGNOSTICS updated_meeting_count = ROW_COUNT;
  IF updated_meeting_count <> 1 THEN
    RAISE EXCEPTION 'Meeting not found or is not completed';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.save_meeting_report(bigint, text, jsonb, boolean, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_meeting_report(bigint, text, jsonb, boolean, text)
  TO authenticated, service_role;