# Curriculum Flow Audit — Session-to-Curriculum Mapping

Status: design blocker identified; no production database changes made.

## Confirmed current behavior

- Quest Map topics are ordered by `order_index`; quiz code maps topic position to `session_number = index + 1`.
- Student meeting assignments are queried across all meetings. `meetings` has `session_number` and `series_id`, but no curriculum identifier.
- The admin form and `POST /api/sessions` are two separate meeting creation paths. Both generate numbered weekly sessions, and neither stores a module/topic association.
- Quiz state uses any assigned meeting to decide whether the student is self-paced, then matches completed reports by session number only. A meeting from another module or series can therefore affect the wrong topic's lock state.
- The meeting form has no module selector, and `student_modules` has no explicit guided/self-paced learning mode.

## Recommended design

First validate the product rule: **does one meeting series belong to one module, with session N corresponding to topic N?**

If yes:

1. Add a nullable `module_id` FK on `meetings` plus an index. All generated meetings in a series must share the same module. Nullable preserves legacy rows without inventing associations.
2. Add a module selector to the admin form; validate module availability and student eligibility. Persist it in both `createSession` and `POST /api/sessions`, and preserve it when editing one session or the remainder of a series.
3. Scope Quest Map and quiz-state lookups to the current module before matching `session_number`. Meetings from another module/series must never unlock the current module's quiz.
4. Add an explicit learning-mode value to student-module enrollment (for example, guided vs. self-paced). Do not infer self-paced mode only because no linked meetings were found; that could bypass the teacher-report requirement for a guided student.
5. Leave historical `module_id` null until there is an evidence-based, reviewed backfill. Never infer from title, date, session number, student assignment, or `series_id`.

If a meeting can cover multiple modules/topics, use a reviewed junction-table design instead; do not force that behavior into a single `module_id` column.

## Implementation sequence

1. Confirm series-to-module semantics and how guided/self-paced mode is assigned during enrollment.
2. Add an additive migration with FK/index/constraints and null-preserving legacy behavior. Do not apply it to production as part of this branch work.
3. Update the admin form, server action, API route, edit-series path, and types together.
4. Scope quiz/Quest Map report matching to the current module and enforce explicit learning mode.
5. Add regression tests for two modules both having session 1, separate series both having session 1, unrelated assigned meetings, absent students, unsubmitted reports, and truly self-paced enrollment.
6. Test migration and end-to-end journey on isolated non-production Supabase before rollout.

## Learner journey acceptance criteria

- Quest Map node opens a topic brief/learning path without replacing or mutating curriculum data.
- If 10–20 slides is a hard requirement, validate it at curriculum authoring/import and show actionable errors rather than manufacturing slides.
- Challenges follow topic progression rules.
- A completed teacher report unlocks only the linked topic quiz for eligible students who attended.
- Once unlocked, the quiz remains available on a later day according to retry policy.
- Final assessment is blocked until all required published topics are complete and contains exactly 20 distinct official questions.
- Certificate issuance is verified after a valid final-assessment attempt.
- Critical checks run in CI; full flow is exercised against isolated staging data.

## Validation state

- GitHub Actions run `39986302251` on code commit `c3fe9c2af7a984edcd7d1a629f809c18faefeeb0` succeeded, including unit tests and TypeScript type-check.
- That run does not prove the meeting-to-curriculum association is correct; dedicated regression and staging E2E tests remain required.
- The successful run predates documentation-only commit `a0ae0543c11509cf75f140b0d3477dd76673fac9`; no fresh run was returned for that docs commit.
- PR remains unmerged. No production migration was applied.
