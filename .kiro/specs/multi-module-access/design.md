# Design Document

## Introduction

This document describes the technical design for the **multi-module-access** feature in the Bits2Bytes LMS. The feature removes the single-active-module restriction so that students can be enrolled in multiple modules simultaneously. Paused modules remain visible to the student but show only the topics they have already completed (as recorded in the `topic_progress` table), while active modules retain full access with the existing meeting-based unlock gating.

The design covers changes to server actions, read-side query helpers, the topic page access control, the quest map rendering logic, the student dashboard, the lessons page module selector, and the admin student-detail modal. No database schema changes are required because the `student_modules` table already supports a `status` column with values `'active'` and `'paused'`.

## Overview

The multi-module-access feature removes the single-active-module restriction in the Bits2Bytes LMS. Students gain access to multiple modules simultaneously: active modules show all published topics with existing meeting-based gating, and paused modules show only completed topics for review. No database schema changes are needed — the existing `student_modules.status` column already supports the required values.

## Architecture

The change touches seven layers, all server-side or server-component-driven. Data flows from the `student_modules` enrollment table through the curriculum query helper into every student-facing surface. The key architectural principle is that all topic filtering happens server-side in `getStudentModulesWithTopics` before data reaches any client component, so the security boundary never depends on the client hiding topics.

At a high level:

1. Enrollment actions stop cascade-pausing. Activating a module upserts only that one enrollment; a new `pauseStudentModule` action pauses only one enrollment.
2. Curriculum query fetches both active and paused enrollments. For paused modules it intersects published topics with `topic_progress` records, returning only completed topics. It attaches an `enrollmentStatus` field to each returned module.
3. Quest map reads `mod.enrollmentStatus`. For paused modules it marks every topic as `COMPLETED` and skips meeting-based gating. For active modules it keeps the existing logic.
4. Topic page accepts both active and paused enrollments. Paused enrollments are granted access only when a `topic_progress` record exists and the topic is published. Active enrollments keep the existing meeting-based unlock check.
5. Dashboard computes an accessible module list (active always; paused only with at least one completed topic) and displays that count.
6. Lessons page lists all active and paused enrollments in the module selector with visible status labels.
7. Admin modal adds an independent pause control for active modules and an independent activate control for paused modules.

The `ModuleWithTopics` type gains an `enrollmentStatus` field that every downstream consumer reads to distinguish the two tiers.

The change touches seven layers of the application, all server-side or server-component-driven. Data flows from the `student_modules` enrollment table through the curriculum query helper into every student-facing surface. The key architectural principle is that **all topic filtering happens server-side** in `getStudentModulesWithTopics` before data reaches any client component, so the security boundary never depends on the client hiding topics.

At a high level:

1. **Enrollment actions** stop cascade-pausing. Activating a module upserts only that one enrollment; a new `pauseStudentModule` action pauses only one enrollment.
2. **Curriculum query** (`getStudentModulesWithTopics`) fetches both `active` and `paused` enrollments. For paused modules it intersects the module's published topics with the student's `topic_progress` records, returning only completed topics. It attaches an `enrollmentStatus` field to each returned module.
3. **Quest map** (`getQuestMapData`) reads `mod.enrollmentStatus`. For paused modules it marks every received topic as `COMPLETED` and skips meeting-based gating. For active modules it keeps the existing logic.
4. **Topic page** accepts both `active` and `paused` enrollments. Paused enrollments are granted access only when a `topic_progress` record exists and the topic is published. Active enrollments keep the existing meeting-based unlock check.
5. **Dashboard** computes an "accessible module list" (active modules always; paused modules only when they have at least one completed topic) and displays that count.
6. **Lessons page** lists all active and paused enrollments in the module selector with visible status labels, and shows the selector only when more than one accessible module exists.
7. **Admin modal** adds an independent pause control for active modules and an independent activate control for paused modules, and removes the note that activating one module pauses the others.

The `ModuleWithTopics` type gains an `enrollmentStatus: 'active' | 'paused'` field that every downstream consumer reads to distinguish the two tiers.

## Components and Interfaces

The following components are modified or added in this design:

| Component | File | Change |
|-----------|------|--------|
| setActiveStudentModule | src/features/users/actions.ts | Remove cascade-pause step; upsert only target enrollment |
| pauseStudentModule (new) | src/features/users/actions.ts | New server action to independently pause one module |
| getStudentModulesWithTopics | src/features/curriculum/queries.ts | Fetch active+paused; filter paused topics by 	opic_progress; add enrollmentStatus |
| ModuleWithTopics type | src/features/curriculum/queries.ts | Add enrollmentStatus: 'active' | 'paused' field |
| getQuestMapData | src/features/quiz/questMapQueries.ts | Branch on mod.enrollmentStatus; paused → all COMPLETED, skip gating |
| Topic page | src/app/student/lessons/topic/[topicId]/page.tsx | Accept both enrollment statuses; branch: paused checks 	opic_progress, active checks gating |
| Student dashboard | src/app/student/dashboard/page.tsx | Compute accessible module list; pass to shell |
| Lessons page | src/app/student/lessons/page.tsx | Pass enrollmentStatus and ccessibleCount to client components |
| SimpleTopicList | src/app/student/lessons/SimpleTopicList.tsx | Add status labels and ccessibleCount-based selector visibility |
| QuestMapClient | src/app/student/lessons/QuestMapClient.tsx | Add status labels and ccessibleCount-based selector visibility |
| StudentDetailModal | src/features/users/components/StudentDetailModal.tsx | Two dispatchers (activate + pause); independent per-module controls |
| Assessment page | src/app/student/assessment/[moduleId]/page.tsx | Accept both enrollment statuses; show existing certificate for paused; block new attempts for paused |
| Achievements page | src/app/student/achievements/page.tsx | Fetch full published topic counts separately to avoid inflated mastery percentage |
| StudentAchievementsShell | src/app/student/achievements/StudentAchievementsShell.tsx | Use separate totalCounts prop for mastery calculation; add paused labels |
| getPublishedTopicCountsByModules (new) | src/features/curriculum/queries.ts | New query helper returning published topic counts per module ID |
| Quiz/challenge server actions | src/features/quiz/actions.ts, src/features/challenges/actions.ts | No change — intentional rejection of paused-module submissions (Section 12) |

## Data Models

No database schema changes are required. The existing tables already support the feature:

### student_modules (existing, no change)

| Column | Type | Values |
|--------|------|--------|
| student_id | uuid | References uth.users.id |
| module_id | int | References modules.id |
| status | text | 'active' or 'paused' |

### topic_progress (existing, no change)

| Column | Type | Description |
|--------|------|-------------|
| student_id | uuid | Student who completed the topic |
| 	opic_id | int | The completed topic |
| completed_at | timestamptz | When completion was recorded |

### TypeScript Type Changes

The ModuleWithTopics interface in src/features/curriculum/queries.ts gains enrollmentStatus:

`	ypescript
export interface ModuleWithTopics extends ModuleRow {
  topics: TopicWithChallengeCount[];
  enrollmentStatus: 'active' | 'paused';  // NEW
}
`

This field is populated by getStudentModulesWithTopics and read by every downstream consumer.

## Detailed Design

### 1. Data Model

No schema migration is needed. The existing `student_modules` table already has:

```typescript
export interface StudentModuleRow {
  student_id: string;
  module_id: number;
  status: 'active' | 'paused';
}
```

The `topic_progress` table (already present) is the source of truth for completed topics:

```typescript
export interface TopicProgressRow {
  id: number;
  student_id: string;
  topic_id: number;
  engine_topic_id: string;
  xp_earned: number;
  best_quiz_score: number;
  completed_at: string;
}
```

The only data-model-level change is a **new TypeScript type**. `StudentModuleWithTopics` extends the existing `ModuleWithTopics` with an `enrollmentStatus` field so student-facing consumers can distinguish active from paused modules without a second query:

`	ypescript
export interface StudentModuleWithTopics extends ModuleWithTopics {
  enrollmentStatus: 'active' | 'paused';
}
`

The existing `ModuleWithTopics` stays unchanged so admin-facing functions (`getAllModulesWithTopics`, `fetchAllModulesWithTopics`) compile without a misleading placeholder value. The return type of `getStudentModulesWithTopics` changes from `Promise<ModuleWithTopics[]>` to `Promise<StudentModuleWithTopics[]>`.
### 2. Enrollment Action Changes

**File:** `src/features/users/actions.ts`

#### 2.1 Modify `setActiveStudentModule` — remove cascade-pause

The current implementation has two steps: (1) set **all** enrollments for the student to `'paused'`, then (2) upsert the target module as `'active'`. Step 1 is the single-active-module restriction and must be removed entirely.

**Before (current):**
```typescript
// 1. Set ALL existing enrollments for this student to 'paused'
await db.from('student_modules').update({ status: 'paused' }).eq('student_id', studentId);

// 2. Upsert the target module as 'active'
await db.from('student_modules').upsert(
  { student_id: studentId, module_id: moduleId, status: 'active' },
  { onConflict: 'student_id,module_id' }
);
```

**After:**
```typescript
// Upsert the target module as 'active'. Other enrollments are left untouched.
const { error: upsertErr } = await (db
  .from('student_modules')
  .upsert(
    { student_id: studentId, module_id: moduleId, status: 'active' } as never,
    { onConflict: 'student_id,module_id' }
  ) as unknown as Promise<{ error: { message: string } | null }>);
```

This satisfies Requirements 1.2, 1.3, 1.5, 2.1, 2.3, and 2.4: activating one module sets only that enrollment to `active` and leaves every other enrollment at its existing status. If the enrollment already exists and is `active`, the upsert is idempotent (Requirement 1.5).

#### 2.2 Add `pauseStudentModule` action

A new server action is needed to independently pause a single module without affecting any other enrollment. It mirrors `setActiveStudentModule` but upserts with `status: 'paused'`:

```typescript
export async function pauseStudentModule(
  _prev: SetModuleResult | null,
  formData: FormData
): Promise<SetModuleResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.message };

  const studentId = (formData.get('student_id') as string | null)?.trim();
  const moduleId  = Number(formData.get('module_id'));

  if (!studentId) return { success: false, error: 'student_id wajib diisi.' };
  if (!moduleId || isNaN(moduleId)) return { success: false, error: 'module_id tidak valid.' };

  const db = createSupabaseAdminClient();

  const { error: upsertErr } = await (db
    .from('student_modules')
    .upsert(
      { student_id: studentId, module_id: moduleId, status: 'paused' } as never,
      { onConflict: 'student_id,module_id' }
    ) as unknown as Promise<{ error: { message: string } | null }>);

  if (upsertErr) {
    return { success: false, error: `Gagal menjeda modul: ${upsertErr.message}` };
  }

  revalidatePath('/admin/users', 'layout');
  revalidatePath('/student/lessons', 'layout');
  return { success: true, message: 'Modul berhasil dijeda.' };
}
```

This satisfies Requirements 2.2, 2.3, and 2.5: pausing creates the enrollment with `paused` status if it doesn't exist (Requirement 2.5) and modifies only that one enrollment (Requirement 2.3).

The existing `SetModuleResult` return type is reused for both actions.

### 3. Curriculum Query Changes

**File:** `src/features/curriculum/queries.ts`

`getStudentModulesWithTopics` is the central read-side helper used by the dashboard, lessons page, and topic page. It must change in three ways:

#### 3.1 Fetch both active and paused enrollments

**Before (current):** filters `.eq('status', 'active')`.

**After:** filters `.in('status', ['active', 'paused'])` and also selects the `status` column:

```typescript
const { data: enrollments, error: enErr } = await db
  .from('student_modules')
  .select('module_id, status')
  .eq('student_id', studentId)
  .in('status', ['active', 'paused']) as unknown as {
    data: Array<{ module_id: number; status: 'active' | 'paused' }>;
    error: { message: string } | null;
  };
```

This satisfies Requirements 3.1, 3.2, and 3.3 (return all active+paused enrollments; empty list when none exist).

#### 3.2 Fetch the student's completed topic IDs

A new query fetches the set of `topic_id` values from `topic_progress` for this student. This set is used to filter paused-module topics:

```typescript
// Fetch completed topic IDs only when the student has paused enrollments
// (avoids an unnecessary round-trip for the common all-active case).
const hasPaused = enrollments.some((e) => e.status === 'paused');
const completedTopicIds = hasPaused
  ? await (async () => {
      const { data: progressRows } = await db
        .from('topic_progress')
        .select('topic_id')
        .eq('student_id', studentId) as unknown as {
          data: Array<{ topic_id: number }> | null;
          error: unknown;
        };
      return new Set((progressRows ?? []).map((p) => p.topic_id));
    })()
  : new Set<number>();
```

This query runs in parallel with the existing modules and topics fetches (via `Promise.all`).

#### 3.3 Per-module topic filtering by enrollment status

The published-topics fetch stays unchanged (it already filters `.eq('status', 'published')`). The per-module assembly changes to filter based on enrollment status:

```typescript
// Build a lookup: moduleId -> enrollment status
const statusByModule = new Map(enrollments.map((e) => [e.module_id, e.status]));

return (modules as unknown as ModuleRow[]).map((mod) => {
  const enrollmentStatus = statusByModule.get(mod.id) ?? 'active';
  const moduleTopics = topicList.filter((t) => t.module_id === mod.id);

  // Paused modules: only topics that are published AND completed by the student.
  // Active modules: all published topics (existing behavior).
  const visibleTopics = enrollmentStatus === 'paused'
    ? moduleTopics.filter((t) => completedTopicIds.has(t.id))
    : moduleTopics;

  return {
    ...mod,
    enrollmentStatus,
    topics: visibleTopics.map((t) => ({
      ...t,
      challenge_count: challengeCountMap.get(t.id) ?? 0,
    })),
  };
});
```

This satisfies Requirements 4.1–4.5:
- Paused modules return only topics with a matching `topic_progress` record (4.1, 4.2).
- Active modules return every published topic (4.3).
- The paused set is a subset of the active set because both start from the same published-topics query and the paused set additionally intersects with `completedTopicIds` (4.4).
- Topics no longer published are excluded because the base query already filters `status = 'published'` — even if `topic_progress` has a record, the topic won't appear (4.5).

#### 3.4 Challenge counts for paused modules

Challenge counts are computed from the published topics (existing `countVisibleChallenges`). For paused modules, the challenge-count map is still built from all published topics, but only completed topics are returned. The map lookup `challengeCountMap.get(t.id) ?? 0` works correctly because it was built for all topic IDs. No change needed to `countVisibleChallenges`.

### 4. Topic Page Changes

**File:** `src/app/student/lessons/topic/[topicId]/page.tsx`

The topic page currently enforces a single gate: enrollment must be `active`, then the quest map's `isUnlocked` check blocks future topics. This must split into two paths based on enrollment status.

#### 4.1 Enrollment check — accept both statuses

**Before (current):**
```typescript
const { data: enrollment } = await db
  .from('student_modules')
  .select('module_id')
  .eq('student_id', auth.user.id)
  .eq('module_id', topic.module_id)
  .eq('status', 'active')
  .maybeSingle();
if (enrollmentError || !enrollment) notFound();
```

**After:**
```typescript
const { data: enrollment, error: enrollmentError } = await (db
  .from('student_modules')
  .select('module_id, status')
  .eq('student_id', auth.user.id)
  .eq('module_id', topic.module_id)
  .in('status', ['active', 'paused'])
  .maybeSingle() as unknown as Promise<{
    data: { module_id: number; status: 'active' | 'paused' } | null;
    error: { message: string } | null;
  }>);
if (enrollmentError || !enrollment) notFound();
```

This satisfies Requirements 5.4 (no enrollment → not-found) and begins the branching for 5.1/5.2/5.3/5.5/5.6.

#### 4.2 Branch on enrollment status

After the enrollment check and the existing published-topic check (`if (!topic || topic.status !== 'published') notFound()`), the page branches:

**Paused module path** — grant access only if a `topic_progress` record exists:

```typescript
if (enrollment.status === 'paused') {
  // Paused module: review-only. Topic must be published (already checked above)
  // AND the student must have a topic_progress record for this topic.
  const { data: progress } = await (db
    .from('topic_progress')
    .select('id')
    .eq('student_id', auth.user.id)
    .eq('topic_id', id)
    .maybeSingle() as unknown as Promise<{
      data: { id: number } | null;
      error: unknown;
    }>);
  if (!progress) notFound();   // Requirement 5.2

  // Skip meeting-based gating (Requirement 5.1, 5.6).
  // Render the topic content with challenges + quiz state for review.
}
```

This satisfies:
- 5.1: paused + topic_progress exists → render content.
- 5.2: paused + no topic_progress → not-found.
- 5.6: paused + topic not published → not-found (the published check runs before this branch).

**Active module path** — keep existing meeting-based unlock gating:

```typescript
// Active module: existing behavior — quest map unlock check.
const enrolledModules = await getStudentModulesWithTopics(auth.user.id);
const enrolledModule = enrolledModules.find((item) => item.id === topic.module_id);
const questProgress = enrolledModule
  ? await getQuestMapData(auth.user.id, enrolledModule)
  : null;
const topicNode = questProgress?.nodes.find((node) => node.topic.id === id);
if (!topicNode || !topicNode.isUnlocked) notFound();  // Requirement 5.3, 5.5
```

This satisfies:
- 5.3: active + gating satisfied → render.
- 5.5: active + gating not satisfied → not-found.

#### 4.3 Shared rendering with paused-module form gating

Both paths converge on the existing rendering logic (challenges, quiz widget, learning path nodes). The `challenges` and `quizState` fetches remain unchanged. The `LessonNodeWalker` content is fully available for published topics.

**Paused-module form behavior:** When `enrollment.status === 'paused'`, the topic page MUST pass a `reviewOnly` flag to the challenge and quiz client components so that:

- Challenge submission forms (`SubmitChallengeForm`) are rendered in a **read-only state** — previous submission status and teacher feedback are visible, but the URL/note input fields and submit button are hidden or disabled.
- Quiz widget (`TopicQuizWidget`) shows **prior attempt results only** — the "Take Quiz" button is hidden, and any previous attempt scores and breakdowns are visible.
- The `LessonNodeWalker` renders normally (content is safe for completed+published topics).

This prevents the UX issue where a student fills out a form, submits, and receives a server error because the quiz and challenge server actions intentionally reject submissions for non-active enrollments (see Section 12).

For the paused path, `getQuestMapData` is not called (the gating is bypassed), saving one query. The `challenges` and `quizState` fetches still run via the existing `Promise.all`.
### 5. Quest Map Changes

**File:** `src/features/quiz/questMapQueries.ts`

`getQuestMapData` currently accepts `(studentId, mod)` and computes node statuses via meeting-based gating. It must branch on the module's enrollment status, which it reads from the new `mod.enrollmentStatus` field (no signature change needed).

#### 5.1 Paused-module rendering — completed topics only, all COMPLETED

When `mod.enrollmentStatus === 'paused'`, the `mod.topics` array already contains only completed topics (filtered by `getStudentModulesWithTopics`). The function marks every node as `COMPLETED` and skips all meeting/quiz logic:

```typescript
export async function getQuestMapData(
  studentId: string,
  mod: ModuleWithTopics
): Promise<QuestMapData> {
  // ── Paused module: review-only mode ──
  if (mod.enrollmentStatus === 'paused') {
    const nodes: QuestTopicNode[] = mod.topics.map((topic, idx) => ({
      topic,
      status: 'COMPLETED',          // Requirement 6.2
      hasQuiz: false,
      attemptsUsed: 0,
      bestScore: 0,
      stars: 0,
      sessionNumber: idx + 1,
      isSessionReportSubmitted: false,
      quizUnlocked: false,
      isUnlocked: true,             // all rendered topics are open for review
      meetingDate: null,
    }));

    return {
      mod: { ...mod, topics: mod.topics },  // content already safe (completed+published)
      nodes,
      moduleComplete: false,                 // paused modules are never "complete"
      hasFinal: extractFinalAssessment(mod.description) !== null,
      needsQuizTopics: [],                    // no quiz actions in review mode
    };
  }

  // ── Active module: existing logic unchanged ──
  // (existing meeting-based gating code continues here)
}
```

This satisfies Requirements 6.1–6.5:
- 6.1: renders only completed topics (the topics were pre-filtered by the curriculum query).
- 6.2: every node is `COMPLETED`.
- 6.3: non-completed topics are hidden (they never reach `getQuestMapData`).
- 6.4: active modules keep existing behavior (the existing code path is untouched).
- 6.5: a paused module with zero completed topics receives `mod.topics = []`, so `nodes = []`.

For paused modules, no meeting or quiz-attempt queries are executed — the early return skips the expensive `Promise.all` that fetches `topic_quiz_attempts` and `meeting_students`. This is both a correctness improvement (no meeting gating) and a performance improvement.

`hideLockedTopicContent` is not applied for paused modules because all received topics are completed and published — their content is safe to show in full for review.

#### 5.2 Active-module rendering — no change

The existing code path (everything after the paused-module early return) remains identical. Active modules continue to fetch meeting data, quiz attempts, and compute `COMPLETED`/`NEEDS_QUIZ`/`ACTIVE_NEXT`/`LOCKED` statuses with the existing meeting-based gating.

### 6. Student Dashboard Changes

**File:** `src/app/student/dashboard/page.tsx` and `src/features/dashboard/student/StudentDashboardShell.tsx`

#### 6.1 Compute the accessible module list

The dashboard page calls `getStudentModulesWithTopics(user.id)`, which now returns all active and paused modules (with paused topics pre-filtered to completed ones). The "accessible module list" is computed from this result:

```typescript
const allModules = await getStudentModulesWithTopics(user.id);

// Accessible = active modules (always) + paused modules with ≥1 completed topic.
const accessibleModules = allModules.filter(
  (m) => m.enrollmentStatus === 'active' || m.topics.length > 0
);
```

This satisfies Requirements 7.2–7.4:
- 7.2: paused module with ≥1 completed topic → `topics.length > 0` → included.
- 7.3: active module → always included (regardless of topic count).
- 7.4: paused module with 0 completed topics → `topics.length === 0` and `status !== 'active'` → excluded.

The dashboard passes `accessibleModules` to the shell (replacing the current `allModules` prop), so the displayed module count equals `accessibleModules.length` (Requirement 7.1).

#### 6.2 Needs-quiz check — use first active module

The current code checks `allModules[0]` for `NEEDS_QUIZ` topics. Since `allModules` now includes paused modules, the check must find the first **active** module:

```typescript
if (isFeatureEnabled('questMap') || isFeatureEnabled('gamification')) {
  const activeMod = accessibleModules.find((m) => m.enrollmentStatus === 'active') ?? null;
  if (activeMod) {
    const { getQuestMapData } = await import("@/features/quiz/questMapQueries");
    const questData = await getQuestMapData(user.id, activeMod);
    for (const node of questData.needsQuizTopics) {
      needsQuizTopics.push({ id: node.topic.id, title: node.topic.title });
    }
  }
}
```

Only active modules can have `NEEDS_QUIZ` topics (paused modules return `needsQuizTopics: []`), so this is both correct and efficient.

#### 6.3 Shell display

The `StudentDashboardShell` currently displays `{allModules.length} Modul` in the "Ringkasan Belajar" section. It now receives `accessibleModules` as the `allModules` prop, so the count automatically reflects the accessible count. No change to the shell component itself — it already uses `allModules.length` for the count. The prop name stays `allModules` but the value passed is the filtered `accessibleModules` list.

### 7. Lessons Page Changes

**File:** `src/app/student/lessons/page.tsx`, `src/app/student/lessons/SimpleTopicList.tsx`, `src/app/student/lessons/QuestMapClient.tsx`

#### 7.1 Module selection and selector visibility

The lessons page fetches `getStudentModulesWithTopics(user.id)` (now returning active + paused). It computes accessible modules and uses them to decide the default module and whether to show the selector:

```typescript
const allModules = await getStudentModulesWithTopics(user.id);

if (allModules.length === 0) {
  return ( /* empty state */ );
}

// Accessible modules drive selector visibility and default selection.
const accessibleModules = allModules.filter(
  (m) => m.enrollmentStatus === 'active' || m.topics.length > 0
);

if (accessibleModules.length === 0) {
  return ( /* empty state — all modules paused with no completed topics */ );
}

const selectedModId = resolvedParams?.moduleId
  ? Number(resolvedParams.moduleId)
  : accessibleModules[0]?.id;

const mod = allModules.find((m) => m.id === selectedModId) ?? accessibleModules[0];
```

The selected module can be any enrollment the student has (including a paused module with 0 topics, if manually selected via URL). `getQuestMapData` handles the paused case by returning an empty node list.

The module metadata passed to client components gains the `enrollmentStatus`:

```typescript
const allModulesMeta = allModules.map((m) => ({
  id: m.id,
  title: m.title ?? 'Modul',
  topicCount: m.topics.length,
  enrollmentStatus: m.enrollmentStatus,
}));
```

The `accessibleCount` is passed so the client knows when to show the selector (Requirement 8.1 — show when >1 accessible module):

```typescript
<QuestMapClient
  questData={questData}
  cert={cert}
  studentId={user.id}
  allModules={allModulesMeta}
  currentModuleId={mod.id}
  accessibleCount={accessibleModules.length}
/>
```

#### 7.2 SimpleTopicList — status labels

**File:** `src/app/student/lessons/SimpleTopicList.tsx`

The `Props` interface adds `enrollmentStatus` to each module meta entry and `accessibleCount`:

```typescript
interface Props {
  questData: QuestMapData;
  allModules: Array<{
    id: number;
    title: string;
    topicCount: number;
    enrollmentStatus: 'active' | 'paused';
  }>;
  currentModuleId: number;
  accessibleCount: number;
}
```

The selector visibility check changes from `allModules.length > 1` to `accessibleCount > 1`, and each module entry gets a visible status label:

```tsx
{accessibleCount > 1 && (
  <div className="flex flex-wrap gap-2">
    {allModules.map((m) => (
      <Link key={m.id} href={`/student/lessons?moduleId=${m.id}`} className={...}>
        {m.title} ({m.topicCount})
        <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ...">
          {m.enrollmentStatus === 'active' ? 'active' : 'paused'}
        </span>
      </Link>
    ))}
  </div>
)}
```

This satisfies Requirements 8.1 (list all active+paused when >1 accessible), 8.2 (active label), and 8.3 (paused label).

When a paused module is selected, `questData` already reflects paused filtering (Requirement 8.4) because `getQuestMapData` returns only completed topics with `COMPLETED` status. When an active module is selected, all published topics render with meeting-based gating (Requirement 8.5).

#### 7.3 QuestMapClient — status labels

**File:** `src/app/student/lessons/QuestMapClient.tsx`

Same changes as SimpleTopicList: the `Props` interface adds `enrollmentStatus` to the `allModules` items and adds `accessibleCount`. The selector visibility check changes from `allModules && allModules.length > 1` to `accessibleCount > 1`, and each module link gets an active/paused label badge matching the pixel-art aesthetic (small pill with text "active" or "paused").

### 8. Admin UI Changes

**File:** `src/features/users/components/StudentDetailModal.tsx`

#### 8.1 Two action dispatchers

The `LearningPathTab` currently uses a single `useActionState` bound to `setActiveStudentModule`. With independent pause and activate controls, it needs two dispatchers:

```typescript
const [activateResult, activateDispatch, activatePending] = useActionState<SetModuleResult | null, FormData>(
  setActiveStudentModule, null
);
const [pauseResult, pauseDispatch, pausePending] = useActionState<SetModuleResult | null, FormData>(
  pauseStudentModule, null
);
```

Both results trigger a `router.refresh()` and toast on success, and a toast on error. A single `useEffect` can handle both, or two separate effects.

#### 8.2 Independent pause/activate controls per module

Each enrolled module gets a control based on its status:

- **Active module** — a "Jeda" (pause) button that submits to `pauseDispatch`:
```tsx
<form action={pauseDispatch}>
  <input type="hidden" name="student_id" value={student.id} />
  <input type="hidden" name="module_id" value={m.module_id} />
  <button type="submit" disabled={pausePending} className="...">
    {pausePending ? '…' : 'Jeda'}
  </button>
</form>
```

- **Paused module** — an "Aktifkan" (activate) button that submits to `activateDispatch` (existing, now without cascade-pause):
```tsx
<form action={activateDispatch}>
  <input type="hidden" name="student_id" value={student.id} />
  <input type="hidden" name="module_id" value={m.module_id} />
  <button type="submit" disabled={activatePending} className="...">
    {activatePending ? '…' : 'Aktifkan'}
  </button>
</form>
```

This satisfies Requirements 9.2 (pause control for active modules) and 9.3 (activate control for paused modules). Requirements 9.4 and 9.5 (no cascade effect) are satisfied by the action changes in Section 2.

#### 8.3 Updated helper text

The current note says: *"Mengaktifkan modul lain akan menjeda yang ini"* (activating another module will pause this one). This is no longer true and must be replaced with text reflecting independent control, e.g.:

> *"Modul dapat diaktifkan dan dijeda secara mandiri. Siswa dapat belajar beberapa modul aktif sekaligus."*

(Modules can be activated and paused independently. A student can study multiple active modules at once.)

#### 8.4 Status count display

The existing header already shows active and paused counts:
```tsx
{student.modules.filter((m) => m.status === 'active').length} aktif
{student.modules.some((m) => m.status !== 'active') &&
  ` · ${student.modules.filter((m) => m.status !== 'active').length} dijeda`}
```

This already supports multiple active modules and requires no change (Requirement 9.1 — display every enrollment with its status).

#### 8.5 `module_titles` in user queries

**File:** `src/features/users/queries.ts`

`getAllStudents` builds `module_titles` from active modules:
```typescript
const module_titles = modules.filter((m) => m.status === 'active').map((m) => m.title);
```

With multiple active modules, this list grows to include all active module titles. The admin user table uses `module_titles` for badge display. No change needed — the existing code already handles an array of titles. If the display shows too many badges, that is a cosmetic concern outside this feature's scope.

### 9. Return Type Changes

**File:** `src/features/curriculum/queries.ts`

The `ModuleWithTopics` interface (Section 1) gains `enrollmentStatus: 'active' | 'paused'`. Every function that returns `ModuleWithTopics` must populate this field:

- `getStudentModulesWithTopics` — populates from the enrollment `status` column (Section 3).
- `fetchAllModulesWithTopics` / `getAllModulesWithTopics` — these admin-facing functions return all modules regardless of enrollment. They are unaffected and can default `enrollmentStatus` to `'active'` or omit it (they are not used in the student-facing flow). To keep the type consistent, these functions set `enrollmentStatus: 'active'` as a placeholder since they don't have student context.

The `allModulesMeta` shape passed to client components gains `enrollmentStatus` as described in Section 7.


### 10. Assessment Page Changes

**File:** src/app/student/assessment/[moduleId]/page.tsx

The assessment page currently rejects any enrollment that is not ctive, preventing students from viewing certificates they already earned in a now-paused module. The fix splits the enrollment check into two paths:

#### 10.1 Accept both enrollment statuses

**Before (current):**
`	ypescript
.eq('status', 'active')
.maybeSingle();
if (enrollmentError || !enrollment) notFound();
`

**After:**
`	ypescript
const { data: enrollment, error: enrollmentError } = await (db
  .from('student_modules')
  .select('module_id, status')
  .eq('student_id', auth.user.id)
  .eq('module_id', id)
  .in('status', ['active', 'paused'])
  .maybeSingle() as unknown as Promise<{
    data: { module_id: number; status: 'active' | 'paused' } | null;
    error: { message: string } | null;
  }>);
if (enrollmentError || !enrollment) notFound();
`

#### 10.2 Existing certificate display — always accessible

After the enrollment check, the page fetches existingCert via getCertificateByModuleAndStudent. If a certificate exists, it is displayed regardless of enrollment status. This code runs before the moduleComplete check and is unaffected by the change — the enrollment check is the only gate that blocked it.

#### 10.3 New assessment submission — active only

The moduleComplete gate and the TryoutClient rendering still require enrollment.status === 'active':

`	ypescript
if (enrollment.status === 'paused') {
  // Paused module: show existing certificate if present (handled above),
  // but do not allow new assessment attempts.
  return (
    <div className="max-w-xl mx-auto py-16 text-center space-y-4">
      <p className="text-4xl">🔒</p>
      <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
        Tryout tidak tersedia
      </h1>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Modul ini sedang dijeda. Kamu masih bisa me review topik yang sudah selesai.
      </p>
      <Link href="/student/lessons"
        className="inline-block px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700">
        Kembali ke Quest Map
      </Link>
    </div>
  );
}
`

The existing quest-map-based moduleComplete check continues to run only for active modules. The server action submitFinalAssessment already checks status = 'active' independently (see Section 12), so even if a student bypassed the UI, the submission would be rejected.

### 11. Achievements Page Changes

**File:** src/app/student/achievements/page.tsx and src/app/student/achievements/StudentAchievementsShell.tsx

The achievements page calls getStudentModulesWithTopics(user.id) and passes llModules to StudentAchievementsShell, which computes:

`	ypescript
const totalPossibleTopics = allModules.reduce((acc, m) => acc + (m.topics?.length || 0), 0);
`

With the design change, paused modules contribute only their **completed** topics to m.topics.length, not all published topics. This shrinks 	otalPossibleTopics and inflates the mastery percentage.

#### 11.1 Fix: use full published topic count, not filtered

The achievements page must compute the total possible topics from the **full** published topic count per module, not the paused-filtered subset. Two approaches:

**Approach A (preferred): Separate query for topic counts.** Fetch the total published topic count per enrolled module independently of the paused-module filtering:

`	ypescript
// In StudentAchievementsShell — accept a separate totalCounts prop
const totalPossibleTopics = totalCounts.reduce((acc, count) => acc + count, 0);
`

The achievements page fetches this alongside llModules:

`	ypescript
// Fetch total published topics per module (regardless of enrollment status)
const moduleTopicCounts = await getPublishedTopicCountsByModules(
  allModules.map((m) => m.id)
);
`

This requires a new query helper getPublishedTopicCountsByModules that returns { moduleId: number; publishedCount: number }[].

**Approach B (simpler): Pass enrollment status and compute client-side.** The shell receives llModules with enrollmentStatus on each module. For paused modules, it looks up the full published topic count from a separate prop or uses the module's metadata. This is less clean but avoids a new query.

Either way, the key invariant is: 	otalPossibleTopics must reflect the **actual** number of published topics across all enrolled modules, not the paused-filtered subset.

#### 11.2 Module progress chart

StudentModuleProgressChart also receives llModules and renders per-module progress bars. For paused modules, the chart should show the full topic count (denominator) with completed topics as the filled portion, and include a "paused" label. The enrollmentStatus field on each module entry enables this.

### 12. Server Action Enrollment Checks (Intentional Rejection)

**Files:** src/features/quiz/actions.ts, src/features/challenges/actions.ts

The following server actions check status = 'active' directly and **intentionally reject** paused-module submissions. These checks are **correct and must NOT be changed** — paused modules are review-only, and new submissions (quiz attempts, challenge submissions, final assessments) should not be accepted.

| Action | File | Line | Behavior for paused modules |
|--------|------|------|----------------------------|
| submitTopicQuiz | quiz/actions.ts | 124 | Rejects with "Kamu belum terdaftar aktif pada modul topik ini." |
| submitFinalAssessment | quiz/actions.ts | 283 | Rejects with "Kamu belum terdaftar aktif pada modul ini." |
| submitChallenge | challenges/actions.ts | 227 | Rejects with "Kamu belum terdaftar aktif pada modul challenge ini." |

The topic page (Section 4.3) prevents the student from reaching these actions by gating the submission forms with a eviewOnly flag. The server-side check is a defense-in-depth layer: even if a student bypasses the UI (e.g., by crafting a direct Server Action call), the action still rejects because it independently verifies status = 'active'.

No changes are needed to these server actions. They are documented here to explicitly state that the rejection of paused-module submissions is intentional design, not an oversight.
### 10. Assessment Page Changes

**File:** src/app/student/assessment/[moduleId]/page.tsx

The assessment page currently rejects any enrollment that is not ctive, preventing students from viewing certificates they already earned in a now-paused module. The fix splits the enrollment check into two paths.

#### 10.1 Accept both enrollment statuses

Replace the .eq('status', 'active') check with .in('status', ['active', 'paused']) and select the status column so the page can branch on enrollment tier.

#### 10.2 Existing certificate display — always accessible

After the enrollment check, the page fetches existingCert via getCertificateByModuleAndStudent. If a certificate exists, it is displayed regardless of enrollment status. This code runs before the moduleComplete check and is unaffected by the change — the enrollment check is the only gate that blocked it.

#### 10.3 New assessment submission — active only

The moduleComplete gate and the TryoutClient rendering require enrollment.status === 'active'. For paused modules, render a "Tryout tidak tersedia" message explaining the module is paused and the student can review completed topics. The server action submitFinalAssessment already checks status = 'active' independently (see Section 12), so even if a student bypassed the UI, the submission would be rejected.

### 11. Achievements Page Changes

**File:** src/app/student/achievements/page.tsx and src/app/student/achievements/StudentAchievementsShell.tsx

The achievements page calls getStudentModulesWithTopics(user.id) and passes llModules to StudentAchievementsShell, which computes 	otalPossibleTopics = allModules.reduce((acc, m) => acc + (m.topics.length || 0), 0). With the design change, paused modules contribute only their completed topics to m.topics.length, inflating the mastery percentage.

#### 11.1 Fix: use full published topic count, not filtered

The achievements page must compute the total possible topics from the full published topic count per module, not the paused-filtered subset. A new query helper getPublishedTopicCountsByModules(moduleIds: number[]) returns { moduleId: number; publishedCount: number }[]. The achievements page fetches this alongside llModules and passes it to the shell as a 	otalCounts prop. The shell computes 	otalPossibleTopics from 	otalCounts, not from llModules topic lengths.

#### 11.2 Module progress chart

StudentModuleProgressChart receives llModules and renders per-module progress bars. For paused modules, the chart shows the full topic count (denominator) with completed topics as the filled portion, plus a "paused" label using the enrollmentStatus field.

### 12. Server Action Enrollment Checks (Intentional Rejection)

**Files:** src/features/quiz/actions.ts, src/features/challenges/actions.ts

The following server actions check status = 'active' directly and intentionally reject paused-module submissions. These checks are correct and must NOT be changed — paused modules are review-only, and new submissions should not be accepted.

| Action | File | Behavior for paused modules |
|--------|------|----------------------------|
| submitTopicQuiz | quiz/actions.ts | Rejects: "Kamu belum terdaftar aktif pada modul topik ini." |
| submitFinalAssessment | quiz/actions.ts | Rejects: "Kamu belum terdaftar aktif pada modul ini." |
| submitChallenge | challenges/actions.ts | Rejects: "Kamu belum terdaftar aktif pada modul challenge ini." |

The topic page (Section 4.3) prevents the student from reaching these actions by gating the submission forms with a eviewOnly flag. The server-side check is defense-in-depth: even if a student bypasses the UI, the action still rejects because it independently verifies status = 'active'. No changes are needed to these server actions.
## Correctness Properties

### Property 1: Subset Invariant

**Validates: Requirements 4.4**

For any student and module

For any student and module, the set of topics returned for a paused enrollment is always a subset of topics returned for an active enrollment of the same module. This holds because both paths start from the same published-topics query, and the paused path additionally intersects with 	opic_progress records.

### Property 2: Accessible-Count Consistency

**Validates: Requirements 7.1**

The dashboard module count

The dashboard module count always equals the number of modules in the accessible module list. This holds because the count is derived from the same filtered list, not from a separate query.

### Property 3: No-Cascade Invariant

**Validates: Requirements 1.3, 2.3**

Activating or pausing one module

Activating or pausing one module never changes the status of any other enrollment. This holds because the upsert targets a single (student_id, module_id) row and the cascade-pause step is removed.

### Property 4: Published-Check Universality

**Validates: Requirements 4.5, 5.6**

A completed-but-unpublished topic

A completed-but-unpublished topic is excluded from both the curriculum query results and the topic page. This holds because the base topics query filters status = 'published' and the topic page checks 	opic.status !== 'published' before branching.

## Error Handling

1. **Enrollment not found** — If no student_modules row exists for the requested student and module, the topic page returns 
otFound(). This is existing behavior preserved for both active and paused paths.

2. **topic_progress not found in paused path** — If a student requests a topic in a paused module without a 	opic_progress record, the topic page returns 
otFound().

3. **Supabase upsert failure** — Both setActiveStudentModule and pauseStudentModule return a SetModuleResult with success: false and the Supabase error message. The admin UI displays the error via a toast notification.

4. **All modules paused with zero completed topics** — The lessons page shows the empty state when ccessibleModules.length === 0, preventing a blank or broken quest map render.

5. **Concurrent admin actions** — Two admins modifying different modules for the same student is safe because each upsert targets a different (student_id, module_id) row with no row-level contention.

## Data Flow

### Scenario A: Student with one active and one paused module opens the lessons page

1. `getStudentModulesWithTopics(studentId)` fetches both enrollments.
2. For the active module: all published topics are returned.
3. For the paused module: published topics are intersected with `topic_progress` → only completed topics returned.
4. `accessibleModules` = both modules (active always; paused has completed topics).
5. `accessibleCount = 2` → selector shows.
6. Student sees both modules in the selector with "active" and "paused" labels.
7. Selecting the active module → `getQuestMapData` runs the existing meeting-based gating.
8. Selecting the paused module → `getQuestMapData` returns only completed topics, all marked `COMPLETED`.

### Scenario B: Student opens a completed topic in a paused module via direct URL

1. Topic page fetches the topic (must be published, else `notFound`).
2. Enrollment query finds the `paused` enrollment.
3. Branch enters paused path → queries `topic_progress` for this student + topic.
4. Record exists → page renders the topic content, challenges (with prior submissions), and quiz widget (with prior attempts).
5. No quest map unlock check runs — meeting gating is bypassed for review.

### Scenario C: Student opens an unfinished topic in a paused module via direct URL

1. Topic page fetches the topic (published).
2. Enrollment query finds the `paused` enrollment.
3. Paused path queries `topic_progress` → no record.
4. `notFound()` is returned (Requirement 5.2).

### Scenario D: Admin activates a second module from the detail modal

1. Admin clicks "Aktifkan" on a paused module.
2. `setActiveStudentModule` upserts that enrollment to `active`.
3. The other active enrollment is **not** paused (cascade removed).
4. `revalidatePath` refreshes `/admin/users` and `/student/lessons`.
5. Student now has two active modules — both appear in the selector, both show all published topics.

### Scenario E: Dashboard for a student with one active module and one paused module with zero completed topics

1. `getStudentModulesWithTopics` returns both modules.
2. Paused module has `topics: []` (no completed topics).
3. `accessibleModules` = [active module only] (paused excluded by the `topics.length > 0` filter).
4. Dashboard displays "1 Modul" — only the accessible module is counted.
5. The selector does not show on the lessons page (`accessibleCount = 1`).

## Edge Cases

1. **Paused module with zero completed topics** — `getStudentModulesWithTopics` returns it with `topics: []`. It is excluded from the dashboard's accessible count (Requirement 7.4) and from the selector visibility threshold. If the student navigates to it directly via `?moduleId=`, the quest map renders zero nodes (Requirement 6.5). The topic page returns `notFound` for any topic in it (no `topic_progress` records).

2. **Topic completed but no longer published** — the base topics query filters `status = 'published'`, so a completed-but-unpublished topic never appears in paused-module results (Requirement 4.5). The topic page also checks `topic.status !== 'published'` → `notFound` before the paused branch, covering the direct-URL case (Requirement 5.6).

3. **Student with no enrollments** — `getStudentModulesWithTopics` returns `[]`. Dashboard shows "0 Modul". Lessons page shows the empty state. No change from current behavior (Requirement 3.3).

4. **All modules paused, none with completed topics** — `accessibleModules` is empty. Dashboard shows "0 Modul". Lessons page shows the empty state (the `accessibleModules.length === 0` guard triggers the empty state).

5. **All modules paused, some with completed topics** — only paused modules with ≥1 completed topic appear in the accessible count. The selector shows if ≥2 such modules exist. Each renders only its completed topics with `COMPLETED` status.

6. **Module activated while already active** — the upsert is idempotent; status stays `active` (Requirement 1.5). No other enrollment is touched.

7. **Direct URL to a non-published topic in an active module** — the topic page checks `topic.status !== 'published'` → `notFound` before any enrollment or gating logic, so this is already handled and unaffected by the change.

8. **Teacher-facing student card (`getStudentsForTeacher`)** — currently shows the first active module title. With multiple active modules, it shows only the first. This is a cosmetic limitation outside this feature's acceptance criteria; no change is required, but the field name `active_module` (singular) could be updated to `active_module_title` or joined into a list in a future iteration.

9. **Concurrent admin actions** — two admins activating/pausing different modules for the same student simultaneously is safe because each action upserts a different `(student_id, module_id)` row. The upsert uses `onConflict: 'student_id,module_id'`, so there is no row-level contention between different modules.

## Testing Strategy

### Unit Tests

1. **`getStudentModulesWithTopics`** — test with a mix of active and paused enrollments:
   - Active module returns all published topics.
   - Paused module returns only topics present in `topic_progress`.
   - Paused module with zero completed topics returns `topics: []`.
   - `enrollmentStatus` is correctly set on each returned module.
   - Completed-but-unpublished topic is excluded from paused results.

2. **`getQuestMapData`** — test both branches:
   - Paused module: all nodes are `COMPLETED`, `needsQuizTopics` is empty, no meeting queries needed.
   - Paused module with zero topics: `nodes` is empty, `moduleComplete` is `false`.
   - Active module: existing behavior unchanged (meeting gating, quiz unlock, status computation).

3. **`setActiveStudentModule`** — test that activating a module does not change other enrollments' status (no cascade).

4. **`pauseStudentModule`** — test that pausing one module leaves other enrollments unchanged, and creates a `paused` enrollment if none existed.

### Property-Based Tests

1. **Subset property (Requirement 4.4)** — for any student, the set of topics returned for a paused module is always a subset of the topics returned for the same module as active. Generate arbitrary enrollment states and verify the subset relationship holds.

2. **Accessible-count property (Requirement 7.1)** — for any student, the accessible module count equals the number of active modules plus paused modules with ≥1 completed topic. Generate random enrollment + topic_progress states and verify the count.

3. **Idempotent activation (Requirement 1.5)** — activating a module that is already `active` does not change its status or any other enrollment's status. Repeat the action N times and verify the state is unchanged.

### Integration Tests

1. **Topic page access control** — for each combination of (enrollment status × topic published × topic_progress exists), verify the correct render/not-found response:
   - Paused + published + progress → render.
   - Paused + published + no progress → not-found.
   - Paused + not published → not-found.
   - Active + published + gating satisfied → render.
   - Active + published + gating not satisfied → not-found.
   - No enrollment → not-found.

2. **Lessons page selector** — verify the selector appears when >1 accessible module and lists all active+paused enrollments with correct labels.

3. **Admin modal controls** — verify that pausing an active module and activating a paused module each affect only the target enrollment, and that the UI updates via `router.refresh()`.
