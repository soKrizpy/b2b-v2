// src/features/quiz/questMapQueries.ts
// Batch-fetches quiz state for every topic in a module in a single pass.
// Used by the Quest Map page to compute the 4 node states without N+1 queries.

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { extractFinalAssessment } from '@/features/curriculum/validation';
import type { TopicWithChallengeCount, ModuleWithTopics } from '@/features/curriculum/queries';

// ── Node status ───────────────────────────────────────────────────────────────

export type NodeStatus =
  | 'COMPLETED'   // topic completed (quiz passed / cleared)
  | 'NEEDS_QUIZ'  // session finished with report, quiz unlocked & ready to take
  | 'ACTIVE_NEXT' // unlocked to study lesson, waiting for teacher report or current active mission
  | 'LOCKED';     // locked for future meetings

// ── Per-topic enriched data ───────────────────────────────────────────────────

export interface QuestTopicNode {
  topic:                    TopicWithChallengeCount;
  status:                   NodeStatus;
  hasQuiz:                  boolean;
  attemptsUsed:             number;   // 0–2
  bestScore:                number;   // 0–100
  stars:                    0 | 1 | 2 | 3;
  sessionNumber:            number;
  isSessionReportSubmitted: boolean;
  quizUnlocked:             boolean;
  meetingDate?:             string | null;
}

// ── getQuestMapData ───────────────────────────────────────────────────────────

export interface QuestMapData {
  mod:              ModuleWithTopics;
  nodes:            QuestTopicNode[];
  moduleComplete:   boolean;
  hasFinal:         boolean;
  needsQuizTopics:  QuestTopicNode[]; // topics that need quiz action (for banner)
}

export async function getQuestMapData(
  studentId: string,
  mod:       ModuleWithTopics
): Promise<QuestMapData> {
  const db       = createSupabaseAdminClient();
  const topicIds = mod.topics.map((t) => t.id);

  // ── 1 & 2. Parallel batch: quiz attempts + student meetings with teacher report ────────
  const [attemptsRes, joinRowsRes] = await Promise.all([
    topicIds.length > 0
      ? (db
          .from('topic_quiz_attempts')
          .select('topic_id, attempt_num, score, submitted_at')
          .eq('student_id', studentId)
          .in('topic_id', topicIds) as unknown as Promise<{
            data: Array<{ topic_id: number; attempt_num: number; score: number; submitted_at: string }> | null;
            error: unknown;
          }>)
      : Promise.resolve({ data: [], error: null }),
    db
      .from('meeting_students')
      .select('meeting_id, has_joined, attendance_status, meetings!inner(id, session_number, is_completed, progress_report, meeting_date)')
      .eq('student_id', studentId) as unknown as Promise<{
        data: Array<{
          meeting_id: number;
          has_joined: boolean;
          attendance_status: string | null;
          meetings: {
            id: number;
            session_number: number | null;
            is_completed: boolean;
            progress_report: string | null;
            meeting_date: string;
          };
        }> | null;
        error: unknown;
      }>,
  ]);

  // Best score + count per topic
  const attemptsMap = new Map<number, { count: number; bestScore: number }>();
  for (const a of attemptsRes.data ?? []) {
    const prev = attemptsMap.get(a.topic_id) ?? { count: 0, bestScore: 0 };
    attemptsMap.set(a.topic_id, {
      count:     prev.count + 1,
      bestScore: Math.max(prev.bestScore, a.score),
    });
  }

  // Set of session numbers where teacher has completed the session and submitted report
  const meetingRows = joinRowsRes.data ?? [];
  const hasAssignedMeetings = meetingRows.length > 0;
  const reportedSessionNumbers = new Set<number>();
  const sessionDatesMap = new Map<number, string>();
  for (const r of meetingRows) {
    const sNum = r.meetings?.session_number;
    if (typeof sNum === 'number' && sNum > 0) {
      if (r.meetings?.meeting_date) {
        sessionDatesMap.set(sNum, r.meetings.meeting_date);
      }
      // A teacher report unlocks this topic only for a student assigned to and
      // present in that specific completed session—not by counting other sessions.
      if (r.has_joined && r.meetings?.is_completed) {
        reportedSessionNumbers.add(sNum);
      }
    }
  }

  // ── 3. Derive per-topic hasQuiz from lesson_content ──────────────────────
  const hasQuizMap = new Map<number, boolean>();
  for (const t of mod.topics) {
    const lc = t.lesson_content as Record<string, unknown> | null;
    hasQuizMap.set(t.id, Array.isArray(lc?.quiz) && (lc!.quiz as unknown[]).length > 0);
  }

  // ── 4. Compute stars ──────────────────────────────────────────────────────
  function computeStars(bestScore: number, attemptsUsed: number): 0 | 1 | 2 | 3 {
    if (attemptsUsed === 0) return 0;
    if (bestScore >= 100) return 3;
    if (bestScore >= 80)  return 2;
    return 1;
  }

  // ── 5. Compute per-topic status sequentially ─────────────────────────────
  const nodes: QuestTopicNode[] = [];
  let lastCompletedIdx = -1; // highest consecutive completed index
  let activeNextAssigned = false;

  for (let idx = 0; idx < mod.topics.length; idx++) {
    const topic       = mod.topics[idx];
    const hasQuiz     = hasQuizMap.get(topic.id) ?? false;
    const quizInfo    = attemptsMap.get(topic.id) ?? { count: 0, bestScore: 0 };
    const { count: attemptsUsed, bestScore } = quizInfo;

    const sessionNumber = topic.order_index > 0 ? topic.order_index : idx + 1;

    // A session report is submitted if:
    // 1) Student has matching completed meeting by session_number, OR
    // 2) Total completed meetings reaches or exceeds this session number, OR
    // 3) Student has no assigned meetings at all (e.g. self-paced demo/test mode).
    const isSessionReportSubmitted = hasAssignedMeetings
      ? reportedSessionNumbers.has(sessionNumber)
      : true;

    // Quiz is unlocked once teacher has submitted report
    const quizUnlocked = isSessionReportSubmitted;

    // Topic is completed when quiz is passed (bestScore >= 70 or attempts exhausted),
    // OR if topic has no quiz and session report was submitted.
    const quizDone = hasQuiz
      ? (attemptsUsed > 0 && (bestScore >= 70 || attemptsUsed >= 2))
      : isSessionReportSubmitted;

    const isDone = quizDone;

    // Only advance the completed frontier when this topic directly follows
    // the already-completed streak. A previously completed later topic must
    // never make an unfinished earlier topic appear completed.
    if (isDone && idx === lastCompletedIdx + 1) {
      lastCompletedIdx = idx;
    }

    nodes.push({
      topic,
      hasQuiz,
      attemptsUsed,
      bestScore,
      stars: computeStars(bestScore, attemptsUsed),
      sessionNumber,
      isSessionReportSubmitted,
      quizUnlocked,
      meetingDate: sessionDatesMap.get(sessionNumber) ?? null,
      status: 'LOCKED', // will be overwritten below
    });
  }

  // Second pass: assign statuses based on lastCompletedIdx
  for (let idx = 0; idx < nodes.length; idx++) {
    const n = nodes[idx];
    const { hasQuiz, attemptsUsed, bestScore, quizUnlocked } = n;

    if (idx <= lastCompletedIdx) {
      // All topics up to and including lastCompletedIdx are COMPLETED
      n.status = 'COMPLETED';
    } else if (idx === lastCompletedIdx + 1) {
      // The first topic after completed streak is active for this meeting
      if (quizUnlocked) {
        if (hasQuiz && attemptsUsed < 2 && bestScore < 70) {
          // Quiz unlocked because teacher submitted report, but student hasn't passed quiz yet
          n.status = 'NEEDS_QUIZ';
        } else if (!activeNextAssigned) {
          n.status = 'ACTIVE_NEXT';
          activeNextAssigned = true;
        } else {
          n.status = 'LOCKED';
        }
      } else {
        // Teacher has not submitted report for this session yet.
        // Student can study lesson content first! Quiz is locked until meeting report submitted.
        if (!activeNextAssigned) {
          n.status = 'ACTIVE_NEXT';
          activeNextAssigned = true;
        } else {
          n.status = 'LOCKED';
        }
      }
    } else {
      // Future topic — locked for future meetings
      n.status = 'LOCKED';
    }
  }

  const moduleComplete = lastCompletedIdx === mod.topics.length - 1 && mod.topics.length > 0;
  const hasFinal = Boolean(
    (mod.description ?? '').startsWith('FINAL_ASSESSMENT:') ||
    Boolean((mod as unknown as { final_assessment?: unknown }).final_assessment) ||
    extractFinalAssessment(mod.description, (mod as unknown as { final_assessment?: unknown }).final_assessment)
  );
  const needsQuizTopics = nodes.filter((n) => n.status === 'NEEDS_QUIZ');

  return { mod, nodes, moduleComplete, hasFinal, needsQuizTopics };
}
