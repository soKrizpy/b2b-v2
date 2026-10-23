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
- Quest Map lesson modal counts only valid authored instructional nodes (`lesson`/`theory`, `code`, `practice`) with a non-empty title and substantive content; practice nodes also require options and a matching correct answer. Quiz/challenge markers, unknown types, malformed entries, and blank content do not count. The modal shows at most 20 valid slides. Challenge navigation and direct topic URLs stay blocked until at least 10 valid slides exist. Publishing is rejected unless the topic has 10–20 valid slides, and JSON imports leave underfilled topics in draft rather than publishing them. No filler slides are fabricated. Regression tests cover empty, 9, 10, 20, over-20, non-instructional/malformed entries, code slides, practice validity, and publish gating.
- GitHub Actions Quality checks run `39993334426` passed on latest reviewed commit `dcf7579443be70c1e616e2b25b13c3fc84e816a0`: dependency installation, unit tests, TypeScript type-check, full/production dependency audit, production dependency vulnerability gate, and dry-run audit-fix preview all completed successfully. Vercel deployment checks still fail due to the account's daily deployment/build-rate limit; that is separate from the passing GitHub Actions job.
- Run migration and full student/teacher/admin journey only against isolated staging Supabase.
- Final assessment must remain blocked until all published module topics are complete and must use exactly 20 official distinct questions; certificate issuance requires a valid final assessment attempt.

## Safety / validation

- Work stays on `fix/security-priority-audit`; PR #1 remains unmerged.
- Migration 0018 and earlier proposed migrations are not applied to production.
- An earlier CI run was cancelled/failed while the slide coverage tests were being added; the subsequent full Quality checks run `39993334426` passed on the current branch head at the time of this audit. The direct topic route now uses the shared slide validator and redirects to Quest Map when fewer than 10 valid slides exist. No staging E2E is claimed without a dedicated staging database. PR #1 remains open as draft, `main` is unchanged, and production migrations remain unapplied.
