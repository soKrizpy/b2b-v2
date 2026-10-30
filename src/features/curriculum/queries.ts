// src/features/curriculum/queries.ts
// Read-side query helpers for modules and topics.
// All queries use the admin client (bypasses RLS) — called only from
// Server Components, Server Actions, and Route Handlers.

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { ModuleRow, TopicRow } from '@/types/database';

// ── Result shapes ─────────────────────────────────────────────────────────────

export interface TopicWithChallengeCount extends TopicRow {
  challenge_count: number;
}

export interface ModuleWithTopics extends ModuleRow {
  topics: TopicWithChallengeCount[];
}

// ── Modules ───────────────────────────────────────────────────────────────────

/** All modules, ordered newest-first. Admin use. */
export async function getAllModules(): Promise<ModuleRow[]> {
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from('modules')
    .select('id, title, description, level, gamification_type, is_active, created_at')
    .order('created_at', { ascending: false });

  if (error) { console.error('[getAllModules]', error.message); return []; }
  return (data ?? []) as ModuleRow[];
}

/** Single module by id. */
export async function getModuleById(moduleId: number): Promise<ModuleRow | null> {
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from('modules')
    .select('id, title, description, level, gamification_type, is_active, created_at')
    .eq('id', moduleId)
    .maybeSingle();

  if (error) { console.error('[getModuleById]', error.message); return null; }
  return data as ModuleRow | null;
}

/**
 * All modules the student is currently enrolled in (status = 'active').
 * Returns modules with their published topics and challenge counts.
 */
export async function getStudentModulesWithTopics(studentId: string): Promise<ModuleWithTopics[]> {
  const db = createSupabaseAdminClient();

  // 1. Enrolled module ids
  const { data: enrollments, error: enErr } = await db
    .from('student_modules')
    .select('module_id')
    .eq('student_id', studentId)
    .eq('status', 'active') as unknown as {
      data: Array<{ module_id: number }>;
      error: { message: string } | null;
    };

  if (enErr || !enrollments?.length) return [];

  const moduleIds = enrollments.map((e) => e.module_id);

  // 2 & 3. Fetch Modules and Published Topics in parallel
  const [{ data: modules, error: modErr }, { data: topics, error: topErr }] = await Promise.all([
    db
      .from('modules')
      .select('id, title, description, level, gamification_type, is_active, created_at')
      .in('id', moduleIds)
      .order('created_at', { ascending: false }),
    db
      .from('topics')
      .select('id, module_id, title, order_index, description, project_link, topic_link, engine_topic_id, lesson_content, status, published_at, created_at')
      .in('module_id', moduleIds)
      .eq('status', 'published')
      .order('order_index', { ascending: true }),
  ]);

  if (modErr || !modules?.length) return [];
  if (topErr) { console.error('[getStudentModulesWithTopics] topics', topErr.message); }

  const topicList = (topics ?? []) as unknown as TopicRow[];
  const topicIds = topicList.map((t) => t.id);

  // 4. Challenge counts per topic (filtered by topicIds in SQL)
  const challengeCountMap = new Map<number, number>();
  if (topicIds.length > 0) {
    const { data: challenges } = await db
      .from('challenges')
      .select('topic_id')
      .in('topic_id', topicIds) as unknown as {
        data: Array<{ topic_id: number }>;
        error: unknown;
      };

    (challenges ?? []).forEach((c) => {
      challengeCountMap.set(c.topic_id, (challengeCountMap.get(c.topic_id) ?? 0) + 1);
    });
  }

  return (modules as unknown as ModuleRow[]).map((mod) => ({
    ...mod,
    topics: topicList
      .filter((t) => t.module_id === mod.id)
      .map((t) => ({ ...t, challenge_count: challengeCountMap.get(t.id) ?? 0 })),
  }));
}

// ── Topics ────────────────────────────────────────────────────────────────────

/** All topics for a module (admin — all statuses). */
export async function getTopicsByModuleId(moduleId: number): Promise<TopicRow[]> {
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from('topics')
    .select('id, module_id, title, order_index, description, project_link, topic_link, engine_topic_id, lesson_content, status, published_at, created_at')
    .eq('module_id', moduleId)
    .order('order_index', { ascending: true });

  if (error) { console.error('[getTopicsByModuleId]', error.message); return []; }
  return (data ?? []) as unknown as TopicRow[];
}

/** Single topic by id. */
export async function getTopicById(topicId: number): Promise<TopicRow | null> {
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from('topics')
    .select('id, module_id, title, order_index, description, project_link, topic_link, engine_topic_id, lesson_content, status, published_at, created_at')
    .eq('id', topicId)
    .maybeSingle();

  if (error) { console.error('[getTopicById]', error.message); return null; }
  return data as unknown as TopicRow | null;
}

/** Internal uncached fetch for all modules + topics + challenge counts */
async function fetchAllModulesWithTopics(): Promise<ModuleWithTopics[]> {
  const db = createSupabaseAdminClient();

  const { data: modules, error: modErr } = await db
    .from('modules')
    .select('id, title, description, level, gamification_type, is_active, created_at')
    .order('created_at', { ascending: false });

  if (modErr || !modules?.length) return [];

  const moduleIds = (modules as unknown as ModuleRow[]).map((m) => m.id);

  const { data: topics, error: topErr } = await db
    .from('topics')
    .select('id, module_id, title, order_index, description, project_link, topic_link, engine_topic_id, lesson_content, status, published_at, created_at')
    .in('module_id', moduleIds)
    .order('order_index', { ascending: true });

  if (topErr) console.error('[getAllModulesWithTopics] topics', topErr.message);

  const topicList = (topics ?? []) as unknown as TopicRow[];
  const topicIds = topicList.map((t) => t.id);

  const challengeCountMap = new Map<number, number>();
  if (topicIds.length > 0) {
    const { data: challenges } = await db
      .from('challenges')
      .select('topic_id')
      .in('topic_id', topicIds) as unknown as {
        data: Array<{ topic_id: number }>;
        error: unknown;
      };

    (challenges ?? []).forEach((c) => {
      challengeCountMap.set(c.topic_id, (challengeCountMap.get(c.topic_id) ?? 0) + 1);
    });
  }

  return (modules as unknown as ModuleRow[]).map((mod) => ({
    ...mod,
    topics: topicList
      .filter((t) => t.module_id === mod.id)
      .map((t) => ({ ...t, challenge_count: challengeCountMap.get(t.id) ?? 0 })),
  }));
}

/** All modules with their topics and challenge counts. Admin curriculum view. */
export async function getAllModulesWithTopics(): Promise<ModuleWithTopics[]> {
  return fetchAllModulesWithTopics();
}


// ── Student module progress (for lessons page) ────────────────────────────────

export interface ModuleProgress {
  moduleId: number;
  totalTopics: number;
  /** Topics where the student achieved quiz score >= 70 (or no quiz exists). */
  completedTopics: number;
  isModuleComplete: boolean;
  hasAssessment: boolean;
}

/**
 * Returns quiz-based completion progress for each module the student is enrolled in.
 * A topic is "completed" if:
 *   (a) it has a quiz and the student scored >= 70 on their best attempt, OR
 *   (b) it has no quiz (description/nodes only).
 */
export async function getStudentModuleProgress(
  studentId: string,
  moduleIds: number[]
): Promise<ModuleProgress[]> {
  if (moduleIds.length === 0) return [];

  const db = createSupabaseAdminClient();

  // Fetch topics for these modules
  const { data: topicsData } = await db
    .from('topics')
    .select('id, module_id, lesson_content, description')
    .in('module_id', moduleIds)
    .eq('status', 'published') as unknown as {
      data: Array<{ id: number; module_id: number; lesson_content: unknown; description: string | null }>;
      error: unknown;
    };

  const topics = topicsData ?? [];

  // Fetch all quiz attempts for this student (across these topics)
  const topicIds = topics.map((t) => t.id);
  const bestScoreMap = new Map<number, number>();

  if (topicIds.length > 0) {
    const { data: attempts } = await db
      .from('topic_quiz_attempts')
      .select('topic_id, score')
      .eq('student_id', studentId)
      .in('topic_id', topicIds) as unknown as {
        data: Array<{ topic_id: number; score: number }>;
        error: unknown;
      };

    for (const a of attempts ?? []) {
      const prev = bestScoreMap.get(a.topic_id) ?? 0;
      if (a.score > prev) bestScoreMap.set(a.topic_id, a.score);
    }
  }

  // Check which modules have a final_assessment encoded in description
  const { data: modules } = await db
    .from('modules')
    .select('id, description')
    .in('id', moduleIds) as unknown as {
      data: Array<{ id: number; description: string | null }>;
      error: unknown;
    };

  const FA_PREFIX = 'FINAL_ASSESSMENT:';
  const hasAssessmentMap = new Map<number, boolean>(
    (modules ?? []).map((m) => [m.id, (m.description ?? '').startsWith(FA_PREFIX)])
  );

  return moduleIds.map((modId) => {
    const modTopics = topics.filter((t) => t.module_id === modId);
    const total = modTopics.length;

    let completed = 0;
    for (const t of modTopics) {
      // A topic without a quiz in lesson_content counts as auto-complete
      const lc = t.lesson_content as Record<string, unknown> | null;
      const hasQuiz = Array.isArray(lc?.quiz) && (lc!.quiz as unknown[]).length > 0;

      if (!hasQuiz) {
        // No quiz — complete if topic exists (student just needs to view it)
        completed++;
      } else {
        const best = bestScoreMap.get(t.id) ?? 0;
        if (best >= 70) completed++;
      }
    }

    return {
      moduleId: modId,
      totalTopics: total,
      completedTopics: completed,
      isModuleComplete: total > 0 && completed >= total,
      hasAssessment: hasAssessmentMap.get(modId) ?? false,
    };
  });
}

export interface TopicProgressSummary {
  topic_id: number;
  engine_topic_id: string;
  xp_earned: number;
  best_quiz_score: number;
  completed_at: string;
}

/**
 * Returns completed topics for a student from topic_progress.
 */
export async function getStudentCompletedTopics(studentId: string): Promise<TopicProgressSummary[]> {
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from('topic_progress')
    .select('topic_id, engine_topic_id, xp_earned, best_quiz_score, completed_at')
    .eq('student_id', studentId)
    .order('completed_at', { ascending: false });

  if (error) {
    console.error('[getStudentCompletedTopics]', error.message);
    return [];
  }
  return (data ?? []) as TopicProgressSummary[];
}


/**
 * Published curriculum available to a teacher through their currently mentored
 * students' active module enrollments. Draft topics are never exposed here.
 */
export async function getTeacherModulesWithTopics(teacherId: string): Promise<ModuleWithTopics[]> {
  const db = createSupabaseAdminClient();

  const [{ data: meetings, error: meetingsError }, { data: directStudents, error: directStudentsError }] = await Promise.all([
    db.from('meetings').select('id').eq('teacher_id', teacherId) as unknown as Promise<{
      data: Array<{ id: number }> | null;
      error: { message: string } | null;
    }>,
    db.from('teacher_students').select('student_id').eq('teacher_id', teacherId) as unknown as Promise<{
      data: Array<{ student_id: string }> | null;
      error: { message: string } | null;
    }>,
  ]);

  if (meetingsError || directStudentsError) {
    const details = [meetingsError?.message, directStudentsError?.message].filter(Boolean).join('; ');
    throw new Error(`[getTeacherModulesWithTopics] teacher relationships: ${details}`);
  }

  const meetingIds = (meetings ?? []).map((meeting) => meeting.id);
  const meetingStudentsResult = meetingIds.length > 0
    ? await db.from('meeting_students').select('student_id').in('meeting_id', meetingIds) as unknown as {
        data: Array<{ student_id: string }> | null;
        error: { message: string } | null;
      }
    : { data: [] as Array<{ student_id: string }>, error: null };

  if (meetingStudentsResult.error) {
    throw new Error(`[getTeacherModulesWithTopics] meeting students: ${meetingStudentsResult.error.message}`);
  }

  const studentIds = Array.from(new Set([
    ...(directStudents ?? []).map((row) => row.student_id),
    ...(meetingStudentsResult.data ?? []).map((row) => row.student_id),
  ]));
  if (studentIds.length === 0) return [];

  const { data: enrollments, error: enrollmentError } = await db
    .from('student_modules')
    .select('module_id')
    .in('student_id', studentIds)
    .eq('status', 'active') as unknown as {
      data: Array<{ module_id: number }> | null;
      error: { message: string } | null;
    };

  if (enrollmentError) {
    throw new Error(`[getTeacherModulesWithTopics] active enrollments: ${enrollmentError.message}`);
  }

  const moduleIds = Array.from(new Set((enrollments ?? []).map((row) => row.module_id)));
  if (moduleIds.length === 0) return [];

  const [{ data: modules, error: moduleError }, { data: topics, error: topicError }] = await Promise.all([
    db.from('modules')
      .select('id, title, description, level, gamification_type, is_active, created_at')
      .in('id', moduleIds)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    db.from('topics')
      .select('id, module_id, title, order_index, description, project_link, topic_link, engine_topic_id, lesson_content, status, published_at, created_at')
      .in('module_id', moduleIds)
      .eq('status', 'published')
      .order('order_index', { ascending: true }),
  ]);

  if (moduleError) {
    throw new Error(`[getTeacherModulesWithTopics] modules: ${moduleError.message}`);
  }
  if (topicError) {
    throw new Error(`[getTeacherModulesWithTopics] topics: ${topicError.message}`);
  }

  const topicRows = (topics ?? []) as unknown as TopicRow[];
  const topicIds = topicRows.map((topic) => topic.id);
  const challengeCounts = new Map<number, number>();

  if (topicIds.length > 0) {
    const { data: challenges, error: challengeError } = await db
      .from('challenges')
      .select('topic_id')
      .in('topic_id', topicIds) as unknown as {
        data: Array<{ topic_id: number }> | null;
        error: { message: string } | null;
      };

    if (challengeError) {
      throw new Error(`[getTeacherModulesWithTopics] challenge counts: ${challengeError.message}`);
    } else {
      (challenges ?? []).forEach((challenge) => {
        challengeCounts.set(challenge.topic_id, (challengeCounts.get(challenge.topic_id) ?? 0) + 1);
      });
    }
  }

  return ((modules ?? []) as unknown as ModuleRow[]).map((module) => ({
    ...module,
    topics: topicRows
      .filter((topic) => topic.module_id === module.id)
      .map((topic) => ({
        ...topic,
        challenge_count: challengeCounts.get(topic.id) ?? 0,
      })),
  }));
}
