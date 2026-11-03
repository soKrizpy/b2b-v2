# Implementation Plan: multi-module-access

## Overview

This plan implements the multi-module-access feature in 13 tasks. The feature removes the single-active-module restriction so students can access multiple modules simultaneously. Paused modules show only completed topics for review. No database schema changes are required.

Tasks are sequenced by data-flow dependency: types first, then the data layer (query), then server actions, then server components (pages), then client components, then the admin UI.

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1", "4", "7"] },
    { "wave": 2, "tasks": ["2", "3"] },
    { "wave": 3, "tasks": ["5"] },
    { "wave": 4, "tasks": ["6", "8", "9", "11"] },
    { "wave": 5, "tasks": ["10", "12", "13"] }
  ],
  "dependencies": {
    "2":  ["1"],
    "3":  ["1"],
    "5":  ["1"],
    "6":  ["2", "5"],
    "8":  ["2", "5"],
    "9":  ["2"],
    "10": ["9"],
    "11": ["2"],
    "12": ["2", "3"],
    "13": ["4"]
  }
}
```

## Tasks

# Implementation Tasks

- [ ] 1. Add `StudentModuleWithTopics` type to curriculum queries
  - Add `export interface StudentModuleWithTopics extends ModuleWithTopics` with `enrollmentStatus: 'active' | 'paused'` field
  - Change return type of `getStudentModulesWithTopics` from `Promise<ModuleWithTopics[]>` to `Promise<StudentModuleWithTopics[]>`
  - Update admin-facing helpers (`getAllModulesWithTopics`, `fetchAllModulesWithTopics`) to set `enrollmentStatus: 'active'` as placeholder so they satisfy the extended type
  - **Files:** `src/features/curriculum/queries.ts`
  - **Requires:** none

- [ ] 2. Update `getStudentModulesWithTopics` to fetch active + paused enrollments with topic filtering
  - Change `.eq('status', 'active')` to `.in('status', ['active', 'paused'])` and select `status` column from `student_modules`
  - After fetching enrollments, check `hasPaused = enrollments.some(e => e.status === 'paused')`; if true, query `topic_progress` for the student's completed `topic_id` values and store in a `Set<number>`
  - Build `statusByModule` map from enrollments; in the per-module assembly loop, compute `enrollmentStatus` from the map
  - For `enrollmentStatus === 'paused'`, filter `moduleTopics` to only those whose `id` is in `completedTopicIds`; for `'active'`, keep all published topics (existing behaviour)
  - Set `enrollmentStatus` on each returned module object
  - **Files:** `src/features/curriculum/queries.ts`
  - **Requires:** Task 1

- [ ] 3. Add `getPublishedTopicCountsByModules` query helper
  - Add new exported function `getPublishedTopicCountsByModules(moduleIds: number[]): Promise<{ moduleId: number; publishedCount: number }[]>`
  - Query `topics` table with `.in('module_id', moduleIds).eq('status', 'published').select('id, module_id')` and aggregate count per module
  - Return an array of `{ moduleId, publishedCount }` entries (one per requested module ID, defaulting to 0 for modules with no published topics)
  - **Files:** `src/features/curriculum/queries.ts`
  - **Requires:** Task 1

- [ ] 4. Modify `setActiveStudentModule` and add `pauseStudentModule` server actions
  - In `setActiveStudentModule`, delete the entire cascade-pause step (the `.update({ status: 'paused' }).eq('student_id', studentId)` call); leave only the upsert targeting the single target enrollment
  - Add new exported `async function pauseStudentModule(_prev: SetModuleResult | null, formData: FormData): Promise<SetModuleResult>` that upserts `{ student_id, module_id, status: 'paused' }` with `onConflict: 'student_id,module_id'`
  - Reuse `SetModuleResult` return type and same validation pattern (require `student_id` and valid `module_id`, call `requireAdmin`, use `createSupabaseAdminClient`)
  - On success call `revalidatePath('/admin/users', 'layout')` and `revalidatePath('/student/lessons', 'layout')` then return `{ success: true, message: 'Modul berhasil dijeda.' }`
  - **Files:** `src/features/users/actions.ts`
  - **Requires:** none

- [ ] 5. Update `getQuestMapData` to short-circuit for paused modules
  - At the top of `getQuestMapData`, check `if (mod.enrollmentStatus === 'paused')`
  - In the paused branch, map `mod.topics` to `QuestTopicNode` objects with `status: 'COMPLETED'`, `isUnlocked: true`, `hasQuiz: false`, `attemptsUsed: 0`, `bestScore: 0`, `stars: 0`, `quizUnlocked: false`, `isSessionReportSubmitted: false`, `meetingDate: null`, and `sessionNumber` equal to the array index + 1
  - Return early with `{ mod, nodes, moduleComplete: false, hasFinal: extractFinalAssessment(mod.description) !== null, needsQuizTopics: [] }`
  - Leave all existing active-module code unchanged after the early return
  - **Files:** `src/features/quiz/questMapQueries.ts`
  - **Requires:** Task 1

- [ ] 6. Update the topic page to branch on enrollment status
  - Change enrollment query from `.eq('status', 'active').select('module_id')` to `.in('status', ['active', 'paused']).select('module_id, status')` (with proper type cast)
  - After the published-topic check, add a `if (enrollment.status === 'paused')` branch that queries `topic_progress` for `(student_id, topic_id)`; if no record exists call `notFound()`, otherwise set a local `const reviewOnly = true` and skip quest-map gating entirely
  - In the active branch, keep the existing `getStudentModulesWithTopics` → `getQuestMapData` unlock check unchanged; set `const reviewOnly = false`
  - Pass `reviewOnly` prop down to `SubmitChallengeForm` and `TopicQuizWidget` in the JSX
  - **Files:** `src/app/student/lessons/topic/[topicId]/page.tsx`
  - **Requires:** Tasks 2, 5

- [ ] 7. Add `reviewOnly` prop to `SubmitChallengeForm` and `TopicQuizWidget`
  - In `SubmitChallengeForm`, accept optional `reviewOnly?: boolean`; when `true`, hide the URL/note input fields and the submit button (render submission history and teacher feedback only)
  - In `TopicQuizWidget`, accept optional `reviewOnly?: boolean`; when `true`, hide the "Take Quiz" / "Mulai Quiz" button (render prior attempt scores and breakdowns only)
  - Default `reviewOnly` to `false` in both components so all existing call sites are unaffected
  - **Files:** `src/features/challenges/components/SubmitChallengeForm.tsx`, `src/features/quiz/components/TopicQuizWidget.tsx`
  - **Requires:** none

- [ ] 8. Update the student dashboard to use `accessibleModules`
  - After `const allModules = await getStudentModulesWithTopics(user.id)`, compute `const accessibleModules = allModules.filter(m => m.enrollmentStatus === 'active' || m.topics.length > 0)`
  - Change the `NEEDS_QUIZ` check from using `allModules[0]` to `accessibleModules.find(m => m.enrollmentStatus === 'active') ?? null`; skip the quest-map import entirely when `activeMod` is null
  - Pass `accessibleModules` to the shell where `allModules` was previously passed (the prop name on the shell stays `allModules`; the value changes to the filtered list)
  - **Files:** `src/app/student/dashboard/page.tsx`
  - **Requires:** Tasks 2, 5

- [ ] 9. Update the lessons page to pass `enrollmentStatus` and `accessibleCount` to client components
  - After `const allModules = await getStudentModulesWithTopics(user.id)`, compute `accessibleModules` the same way as in the dashboard (Task 8)
  - Add an empty-state return when `accessibleModules.length === 0`
  - Extend the `allModulesMeta` mapping to include `enrollmentStatus: m.enrollmentStatus` on each entry
  - Pass `accessibleCount={accessibleModules.length}` as an additional prop to both `QuestMapClient` and `SimpleTopicList`
  - **Files:** `src/app/student/lessons/page.tsx`
  - **Requires:** Task 2

- [ ] 10. Add status labels and `accessibleCount`-based selector to `SimpleTopicList` and `QuestMapClient`
  - In `SimpleTopicList` Props, add `enrollmentStatus: 'active' | 'paused'` to each entry in `allModules` and add `accessibleCount: number`
  - Change the selector visibility guard from `allModules.length > 1` to `accessibleCount > 1`
  - Render a small pill badge next to each module title: "active" (e.g. `bg-green-100 text-green-700`) for active, "paused" (e.g. `bg-amber-100 text-amber-700`) for paused
  - Apply the same three changes to `QuestMapClient` (different guard was `allModules && allModules.length > 1`; change to `accessibleCount > 1`)
  - **Files:** `src/app/student/lessons/SimpleTopicList.tsx`, `src/app/student/lessons/QuestMapClient.tsx`
  - **Requires:** Task 9

- [ ] 11. Update the assessment page to accept both enrollment statuses
  - Change `.eq('status', 'active')` to `.in('status', ['active', 'paused']).select('module_id, status')` in the enrollment query
  - After the existing `existingCert` check (which now runs for both tiers unchanged), add `if (enrollment.status === 'paused')` return block that renders the "Tryout tidak tersedia" locked-state UI (with a "Kembali ke Quest Map" link) instead of the TryoutClient
  - Leave the `moduleComplete` check and `TryoutClient` rendering for active modules entirely unchanged
  - **Files:** `src/app/student/assessment/[moduleId]/page.tsx`
  - **Requires:** Task 2

- [ ] 12. Fix achievements mastery calculation with full published topic counts
  - In `src/app/student/achievements/page.tsx`, after fetching `allModules`, call `getPublishedTopicCountsByModules(allModules.map(m => m.id))` and store as `moduleTopicCounts`
  - Pass `moduleTopicCounts` to `StudentAchievementsShell` as a new `totalCounts` prop
  - In `StudentAchievementsShell`, update the mastery computation to use `totalCounts.reduce((acc, c) => acc + c.publishedCount, 0)` instead of `allModules.reduce((acc, m) => acc + (m.topics?.length || 0), 0)`
  - Update `StudentModuleProgressChart` (if it receives module data) to use `publishedCount` from `totalCounts` as the denominator for per-module progress bars, and add a "paused" label for modules where `enrollmentStatus === 'paused'`
  - **Files:** `src/app/student/achievements/page.tsx`, `src/app/student/achievements/StudentAchievementsShell.tsx`
  - **Requires:** Tasks 2, 3

- [ ] 13. Update the admin `StudentDetailModal` with independent pause/activate controls
  - Import `pauseStudentModule` from `src/features/users/actions.ts`
  - Add a second `useActionState` dispatcher: `const [pauseResult, pauseDispatch, pausePending] = useActionState<SetModuleResult | null, FormData>(pauseStudentModule, null)`
  - Add a second `useEffect` (or extend the existing one) to handle `pauseResult`: call `router.refresh()` and show a toast on success or error
  - For each enrolled module in the list, render conditionally: if `m.status === 'active'`, show a "Jeda" button bound to `pauseDispatch`; if `m.status === 'paused'`, show an "Aktifkan" button bound to `activateDispatch` (existing dispatcher, now renamed clearly)
  - Replace the helper-text note *"Mengaktifkan modul lain akan menjeda yang ini"* with *"Modul dapat diaktifkan dan dijeda secara mandiri. Siswa dapat belajar beberapa modul aktif sekaligus."*
  - **Files:** `src/features/users/components/StudentDetailModal.tsx`
  - **Requires:** Task 4


## Notes

- Tasks 1, 4, and 7 have no dependencies and can start immediately.
- Tasks 2 and 3 both depend on Task 1 and can run in parallel after Task 1.
- Task 5 depends on Task 1; Task 6 depends on both Task 2 and Task 5.
- All page-level tasks (8, 9, 11, 12) depend on Task 2.
- Task 12 additionally depends on Task 3 for the new query helper.
- Task 13 depends on Task 4 for the new pauseStudentModule action.
- Server actions in quiz/actions.ts and challenges/actions.ts require NO changes (Section 12 of the design documents the intentional rejection of paused-module submissions).