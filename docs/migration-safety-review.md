# Migration Safety Review — 2026-10-24

Status: read-only review only. No SQL was executed against application tables, no migration was applied, and no production rows were read or changed.

## Confirmed live-schema matches

Metadata-only inspection of the Production schema confirms these local migration effects are already present in some form:

- `0007_add_teacher_id_to_meetings.sql`: `meetings.teacher_id` exists.
- `0011_add_equipped_cosmetics.sql`: `students.equipped_cosmetics` exists as non-null JSONB with default `{}`.
- `0012_add_email_to_profiles.sql` / `0009_performance_and_schema_upgrades.sql`: `profiles.email` exists.
- `0013_meeting_attendance_status.sql`: `meeting_students.attendance_status` exists as non-null text with default `absen`.
- `0015_quiz_reward_claims.sql` is NOT reflected in the live schema: `topic_quiz_attempts.reward_claimed_at` is absent.
- `0018_meeting_module_association.sql` is NOT reflected in the live schema: `meetings.module_id` is absent.
- `teacher_students` is absent from the live schema.

These are schema-effect comparisons only, not proof that a specific local file corresponds to a particular remote migration-history entry.

## Migration-history reconciliation blocker

Remote Supabase migration history currently lists versions `20250601`, `20250602`, `20250603`, `20250604`, `20250605`, `20250606`, `20250607`, `20250610`, and `20260923`. The repository uses local filenames `0001`–`0018`. The names and versions do not establish a safe one-to-one mapping. Do not run `supabase db push`, `migration repair`, or rename files until each local SQL effect is reconciled with remote history and actual schema.

## Additional SQL risks found

1. **`0008_retention_policy.sql` defines a destructive retention function.** If `delete_expired_learning_logs()` is invoked, it deletes `topic_quiz_attempts` and `topic_progress` older than one year. The cron scheduling example is commented out, but the function itself is executable by `service_role`. Confirm retention policy, backup/restore expectations, and approval before invoking it. Do not run it as part of validation.
2. **Several earlier migrations perform data backfills, not just DDL.** `0009` and `0012` update `profiles.email`; `0011` populates `students.equipped_cosmetics`; `0013` fills missing attendance statuses and enforces NOT NULL. These statements may be reasonable, but replaying migrations against a live database must not be treated as a harmless no-op merely because many DDL statements use `IF NOT EXISTS`.
3. **`0016_lock_enrollment_and_meeting_access.sql` revokes direct privileges from `PUBLIC`, `anon`, and `authenticated` on `student_modules`, `meetings`, and `meeting_students`.** The repository's `createSupabaseAdminClient()` can fall back to the current user's JWT when a valid service-role key is absent. In that mode, database requests run under browser-role permissions and may fail after these grants are revoked. Production and staging must be verified to use a valid server-only service-role key for these server-side paths before migration testing. Never print the key.
4. **Preview is not a safe place to test this permission change yet.** The Vercel Preview environment was found to point to the Production Supabase project, and the Preview service-role environment entry was empty. Do not run write-based tests or apply `0016` there.
5. **`0014_privileged_rpc_grants.sql` intentionally removes browser-role execution of `activate_learning_path` and `save_meeting_report`.** Confirm every caller is server-side and uses the service-role client in the target environment. `0013` historically grants `save_meeting_report` to `authenticated`; `0014` overrides that grant by design.
6. **`0017_atomic_quiz_rewards.sql` depends on `topic_quiz_attempts.reward_claimed_at` and the expected XP/coin columns.** It should only be tested after `0015` is applied in isolated staging and the exact schema types are verified.
7. **`0018_meeting_module_association.sql` leaves historical meetings unlinked by design.** Its trigger permits creation of a series when all inserted rows share the same module, but rejects mixing NULL and non-NULL module IDs within a series. Do not backfill historical meetings by guessing based on title/date/session number.

## Safe next actions

- Obtain explicit confirmation of a dedicated non-production Supabase project and its data ownership.
- Configure Vercel Preview to point only to that project, and verify project references without exposing secrets.
- Verify server-side service-role availability in the isolated target and review all relevant callers.
- Reconcile migration files against remote history and metadata, documenting which effects are already present and which are missing.
- Apply/test migrations only in isolated staging; run curriculum acceptance tests there.
- Keep PR #1 as draft until these checks pass. Do not merge, modify `main`, or apply migrations to Production as part of this review.
