-- Security hardening: keep privileged RPCs server-only.
-- The application calls these RPCs through its service-role server client.
-- Revoke any historical grants from browser roles to reconcile live DB drift.
DO $$
DECLARE
  fn RECORD;
  signature TEXT;
BEGIN
  FOR fn IN
    SELECT p.oid, n.nspname, p.proname,
           pg_get_function_identity_arguments(p.oid) AS identity_args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('activate_learning_path', 'save_meeting_report')
  LOOP
    signature := format('%I.%I(%s)', fn.nspname, fn.proname, fn.identity_args);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', signature);
  END LOOP;
END $$;
