// src/features/challenges/queries.ts
// Read-side query helpers for challenges and submissions.

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { ChallengeRow, SubmissionRow } from '@/types/database';

// ── Result shapes ─────────────────────────────────────────────────────────────

export interface ChallengeWithSubmission extends ChallengeRow {
  /** Most-recent submission for this student, or null. */
  submission: SubmissionRow | null;
}

export interface SubmissionWithDetails extends SubmissionRow {
  challenge: Pick<ChallengeRow, 'id' | 'title' | 'topic_id'> | null;
  student_name: string | null;
  student_email: string | null;
}

// ── Challenges ────────────────────────────────────────────────────────────────

/** All challenges for a topic, ordered by order_index. */
export async function getChallengesByTopicId(topicId: number): Promise<ChallengeRow[]> {
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from('challenges')
    .select('id, topic_id, title, instructions, order_index, allows_file_upload, created_at')
    .eq('topic_id', topicId)
    .order('order_index', { ascending: true });

  if (error) { console.error('[getChallengesByTopicId]', error.message); return []; }
  return (data ?? []) as unknown as ChallengeRow[];
}

/** Single challenge by id. */
export async function getChallengeById(challengeId: number): Promise<ChallengeRow | null> {
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from('challenges')
    .select('id, topic_id, title, instructions, order_index, allows_file_upload, created_at')
    .eq('id', challengeId)
    .maybeSingle();

  if (error) { console.error('[getChallengeById]', error.message); return null; }
  return data as unknown as ChallengeRow | null;
}

/**
 * Challenges for a topic, enriched with the student's most-recent submission.
 * Used on the student topic detail page.
 */
export async function getChallengesWithSubmissions(
  topicId: number,
  studentId: string,
  activeChallengeIds?: number[]
): Promise<ChallengeWithSubmission[]> {
  const db = createSupabaseAdminClient();

  const { data: challenges, error: chErr } = await db
    .from('challenges')
    .select('id, topic_id, title, instructions, order_index, allows_file_upload, created_at')
    .eq('topic_id', topicId)
    .order('order_index', { ascending: true });

  if (chErr || !challenges?.length) return [];

  const activeIds = activeChallengeIds === undefined ? null : new Set(activeChallengeIds);
  const visibleChallenges = activeIds
    ? (challenges as unknown as ChallengeRow[]).filter((challenge) => activeIds.has(challenge.id))
    : challenges as unknown as ChallengeRow[];
  if (!visibleChallenges.length) return [];

  const challengeIds = visibleChallenges.map((c) => c.id);

  const { data: subs, error: subErr } = await db
    .from('challenge_submissions')
    .select('id, challenge_id, student_id, submission_url, submission_note, status, review_note, reviewed_by, reviewed_at, submitted_at, created_at')
    .in('challenge_id', challengeIds)
    .eq('student_id', studentId)
    .order('submitted_at', { ascending: false });

  if (subErr) console.error('[getChallengesWithSubmissions] subs', subErr.message);

  const subList = (subs ?? []) as unknown as SubmissionRow[];

  // Keep only the most-recent submission per challenge
  const latestSubMap = new Map<number, SubmissionRow>();
  subList.forEach((s) => {
    if (!latestSubMap.has(s.challenge_id)) latestSubMap.set(s.challenge_id, s);
  });

  const orderedChallenges = activeIds
    ? [...visibleChallenges].sort((a, b) => activeChallengeIds!.indexOf(a.id) - activeChallengeIds!.indexOf(b.id))
    : visibleChallenges;

  return orderedChallenges.map((c) => ({
    ...c,
    submission: latestSubMap.get(c.id) ?? null,
  }));
}

// ── Submissions ───────────────────────────────────────────────────────────────

/**
 * All pending submissions — for teacher review page.
 * Enriched with challenge info and student name.
 */
export async function getPendingSubmissions(): Promise<SubmissionWithDetails[]> {
  const db = createSupabaseAdminClient();

  const { data: subs, error: subErr } = await db
    .from('challenge_submissions')
    .select(`
      id, challenge_id, student_id, submission_url, submission_note,
      status, review_note, reviewed_by, reviewed_at, submitted_at, created_at
    `)
    .eq('status', 'pending')
    .order('submitted_at', { ascending: true });

  if (subErr) { console.error('[getPendingSubmissions]', subErr.message); return []; }

  const rawSubs = (subs ?? []) as unknown as SubmissionRow[];
  if (!rawSubs.length) return [];

  // Enrich with challenge and student data in parallel
  const challengeIds = [...new Set(rawSubs.map((s) => s.challenge_id))];
  const studentIds   = [...new Set(rawSubs.map((s) => s.student_id))];

  const [{ data: challenges }, { data: students }] = await Promise.all([
    db
      .from('challenges')
      .select('id, topic_id, title')
      .in('id', challengeIds) as unknown as Promise<{
        data: Array<Pick<ChallengeRow, 'id' | 'topic_id' | 'title'>>;
        error: unknown;
      }>,
    db
      .from('students')
      .select('id, full_name, email_or_phone')
      .in('id', studentIds) as unknown as Promise<{
        data: Array<{ id: string; full_name: string; email_or_phone: string }>;
        error: unknown;
      }>,
  ]);

  const challengeMap = new Map((challenges ?? []).map((c) => [c.id, c]));
  const studentMap   = new Map((students ?? []).map((s) => [s.id, s]));

  return rawSubs.map((sub) => ({
    ...sub,
    challenge: challengeMap.get(sub.challenge_id) ?? null,
    student_name:  studentMap.get(sub.student_id)?.full_name  ?? null,
    student_email: studentMap.get(sub.student_id)?.email_or_phone ?? null,
  }));
}

/**
 * All submissions (any status) for a given student.
 * Used on student dashboard to show completion history.
 */
export async function getStudentSubmissions(studentId: string): Promise<SubmissionRow[]> {
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from('challenge_submissions')
    .select('id, challenge_id, student_id, submission_url, submission_note, status, review_note, reviewed_by, reviewed_at, submitted_at, created_at')
    .eq('student_id', studentId)
    .order('submitted_at', { ascending: false });

  if (error) { console.error('[getStudentSubmissions]', error.message); return []; }
  return (data ?? []) as unknown as SubmissionRow[];
}

/** Single submission by id. */
export async function getSubmissionById(submissionId: number): Promise<SubmissionRow | null> {
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from('challenge_submissions')
    .select('id, challenge_id, student_id, submission_url, submission_note, status, review_note, reviewed_by, reviewed_at, submitted_at, created_at')
    .eq('id', submissionId)
    .maybeSingle();

  if (error) { console.error('[getSubmissionById]', error.message); return null; }
  return data as unknown as SubmissionRow | null;
}

/** All submissions for teacher view — all statuses, all students. */
export async function getAllSubmissions(teacherId?: string): Promise<SubmissionWithDetails[]> {
  const db = createSupabaseAdminClient();

  // Teacher view is limited to students explicitly assigned to that teacher.
  // Admin callers may omit teacherId to access the complete review queue.
  let assignedStudentIds: Set<string> | null = null;
  if (teacherId) {
    const { data: assignments, error: assignmentError } = await (db
      .from('teacher_students')
      .select('student_id')
      .eq('teacher_id', teacherId) as unknown as Promise<{
        data: Array<{ student_id: string }> | null;
        error: { message: string } | null;
      }>);
    if (assignmentError) {
      console.error('[getAllSubmissions] assignment lookup failed', assignmentError.message);
      return [];
    }
    assignedStudentIds = new Set((assignments ?? []).map((row) => row.student_id));

    // Also include students on meetings assigned to this teacher; some class
    // assignments are represented through meeting_students rather than mentorship.
    const { data: meetings, error: meetingError } = await (db
      .from('meetings')
      .select('id')
      .eq('teacher_id', teacherId) as unknown as Promise<{
        data: Array<{ id: number }> | null;
        error: { message: string } | null;
      }>);
    if (meetingError) {
      console.error('[getAllSubmissions] meeting lookup failed', meetingError.message);
      return [];
    }
    const meetingIds = (meetings ?? []).map((meeting) => meeting.id);
    if (meetingIds.length > 0) {
      const { data: meetingStudents, error: meetingStudentsError } = await (db
        .from('meeting_students')
        .select('student_id')
        .in('meeting_id', meetingIds) as unknown as Promise<{
          data: Array<{ student_id: string }> | null;
          error: { message: string } | null;
        }>);
      if (meetingStudentsError) {
        console.error('[getAllSubmissions] meeting-student lookup failed', meetingStudentsError.message);
        return [];
      }
      for (const row of meetingStudents ?? []) assignedStudentIds.add(row.student_id);
    }
    if (assignedStudentIds.size === 0) return [];
  }

  const { data: subs, error: subErr } = await db
    .from('challenge_submissions')
    .select(`
      id, challenge_id, student_id, submission_url, submission_note,
      status, review_note, reviewed_by, reviewed_at, submitted_at, created_at
    `)
    .order('submitted_at', { ascending: false });

  if (subErr) { console.error('[getAllSubmissions]', subErr.message); return []; }

  const allSubs = (subs ?? []) as unknown as SubmissionRow[];
  const rawSubs = assignedStudentIds
    ? allSubs.filter((sub) => assignedStudentIds!.has(sub.student_id))
    : allSubs;
  if (!rawSubs.length) return [];

  const challengeIds = [...new Set(rawSubs.map((s) => s.challenge_id))];
  const studentIds   = [...new Set(rawSubs.map((s) => s.student_id))];

  const [{ data: challenges }, { data: students }] = await Promise.all([
    db
      .from('challenges')
      .select('id, topic_id, title')
      .in('id', challengeIds) as unknown as Promise<{
        data: Array<Pick<ChallengeRow, 'id' | 'topic_id' | 'title'>>;
        error: unknown;
      }>,
    db
      .from('students')
      .select('id, full_name, email_or_phone')
      .in('id', studentIds) as unknown as Promise<{
        data: Array<{ id: string; full_name: string; email_or_phone: string }>;
        error: unknown;
      }>,
  ]);

  const challengeMap = new Map((challenges ?? []).map((c) => [c.id, c]));
  const studentMap   = new Map((students ?? []).map((s) => [s.id, s]));

  return rawSubs.map((sub) => ({
    ...sub,
    challenge: challengeMap.get(sub.challenge_id) ?? null,
    student_name:  studentMap.get(sub.student_id)?.full_name  ?? null,
    student_email: studentMap.get(sub.student_id)?.email_or_phone ?? null,
  }));
}
