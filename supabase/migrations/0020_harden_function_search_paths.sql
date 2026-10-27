-- Harden SECURITY DEFINER / trigger function name resolution.
-- Both functions qualify application tables as public.*; an empty search_path
-- prevents untrusted schemas from shadowing function dependencies.
ALTER FUNCTION public.delete_expired_learning_logs()
  SET search_path = '';

ALTER FUNCTION public.enforce_meeting_series_single_module()
  SET search_path = '';
