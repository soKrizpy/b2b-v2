# Curriculum Flow Audit — Session-to-Topic Mapping

Status: design blocker; no production database changes made.

## Confirmed current behavior

- The student Quest Map builds topic nodes from published topics ordered by `order_index`.
- Both `src/features/quiz/questMapQueries.ts` and `src/features/quiz/queries.ts` derive a session number from a topic's sorted position (`index + 1`).
- Student meeting assignments are queried across all meetings assigned to the student. The `meetings` relation exposes `session_number`, but does not expose a `module_id` or `topic_id` relation.
- Therefore, the current lookup cannot reliably distinguish sessions belonging to different modules or different session series. A session number match is not proof that a report belongs to the topic being unlocked.

## Required design decision

Before changing quiz gating, establish an explicit, durable relation between a curriculum unit and the meeting/session that teaches it. Preferred options:

1. Add a nullable `topic_id` foreign key to `meetings` (if one meeting is intended to teach one topic); or
2. Add a junction table such as `meeting_topics(meeting_id, topic_id)` if a meeting can cover multiple topics.

Do not infer the relation from title text, date, `session_number`, student assignment, or `series_id` alone. Existing rows need a reviewed backfill plan; leave unknown historical associations unlinked rather than guessing.

## Implementation sequence

1. Confirm product semantics: one meeting per topic vs. one meeting covering several topics; whether series are module-specific; and how self-paced students are identified.
2. Add an additive migration with foreign keys, indexes, and constraints appropriate to the chosen relationship. Do not apply it to production as part of this branch work.
3. Update the teacher/admin meeting form and server action to select and persist the curriculum topic/module association. Validate that selected topics are published and available to the student's active enrollment.
4. Update Quest Map and quiz state queries to filter meetings by the explicit topic relation and the current student assignment. A report should unlock only the linked topic for students who attended the completed meeting.
5. Keep self-paced behavior explicit (for example, a defined enrollment/learning mode) instead of treating “no meeting rows returned” as proof that a student is self-paced.
6. Add regression tests for two modules both having session 1, separate series both having session 1, an unrelated assigned meeting, a student absent from the linked meeting, an unsubmitted report, and a truly self-paced student.
7. Validate the migration and end-to-end flow on a non-production Supabase project before any production rollout.

## Acceptance criteria for the requested learner journey

- Opening a Quest Map topic shows the topic brief/learning path and does not replace or mutate curriculum data.
- Lesson content may contain 10–20 slides; if that is a hard curriculum requirement, validate it in the curriculum authoring/import path and show an actionable validation error rather than silently manufacturing slides.
- The challenge is available according to topic progression rules.
- A teacher's completed report unlocks only the quiz associated with that topic and only for eligible students.
- The quiz remains available on a later day after it has been unlocked, according to the retry policy.
- The final assessment is inaccessible until all required published topics are complete; it uses exactly 20 distinct official questions.
- Certificate issuance is verified after a valid final assessment attempt.
- All critical checks run in CI; full flow is exercised against isolated staging data.

## Validation state at audit time

- GitHub Actions run `39986302251` on commit `c3fe9c2af7a984edcd7d1a629f809c18faefeeb0`: success, including unit tests and TypeScript type-check.
- This CI result does not establish that the meeting-to-topic association is correct; dedicated regression tests and staging end-to-end tests remain required.
- PR remains unmerged. No production migration was applied.
