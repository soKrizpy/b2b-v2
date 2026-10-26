// src/features/quiz/queries.ts
// Read-side helpers for topic quiz attempts and the inline quiz data stored
// in lesson_content JSONB.

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { extractTopicQuiz } from '@/features/curriculum/validation';
import type { TopicQuizAttemptRow } from '@/types/database';
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

  // Fetch topic metadata, attempts, and assigned meetings in parallel.
  // Unlock state is matched to this exact topic association.
  const [topicRes, { data: attemptRows }, { data: joinRows }] = await Promise.all([
    db
      .from('topics')
      .select('id, module_id, lesson_content')
      .eq('id', topicId)
      .maybeSingle() as unknown as Promise<{
        data: { id: number; module_id: number; lesson_content: unknown } | null;
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
      .select('meeting_id, has_joined, meetings!inner(module_id, topic_id, is_completed, progress_report)')
      .eq('student_id', studentId) as unknown as Promise<{
        data: Array<{
          meeting_id: number;
          has_joined: boolean;
          meetings: { module_id: number | null; topic_id: number | null; is_completed: boolean; progress_report: string | null };
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

  const matchingTopicMeetings = (joinRows ?? []).filter(
    (r) => r.meetings?.module_id === topicRes.data?.module_id && r.meetings?.topic_id === topicId
  );
  const matchingMeeting = matchingTopicMeetings[0];
  const hasCompletedSession = matchingTopicMeetings.length === 1 && isTeacherReportSubmittedForTopic(
    {
      topic_id: matchingMeeting?.meetings?.topic_id ?? null,
      has_joined: matchingMeeting?.has_joined ?? false,
      is_completed: matchingMeeting?.meetings?.is_completed === true,
      progress_report: matchingMeeting?.meetings?.progress_report ?? null,
    },
    topicId
  );

  return {
    // Do not serialize answerable quiz content until the matching attended
    // session has a completed teacher report.
    questions: hasCompletedSession ? questions : [],
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
