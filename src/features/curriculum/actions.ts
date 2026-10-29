// src/features/curriculum/actions.ts
// Admin Server Actions: JSON bulk import/export + delete (module/topic).
// 'use server' files may ONLY export async functions — all schemas and types
// live in ./validation.ts.
'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getActiveChallengeIds, isValidActiveChallengeIds } from '@/features/challenges/activeChallengeIds';
import { getAllModulesWithTopics } from './queries';
import {
  curriculumJsonSchema,
  encodeFinalAssessment,
  extractFinalAssessment,
  extractTopicQuiz,
  moduleImportSchema,
  normalizeTopicChallenges,
  type ModuleImport,
  type NodeImport,
} from './validation';
import { getInstructionalSlides, hasAuthoredLessonContent, MIN_LESSON_SLIDES, MAX_LESSON_SLIDES } from './lessonSlides';

// ── Return type ───────────────────────────────────────────────────────────────
// Exported as a type — allowed in 'use server' files (type exports are erased
// at runtime and do not violate the async-function-only constraint).

export type CurriculumActionResult =
  | { success: true; message: string; stats?: { modules: number; topics: number } }
  | { success: false; error: string; fields?: Record<string, string> };

// ── Private helpers ───────────────────────────────────────────────────────────

function nodeToLearningNode(n: NodeImport) {
  const typeMap: Record<string, string> = {
    theory:    'lesson',
    quiz:      'quiz',
    challenge: 'challenge',
    code:      'code',
    practice:  'practice',
    lesson:    'lesson',
  };
  return {
    id:            n.node_id,
    order:         n.order,
    type:          typeMap[n.type] ?? n.type,
    title:         n.title,
    xp:            n.xp,
    explanation:   n.content,
    instructions:  n.instructions,
    options:       n.options,
    correctOption: n.correct_option,
    content:       n.content,
    ...(n.code_content && {
      code: { language: n.code_language ?? 'text', content: n.code_content },
    }),
  };
}

function buildLessonContent(
  topic: ModuleImport['topics'][number],
  existing: unknown
): Record<string, unknown> {
  const previous = existing && typeof existing === 'object' && !Array.isArray(existing)
    ? existing as Record<string, unknown>
    : {};
  const lessonContent: Record<string, unknown> = {
    ...previous,
    learningPath: topic.nodes.map(nodeToLearningNode),
  };

  if (topic.quiz !== undefined) lessonContent.quiz = topic.quiz;
  if (topic.challenge !== undefined) {
    lessonContent.challenge = normalizeTopicChallenges(topic.challenge);
  }
  return lessonContent;
}

async function persistTopicChallenges(
  db: ReturnType<typeof createSupabaseAdminClient>,
  topicId: number,
  challengeInput: ModuleImport['topics'][number]['challenge'],
  existing: Array<{
    id: number;
    order_index: number;
    title: string;
    instructions: string | null;
    allows_file_upload: boolean;
  }>
): Promise<{ error: string | null; activeIds: number[] | undefined }> {
  const definitions = normalizeTopicChallenges(challengeInput);
  if (!definitions?.length) return { error: null, activeIds: undefined };

  const usedIds = new Set<number>();
  const activeIds: number[] = [];
  for (const [index, challenge] of definitions.entries()) {
    const allowsFileUpload = challenge.submission_type === 'file';
    const matching = existing.find((row) =>
      !usedIds.has(row.id)
      && row.title === challenge.title
      && (row.instructions ?? '') === challenge.instructions
      && row.allows_file_upload === allowsFileUpload
    );
    if (matching) {
      usedIds.add(matching.id);
      activeIds.push(matching.id);
      continue;
    }

    const { data: inserted, error } = await (db.from('challenges')
      .insert({
        topic_id: topicId,
        title: challenge.title,
        instructions: challenge.instructions,
        order_index: index,
        allows_file_upload: allowsFileUpload,
      } as never)
      .select('id')
      .single() as unknown as Promise<{ data: { id: number } | null; error: { message: string } | null }>);
    if (error || !inserted) {
      return { error: error?.message ?? 'ID challenge tidak dikembalikan.', activeIds: undefined };
    }
    activeIds.push(inserted.id);
  }

  // Keep historical rows intact; the topic JSONB sidecar controls visibility.
  return { error: null, activeIds };
}

function importFailure(message: string, writeStarted: boolean): CurriculumActionResult {
  return {
    success: false,
    error: writeStarted
      ? `${message} Import tidak transaksional; perubahan parsial mungkin sudah tersimpan. Periksa hasilnya lalu jalankan ulang JSON yang sama untuk melanjutkan dengan aman.`
      : message,
  };
}

const REVALIDATE_PATHS = ['/admin/curriculum', '/admin/dashboard', '/student/lessons'];
function revalidateAll() {
  revalidateTag('curriculum');
  REVALIDATE_PATHS.forEach((p) => revalidatePath(p, 'layout'));
}

// ── importCurriculumJson ──────────────────────────────────────────────────────

export async function importCurriculumJson(
  payload: unknown
): Promise<CurriculumActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.message };

  const parsed = curriculumJsonSchema.safeParse(payload);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const firstFormError  = flat.formErrors[0];
    const firstFieldError = Object.values(flat.fieldErrors)[0];
    const msg = firstFormError
      ?? (Array.isArray(firstFieldError) ? firstFieldError[0] : null)
      ?? 'Format JSON tidak valid. Periksa struktur dan tipe data.';
    return { success: false, error: msg as string };
  }

  const modules = parsed.data;
  const db = createSupabaseAdminClient();
  let importedModules = 0;
  let importedTopics  = 0;
  let writeStarted = false;

  type ExistingTopic = { id: number; title: string; lesson_content: unknown; project_link: string | null };
  type ExistingChallenge = { id: number; order_index: number; title: string; instructions: string | null; allows_file_upload: boolean };
  type TopicPlan = { topic: ModuleImport['topics'][number]; existingTopic?: ExistingTopic; existingChallenges: ExistingChallenge[] };
  type ModulePlan = { mod: ModuleImport; existingId?: number; topics: TopicPlan[] };

  try {
    // Preflight every read needed by the complete payload before the first write.
    const { data: existingModules, error: modulesReadError } = await (db
      .from('modules')
      .select('id, title') as unknown as Promise<{
        data: Array<{ id: number; title: string }> | null;
        error: { message: string } | null;
      }>);
    if (modulesReadError || !existingModules) {
      return importFailure(`Gagal membaca modul yang sudah ada: ${modulesReadError?.message ?? 'data tidak tersedia.'}`, false);
    }

    const moduleIds = new Map(existingModules.map((row) => [row.title.toLowerCase().trim(), row.id]));
    const plans: ModulePlan[] = [];
    for (const mod of modules) {
      const existingId = moduleIds.get(mod.module_title.trim().toLowerCase());
      let existingTopics: ExistingTopic[] = [];
      if (existingId !== undefined) {
        const { data, error } = await (db.from('topics')
          .select('id, title, lesson_content, project_link')
          .eq('module_id', existingId) as unknown as Promise<{ data: ExistingTopic[] | null; error: { message: string } | null }>);
        if (error || !data) {
          return importFailure(`Gagal membaca topik modul "${mod.module_title}": ${error?.message ?? 'data tidak tersedia.'}`, false);
        }
        existingTopics = data;
      }

      const topics = mod.topics.map((topic) => ({
        topic,
        existingTopic: existingTopics.find((row) => row.title.toLowerCase().trim() === topic.topic_title.trim().toLowerCase()),
        existingChallenges: [] as ExistingChallenge[],
      }));
      for (const topicPlan of topics) {
        if (topicPlan.existingTopic && topicPlan.topic.challenge !== undefined) {
          const { data, error } = await (db.from('challenges')
            .select('id, order_index, title, instructions, allows_file_upload')
            .eq('topic_id', topicPlan.existingTopic.id)
            .order('order_index', { ascending: true }) as unknown as Promise<{ data: ExistingChallenge[] | null; error: { message: string } | null }>);
          if (error || !data) {
            return importFailure(`Gagal membaca challenge topik "${topicPlan.topic.topic_title}": ${error?.message ?? 'data tidak tersedia.'}`, false);
          }
          topicPlan.existingChallenges = data;
        }
      }
      plans.push({ mod, existingId, topics });
    }

    for (const plan of plans) {
      const normalizedTitle = plan.mod.module_title.trim();
      let moduleId = plan.existingId;
      if (moduleId !== undefined) {
        const moduleUpdate: Record<string, unknown> = {
          level: plan.mod.level,
          gamification_type: plan.mod.gamification_type,
        };
        if (plan.mod.final_assessment) moduleUpdate.description = encodeFinalAssessment(plan.mod.final_assessment);
        else if (plan.mod.description !== undefined) moduleUpdate.description = plan.mod.description;
        writeStarted = true;
        const { error } = await (db.from('modules').update(moduleUpdate as never).eq('id', moduleId) as unknown as Promise<{ error: { message: string } | null }>);
        if (error) return importFailure(`Gagal memperbarui modul "${normalizedTitle}": ${error.message}`, writeStarted);
      } else {
        writeStarted = true;
        const { data, error } = await (db.from('modules').insert({
          title: normalizedTitle,
          description: plan.mod.final_assessment ? encodeFinalAssessment(plan.mod.final_assessment) : (plan.mod.description ?? null),
          level: plan.mod.level,
          gamification_type: plan.mod.gamification_type,
        } as never).select('id').single() as unknown as Promise<{ data: { id: number } | null; error: { message: string } | null }>);
        if (error || !data) return importFailure(`Gagal membuat modul "${normalizedTitle}": ${error?.message ?? 'ID modul tidak dikembalikan.'}`, writeStarted);
        moduleId = data.id;
      }
      importedModules++;

      for (const topicPlan of plan.topics) {
        const { topic, existingTopic } = topicPlan;
        const topicTitle = topic.topic_title.trim();
        const lessonContent = buildLessonContent(topic, existingTopic?.lesson_content ?? null);
        const lessonReady = hasAuthoredLessonContent(getInstructionalSlides(lessonContent.learningPath));
        const topicValues: Record<string, unknown> = {
          order_index: topic.topic_order,
          project_link: topic.project_link !== undefined ? (topic.project_link || null) : existingTopic?.project_link,
          lesson_content: lessonContent,
          status: lessonReady ? 'published' : 'draft',
          published_at: lessonReady ? new Date().toISOString() : null,
        };
        if (topic.description !== undefined) topicValues.description = topic.description;

        let topicId = existingTopic?.id;
        if (topicId === undefined) {
          writeStarted = true;
          const { data, error } = await (db.from('topics').insert({
            module_id: moduleId,
            title: topicTitle,
            description: topic.description ?? null,
            project_link: topic.project_link || null,
            ...topicValues,
          } as never).select('id').single() as unknown as Promise<{ data: { id: number } | null; error: { message: string } | null }>);
          if (error || !data) return importFailure(`Gagal membuat topik "${topicTitle}": ${error?.message ?? 'ID topik tidak dikembalikan.'}`, writeStarted);
          topicId = data.id;
        }

        if (topic.challenge !== undefined) {
          writeStarted = true;
          const persisted = await persistTopicChallenges(db, topicId, topic.challenge, topicPlan.existingChallenges);
          if (persisted.error) return importFailure(`Gagal menyimpan challenge topik "${topicTitle}": ${persisted.error}`, writeStarted);
          lessonContent.activeChallengeIds = persisted.activeIds ?? [];
          topicValues.lesson_content = lessonContent;
        }

        // Existing topics are written after challenge definitions so their active-ID
        // sidecar is committed with the imported topic content. New topics need this
        // final update only when challenge IDs were generated.
        if (existingTopic || topic.challenge !== undefined) {
          writeStarted = true;
          const { error } = await (db.from('topics').update(topicValues as never).eq('id', topicId) as unknown as Promise<{ error: { message: string } | null }>);
          if (error) return importFailure(`Gagal memperbarui topik "${topicTitle}": ${error.message}`, writeStarted);
        }
        importedTopics++;
      }
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return importFailure(`Import gagal: ${detail}`, writeStarted);
  }

  revalidateAll();
  return {
    success: true,
    message: `Import berhasil! ${importedModules} modul, ${importedTopics} topik diproses.`,
    stats: { modules: importedModules, topics: importedTopics },
  };
}

// ── exportCurriculumJson ──────────────────────────────────────────────────────

export async function exportCurriculumJson(): Promise<
  | { success: true; data: unknown }
  | { success: false; error: string }
> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.message };

  const modules = await getAllModulesWithTopics();
  const topicIds = modules.flatMap((module) => module.topics.map((topic) => topic.id));
  const db = createSupabaseAdminClient();
  const { data: challengeRows, error: challengeReadError } = topicIds.length
    ? await (db.from('challenges')
        .select('id, topic_id, title, instructions, order_index, allows_file_upload')
        .in('topic_id', topicIds)
        .order('order_index', { ascending: true }) as unknown as Promise<{
          data: Array<{ id: number; topic_id: number; title: string; instructions: string | null; order_index: number; allows_file_upload: boolean }> | null;
          error: { message: string } | null;
        }>)
    : { data: [], error: null };
  if (challengeReadError || !challengeRows) {
    return { success: false, error: `Gagal membaca challenge kurikulum: ${challengeReadError?.message ?? 'data tidak tersedia.'}` };
  }

  const supportedTypes = new Set(['lesson', 'theory', 'quiz', 'challenge', 'code', 'practice']);
  for (const curriculumModule of modules) {
    if (curriculumModule.description?.startsWith('FINAL_ASSESSMENT:') && !extractFinalAssessment(curriculumModule.description)) {
      return { success: false, error: `Final assessment pada modul "${curriculumModule.title}" tidak valid; export dihentikan agar data tidak hilang.` };
    }
    for (const topic of curriculumModule.topics) {
      const lessonContent = topic.lesson_content as { learningPath?: unknown; quiz?: unknown } | null;
      if (!isValidActiveChallengeIds(lessonContent)) {
        return { success: false, error: `Metadata challenge aktif pada topik "${topic.title}" tidak valid; export dihentikan agar visibilitas tidak berubah diam-diam.` };
      }
      if (lessonContent?.learningPath !== undefined && !Array.isArray(lessonContent.learningPath)) {
        return { success: false, error: `Learning path pada topik "${topic.title}" tidak valid; export dihentikan agar materi tidak hilang.` };
      }
      if (Array.isArray(lessonContent?.learningPath)) {
        for (const [index, rawNode] of lessonContent.learningPath.entries()) {
          if (!rawNode || typeof rawNode !== 'object' || Array.isArray(rawNode)) {
            return { success: false, error: `Node materi ke-${index + 1} pada topik "${topic.title}" tidak valid.` };
          }
          const type = (rawNode as Record<string, unknown>).type;
          if (typeof type === 'string' && !supportedTypes.has(type)) {
            return { success: false, error: `Tipe node "${type}" pada topik "${topic.title}" belum didukung export.` };
          }
        }
      }
      const rawQuiz = lessonContent?.quiz;
      if (rawQuiz !== undefined && !Array.isArray(rawQuiz)) {
        return { success: false, error: `Quiz pada topik "${topic.title}" tidak valid; export dihentikan agar soal tidak hilang.` };
      }
      if (Array.isArray(rawQuiz) && extractTopicQuiz(lessonContent).length !== rawQuiz.length) {
        return { success: false, error: `Quiz pada topik "${topic.title}" tidak valid; export dihentikan agar soal tidak hilang.` };
      }
    }
  }
  const challengeMap = new Map<number, typeof challengeRows>();
  for (const challenge of challengeRows) {
    const rows = challengeMap.get(challenge.topic_id) ?? [];
    rows.push(challenge);
    challengeMap.set(challenge.topic_id, rows);
  }

  const payload = modules.map((mod) => ({
    module_title:      mod.title ?? '',
    module_order:      0,
    description:       mod.description?.startsWith('FINAL_ASSESSMENT:') ? undefined : mod.description ?? undefined,
    level:             (mod.level as ModuleImport['level']) ?? 'beginner',
    gamification_type: (mod.gamification_type as ModuleImport['gamification_type']) ?? 'mimo',
    final_assessment:  extractFinalAssessment(mod.description ?? null) ?? undefined,
    topics: mod.topics.map((topic) => {
      const lc       = topic.lesson_content as { learningPath?: unknown[]; quiz?: unknown; challenge?: unknown } | null;
      const rawNodes = lc?.learningPath ?? [];

      const nodes: NodeImport[] = rawNodes.map((n: unknown, idx: number) => {
        const node       = n as Record<string, unknown>;
        const typeRevMap: Record<string, NodeImport['type']> = {
          lesson: 'theory', quiz: 'quiz', challenge: 'challenge',
          code: 'code', practice: 'practice',
        };
        const rawType = (node.type as string) ?? 'lesson';
        return {
          node_id:        (node.id as string) ?? `node-${idx + 1}`,
          order:          Number.isInteger(node.order) ? node.order as number : idx,
          type:           typeRevMap[rawType] ?? (['theory', 'lesson', 'quiz', 'challenge', 'code', 'practice'].includes(rawType) ? rawType as NodeImport['type'] : 'theory'),
          title:          (node.title as string) ?? '',
          content:        (node.explanation as string) ?? (node.content as string) ?? undefined,
          instructions:   (node.instructions as string) ?? undefined,
          options:        Array.isArray(node.options) ? (node.options as string[]) : undefined,
          correct_option: (node.correctOption as string) ?? undefined,
          xp:             typeof node.xp === 'number' ? node.xp : 0,
          code_content:   (node.code as Record<string, string> | undefined)?.content,
          code_language:  (node.code as Record<string, string> | undefined)?.language,
        };
      });

      const allStoredChallenges = challengeMap.get(topic.id) ?? [];
      const activeChallengeIds = getActiveChallengeIds(lc);
      const storedChallenges = activeChallengeIds === undefined
        ? allStoredChallenges
        : [...allStoredChallenges]
          .filter((challenge) => activeChallengeIds.includes(challenge.id))
          .sort((a, b) => activeChallengeIds.indexOf(a.id) - activeChallengeIds.indexOf(b.id));
      const lessonSidecar = Array.isArray(lc?.challenge)
        ? lc.challenge as Array<{ xp?: unknown }>
        : lc?.challenge && typeof lc.challenge === 'object'
          ? [lc.challenge as { xp?: unknown }]
          : [];
      const challenges = storedChallenges.map((challenge, index) => ({
        title: challenge.title,
        instructions: challenge.instructions ?? '',
        submission_type: challenge.allows_file_upload ? 'file' as const : 'link' as const,
        xp: lessonSidecar[index]?.xp ?? 30,
      }));

      return {
        topic_title:  topic.title,
        topic_order:  topic.order_index,
        description:  topic.description ?? undefined,
        project_link: topic.project_link ?? undefined,
        nodes,
        ...(extractTopicQuiz(lc).length > 0 && { quiz: extractTopicQuiz(lc) }),
        challenge: challenges.length === 0
          ? (activeChallengeIds === undefined ? undefined : [])
          : challenges.length === 1 ? challenges[0] : challenges,
      };
    }),
  }));

  const validatedPayload = curriculumJsonSchema.safeParse(payload);
  if (!validatedPayload.success) {
    return { success: false, error: 'Data kurikulum tidak memenuhi format export; proses dihentikan agar konten tidak hilang.' };
  }
  return { success: true, data: validatedPayload.data };
}

// ── deleteModule ──────────────────────────────────────────────────────────────

export async function deleteModule(
  _prev: CurriculumActionResult | null,
  formData: FormData
): Promise<CurriculumActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.message };

  const id = Number(formData.get('id'));
  if (!id) return { success: false, error: 'ID modul tidak valid.' };

  const db = createSupabaseAdminClient();

  const { data: topics } = await (db
    .from('topics').select('id').eq('module_id', id) as unknown as Promise<{
      data: Array<{ id: number }>;
      error: unknown;
    }>);

  const topicIds = (topics ?? []).map((t) => t.id);

  if (topicIds.length > 0) {
    await (db.from('challenges').delete().in('topic_id', topicIds) as unknown as Promise<unknown>);
    const { data: quizzes } = await (db
      .from('quizzes').select('id').in('topic_id', topicIds) as unknown as Promise<{
        data: Array<{ id: number }>;
        error: unknown;
      }>);
    const quizIds = (quizzes ?? []).map((q) => q.id);
    if (quizIds.length) await (db.from('quiz_questions').delete().in('quiz_id', quizIds) as unknown as Promise<unknown>);
    if (quizIds.length) await (db.from('quizzes').delete().in('id', quizIds) as unknown as Promise<unknown>);
    await (db.from('topics').delete().in('id', topicIds) as unknown as Promise<unknown>);
  }

  const { error } = await (db
    .from('modules').delete().eq('id', id) as unknown as Promise<{
      error: { message: string } | null;
    }>);

  if (error) return { success: false, error: error.message };
  revalidateAll();
  return { success: true, message: 'Modul berhasil dihapus.' };
}

// ── deleteTopic ───────────────────────────────────────────────────────────────

export async function deleteTopic(
  _prev: CurriculumActionResult | null,
  formData: FormData
): Promise<CurriculumActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.message };

  const id = Number(formData.get('id'));
  if (!id) return { success: false, error: 'ID topik tidak valid.' };

  const db = createSupabaseAdminClient();
  await (db.from('challenges').delete().eq('topic_id', id) as unknown as Promise<unknown>);
  const { error } = await (db
    .from('topics').delete().eq('id', id) as unknown as Promise<{
      error: { message: string } | null;
    }>);

  if (error) return { success: false, error: error.message };
  revalidateAll();
  return { success: true, message: 'Topik berhasil dihapus.' };
}


// ── createModuleAction ────────────────────────────────────────────────────────

export async function createModuleAction(
  _prev: CurriculumActionResult | null,
  formData: FormData
): Promise<CurriculumActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.message };

  const title            = (formData.get('title') as string | null)?.trim();
  const description      = (formData.get('description') as string | null)?.trim() || null;
  const level            = (formData.get('level') as string) || 'beginner';
  const gamification_type = (formData.get('gamification_type') as string) || 'mimo';

  if (!title) return { success: false, error: 'Judul modul wajib diisi.', fields: { title: 'Wajib diisi.' } };

  const db = createSupabaseAdminClient();
  const { error } = await (db
    .from('modules')
    .insert({ title, description, level, gamification_type } as never)
    .select('id')
    .single() as unknown as Promise<{ data: { id: number } | null; error: { message: string } | null }>);

  if (error) return { success: false, error: error.message };
  revalidateAll();
  return { success: true, message: `Modul "${title}" berhasil dibuat.`, stats: { modules: 1, topics: 0 } };
}

// ── updateModuleAction ────────────────────────────────────────────────────────

export async function updateModuleAction(
  _prev: CurriculumActionResult | null,
  formData: FormData
): Promise<CurriculumActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.message };

  const id               = Number(formData.get('id'));
  const title            = (formData.get('title') as string | null)?.trim();
  const description      = (formData.get('description') as string | null)?.trim() || null;
  const level            = (formData.get('level') as string) || 'beginner';
  const gamification_type = (formData.get('gamification_type') as string) || 'mimo';

  if (!id) return { success: false, error: 'ID modul tidak valid.' };
  if (!title) return { success: false, error: 'Judul modul wajib diisi.', fields: { title: 'Wajib diisi.' } };

  const db = createSupabaseAdminClient();
  const { error } = await (db
    .from('modules')
    .update({ title, description, level, gamification_type } as never)
    .eq('id', id) as unknown as Promise<{ error: { message: string } | null }>);

  if (error) return { success: false, error: error.message };
  revalidateAll();
  revalidatePath(`/admin/curriculum/${id}`, 'layout');
  return { success: true, message: 'Modul berhasil diperbarui.' };
}

// ── importCurriculumJsonForModule ─────────────────────────────────────────────
// Like importCurriculumJson but scoped to a single existing module.
// The JSON payload is a topics-only array (no module wrapper needed) OR
// a full single-module object. Topics are attached to the given moduleId.

export async function importCurriculumJsonForModule(
  moduleId: number,
  payload: unknown
): Promise<CurriculumActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.message };
  if (!Number.isSafeInteger(moduleId) || moduleId <= 0) {
    return { success: false, error: 'moduleId tidak valid.' };
  }

  // Accept { topics: [...], final_assessment?: {...} } OR full module object
  // We normalise both into a single module entry with the given moduleId.
  // Parse: accept single-module JSON or a wrapper with just topics[]
  // If it's an array, treat as multi-module (legacy) and pick the first.
  if (Array.isArray(payload) && payload.length !== 1) {
    return { success: false, error: 'Import ke satu modul harus berisi tepat satu modul; tidak ada modul yang diabaikan.' };
  }
  const parsed = Array.isArray(payload) ? payload[0] : payload;
  if (!parsed || typeof parsed !== 'object') {
    return { success: false, error: 'Payload kosong.' };
  }

  // Validate just the module import schema
  // Inject a dummy title if missing so the schema validates
  const toValidate = { module_title: 'ignored', module_order: 0, ...(parsed as object) };
  const result = moduleImportSchema.safeParse(toValidate);
  if (!result.success) {
    const firstErr = result.error.flatten().formErrors[0]
      ?? Object.values(result.error.flatten().fieldErrors)[0]?.[0]
      ?? 'Format JSON tidak valid.';
    return { success: false, error: firstErr as string };
  }

  const mod = result.data;
  let importedTopics = 0;
  let writeStarted = false;

  try {
    const db = createSupabaseAdminClient();

    // Upsert topics into this module
    const { data: existingTopics, error: topicsError } = await (db
      .from('topics')
      .select('id, title, lesson_content, project_link')
      .eq('module_id', moduleId) as unknown as Promise<{
        data: Array<{ id: number; title: string; lesson_content: unknown; project_link: string | null }> | null;
        error: { message: string } | null;
      }>);
    if (topicsError || !existingTopics) {
      return importFailure(`Gagal membaca topik modul: ${topicsError?.message ?? 'data tidak tersedia.'}`, false);
    }

    const topicPlans = mod.topics.map((topic) => {
      const existingTopic = existingTopics.find((row) => row.title.toLowerCase().trim() === topic.topic_title.trim().toLowerCase());
      return { topic, existingTopic, existingChallenges: [] as Array<{ id: number; order_index: number; title: string; instructions: string | null; allows_file_upload: boolean }> };
    });
    // Read all challenge snapshots before assessment/topic/challenge writes.
    for (const topicPlan of topicPlans) {
      if (!topicPlan.existingTopic || topicPlan.topic.challenge === undefined) continue;
      const { data, error } = await (db.from('challenges')
        .select('id, order_index, title, instructions, allows_file_upload')
        .eq('topic_id', topicPlan.existingTopic.id)
        .order('order_index', { ascending: true }) as unknown as Promise<{
          data: Array<{ id: number; order_index: number; title: string; instructions: string | null; allows_file_upload: boolean }> | null;
          error: { message: string } | null;
        }>);
      if (error || !data) return importFailure(`Gagal membaca challenge topik "${topicPlan.topic.topic_title}": ${error?.message ?? 'data tidak tersedia.'}`, false);
      topicPlan.existingChallenges = data;
    }

    // Perform module assessment changes only after all required reads succeed.
    if (mod.final_assessment) {
      writeStarted = true;
      const { error } = await (db
        .from('modules')
        .update({ description: encodeFinalAssessment(mod.final_assessment) } as never)
        .eq('id', moduleId) as unknown as Promise<{ error: { message: string } | null }>);
      if (error) {
        return importFailure(`Gagal memperbarui tryout modul: ${error.message}`, writeStarted);
      }
    }

    for (const topicPlan of topicPlans) {
      const { topic, existingTopic } = topicPlan;
      const topicTitle    = topic.topic_title.trim();
      const lessonContent = buildLessonContent(
        topic,
        existingTopic?.lesson_content ?? null
      );
      const learningPath = lessonContent.learningPath;
      const lessonReady = hasAuthoredLessonContent(getInstructionalSlides(learningPath));
      const topicStatus = lessonReady ? 'published' : 'draft';

      let topicId = existingTopic?.id;
      if (topicId === undefined) {
        writeStarted = true;
        const { data: insertedTopic, error: tErr } = await (db
          .from('topics')
          .insert({
            module_id: moduleId, title: topicTitle, order_index: topic.topic_order,
            description: topic.description ?? null, project_link: topic.project_link || null,
            lesson_content: lessonContent, status: topicStatus,
            published_at: lessonReady ? new Date().toISOString() : null,
          } as never)
          .select('id')
          .single() as unknown as Promise<{ data: { id: number } | null; error: { message: string } | null }>);
        if (tErr || !insertedTopic) return importFailure(`Gagal membuat topik "${topicTitle}": ${tErr?.message ?? 'ID topik tidak dikembalikan.'}`, writeStarted);
        topicId = insertedTopic.id;
      }

      if (topic.challenge !== undefined) {
        writeStarted = true;
        const persisted = await persistTopicChallenges(db, topicId, topic.challenge, topicPlan.existingChallenges);
        if (persisted.error) return importFailure(`Gagal menyimpan challenge topik "${topicTitle}": ${persisted.error}`, writeStarted);
        lessonContent.activeChallengeIds = persisted.activeIds ?? [];
      }

      if (existingTopic || topic.challenge !== undefined) {
        const topicUpdate: Record<string, unknown> = {
          order_index: topic.topic_order,
          project_link: topic.project_link !== undefined ? (topic.project_link || null) : existingTopic?.project_link,
          lesson_content: lessonContent,
          status: topicStatus,
          published_at: lessonReady ? new Date().toISOString() : null,
        };
        if (topic.description !== undefined) topicUpdate.description = topic.description;
        writeStarted = true;
        const { error } = await (db.from('topics').update(topicUpdate as never).eq('id', topicId) as unknown as Promise<{ error: { message: string } | null }>);
        if (error) return importFailure(`Gagal memperbarui topik "${topicTitle}": ${error.message}`, writeStarted);
      }
      importedTopics++;
    }

    revalidateAll();
    revalidatePath(`/admin/curriculum/${moduleId}`, 'layout');
    return { success: true, message: `${importedTopics} topik berhasil diimpor ke modul ini.`, stats: { modules: 1, topics: importedTopics } };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    const stage = writeStarted ? 'menyimpan' : 'membaca data sebelum menyimpan';
    console.error('[importCurriculumJsonForModule] Import failed', {
      moduleId,
      error: detail,
    });
    return importFailure(`Import gagal saat ${stage}: ${detail}`, writeStarted);
  }
}

// ── updateTopicAction ─────────────────────────────────────────────────────────

export async function updateTopicAction(
  _prev: CurriculumActionResult | null,
  formData: FormData
): Promise<CurriculumActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.message };

  const id          = Number(formData.get('id'));
  const moduleId    = Number(formData.get('module_id'));
  const title       = (formData.get('title') as string | null)?.trim();
  const description = (formData.get('description') as string | null)?.trim() || null;
  const projectLink = (formData.get('project_link') as string | null)?.trim() || null;
  const status      = (formData.get('status') as string) || 'draft';
  const orderIndex  = Number(formData.get('order_index'));

  if (!id)    return { success: false, error: 'ID topik tidak valid.' };
  if (!title) return { success: false, error: 'Judul topik wajib diisi.', fields: { title: 'Wajib diisi.' } };

  const db = createSupabaseAdminClient();
  if (status === 'published') {
    const { data: topic, error: topicError } = await (db
      .from('topics')
      .select('lesson_content')
      .eq('id', id)
      .maybeSingle() as unknown as Promise<{
        data: { lesson_content: unknown } | null;
        error: { message: string } | null;
      }>);

    if (topicError) return { success: false, error: topicError.message };
    if (!topic) return { success: false, error: 'Topik tidak ditemukan.' };
    const lessonContent = topic.lesson_content as Record<string, unknown> | null;
    const slides = getInstructionalSlides(lessonContent?.learningPath);
    if (slides.length < MIN_LESSON_SLIDES || slides.length > MAX_LESSON_SLIDES) {
      return {
        success: false,
        error: `Topik hanya boleh dipublikasikan jika memiliki ${MIN_LESSON_SLIDES}–${MAX_LESSON_SLIDES} node pembelajaran valid (termasuk challenge). Saat ini: ${slides.length}.`,
      };
    }
    const topicQuiz = extractTopicQuiz(lessonContent);
    if (topicQuiz.length !== 5) {
      return {
        success: false,
        error: `Topik wajib memiliki tepat 5 soal quiz valid sebelum dipublikasikan. Saat ini: ${topicQuiz.length}.`,
      };
    }
  }

  const { error } = await (db
    .from('topics')
    .update({
      title,
      description,
      project_link:   projectLink,
      status:         status === 'published' ? 'published' : 'draft',
      order_index:    Number.isFinite(orderIndex) ? orderIndex : undefined,
      ...(status === 'published' && { published_at: new Date().toISOString() }),
      ...(status === 'draft'     && { published_at: null }),
    } as never)
    .eq('id', id) as unknown as Promise<{ error: { message: string } | null }>);

  if (error) return { success: false, error: error.message };

  revalidateAll();
  if (moduleId) revalidatePath(`/admin/curriculum/${moduleId}`, 'layout');
  return { success: true, message: `Topik "${title}" berhasil diperbarui.` };
}
