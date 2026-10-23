# Curriculum Flow Audit — Session-to-Curriculum Mapping

Status: implementation in progress on `fix/security-priority-audit`; migration remains unapplied to production.

## Confirmed product rule

- One schedule series belongs to one module.
- Session N maps to the Nth published topic in that module (1-based order by `order_index`).
- Learning is teacher-guided. A quiz is available only after the student attended the matching session, the session is marked complete, and a non-empty teacher progress report is saved.
- Historical meetings are not backfilled by guessing from title, date, series, student assignments, or session number.

## Changes on this branch

- Added additive migration `0018_meeting_module_association.sql`: nullable `meetings.module_id` FK/indexes and a trigger preventing a non-null series from being assigned to two different modules. Existing meetings remain NULL.
- Added a shared report-gate predicate and regression tests for module collisions, session-number collisions, absence, incomplete sessions, blank reports, and legacy unlinked meetings.
- New schedule creation validates an active module and persists `module_id` through both the Server Action and `POST /api/sessions`.
- Quiz and Quest Map lookups scope sessions to the current module and no longer infer self-paced mode from missing meeting assignments.
- Meeting form uses an admin-only module picker; both creation paths validate that the module is active and require the series length to equal the published-topic count, so every topic has a corresponding 1-based session. Editing cannot silently move an existing schedule to another module.

## Required follow-up / acceptance checks

- Create a series against an active module and verify all generated sessions share the module ID and session numbers 1..N.
- Verify two modules with session 1 cannot unlock one another's quizzes.
- Verify unlinked legacy meetings never unlock topics.
- Verify attendance + completed status + non-empty report are all required.
- Quest Map lesson modal filters quiz/challenge nodes and shows at most 20 authored instructional entries. The challenge link remains disabled until at least 10 authored entries exist, and the direct topic/challenge URL redirects back to the Quest Map when coverage is insufficient. Missing content is not fabricated. Admin/teacher must complete `learningPath` for underfilled topics. Regression tests cover minimum/maximum counts and filtering.
- GitHub Actions Quality checks run `39990748766` passed on commit `cb75acd4b98b793d6df54806c3a5089daf8363bf`: dependency installation, unit tests, `npx tsc --noEmit`, full/production npm audit reporting, production dependency vulnerability gate, and dry-run audit-fix preview all completed successfully. Any subsequent code commit requires a fresh run.
- Run migration and full student/teacher/admin journey only against isolated staging Supabase.
- Final assessment must remain blocked until all published module topics are complete and must use exactly 20 official distinct questions; certificate issuance requires a valid final assessment attempt.

## Safety / validation

- Work stays on `fix/security-priority-audit`; PR #1 remains unmerged.
- Migration 0018 and earlier proposed migrations are not applied to production.
- CI run `39991820708` was queued/in progress after the slide helper, modal gate, and tests were committed; the direct-URL guard was added after that run started, so the final branch head still requires a fresh successful CI run. Vercel deployment is still blocked by the account's daily deployment limit, so no deployment validation is claimed. No staging E2E is claimed without a dedicated staging database.
