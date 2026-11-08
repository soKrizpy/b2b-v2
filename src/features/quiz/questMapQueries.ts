// src/features/quiz/questMapQueries.ts
// Batch-fetches quiz state for every topic in a module in a single pass.
// Used by the Quest Map page to compute the 4 node states without N+1 queries.

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { extractFinalAssessment, extractTopicQuiz } from '@/features/curriculum/validation';
import type { TopicWithChallengeCount, ModuleWithTopics, StudentModuleWithTopics } from '@/features/curriculum/queries';
import { isTeacherReportSubmittedForTopic } from '@/features/quiz/sessionReportGate';
import { getTopicMeetingDate, getTopicMeetingSessionNumber, hasTopicMeetingStarted, type TopicMeetingSchedule } from '@/features/quiz/topicMeetingAccess';

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
  isUnlocked:               boolean;
  meetingDate?:             string | null;
}

// ── getQuestMapData ───────────────────────────────────────────────────────────

export interface QuestMapData {
  mod:              ModuleWithTopics;
  nodes:            QuestTopicNode[];
  moduleComplete:   boolean;
  assessmentUnlocked?: boolean;
  hasFinal:         boolean;
  needsQuizTopics:  QuestTopicNode[]; // topics that need quiz action (for banner)
}

function hideLockedTopicContent(topic: TopicWithChallengeCount): TopicWithChallengeCount {
  return {
    ...topic,
    description: null,
    project_link: null,
    topic_link: null,
    lesson_content: null,
  };
}

export async function getQuestMapData(
  studentId: string,
  mod:       ModuleWithTopics | StudentModuleWithTopics
): Promise<QuestMapData> {
  // ── Paused module: review-only mode ──────────────────────────────────────
  // mod.topics is already pre-filtered to completed topics only by
  // getStudentModulesWithTopics, so we just mark them all COMPLETED.
  if ((mod as StudentModuleWithTopics).enrollmentStatus === 'paused') {
    const nodes: QuestTopicNode[] = mod.topics.map((topic, idx) => ({
      topic,
      status: 'COMPLETED' as const,
      hasQuiz: false,
      attemptsUsed: 0,
      bestScore: 0,
      stars: 0 as const,
      sessionNumber: idx + 1,
      isSessionReportSubmitted: false,
      quizUnlocked: false,
      isUnlocked: true, // all received topics are open for review
      meetingDate: null,
    }));

    return {
      mod,
      nodes,
      moduleComplete: false, // paused modules are never "complete" for tryout purposes
      assessmentUnlocked: false,
      hasFinal: extractFinalAssessment(mod.description) !== null,
      needsQuizTopics: [], // no quiz actions in review mode
    };
  }

  // ── Active module: existing meeting-based gating logic ───────────────────
  const db       = createSupabaseAdminClient();
  const topicIds = mod.topics.map((t) => t.id);

  // ── Parallel batch: quiz attempts, assigned meetings, and admin override ───
  const [attemptsRes, joinRowsRes, studentRes, unlockRes] = await Promise.all([
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
      .select('meeting_id, has_joined, attendance_status, meetings!inner(id, module_id, topic_id, session_number, is_completed, progress_report, meeting_date)')
      .eq('student_id', studentId) as unknown as Promise<{
        data: Array<{
          meeting_id: number;
          has_joined: boolean;
          attendance_status: string | null;
          meetings: {
            id: number;
            module_id: number | null;
            topic_id: number | null;
            session_number: number | null;
            is_completed: boolean;
            progress_report: string | null;
            meeting_date: string | null;
          };
        }> | null;
        error: unknown;
      }>,
    db
      .from('students')
      .select('full_name')
      .eq('id', studentId)
      .maybeSingle() as unknown as Promise<{
        data: { full_name: string | null } | null;
        error: unknown;
      }>,
    db
      .from('student_assessment_unlocks')
      .select('student_id')
      .eq('student_id', studentId)
      .eq('module_id', mod.id)
      .maybeSingle() as unknown as Promise<{
        data: { student_id: string } | null;
        error: unknown;
      }>,
  ]);

  const assessmentUnlocked = Boolean(unlockRes.data);

  // Best score + count per topic
  const attemptsMap = new Map<number, { count: number; bestScore: number }>();
  for (const a of attemptsRes.data ?? []) {
    const prev = attemptsMap.get(a.topic_id) ?? { count: 0, bestScore: 0 };
    attemptsMap.set(a.topic_id, {
      count:     prev.count + 1,
      bestScore: Math.max(prev.bestScore, a.score),
    });
  }

  // Legacy teacher reports often have no topic_id/module_id association.
  // For normal curriculum students, each completed report opens the next topic
  // in sequence. Jason and Sarah intentionally retain their existing schedule-based
  // access because their sessions do not follow the topic sequence.
  const studentMeetingRows = joinRowsRes.data ?? [];
  const studentName = studentRes.data?.full_name?.trim() ?? '';
  const useReportCountUnlock = !['Jason Tanjaya', 'Sarah Maisha'].includes(studentName);
  const reportMeetingRows = studentMeetingRows.filter((row) =>
    (row.meetings?.module_id == null || row.meetings.module_id === mod.id)
    && row.meetings?.is_completed === true
    && Boolean(row.meetings?.progress_report?.trim())
  );
  const teacherReportCount = reportMeetingRows.length;

  // Keep explicit topic schedules for the two exempt students and for date labels.
  const meetingRows = studentMeetingRows.filter((row) => row.meetings?.module_id === mod.id);
  const meetingCountByTopic = new Map<number, number>();
  for (const row of meetingRows) {
    const topicId = row.meetings?.topic_id;
    if (typeof topicId === 'number' && topicId > 0) {
      meetingCountByTopic.set(topicId, (meetingCountByTopic.get(topicId) ?? 0) + 1);
    }
  }
  const reportedTopicIds = new Set<number>();
  const assignedMeetings: TopicMeetingSchedule[] = [];
  for (const r of meetingRows) {
    const topicId = r.meetings?.topic_id;
    if (typeof topicId === 'number' && topicId > 0) {
      assignedMeetings.push({
        topic_id: topicId,
        session_number: r.meetings?.session_number ?? null,
        meeting_date: r.meetings?.meeting_date ?? null,
      });
      if (meetingCountByTopic.get(topicId) === 1 && isTeacherReportSubmittedForTopic({
        topic_id: topicId,
        has_joined: r.has_joined,
        is_completed: r.meetings?.is_completed === true,
        progress_report: r.meetings?.progress_report ?? null,
      }, topicId)) {
        reportedTopicIds.add(topicId);
      }
    }
  }

  // ── 3. Derive per-topic hasQuiz from lesson_content ──────────────────────
  const hasQuizMap = new Map<number, boolean>();
  for (const t of mod.topics) {
    const lc = t.lesson_content as Record<string, unknown> | null;
    hasQuizMap.set(t.id, extractTopicQuiz(lc).length > 0);
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

  for (let idx = 0; idx < mod.topics.length; idx++) {
    const topic       = mod.topics[idx];
    const sessionNumber = useReportCountUnlock
      ? idx + 1
      : getTopicMeetingSessionNumber(assignedMeetings, topic.id) ?? idx + 1;
    const hasQuiz     = hasQuizMap.get(topic.id) ?? false;
    const quizInfo    = attemptsMap.get(topic.id) ?? { count: 0, bestScore: 0 };
    const { count: attemptsUsed, bestScore } = quizInfo;

    // Meetings without an explicit topic association cannot unlock lesson content.
    const isSessionReportSubmitted = useReportCountUnlock
      ? idx < teacherReportCount
      : reportedTopicIds.has(topic.id);
    const isUnlocked = useReportCountUnlock
      ? idx < teacherReportCount
      : hasTopicMeetingStarted(assignedMeetings, topic.id);

    // Quiz is unlocked once teacher has submitted report
    const quizUnlocked = isSessionReportSubmitted;

    // Topic is completed when quiz is passed (bestScore >= 70 or attempts exhausted),
    // OR if topic has no quiz and session report was submitted.
    const quizDone = isUnlocked && isSessionReportSubmitted && (
      hasQuiz
        ? (attemptsUsed > 0 && (bestScore >= 70 || attemptsUsed >= 2))
        : true
    );

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
      isUnlocked,
      meetingDate: useReportCountUnlock
        ? reportMeetingRows[idx]?.meetings?.meeting_date ?? null
        : getTopicMeetingDate(assignedMeetings, topic.id),
      status: 'LOCKED', // will be overwritten below
    });
  }

  // Access follows each topic's own scheduled meeting. Completion still follows
  // the existing sequential module frontier and quizzes still require reports.
  for (let idx = 0; idx < nodes.length; idx++) {
    const n = nodes[idx];
    const { hasQuiz, attemptsUsed, bestScore, quizUnlocked, isUnlocked } = n;

    if (idx <= lastCompletedIdx && isUnlocked) {
      // All topics up to and including lastCompletedIdx are COMPLETED
      n.status = 'COMPLETED';
    } else if (isUnlocked) {
      if (quizUnlocked) {
        if (hasQuiz && attemptsUsed < 2 && bestScore < 70) {
          // Quiz unlocked because teacher submitted report, but student hasn't passed quiz yet
          n.status = 'NEEDS_QUIZ';
        } else {
          n.status = 'ACTIVE_NEXT';
        }
      } else {
        // Class time unlocks its lesson; teacher report remains the quiz gate.
        n.status = 'ACTIVE_NEXT';
      }
    } else {
      // Future topic — locked for future meetings
      n.status = 'LOCKED';
    }
  }

  const moduleComplete = lastCompletedIdx === mod.topics.length - 1 && mod.topics.length > 0;
  // Only a valid legacy marker is currently supported by the assessment page
  // and submit action. Do not show a boss for malformed markers or JSONB-only
  // data that those consumers cannot load.
  const hasFinal = extractFinalAssessment(mod.description) !== null;
  // Do not serialize future lesson bodies or quiz answers to the student map.
  const safeNodes = nodes.map((node) => ({
    ...node,
    topic: node.isUnlocked ? node.topic : hideLockedTopicContent(node.topic),
  }));
  const safeTopics = mod.topics.map((topic, index) =>
    safeNodes[index]?.isUnlocked ? topic : hideLockedTopicContent(topic)
  );

  return {
    mod: { ...mod, topics: safeTopics },
    nodes: safeNodes,
    moduleComplete,
    assessmentUnlocked,
    hasFinal,
    needsQuizTopics: safeNodes.filter((node) => node.status === 'NEEDS_QUIZ'),
  };
}
