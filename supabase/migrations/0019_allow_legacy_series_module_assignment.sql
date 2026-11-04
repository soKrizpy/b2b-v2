-- Permit gradual assignment of legacy meetings while enforcing consistency
-- whenever a meeting has an explicit module_id. No historical data is changed.
CREATE OR REPLACE FUNCTION public.enforce_meeting_series_single_module()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- NULL means a legacy meeting has not yet been assigned. Permit gradual
  -- assignment, but never permit two explicitly assigned modules in one series.
  IF NEW.series_id IS NOT NULL
     AND NEW.module_id IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM public.meetings existing
       WHERE existing.series_id = NEW.series_id
         AND existing.id IS DISTINCT FROM NEW.id
         AND existing.module_id IS NOT NULL
         AND existing.module_id IS DISTINCT FROM NEW.module_id
     ) THEN
    RAISE EXCEPTION 'All assigned meetings in a series must belong to the same module'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
