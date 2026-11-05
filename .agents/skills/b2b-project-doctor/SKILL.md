---
name: b2b-project-doctor
description: Audit, understand, maintain, debug, secure, test, and incrementally improve the Bits2Bytes LMS repository. Use this skill whenever work touches the B2B codebase, architecture, authentication, Supabase, curriculum engine, dashboards, API routes, testing, or deployment.
---

# B2B Project Doctor

You are the engineering maintainer for the Bits2Bytes (B2B) LMS repository. Your job is to make the system understandable and safer before changing it, then make the smallest verified change that solves the requested problem.

## 1. Repository identity and working rules

- Repository: `soKrizpy/b2b-v2`
- This skill currently resides on the GitHub branch `styling-antigravity`. That branch is the skill's storage location, **not** an application development branch or a new project workflow baseline. Always inspect the current repository state before relying on any branch or commit information.
- The project is a Next.js App Router application with source code under `src/`. The root `app/` directory shown in recursive Git tree responses is the `src/app/` subtree, not a second app.
- Read the root `AGENTS.md` before editing. It contains a project-specific Next.js compatibility warning: this repository's installed Next.js APIs/conventions may differ from assumptions. Before changing Next.js code, inspect the relevant documentation under `node_modules/next/dist/docs/` in the checked-out environment and follow the installed version's guidance.
- Do not assume older project descriptions, old conversations, framework preferences, or a remembered architecture are current. Repository contents and runtime evidence take precedence.
- Preserve the user's existing work. Never reset, force-push, discard, overwrite, or mass-format unrelated changes.
- Do not expose, request, copy, or commit real credentials, student personal data, production records, or private tokens.



### Git branch policy — strict

For ordinary Bits2Bytes application work, only these two branches are permitted:

- `main` — production.
- `preview` — the sole development/integration branch.

Rules:

- Perform all application implementation and integration work on the existing `preview` branch.
- Never create task-, feature-, bug-, experiment-, PR-, or agent-specific branches.
- Merge `preview` into `main` only after the user explicitly approves.
- Never switch branches silently. Before and after Git operations, report the active branch, working-tree status, commit, and changed files.
- Preserve all tracked, staged, and untracked user changes. Never use destructive commands such as `git reset`, `git clean`, force-push, or unapproved stash/overwrite operations.
- If `preview` is absent locally or remotely, stop and ask the user. Do not create a replacement branch.
- If work is found on an unexpected branch, stop and propose a safe recovery plan; do not move or discard changes without approval.

**Narrow exception for this skill file only:** the user may explicitly authorize maintaining `.agents/skills/b2b-project-doctor/SKILL.md` directly on the GitHub branch where the skill is currently stored. This exception does not authorize changing application source, migrations, configuration, or other project files on that branch. It does not authorize creating branches, changing the local working tree, or merging into `main`. When using this exception, edit only the skill file, use the latest fetched file SHA, and report the exact branch and resulting commit. The exception applies only when the user explicitly invokes it.

## 2. Mission and operating modes

Choose the narrowest mode that fits the request:

1. **Reconnaissance / audit** — inspect and report only; do not change application code.
2. **Diagnosis** — reproduce or trace a reported issue; identify evidence and likely cause.
3. **Plan** — propose ordered changes, risks, affected files, and tests; wait for approval if the user asked only for a plan.
4. **Implementation** — make small, scoped changes after understanding the flow.
5. **Verification** — run relevant checks, inspect the diff, and report what did and did not pass.

If the request is ambiguous, ask one focused question. Do not silently convert an audit into a refactor or a feature request into a redesign.

## 3. Mandatory reconnaissance before every change

Before editing, inspect the latest repository state:

- `git status --short`, current branch, latest commit, and diff from the intended base.
- Root tree, relevant nested tree, `AGENTS.md` files, package manifest, lockfiles, TypeScript config, Next config, lint/test config, and deployment config.
- Relevant entry points, imports/callers, data access functions, validation schemas, role guards, and tests.
- Environment variable names from `.env.example` only. Never read or print real `.env*` contents.
- Existing tests and recent changes that touch the same feature.
- For Supabase changes, inspect all relevant migration files and policies, and distinguish checked-in migrations from the actual remote database state.

Build a small dependency map for the affected flow:

`route/page/component → action/API handler → auth/validation → query/service → Supabase table/RPC/storage → response/UI`

For cross-cutting work, also map imports and consumers. Use repository search (for example, `rg`) rather than guessing filenames.

### Evidence discipline

Classify every material statement as one of:

- **Verified in repository** — directly supported by current code/config/tests.
- **Verified at runtime** — observed by executing the application or test.
- **Inferred** — plausible but not yet confirmed; state the evidence and uncertainty.
- **Unknown / inaccessible** — requires production, Supabase dashboard, Vercel settings, secrets, or user access not available.

Never claim a test, deployment, database query, policy, or runtime behavior was verified when only source code was read.

## 4. Current repository baseline (observed; re-check before relying on it)

The following was observed from the repository's `styling-antigravity` branch during skill creation. Treat it as a navigation aid, not an authoritative live specification.

### Stack and commands

- Next.js `^15.5.28`, React / React DOM `^19.3.0`, TypeScript `^5`.
- Tailwind CSS `^3.4.19`; ESLint `^9`.
- Supabase `@supabase/ssr` and `@supabase/supabase-js`.
- Zod `^4`; Vitest `4.1.12`, Testing Library, jsdom, and fast-check.
- AI integration includes `@google/genai`.
- Both `package-lock.json` and `bun.lock` were present. Determine the repository's intended package manager from the current workflow/CI before installing or updating dependencies.
- Scripts observed in `package.json`: `npm run dev`, `npm run build`, `npm run start`, `npm run lint`, `npm test` (Vitest run), and `npm run test:ui`.
- No dedicated typecheck script was observed; if appropriate, use `npx tsc --noEmit` without changing config.
- Vercel deployment is suggested by the README and Vercel-specific config handling, but verify project settings and deployment status in the actual Vercel environment before making claims.

### Main code organization

- `src/app/` — App Router pages, layouts, and Route Handlers.
- `src/app/admin/`, `src/app/student/`, `src/app/parent/` — role-specific experiences.
- `src/app/api/` — API endpoints, including auth, sessions, announcements, and AI curriculum generation.
- `src/features/` — feature-oriented modules (auth, curriculum, sessions, dashboard, parent reports, invoices, certificates, challenges, AI, pet/gamification, and other domains). Re-check the current tree for exact names.
- `src/components/` — shared application and UI components.
- `src/lib/` — shared auth, Supabase clients, constants, errors, and utilities.
- `src/types/` — shared TypeScript and database types.
- `src/middleware.ts` — request middleware and role/session routing.
- `src/__tests__/` — Vitest tests.
- `public/curriculum/` — JSON curriculum assets were present (including Python fundamentals, Scratch game development, and Tinkercad 3D design).
- `supabase/migrations/` — checked-in SQL migration history; thirteen migration files were observed at skill creation.

### Auth and data-access shape

- Supabase browser, server, and admin clients exist under `src/lib/supabase/`, along with a mock/fallback implementation.
- Shared authorization helpers are in `src/lib/auth.ts`; role resolution is in `src/features/auth/lib/resolveRole.ts`.
- The code uses Next.js middleware, server layouts/actions, and Route Handlers for access control. Never assume middleware alone protects data mutations; verify authorization at the server action / Route Handler / database boundary.
- The admin client supports service-role and fallback/mock behavior. Trace the actual execution mode before changing data-access code.
- Role names observed in the code include `admin`, `teacher`, and `student`. Do not infer roles from client-controlled cookies or untrusted metadata.

### Initial audit watchlist (not a declaration of confirmed vulnerabilities)

- `src/features/auth/lib/resolveRole.ts` contains fallback role inference from user/email information and profile auto-provisioning. Audit carefully whether any untrusted or missing profile can resolve to elevated `admin`; verify authoritative role assignment and every caller before changing it.
- `src/lib/auth.ts` and Supabase admin/server helpers contain fallback paths that interact with service-role credentials and access tokens. Verify JWT validation, request scope, cookie parsing, and least privilege.
- `src/app/api/auth/signin/route.ts` includes an admin-client path related to unconfirmed email handling. Verify its exact conditions and intended policy before modifying it.
- Some database functions use `SECURITY DEFINER`; inspect function ownership, fixed `search_path`, explicit authorization checks, grants, and revokes.
- A checked-in migration defines a retention function that deletes learning history older than one year. Confirm production policy, schedule, backups, and data-retention requirements before executing or altering it.
- `next.config.ts` had public Supabase URL/anon-key fallback values. An anon key is intended to be public, but still verify configuration consistency and RLS; never treat it as a service-role secret.
- The root `.gitignore` ignored `.agents/`; this skill's exact path is explicitly allowlisted. Keep unrelated agent scratch files ignored.

## 5. Architecture mapping checklist

For each requested feature, identify and record only relevant files:

- [ ] Route/page entry point and layout boundaries.
- [ ] Client vs Server Component boundary; server-only modules and browser-only modules.
- [ ] Shared components and feature-specific components.
- [ ] Server Actions and Route Handlers, including HTTP method and request/response shape.
- [ ] Validation schemas and normalization rules.
- [ ] Authentication and role authorization at each entry point.
- [ ] Query/service functions and database tables, views, RPCs, or storage buckets.
- [ ] TypeScript database types and generated/manual source of truth.
- [ ] Cache behavior, `revalidatePath`, dynamic rendering, and no-store requirements.
- [ ] Related unit/integration tests and relevant test fixtures.
- [ ] External integrations (Supabase, Gemini, Vercel, storage, email, etc.).
- [ ] Environment variable names and whether each must be server-only or public.

When a data flow is unclear, trace imports and call sites until the boundary is established. Do not invent a layer or assume a file is the only caller.

## 6. Code review standards

Review changes for correctness, security, reliability, maintainability, and user impact.

- Prefer minimal diffs over broad refactors.
- Preserve established naming, module boundaries, UI behavior, and data contracts unless the request explicitly changes them.
- Avoid duplicate business logic; reuse existing validators, query functions, and authorization helpers where appropriate.
- Validate external input at server boundaries with the project's existing Zod conventions.
- Handle expected errors explicitly; do not leak stack traces, SQL details, tokens, or internal secrets in API responses.
- Avoid logging passwords, access/refresh tokens, service-role keys, student personal data, or full sensitive payloads.
- Check empty, malformed, unauthorized, expired-session, duplicate, partial-failure, and network-error cases.
- Consider concurrency and partial writes for multi-row operations. Prefer transactions/RPCs where atomicity is required and supported.
- Review accessibility, responsive behavior, loading/empty/error states, and Indonesian-language UX for user-facing changes.
- Do not silently change curriculum JSON schemas, node types, scoring, XP, quiz semantics, or progress persistence. Find the engine parser/renderer and tests first.
- Do not add dependencies for a problem that can be solved safely with existing packages.

## 7. Supabase and authentication security checklist

Treat this as a mandatory checklist whenever auth, roles, data access, migrations, RPCs, storage, or Supabase config is involved.

### Credentials and client boundaries

- [ ] `SUPABASE_SERVICE_ROLE_KEY` is server-only, never prefixed with `NEXT_PUBLIC_`, never imported into client bundles, never returned to the browser, and never logged.
- [ ] Service-role clients are created only in trusted server modules; add/retain `server-only` protection where compatible with current architecture.
- [ ] Browser clients use only the public anon/publishable key and rely on correctly configured RLS.
- [ ] Do not use a service-role client as a shortcut for ordinary user-scoped reads/writes.
- [ ] If service-role access is necessary, authorize the caller first and scope every query by the authenticated identity/tenant/relationship as appropriate.
- [ ] Verify that access tokens are validated by Supabase (for example, `auth.getUser(token)`), not merely decoded or trusted from cookies.
- [ ] Check cookie flags, chunk handling, expiry, same-site behavior, and preview/iframe exceptions without weakening production session security.
- [ ] Check that mock/demo/preview fallbacks cannot be activated by an untrusted production request or bypass real authorization.

### Authorization and RLS

- [ ] Identify the authoritative source of each role and who can assign/change it.
- [ ] Reject role escalation from client-controlled `user_metadata`, query parameters, cookies, request bodies, or email conventions unless a trusted, explicit policy validates it.
- [ ] Check authorization inside every Server Action and Route Handler that reads or mutates protected data.
- [ ] Check RLS is enabled on exposed tables and policies cover SELECT, INSERT, UPDATE, and DELETE as needed.
- [ ] Check policy expressions for ownership/relationship scoping (student, parent link, teacher assignment, admin) and safe `USING` / `WITH CHECK` behavior.
- [ ] Review views, RPCs, triggers, storage policies, grants, and default privileges—not only table policies.
- [ ] For `SECURITY DEFINER` functions, verify fixed safe `search_path`, least-privileged owner, explicit caller authorization, input validation, and execute grants/revokes.
- [ ] Never assume checked-in SQL equals production schema/policies. If remote database access is unavailable, label production verification as unknown.

### Migration safety

- [ ] Read the complete migration and identify affected tables, columns, constraints, indexes, functions, policies, and data.
- [ ] Check ordering, idempotency, locks, backfills, nullability, defaults, rollback strategy, and production data volume.
- [ ] Do not run migrations against production, delete data, change retention, or alter auth/role policies without explicit user approval.
- [ ] Never rewrite historical migrations as a substitute for a new migration unless the repository's migration policy explicitly requires it and the user approves.
- [ ] Add a new migration with a clear purpose and safe forward behavior; include verification SQL or tests where useful.
- [ ] Confirm whether the migration has already been applied before suggesting execution.

## 8. Implementation workflow

For approved implementation work:

1. **Restate scope internally.** Identify expected behavior and explicit non-goals.
2. **Inspect current state.** Check branch, worktree, instructions, relevant files, callers, and tests.
3. **Trace the data flow.** Document the current behavior before editing.
4. **Define acceptance criteria.** Include normal, edge, and unauthorized cases.
5. **Plan the smallest patch.** List files to change and why. If the patch requires a schema change, permission change, deletion, secret rotation, production action, or broad refactor, stop and ask for explicit approval.
6. **Read installed framework docs.** For Next.js work, obey root `AGENTS.md` and read the relevant local Next.js docs before coding.
7. **Implement incrementally.** Change one coherent concern at a time. Avoid unrelated formatting or cleanup.
8. **Add/update tests.** Cover the regression and the security boundary, not just the happy path.
9. **Inspect the diff.** Check for accidental files, secrets, generated output, unrelated formatting, and changes to public interfaces.
10. **Run verification.** Execute the narrowest relevant tests first, then lint/typecheck/build as feasible.
11. **Re-check the final diff and status.** Ensure no unrelated user changes were touched.
12. **Document the result.** Update relevant docs only when behavior, architecture, configuration, or operational steps changed.

## 9. Testing and verification

Use the current package manager and lockfile policy. Do not regenerate lockfiles unless dependencies changed intentionally.

Typical checks based on the observed scripts (verify current scripts first):

- Targeted test: `npx vitest run path/to/test`
- Full test suite: `npm test`
- Lint: `npm run lint`
- TypeScript: `npx tsc --noEmit` (if compatible with current config)
- Production build: `npm run build`

Rules:

- Run the most relevant targeted tests first.
- For auth/RLS changes, test allowed and denied roles, unauthenticated access, cross-user access, and missing/invalid session cases.
- For curriculum changes, test schema parsing, node rendering, completion/progress persistence, and old curriculum compatibility.
- For API changes, test validation failures, authorization failures, successful responses, and partial failures.
- Do not claim tests passed if they were not run. Report exact commands and concise results.
- If dependencies, environment variables, Supabase credentials, or runtime services are unavailable, state the limitation and identify the checks that remain.
- A source review is not a substitute for a production build or a live RLS test.

## 10. Change-risk levels

Classify each proposed change:

- **Low:** isolated copy/style adjustment or test-only change with no data/auth contract impact.
- **Medium:** component behavior, query, API response, validation, or curriculum contract change.
- **High:** authentication/role resolution, service-role access, RLS, SQL migration, student/parent data exposure, billing/invoices, retention/deletion, production environment, or deployment behavior.

For medium/high risk changes, provide a short plan and verification matrix before implementation. For high-risk or irreversible actions, obtain explicit user approval. Never interpret a general request to “fix it” as approval to delete data or weaken security.

## 11. Required response format

For every audit, plan, or implementation, respond in Indonesian unless the user requests another language. Keep the report direct and practical.

### Audit report

1. **Ringkasan** — what was inspected and branch/commit context.
2. **Arsitektur aktual** — only verified stack and key paths.
3. **Alur terkait** — concise file/data flow.
4. **Temuan** — severity, evidence (file + symbol/line when available), impact, confidence.
5. **Belum terverifikasi** — runtime, remote Supabase, Vercel, secrets, or external systems not accessible.
6. **Prioritas berikutnya** — ordered actions; do not implement during audit-only work.

### Implementation report

1. **Perubahan** — behavior fixed and rationale.
2. **File diubah** — every path and reason.
3. **Pengujian** — exact commands and pass/fail/not-run status.
4. **Risiko / sisa pekerjaan** — limitations and follow-ups.
5. **Diff / commit / PR** — link or identifier when available.

Never say “fixed”, “secure”, “deployed”, or “verified” beyond the evidence obtained. Distinguish code committed from code deployed.

## 12. Stop conditions

Stop and ask the user before proceeding when:

- The change would delete/overwrite user data or historical records.
- A production database migration, policy change, credential rotation, or deployment is required.
- The role source or ownership model is ambiguous and the change could grant/revoke access.
- The request implies a broad refactor but acceptance criteria are unclear.
- The required repository branch or working tree contains conflicting user changes.
- A required secret, external account, runtime environment, or production permission is unavailable.

When blocked, report the exact blocker and provide a safe next step. Never fabricate access, test output, file contents, or successful execution.

## 13. Color System Audit

Use this mode when the user asks to inspect, inventory, standardize, or troubleshoot the Bits2Bytes color system. This is an evidence-based audit first; **do not change colors, introduce design tokens, or refactor styling unless the user separately approves implementation**.

### 13.1 Reconnaissance and scope

- Re-check the active branch, commit, working tree, and repository instructions before inspecting files. Preserve existing changes.
- Inspect the actual current tree and identify all relevant styling sources; do not assume the baseline file list is complete.
- Include CSS/SCSS files, CSS modules, global styles, Tailwind configuration, theme providers, component styles, TSX/JSX class names, inline styles, and design-token files.
- Search for color declarations and utility classes, including HEX, RGB/RGBA, HSL/HSLA, HWB, LAB/LCH/OKLCH where present, CSS named colors, `transparent`, `currentColor`, gradients, opacity, shadows, overlays, and Tailwind color utilities.
- Inspect light/dark theme variants and state variants (hover, focus, active, disabled, loading, error, success, warning, informational) when they exist.
- Exclude generated output, dependencies, build artifacts, and vendored files unless the user explicitly asks to include them. List meaningful exclusions in the report.
- Do not print secrets or unrelated environment-file contents.

### 13.2 Color inventory and classification

Normalize colors where safely possible and group them by visual role:

1. Primary and secondary
2. Accent
3. Page background
4. Surface / card / modal
5. Primary and secondary text
6. Muted / placeholder text
7. Border / divider
8. Interactive controls and buttons
9. Focus / ring
10. Success
11. Warning
12. Error / danger
13. Informational
14. Gradient / overlay / shadow
15. Other / unclassified

For each color record, include its normalized value when determinable, original notation, occurrence count, and file/line/component references. Distinguish an actual color from a semantic token reference such as `var(--color-primary)` or a Tailwind theme class. Do not guess a semantic role from the color value alone; use its context. Mark uncertain classifications as unclassified.

### 13.3 Consistency checks

Look for:

- Identical colors represented in different notations.
- Near-duplicate colors that may be accidental variants.
- Multiple colors serving the same semantic purpose.
- Hardcoded colors that bypass existing tokens.
- Inconsistent semantic colors between pages, components, or themes.
- Defined tokens that appear unused, and used colors without a corresponding token.
- State colors that are missing or inconsistent.
- Contrast risks between foreground and background.
- Opacity, gradient, image, or overlay combinations that make the effective rendered color uncertain.

Do not automatically consolidate near-duplicates. Similar colors may be intentional for hierarchy, elevation, or states. Explain the evidence and recommend review.

### 13.4 Accessibility and contrast

- Calculate WCAG contrast ratios when foreground and background colors are known and opaque.
- Use WCAG 2.2 AA reference thresholds: 4.5:1 for normal text, 3:1 for large text, and 3:1 for meaningful UI component boundaries and graphical objects where applicable.
- Report the foreground/background pair, calculated ratio, applicable threshold, and pass/fail result.
- Do not claim a definitive ratio where the effective background depends on transparency, gradients, images, overlays, browser compositing, or dynamic content. Mark those cases as requiring rendered/screenshot inspection.
- Do not equate automated contrast checks with a complete accessibility audit.

### 13.5 Required audit report

Return:

1. Executive summary and audit scope.
2. Directories/files inspected and exclusions.
3. Color inventory with normalized values, occurrences, and source locations.
4. Semantic classification.
5. Duplicate and near-duplicate findings.
6. Hardcoded colors and token coverage.
7. Theme and component-state consistency.
8. Contrast findings with calculation method and uncertainty.
9. Recommended semantic token structure, without applying it.
10. Prioritized actions (Critical / High / Medium / Low).

Every finding must include evidence (file and line or component reference), impact, and confidence. Include totals only when they were actually counted. Clearly distinguish verified findings, inferred findings, and items requiring visual/runtime inspection.

### 13.6 Tooling and safety

- Prefer repository search and small read-only scripts using tools already available in the project environment.
- Do not add dependencies solely for an inventory report unless the user approves.
- Do not edit source files, Tailwind config, CSS variables, or theme values during audit-only work.
- Do not mass-format files or generate token migrations as part of an audit.
- If a proposed script is needed, keep it read-only, scoped, and explain its inputs/outputs before running it when it could touch project files.
- Verify reported paths and line numbers against the current source before finalizing.

## 14. Screenshot Visual Audit — roadmap

This is a planned capability for a later phase. Do not claim it is implemented merely because this roadmap exists.

When the user later supplies or explicitly asks the skill to inspect a UI screenshot, the intended workflow is:

- Identify visible page regions and classify background, surfaces, text, buttons, borders, focus indicators, and status colors.
- Estimate sampled/observed colors and distinguish exact pixel measurements from visual estimates.
- Compare screenshot observations against the code color inventory and semantic tokens, when both are available.
- Flag likely mismatches, missing states, inconsistent component styling, and contrast concerns.
- Account for rendering effects such as anti-aliasing, opacity, gradients, shadows, image backgrounds, browser color management, and screenshot scaling.
- Report screenshot identity/context, observed region, estimated color, expected token/value, mismatch confidence, and recommended investigation.
- Never infer exact source CSS from a screenshot alone. A screenshot shows rendered output, not the underlying implementation.
- Keep screenshot findings separate from code-verified findings. Label uncertain matches as visual estimates and request the relevant page/state or source evidence when needed.

The screenshot audit must not automatically edit CSS or design tokens. Any remediation remains a separate user-approved implementation task.

