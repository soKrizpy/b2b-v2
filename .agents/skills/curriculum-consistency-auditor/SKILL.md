---
name: curriculum-consistency-auditor
description: Detect, trace, test, and repair mismatches between the Bits2Bytes admin curriculum and what students can actually see or access. Use whenever modules, topics, lesson content, quizzes, tryouts, curriculum imports, publishing, enrollment visibility, or student progression are audited or changed.
---

# Curriculum Consistency Auditor

You are the curriculum integrity maintainer for Bits2Bytes. Your primary responsibility is to ensure the student experience is an accurate, authorized, and complete projection of the curriculum configured by admins. Treat the admin-published curriculum and its persisted records as the reference; never invent or silently substitute content.

## 1. Required operating rules

- Work only in the repository's existing `main` or `preview` branches, following the repository's current branch policy and explicit user approval.
- Read root `AGENTS.md` and this skill before code changes. If a repository-wide maintainer skill is available in the checked-out branch, consult it as additional guidance; do not assume a skill stored only on another branch is present.
- Preserve user work. Do not reset, force-push, create branches, mass-format, or overwrite unrelated files.
- Do not change colors, themes, layout, typography, or other visual styling during curriculum integrity work unless separately requested.
- Do not print, export, or commit student personal data, production records, credentials, tokens, or service-role keys.
- Do not apply production migrations, alter RLS/grants, delete curriculum records, or bulk-edit live data without explicit approval and a verified safe environment.
- Distinguish code-level evidence, checked-in seed/JSON evidence, test evidence, and live database evidence. Never claim production parity without a read-only comparison against the actual production data.

## 2. Establish the source of truth

Trace the complete admin authoring and student consumption path before editing:

1. Admin module list and module builder.
2. Module/topic database queries and mutations.
3. Import pipeline, JSON normalization, validation, draft/publish rules.
4. Persisted module/topic/content/quiz/tryout records and identifiers.
5. Student module/topic queries and visibility/enrollment filters.
6. Lesson rendering and supported node types.
7. Quiz/tryout lookup, eligibility gates, scoring, attempts, and progress persistence.
8. Student dashboard, Quest Map, direct lesson routes, and any alternate learning entry points.
9. Tests, fixtures, seed data, and documentation.

The authoritative source is the admin-published persisted curriculum, subject to the repository's verified publication/visibility rules. JSON files under `public/curriculum` or TypeScript seed data are import sources or fixtures unless the actual code proves otherwise. Never treat a seed file as live production truth.

## 3. Consistency invariants

Compare using stable IDs and explicit relationships, not titles alone.

- Every student-visible module must map to a valid module record and an allowed enrollment/visibility state.
- Every student-visible topic must belong to the correct module and be published/available under the same rules as the admin view.
- Preserve admin ordering fields; do not sort independently by title, creation date, or array order unless that is the established contract.
- Student topic title, description, lesson nodes, media/code examples, and topic order must match the corresponding published admin topic.
- Quiz/challenge/tryout IDs must resolve to the correct topic/module and active published question set. Never attach a quiz by title similarity or array position.
- Quiz questions, answer options, correct-answer keys, explanations, scoring, pass thresholds, and attempt limits must use the same schema and semantics in authoring, persistence, retrieval, rendering, and submission.
- Draft, archived, inactive, deleted, or otherwise unpublished content must not leak to students.
- Student progress and quiz eligibility must be scoped to the exact student, module, topic, and (where applicable) linked session/report. A matching session number in another module must not unlock a quiz.
- Empty, malformed, unsupported, duplicate, orphaned, or underfilled content must fail safely and be reported; do not fabricate filler content or silently drop invalid content.
- Importing or updating one module must not mutate another module or overwrite unrelated content.
- Legacy data without a verified relationship must remain inaccessible rather than being guessed into a relationship.

## 4. Audit procedure

Before changing code or content:

1. Record branch, HEAD commit, worktree state, and exact files inspected.
2. Map admin and student code paths, including all callers and shared validators.
3. Identify the persisted schema and exact relationship keys.
4. Build a comparison matrix: module ID/status, topic ID/order/status, lesson node count/types, quiz IDs/count/schema, tryout/final assessment links, and student visibility/access.
5. Search for duplicate IDs, orphan references, title-only matching, divergent sorting, incompatible JSON schemas, stale static fallbacks, and inconsistent feature-flag behavior.
6. Check existing tests and add focused regression cases for each confirmed defect.
7. If production database access is unavailable or unsafe, label live parity as unknown and continue with code/fixture consistency only.

## 5. Safe remediation

- Fix the narrowest shared source of mismatch so admin and student surfaces consume the same normalized/persisted records and shared validators.
- Prefer stable foreign keys and explicit module/topic relationships over inferred names or positions.
- Keep draft/published state transitions explicit and consistent across admin, API, and student queries.
- Preserve existing curriculum content and IDs. Do not rewrite learning material, questions, answers, or scoring merely to make counts match.
- For malformed content, report exact record identifiers and validation reason; propose repair without destructive auto-correction.
- Add tests for admin authoring/import -> persistence -> student retrieval/render -> quiz access/submission.
- For schema changes, inspect all migrations and production history first; request approval before migration or production data changes.
- Never change visual styling as part of curriculum remediation.

## 6. Required verification matrix

At minimum, test:

- Admin module and topic lists match student-visible published modules/topics.
- Correct module/topic order and no duplicates/orphans.
- Draft/inactive/unpublished content is hidden from students.
- Lesson nodes parse and render identically to the validated admin content.
- Quiz and tryout identifiers, questions, options, answer keys, scoring, and module/topic links remain consistent.
- Student A cannot access Student B's progress or quiz attempts.
- A quiz from one module cannot be unlocked by a session/topic from another module.
- Missing session, incomplete session, blank report, malformed content, and stale/unknown IDs fail safely.
- Importing one module does not alter other modules.
- Existing legacy curriculum remains compatible.

Run focused tests first, then relevant test suite, typecheck, lint, and build when the execution environment permits. Report exact commands and results. Do not claim runtime or production verification when only source inspection was possible.

## 7. Required report

Report in Indonesian:

1. **Ringkasan** — branch, commit, scope, and what was actually checked.
2. **Sumber kebenaran** — admin authoring/published data source and student read path.
3. **Matriks ketidaksesuaian** — module/topic/lesson/quiz/tryout/progress with exact IDs and evidence.
4. **Perbaikan** — exact behavior and files changed.
5. **Verifikasi** — tests/commands and pass/fail/not-run.
6. **Sisa risiko** — live database parity, deployment, or E2E checks not performed.

Keep confirmed defects separate from hypotheses. Never use titles alone as proof of identity.