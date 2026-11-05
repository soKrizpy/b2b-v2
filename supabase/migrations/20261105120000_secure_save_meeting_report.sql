-- Replace the historical RPC signature with one that carries the verified
-- server-side actor identity. The function remains service_role-only.
REVOKE ALL ON FUNCTION public.save_meeting_report(bigint, text, jsonb, boolean, text)
  FROM PUBLIC, anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.save_meeting_report(bigint, text, jsonb, boolean, text);

CREATE FUNCTION public.save_meeting_report(
  p_meeting_id bigint,
  p_actor_id uuid,
  p_progress_report text,
  p_attendance jsonb,
  p_mark_completed boolean,
  p_completion_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  actor_role text;
  meeting_teacher_id uuid;
  roster_count integer;
  submitted_count integer;
  unique_count integer;
  updated_count integer;
  updated_meeting_count integer;
BEGIN
  IF p_meeting_id IS NULL OR p_meeting_id <= 0 OR p_actor_id IS NULL THEN
    RAISE EXCEPTION 'Invalid meeting report actor or meeting' USING ERRCODE = '22023';
  END IF;

  IF p_mark_completed IS NULL THEN
    RAISE EXCEPTION 'Completion flag is required' USING ERRCODE = '22023';
  END IF;

  IF char_length(COALESCE(p_progress_report, '')) > 5000 THEN
    RAISE EXCEPTION 'Progress report exceeds 5000 characters' USING ERRCODE = '22023';
  END IF;

  IF p_mark_completed THEN
    IF p_completion_status IS NOT NULL AND p_completion_status <> 'selesai' THEN
      RAISE EXCEPTION 'Invalid completion status' USING ERRCODE = '22023';
    END IF;
  ELSIF p_completion_status IS NOT NULL THEN
    RAISE EXCEPTION 'Completion status is not allowed for report-only updates' USING ERRCODE = '22023';
  END IF;

  -- Lock the role row so role changes cannot race this authorization decision.
  SELECT profile.role
    INTO actor_role
    FROM public.profiles AS profile
   WHERE profile.id = p_actor_id
   FOR SHARE;

  IF NOT FOUND OR actor_role IS NULL OR actor_role NOT IN ('admin', 'teacher') THEN
    RAISE EXCEPTION 'Admin or teacher access required' USING ERRCODE = '42501';
  END IF;

  -- Lock and inspect the target in the same transaction as the subsequent writes.
  SELECT meeting.teacher_id
    INTO meeting_teacher_id
    FROM public.meetings AS meeting
   WHERE meeting.id = p_meeting_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Meeting not found' USING ERRCODE = 'P0002';
  END IF;

  IF actor_role = 'teacher'
     AND meeting_teacher_id IS DISTINCT FROM p_actor_id THEN
    RAISE EXCEPTION 'Teacher is not assigned to this meeting' USING ERRCODE = '42501';
  END IF;

  IF p_attendance IS NULL OR pg_catalog.jsonb_typeof(p_attendance) <> 'array' THEN
    RAISE EXCEPTION 'Attendance must be an array' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM pg_catalog.jsonb_to_recordset(p_attendance) AS item(student_id text, status text)
     WHERE item.student_id IS NULL
        OR pg_catalog.btrim(item.student_id) = ''
        OR item.status IS NULL
        OR item.status NOT IN ('hadir', 'telat', 'absen')
  ) THEN
    RAISE EXCEPTION 'Attendance contains an invalid student or status' USING ERRCODE = '22023';
  END IF;

  SELECT pg_catalog.count(*), pg_catalog.count(DISTINCT item.student_id)
    INTO submitted_count, unique_count
    FROM pg_catalog.jsonb_to_recordset(p_attendance) AS item(student_id text, status text);

  SELECT pg_catalog.count(*)
    INTO roster_count
    FROM public.meeting_students AS roster
   WHERE roster.meeting_id = p_meeting_id;

  IF submitted_count <> roster_count OR unique_count <> roster_count THEN
    RAISE EXCEPTION 'Attendance must include every student exactly once' USING ERRCODE = '22023';
  END IF;

  UPDATE public.meeting_students AS roster
     SET attendance_status = item.status,
         has_joined = item.status IN ('hadir', 'telat')
    FROM pg_catalog.jsonb_to_recordset(p_attendance) AS item(student_id text, status text)
   WHERE roster.meeting_id = p_meeting_id
     AND roster.student_id::text = item.student_id;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> roster_count THEN
    RAISE EXCEPTION 'Attendance does not match the meeting roster' USING ERRCODE = '22023';
  END IF;

  IF p_mark_completed THEN
    UPDATE public.meetings AS meeting
       SET is_completed = true,
           progress_report = p_progress_report,
           completion_status = COALESCE(p_completion_status, 'selesai')
     WHERE meeting.id = p_meeting_id;
  ELSE
    UPDATE public.meetings AS meeting
       SET progress_report = p_progress_report
     WHERE meeting.id = p_meeting_id
       AND meeting.is_completed = true;
  END IF;

  GET DIAGNOSTICS updated_meeting_count = ROW_COUNT;
  IF updated_meeting_count <> 1 THEN
    RAISE EXCEPTION 'Meeting not found or is not completed' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.save_meeting_report(bigint, uuid, text, jsonb, boolean, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_meeting_report(bigint, uuid, text, jsonb, boolean, text)
  TO service_role;
