// src/features/curriculum/actions.ts
// Admin Server Actions: JSON bulk import/export + delete (module/topic).
// 'use server' files may ONLY export async functions — all schemas and types
// live in ./validation.ts.
'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getAllModulesWithTopics } from './queries';
import {
  curriculumJsonSchema,
  encodeFinalAssessment,
  moduleImportSchema,
  type ModuleImport,
  type NodeImport,
} from './validation';
import { getInstructionalSlides, hasRequiredLessonSlideCount } from './lessonSlides';

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

  const { data: existingModules } = await (db
    .from('modules')
    .select('id, title') as unknown as Promise<{
      data: Array<{ id: number; title: string }>;
      error: unknown;
    }>);

  const modTitleMap = new Map<string, number>(
    (existingModules ?? []).map((m) => [m.title.toLowerCase().trim(), m.id])
  );

  for (const mod of modules) {
    const normalizedTitle = mod.module_title.trim();
    let moduleId = modTitleMap.get(normalizedTitle.toLowerCase());

    if (moduleId) {
      await (db
        .from('modules')
        .update({
          description:       mod.final_assessment
            ? encodeFinalAssessment(mod.final_assessment)
            : (mod.description ?? null),
          level:             mod.level,
          gamification_type: mod.gamification_type,
        } as never)
        .eq('id', moduleId) as unknown as Promise<unknown>);
    } else {
      const { data: newMod, error: modErr } = await (db
        .from('modules')
        .insert({
          title:             normalizedTitle,
          description:       mod.final_assessment
            ? encodeFinalAssessment(mod.final_assessment)
            : (mod.description ?? null),
          level:             mod.level,
          gamification_type: mod.gamification_type,
        } as never)
        .select('id')
        .single() as unknown as Promise<{
          data: { id: number } | null;
          error: { message: string } | null;
        }>);

      if (modErr || !newMod) {
        return { success: false, error: `Gagal membuat modul "${normalizedTitle}": ${modErr?.message}` };
      }
      moduleId = newMod.id;
      modTitleMap.set(normalizedTitle.toLowerCase(), moduleId);
    }

    importedModules++;

    const { data: existingTopics } = await (db
      .from('topics')
      .select('id, title')
      .eq('module_id', moduleId) as unknown as Promise<{
        data: Array<{ id: number; title: string }>;
        error: unknown;
      }>);

    const topicTitleMap = new Map<string, number>(
      (existingTopics ?? []).map((t) => [t.title.toLowerCase().trim(), t.id])
    );

    for (const topic of mod.topics) {
      const topicTitle    = topic.topic_title.trim();
      const learningPath = topic.nodes.map(nodeToLearningNode);
      const lessonContent = (learningPath.length > 0 || topic.quiz?.length)
        ? {
            learningPath,
            ...(topic.quiz?.length && { quiz: topic.quiz }),
          }
        : null;
      const lessonReady = hasRequiredLessonSlideCount(getInstructionalSlides(learningPath));
      const topicStatus = lessonReady ? 'published' : 'draft';

      const existingTopicId = topicTitleMap.get(topicTitle.toLowerCase());

      if (existingTopicId) {
        await (db
          .from('topics')
          .update({
            order_index:    topic.topic_order,
            description:    topic.description ?? null,
            project_link:   topic.project_link || null,
            lesson_content: lessonContent,
            status:         topicStatus,
            published_at: lessonReady ? new Date().toISOString() : null,
          } as never)
          .eq('id', existingTopicId) as unknown as Promise<unknown>);
      } else {
        const { error: topicErr } = await (db
          .from('topics')
          .insert({
            module_id:      moduleId,
            title:          topicTitle,
            order_index:    topic.topic_order,
            description:    topic.description ?? null,
            project_link:   topic.project_link || null,
            lesson_content: lessonContent,
            status:         topicStatus,
            published_at: lessonReady ? new Date().toISOString() : null,
          } as never) as unknown as Promise<{ error: { message: string } | null }>);

        if (topicErr) {
          return { success: false, error: `Gagal membuat topik "${topicTitle}": ${topicErr.message}` };
        }
      }
      importedTopics++;
    }
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

  const payload = modules.map((mod) => ({
    module_title:      mod.title ?? '',
    module_order:      0,
    description:       mod.description ?? undefined,
    level:             (mod.level as ModuleImport['level']) ?? 'beginner',
    gamification_type: (mod.gamification_type as ModuleImport['gamification_type']) ?? 'mimo',
    topics: mod.topics.map((topic) => {
      const lc       = topic.lesson_content as { learningPath?: unknown[] } | null;
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
          order:          idx,
          type:           typeRevMap[rawType] ?? 'theory',
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

      return {
        topic_title:  topic.title,
        topic_order:  topic.order_index,
        description:  topic.description ?? undefined,
        project_link: topic.project_link ?? undefined,
        nodes,
      };
    }),
  }));

  return { success: true, data: payload };
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
  const { data, error } = await (db
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

  try {
    const db = createSupabaseAdminClient();

    // Update module metadata if final_assessment is in the JSON
    if (mod.final_assessment) {
      const { error } = await (db
        .from('modules')
        .update({ description: encodeFinalAssessment(mod.final_assessment) } as never)
        .eq('id', moduleId) as unknown as Promise<{ error: { message: string } | null }>);
      if (error) {
        return { success: false, error: `Gagal memperbarui tryout modul: ${error.message}` };
      }
    }

    // Upsert topics into this module
    const { data: existingTopics, error: topicsError } = await (db
      .from('topics')
      .select('id, title')
      .eq('module_id', moduleId) as unknown as Promise<{
        data: Array<{ id: number; title: string }> | null;
        error: { message: string } | null;
      }>);
    if (topicsError) {
      return { success: false, error: `Gagal membaca topik modul: ${topicsError.message}` };
    }

    const topicTitleMap = new Map<string, number>(
      (existingTopics ?? []).map((t) => [t.title.toLowerCase().trim(), t.id])
    );

    for (const topic of mod.topics) {
      const topicTitle    = topic.topic_title.trim();
      const learningPath = topic.nodes.map(nodeToLearningNode);
      const lessonContent = (learningPath.length > 0 || topic.quiz?.length)
        ? { learningPath, ...(topic.quiz?.length && { quiz: topic.quiz }) }
        : null;
      const lessonReady = hasRequiredLessonSlideCount(getInstructionalSlides(learningPath));
      const topicStatus = lessonReady ? 'published' : 'draft';

      const existingId = topicTitleMap.get(topicTitle.toLowerCase());
      if (existingId) {
        const { error } = await (db
          .from('topics')
          .update({
            order_index: topic.topic_order, description: topic.description ?? null,
            project_link: topic.project_link || null, lesson_content: lessonContent,
            status: topicStatus,
            published_at: lessonReady ? new Date().toISOString() : null,
          } as never)
          .eq('id', existingId) as unknown as Promise<{ error: { message: string } | null }>);
        if (error) {
          return { success: false, error: `Gagal memperbarui topik "${topicTitle}": ${error.message}` };
        }
      } else {
        const { error: tErr } = await (db
          .from('topics')
          .insert({
            module_id: moduleId, title: topicTitle, order_index: topic.topic_order,
            description: topic.description ?? null, project_link: topic.project_link || null,
            lesson_content: lessonContent, status: topicStatus,
            published_at: lessonReady ? new Date().toISOString() : null,
          } as never) as unknown as Promise<{ error: { message: string } | null }>);
        if (tErr) return { success: false, error: `Gagal membuat topik "${topicTitle}": ${tErr.message}` };
      }
      importedTopics++;
    }

    revalidateAll();
    revalidatePath(`/admin/curriculum/${moduleId}`, 'layout');
    return { success: true, message: `${importedTopics} topik berhasil diimpor ke modul ini.`, stats: { modules: 1, topics: importedTopics } };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error('[importCurriculumJsonForModule] Import failed', {
      moduleId,
      error: detail,
    });
    return {
      success: false,
      error: `Import gagal saat menyimpan kurikulum: ${detail}. Sebagian perubahan mungkin sudah tersimpan.`,
    };
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
    if (!hasRequiredLessonSlideCount(slides)) {
      return {
        success: false,
        error: `Topik harus memiliki ${10}–${20} slide instruksional valid (teori, kode, atau latihan lengkap) sebelum dipublikasikan. Saat ini: ${slides.length}.`,
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
