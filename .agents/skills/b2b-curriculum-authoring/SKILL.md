---
name: b2b-curriculum-authoring
description: Author, audit, validate, and maintain Bits2Bytes learning modules. Use whenever creating or editing curriculum JSON, lesson slides, practice steps, project challenges, teacher reports, topic quizzes, assessments, student progress, or quest-map completion.
---

# Bits2Bytes Curriculum Authoring Standard

## 1. Core principle

A curriculum is a complete learning experience, not a collection of slide-count targets. Never report curriculum quality as successful merely because a module has a minimum number of slides, quizzes, or challenge rows. Verify instructional sequence, content quality, renderer compatibility, teacher workflow, quiz gating, and completion state.

The canonical authored source is `public/curriculum/*.json`, mapped explicitly through `public/curriculum/registry.json`. Do not infer module mappings from similar titles. Treat the JSON as the source of truth and verify how its content is imported into Supabase and rendered by the student UI.

## 2. Required topic learning sequence

Each topic must follow this instructional sequence:

1. **Brief** — a concise orientation: what the learner will make or understand, why it matters, and what they need.
2. **Explanation** — teach the core concept in age-appropriate Indonesian, with concrete examples and vocabulary explained.
3. **Guided practice** — step-by-step actions the learner performs in the target application. Break complex tasks into meaningful, independently understandable steps. Do not disguise another explanation paragraph as practice.
4. **Comprehension check** — a short formative check that tests the concept just taught. It is part of the lesson sequence and is distinct from the graded post-report quiz.
5. **Project challenge** — a practical project brief with goal, required steps/features, submission evidence, and clear success criteria.

The sequence may contain as many explanation and guided-practice slides as the topic needs. Do not force filler slides to hit a numeric target. Every slide must have a clear instructional purpose and be usable by the student without relying on hidden teacher knowledge.

## 3. Separate learning content from graded quiz

- The lesson sequence must end with the project challenge.
- The challenge is performed and submitted for teacher review; it is not a multiple-choice quiz.
- The teacher completes the meeting and submits a non-empty progress report after reviewing the learner's work.
- Only after that report is submitted may the graded topic quiz become available to the student.
- Each graded topic quiz contains exactly **5 questions**, each with exactly **4 non-empty answer options**, one correct answer, and a useful explanation.
- Do not expose quiz questions or answers before the teacher-report gate. Check server-side gating, not only hidden UI.
- Completing the lesson walker or pressing a challenge button must never by itself unlock the graded quiz.

## 4. Completion and quest-map behavior

- A topic node becomes a checkmark only after the student completes the gated graded quiz according to the existing pass/attempt policy.
- A teacher report unlocks the quiz; it does not mark the topic complete.
- A challenge submission, lesson slide completion, quiz availability, or opening the topic must not independently mark the node complete.
- Preserve the established report-count sequencing and the explicit schedule-based exceptions for Jason Tanjaya and Sarah Maisha unless the user explicitly changes that policy.
- Verify both direct topic URL access and quest-map status; the map is not a security boundary.
- Confirm that completed status is based on the authoritative persisted quiz attempt/progress data, not browser localStorage.

## 5. Content quality requirements

For every topic, review:

- Brief matches the topic title and learner outcome.
- Explanations are factually accurate for the actual application/version and use child-friendly language.
- Practice steps are executable, sequential, specific, and produce an observable result.
- Comprehension check tests the just-taught concept and is not a duplicate of the graded quiz.
- Challenge is a coherent project that uses the topic skills, includes deliverables and objective success criteria, and can be reviewed by a teacher.
- Quiz questions are unambiguous, have exactly four plausible options, one defensible answer, and explanations that teach.
- Avoid generic template questions, repeated wording, random answer placement as a substitute for quality, and assessment questions unrelated to the module.
- Do not fabricate UI labels, tools, features, or application behavior. Verify uncertain Tinkercad/Scratch/etc. details against reliable current references or clearly label them as version-dependent.

## 6. Schema and engine compatibility

Before editing content, inspect:

- `src/features/curriculum/validation.ts`
- `src/features/curriculum/lessonSlides.ts`
- `src/features/curriculum/actions.ts`
- `src/features/curriculum/components/LessonNodeWalker.tsx`
- `src/app/student/lessons/topic/[topicId]/page.tsx`
- `src/features/challenges/`
- `src/features/quiz/`, especially `questMapQueries.ts`, quiz actions, and session-report gate helpers.
- Related tests and database migrations.

Do not invent new JSON node types or fields without tracing the importer, Zod schema, database mapping, and renderer. If the current engine cannot express the required instructional sequence, implement and test the smallest compatible schema/renderer change before converting module content. Keep lesson comprehension checks distinct from the 5-question graded quiz.

A slide-count validator is only a structural guard. Add semantic/sequence validation for required stages where supported. A valid schema parse is not proof that the lesson is pedagogically correct.

## 7. Required audit and acceptance tests

For each module under review:

- [ ] Explicit registry mapping and module ID/title match.
- [ ] Every published topic has the required Brief → Explanation → Guided Practice → Comprehension Check → Project Challenge order.
- [ ] Each stage contains meaningful content; no empty or placeholder slides.
- [ ] Guided practice steps are actionable and produce observable outcomes.
- [ ] Challenge instructions, submission type, and success criteria are complete.
- [ ] Exactly five graded quiz questions per topic; exactly four options each.
- [ ] Quiz is unavailable before teacher report submission, including direct API/server paths.
- [ ] Quiz becomes available after a valid teacher report.
- [ ] Node remains incomplete after report submission and before quiz completion.
- [ ] Node becomes checked only after the required quiz completion/pass policy is met.
- [ ] Failed quiz attempts, retry limits, duplicate submissions, and refresh/resume behavior are tested.
- [ ] Jason Tanjaya and Sarah Maisha retain their explicitly defined access behavior.
- [ ] Test the entire student journey from opening the lesson through challenge submission, teacher report, quiz, and quest-map checkmark.
- [ ] Verify production data only after source JSON passes validation and a preflight diff is reviewed.

Report separate results for: content quality, schema validity, renderer behavior, teacher-report gate, quiz behavior, progress persistence, and quest-map state. Never collapse these into a single “sync successful” status.

## 8. Safe implementation and data synchronization

- Follow `.agents/skills/b2b-project-doctor/SKILL.md` for repository, branch, security, and change-management rules.
- Preserve the user's branch policy. Never create branches automatically. Do not merge or deploy without the required authorization.
- Before syncing to Supabase, compare every mapped topic by stable identity and order, validate all content, and show the exact intended changes. Preserve topic IDs, ordering, publication status, student progress, submissions, historical quiz attempts, and unrelated challenge records.
- Use a transaction for multi-row synchronization where supported. Never delete historical student data to make a sync pass.
- After syncing, verify the persisted data independently, then test the rendered student experience. Database row counts alone are insufficient.
- If runtime/browser access is unavailable, state that visual and end-to-end behavior remain unverified.

## 9. Required completion report

Report:
1. Active branch and commit.
2. Exact files changed.
3. Topics and modules affected.
4. Content-sequence validation results.
5. Quiz and challenge counts/quality checks.
6. Tests actually run and their results.
7. Database/deployment actions actually performed.
8. Explicitly unverified behavior and remaining risks.
