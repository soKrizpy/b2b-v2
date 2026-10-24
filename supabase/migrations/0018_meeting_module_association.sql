-- Additive curriculum association for guided teacher-led learning.
-- Existing meetings remain NULL; historical rows are deliberately not guessed/backfilled.
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS module_id bigint NULL
  REFERENCES public.modules(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS meetings_module_session_idx
  ON public.meetings (module_id, session_number);

CREATE INDEX IF NOT EXISTS meetings_series_module_idx
  ON public.meetings (series_id, module_id)
  WHERE series_id IS NOT NULL;

-- A recurring series is bound to one module. Existing all-NULL legacy series remain valid.
CREATE OR REPLACE FUNCTION public.enforce_meeting_series_single_module()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.series_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.meetings existing
    WHERE existing.series_id = NEW.series_id
      AND existing.id IS DISTINCT FROM NEW.id
      AND existing.module_id IS DISTINCT FROM NEW.module_id
  ) THEN
    RAISE EXCEPTION 'All meetings in a series must belong to the same module'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS meetings_single_module_per_series ON public.meetings;
CREATE TRIGGER meetings_single_module_per_series
  BEFORE INSERT OR UPDATE OF series_id, module_id
  ON public.meetings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_meeting_series_single_module();
