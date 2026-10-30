# Bites2Bytes Product & Learning Flow Map
Date: 2026-10-31
Repository: soKrizpy/b2b-v2
Working branch: feat/learning-flow-simplification-20261031
Scope: source-code inspection only. No database, environment, or deployment operations.

## Product direction
Bites2Bytes is a live, teacher-led online classroom with interactive practice and supporting gamification. It is not a self-paced reading catalog. The core learning loop is:
1. Student sees the next live class and joins the teacher-led session.
2. Teacher explains and demonstrates a concept live.
3. Student practices interactively in the LMS or a project tool.
4. Teacher reviews work and gives feedback.
5. Student sees progress and earns meaningful recognition.
6. The next class or practice task is clearly presented.

## Verified current architecture

### Shared application shell
- `src/components/DashboardAppShell.tsx`
- Shared responsive navigation for Admin, Teacher, Student.
- Admin navigation: Dashboard, Jadwal, Kurikulum, Pengguna, Invoice.
- Teacher navigation: Dashboard, Siswa Saya, Tugas Siswa.
- Student navigation: Town Square, Quest Map, Lencana & Target, Parent Hub.
- Shell includes desktop sidebar, mobile bottom navigation, theme toggle, profile/sign-out, and shared chatbot.
- Product implication: navigation already has role separation; do not rebuild it. Consider clearer labels and a primary next action before removing any route.

### Student journey
- `src/app/student/dashboard/page.tsx`
  - Fetches sessions, gamification, certificates, upcoming meeting, invoices, modules, and completed topics in parallel.
  - Then fetches Quest Map data for the first module to derive pending quizzes.
  - This is a potential data-loading/performance hotspot: 7 parallel reads followed by an additional dependent read.
- `src/features/dashboard/student/StudentDashboardShell.tsx`
  - Two-column student dashboard.
  - Includes announcement banner, pending-quiz mission banner, hero/welcome area, Town Square, pet/gamification elements, schedule, and secondary progress/reward areas.
  - Several concepts compete for attention. Recommended priority: next live class / join action first; next teacher-assigned practice second; progress/reward third; cosmetic/collection items lower.
- `src/app/student/lessons/page.tsx` and `src/app/student/lessons/QuestMapClient.tsx`
  - Quest Map is a distinct progression experience with module selection, topic states, and quiz interactions.
  - Preserve its intentional dark/fantasy aesthetic. Do not force it into the light dashboard visual style.
- `src/app/student/lessons/topic/[topicId]/page.tsx`
  - Topic route checks enrollment and unlock state, loads authored learningPath nodes, challenges, and quiz state.
  - Uses `LessonNodeWalker` for interactive instruction and supports challenge submissions and topic quiz.
- `src/features/curriculum/components/LessonNodeWalker.tsx`
  - Existing node types include lesson/theory, code, practice, challenge, quiz.
  - It is a step-through learning engine, not just a text page. Preserve and improve this engine rather than replacing it.
- `src/app/student/achievements/page.tsx`
  - Dedicated achievement/progress destination. Keep as a secondary destination rather than crowding the learning start page.
- Parent Hub and invoice/billing behavior must be preserved; they are secondary to the learning loop, not candidates for deletion without product/operational review.

### Teacher journey
- `src/app/teacher/dashboard/page.tsx`
  - Fetches assigned sessions and mentored students.
  - Shows teacher greeting, announcements, student shortcut, and class schedule.
- `src/features/dashboard/teacher/TeacherScheduleCards.tsx`
  - Schedule tabs: Today, Tomorrow, Class History, Unreported Reports.
  - Meeting cards include class/report actions.
- `src/components/DashboardAppShell.tsx`
  - Teacher navigation currently exposes Dashboard, My Students, Student Tasks.
- `src/app/teacher/students/page.tsx`, `src/app/teacher/submissions/page.tsx`
  - Existing student and submission destinations. Teacher guide/material access should be mapped before adding another navigation item.
- Product implication: the teacher home should answer, in order: which class is next, how to enter it, what topic/material to teach, and which reports/submissions need attention. Avoid adding a parallel teacher dashboard.

### Admin journey
- `src/app/admin/dashboard/page.tsx` and `src/features/dashboard/admin/DashboardShell.tsx`
  - Admin dashboard loads sessions, teachers, and students; shows operational metrics, search, create-session action, schedule/activity, and announcement management.
  - This is an operations dashboard. Keep it separate from student gamification.
- `src/app/admin/curriculum/page.tsx`
  - Curriculum workflow: create module, then edit/build and import lesson/topic/quiz content.
  - This should become a clear authoring workflow, with publishing/readiness status visible, rather than a dense feature hub.
- `src/app/admin/users/page.tsx`
  - User management loads students, teachers, and modules.
- Product implication: admin is for configuration and oversight; do not mix operational controls into teacher/student learning flows.

## Initial simplification decisions

### Keep
- Existing Next.js application and Supabase integration.
- Live class scheduling and join flow.
- Quest Map progression and its dark visual identity.
- LearningPath node engine and challenge/quiz capabilities.
- Teacher review/report workflow.
- XP, badges, certificates, and achievements where they reflect real learning.
- Parent Hub, billing, announcements, and administrative functions.

### Simplify first
1. Student dashboard hierarchy: one primary "kelas berikutnya / masuk kelas" card; one secondary "lanjutkan praktik/misi"; compact progress summary; move pet cosmetics, shop, certificate gallery and other collections to secondary destinations.
2. Teacher dashboard hierarchy: next class + enter class; teaching guide/topic context; pending reports/submissions. Keep the four schedule filters but avoid giving each equal visual weight.
3. Topic learning screen: use a short cycle of explain/demo → try → feedback → apply. Keep content interactive; do not turn it into long reading.
4. Admin dashboard: separate operational KPIs from schedule/announcement management; reduce repeated visual cards and excessive emphasis.
5. Shared navigation: preserve routes and role access; improve labels and mobile discoverability only after checking route coverage.

### Performance candidates (verify before changing)
- Student dashboard performs 7 parallel data fetches and then one dependent Quest Map fetch.
- Student dashboard and Quest Map independently load overlapping module/progress/certificate data across separate routes.
- Audit server query implementations for repeated Supabase round-trips, unbounded history, and oversized props before optimizing.
- Inspect animation/image payloads and client bundle before removing dependencies; do not remove Motion/animejs or gamification packages solely based on package presence.

## Safety / non-goals
- No database schema or data changes.
- No migrations, seed/reset/repair, or production access.
- No Vercel environment changes or deployments.
- No deletion of features until route references, permissions, tests, and user impact are traced.
- Do not change the Quest Map's intentional dark/fantasy aesthetic.
- Do not replace the existing lesson engine.
- Any future authenticated Preview QA must wait until Supabase Preview/Production isolation is confirmed.

## Next implementation slice
Implement only a reversible, UI-focused first slice:
1. Student dashboard: clarify next live class as the primary action and reduce secondary visual competition without deleting underlying features.
2. Teacher dashboard: make the class action and teaching context primary; surface the guide/material entry point only after confirming the existing route/data source.
3. Add/adjust focused component tests and run lint, test, TypeScript, build, and diff checks.
4. Review exact diff before opening/updating a PR. Do not merge or deploy automatically.
