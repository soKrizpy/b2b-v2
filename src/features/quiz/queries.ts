// src/features/quiz/queries.ts
// Read-side helpers for topic quiz attempts and the inline quiz data stored
// in lesson_content JSONB.

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { extractTopicQuiz } from '@/features/curriculum/validation';
import type { TopicQuizAttemptRow, QuizAnswer } from '@/types/database';
import { isTeacherReportSubmittedForTopic } from '@/features/quiz/sessionReportGate';

// ── Per-topic quiz state for a student ────────────────────────────────────────

export interface TopicQuizState {
  /** Quiz questions from lesson_content.quiz[] — empty if topic has no quiz. */
  questions:       import('@/features/curriculum/validation').QuizQuestion[];
  attempts:        TopicQuizAttemptRow[];
  attemptsUsed:    number;   // 0, 1, or 2
  bestScore:       number;   // 0–100; 0 if no attempts
  isLocked:        boolean;  // true when attemptsUsed >= 2
  /** Whether the teacher has marked the session for this student as complete,
   *  unlocking the quiz. True when at least one meeting is is_completed AND
   *  the student has_joined that meeting. */
  isUnlocked:      boolean;
}

/** Returns the quiz state for a specific topic + student. */
export async function getTopicQuizState(
  topicId: number,
  studentId: string,
  preloadedLessonContent?: unknown
): Promise<TopicQuizState> {
  const db = createSupabaseAdminClient();

  // Fetch topic metadata, attempts, and all assigned sessions in parallel.
  // Unlock state is matched to this topic's session, not any completed meeting.
  const [topicRes, { data: attemptRows }, { data: joinRows }] = await Promise.all([
    db
      .from('topics')
      .select('id, module_id, order_index, lesson_content')
      .eq('id', topicId)
      .maybeSingle() as unknown as Promise<{
        data: { id: number; module_id: number; order_index: number; lesson_content: unknown } | null;
        error: unknown;
      }>,
    db
      .from('topic_quiz_attempts')
      .select('id, student_id, topic_id, attempt_num, score, answers, submitted_at')
      .eq('student_id', studentId)
      .eq('topic_id', topicId)
      .order('attempt_num', { ascending: true }) as unknown as Promise<{
        data: TopicQuizAttemptRow[];
        error: unknown;
      }>,
    db
      .from('meeting_students')
      .select('meeting_id, has_joined, meetings!inner(module_id, is_completed, session_number, progress_report)')
      .eq('student_id', studentId) as unknown as Promise<{
        data: Array<{
          meeting_id: number;
          has_joined: boolean;
          meetings: { module_id: number | null; is_completed: boolean; session_number: number | null; progress_report: string | null };
        }>;
        error: unknown;
      }>,
  ]);

  const questions    = topicRes.data
    ? extractTopicQuiz(preloadedLessonContent !== undefined ? preloadedLessonContent : topicRes.data.lesson_content)
    : [];
  const attempts     = attemptRows ?? [];
  const attemptsUsed = attempts.length;
  const bestScore    = attempts.length > 0
    ? Math.max(...attempts.map((a) => a.score))
    : 0;

  const orderedTopics = await db
    .from('topics')
    .select('id, order_index')
    .eq('module_id', topicRes.data?.module_id ?? -1)
    .eq('status', 'published')
    .order('order_index', { ascending: true });
  const orderedTopicRows = (orderedTopics.data ?? []) as unknown as Array<{ id: number; order_index: number }>;
  const topicIndex = orderedTopicRows.findIndex((topic) => topic.id === topicId);
  // Match a topic's sorted position to the 1-based session_number. Do not use
  // order_index directly: imported curricula may number topics from zero, which
  // would otherwise map the first two topics to the same session.
  const sessionNumber = topicIndex + 1;
  const hasCompletedSession = sessionNumber > 0 && topicRes.data != null && (joinRows ?? []).some(
    (r) => isTeacherReportSubmittedForTopic({
      module_id: r.meetings?.module_id ?? null,
      session_number: r.meetings?.session_number ?? null,
      has_joined: r.has_joined,
      is_completed: r.meetings?.is_completed === true,
      progress_report: r.meetings?.progress_report ?? null,
    }, topicRes.data.module_id, sessionNumber)
  );

  return {
    questions,
    attempts,
    attemptsUsed,
    bestScore,
    isLocked:    attemptsUsed >= 2,
    isUnlocked:  hasCompletedSession, // guided mode: only a matching submitted teacher report unlocks the quiz
  };
}

/** Returns all quiz attempts for a student across all topics (for parent report). */
export async function getAllQuizAttemptsByStudent(
  studentId: string
): Promise<TopicQuizAttemptRow[]> {
  const db = createSupabaseAdminClient();
  const { data } = await (db
    .from('topic_quiz_attempts')
    .select('id, student_id, topic_id, attempt_num, score, answers, submitted_at')
    .eq('student_id', studentId)
    .order('submitted_at', { ascending: false }) as unknown as Promise<{
      data: TopicQuizAttemptRow[];
      error: unknown;
    }>);
  return data ?? [];
}
