// src/features/parent-report/queries.student.ts
// Data access for the student-facing Parent Hub (/student/parent-hub).
// Auth-gated by the student's session — no token needed.
// Covers: monthly recap, portfolio, riwayat (with quiz scores + topic titles),
//         certificates, billing, and 12-month snapshots in a single unified loader.

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  getStudentCertificates,
  type CertificateWithModule,
} from '@/features/certificates/queries';
import type { AttendanceStatus } from '@/types/sessions';

// ── Result shapes ─────────────────────────────────────────────────────────────

export interface MonthlyRecap {
  monthLabel: string; // e.g. "Oktober 2026"
  attendedCount: number;
  totalScheduled: number;
  attendanceRate: number; // 0–100 integer percentage
  xpThisMonth: number;
  coinsTotal: number;
  totalXp: number;
  avgQuizScore: number; // 0–100 average across all topic_quiz_attempts best scores
  moduleStatus: string; // e.g. "Desain 3D Tinkercad · 3/5 topik selesai"
}

export interface PortfolioItem {
  submissionId: number;
  challengeTitle: string;
  topicTitle: string | null;
  submissionUrl: string | null;
  approvedAt: string | null;
  submittedAt: string | null;
  status: 'pending' | 'approved' | 'needs_revision';
}

export interface HubInvoice {
  id: string;
  month_year: string;
  attended_meetings: number;
  total_meetings: number;
  price_per_meeting: number;
  total_amount: number;
  bank_account: string | null;
  status: 'draft' | 'sent' | 'paid';
}

export interface RiwayatSession {
  meeting_id: number;
  title: string;
  meeting_date: string;
  has_joined: boolean;
  attendance_status: AttendanceStatus;
  progress_report: string | null; // teacher note
  topic_title: string | null; // resolved from topics table
  quiz_score: number | null; // best attempt score for aligned topic (0-100)
}

export interface RiwayatModule {
  module_id: number | null;
  module_title: string;
  completed_count: number; // sessions where has_joined = true
  sessions: RiwayatSession[];
}

export interface StudentHubData {
  studentName: string;
  monthly: MonthlyRecap;
  portfolio: PortfolioItem[];
  certificates: CertificateWithModule[];
  invoices: HubInvoice[];
  riwayat: RiwayatModule[];
}

export interface MonthlySnapshot {
  monthYear: string; // "YYYY-MM"
  monthLabel: string; // "Oktober 2026"
  attendedCount: number;
  totalScheduled: number;
  attendanceRate: number; // 0–100
  avgQuizScore: number; // 0–100, 0 = no attempts
  topicsCompleted: number; // topics with best quiz score ≥ 70
  xpEarned: number;
  sessions: Array<{
    meeting_id: number;
    title: string;
    meeting_date: string;
    has_joined: boolean;
    attendance_status: AttendanceStatus;
    quiz_score: number | null;
    topic_title: string | null;
    progress_report: string | null;
  }>;
}

interface StudentMeetingAttendance {
  meeting_id: number;
  has_joined: boolean;
  attendance_status: AttendanceStatus | null;
}

async function getStudentMeetingAttendance(
  studentId: string
): Promise<StudentMeetingAttendance[]> {
  const db = createSupabaseAdminClient();

  try {
    const { data, error } = await db
      .from('meeting_students')
      .select('meeting_id, has_joined, attendance_status')
      .eq('student_id', studentId) as unknown as {
      data: StudentMeetingAttendance[] | null;
      error: { message: string } | null;
    };

    if (!error) return data ?? [];
    console.error('[getStudentHubBundle] attendance status query failed:', error.message);
  } catch (error) {
    console.error('[getStudentHubBundle] attendance status query threw:', error);
  }

  try {
    const { data, error } = await db
      .from('meeting_students')
      .select('meeting_id, has_joined')
      .eq('student_id', studentId) as unknown as {
      data: Array<{ meeting_id: number; has_joined: boolean }> | null;
      error: { message: string } | null;
    };

    if (error) {
      console.error('[getStudentHubBundle] legacy attendance query failed:', error.message);
      throw new Error(error.message);
    }
    return (data ?? []).map((row) => ({ ...row, attendance_status: null }));
  } catch (error) {
    console.error('[getStudentHubBundle] legacy attendance query threw:', error);
    throw new Error('Gagal memuat data kehadiran Parent Hub.');
  }
}

// ── Unified 2-stage parallel loader ───────────────────────────────────────────

export async function getStudentHubBundle(
  studentId: string
): Promise<{ hubData: StudentHubData; snapshots: MonthlySnapshot[] }> {
  const db = createSupabaseAdminClient();
  const now = new Date();

  // Stage 1: Fetch all independent student records in parallel
  const [
    { data: student },
    msRows,
    { data: tpAll },
    { data: enrollments },
    { data: portfolioSubs },
    certificates,
    { data: invoiceRows },
  ] = await Promise.all([
    db
      .from('students')
      .select('full_name, total_xp, coins')
      .eq('id', studentId)
      .maybeSingle() as unknown as Promise<{
      data: { full_name: string; total_xp: number; coins: number } | null;
      error: unknown;
    }>,
    getStudentMeetingAttendance(studentId),
    db
      .from('topic_progress')
      .select('xp_earned, completed_at')
      .eq('student_id', studentId) as unknown as Promise<{
      data: Array<{ xp_earned: number; completed_at: string }> | null;
      error: unknown;
    }>,
    db
      .from('student_modules')
      .select('module_id, status, modules ( id, title )')
      .eq('student_id', studentId) as unknown as Promise<{
      data: Array<{
        module_id: number;
        status: string;
        modules: { id: number; title: string } | null;
      }> | null;
      error: unknown;
    }>,
    db
      .from('challenge_submissions')
       .select('id, challenge_id, submission_url, submitted_at, reviewed_at, status')
      .eq('student_id', studentId)
      .not('submission_url', 'is', null)
      .order('submitted_at', { ascending: false }) as unknown as Promise<{
      data: Array<{
        id: number;
        challenge_id: number;
        submission_url: string | null;
        submitted_at: string | null;
        reviewed_at: string | null;
        status: 'pending' | 'approved' | 'needs_revision';
      }> | null;
      error: unknown;
    }>,
    getStudentCertificates(studentId),
    db
      .from('invoices')
      .select(
        'id, month_year, attended_meetings, total_meetings, price_per_meeting, total_amount, bank_account, status'
      )
      .eq('student_id', studentId)
      .order('month_year', { ascending: false }) as unknown as Promise<{
      data: HubInvoice[] | null;
      error: unknown;
    }>,
  ]);

  const studentName = student?.full_name ?? 'Siswa';
  const totalXp = student?.total_xp ?? 0;
  const coinsTotal =
    student?.coins ??
    (student as unknown as { edu_coins?: number })?.edu_coins ??
    0;

  const allMsRows = msRows ?? [];
  const joinedMap = new Map(allMsRows.map((r) => [r.meeting_id, r.has_joined]));
  const attendanceMap = new Map(
    allMsRows.map((r) => [r.meeting_id, r.attendance_status])
  );
  const enrolledModuleIds = (enrollments ?? []).map((e) => e.module_id);
  const challengeIds = (portfolioSubs ?? []).map((s) => s.challenge_id);

  // Stage 2: Fetch dependent meetings, published topics, and challenges in parallel
  const [meetingsRes, topicsRes, challengesRes] = await Promise.all([
    db
      .from('meetings')
      .select(
        'id, title, meeting_date, topic_id, progress_report, is_completed, meeting_students!inner(student_id)'
      )
      .eq('meeting_students.student_id', studentId)
      .eq('is_completed', true)
      .order('meeting_date', { ascending: true }) as unknown as Promise<{
      data: Array<{
        id: number;
        title: string;
        meeting_date: string;
        topic_id: number | null;
        progress_report: string | null;
        is_completed: boolean;
        meeting_students: Array<{ student_id: string }>;
      }> | null;
      error: unknown;
    }>,
    enrolledModuleIds.length > 0
      ? (db
          .from('topics')
          .select('id, title, module_id, order_index')
          .in('module_id', enrolledModuleIds)
          .eq('status', 'published')
          .order('order_index', { ascending: true })
          .order('id', { ascending: true }) as unknown as Promise<{
          data: Array<{
            id: number;
            title: string;
            module_id: number;
            order_index: number;
          }> | null;
          error: unknown;
        }>)
      : Promise.resolve({ data: [], error: null }),
    challengeIds.length > 0
      ? (db
          .from('challenges')
          .select('id, title, topic_id')
          .in('id', challengeIds) as unknown as Promise<{
          data: Array<{ id: number; title: string; topic_id: number }> | null;
          error: unknown;
        }>)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const allMeetingsAsc = meetingsRes.data ?? [];
  const topicsData = topicsRes.data ?? [];
  const challenges = challengesRes.data ?? [];

  // Flatten published topics in module order (active module first)
  const activeEnrollment = (enrollments ?? []).find(
    (e) => e.status === 'active'
  );
  const sortedModIds = [
    ...(activeEnrollment ? [activeEnrollment.module_id] : []),
    ...(enrollments ?? [])
      .filter((e) => e.status !== 'active')
      .map((e) => e.module_id),
  ];

  const flattenedTopics: Array<{
    id: number;
    title: string;
    module_id: number;
    order_index: number;
  }> = [];
  for (const modId of sortedModIds) {
    const modTopics = topicsData
      .filter((t) => t.module_id === modId)
      .sort((a, b) => a.order_index - b.order_index || a.id - b.id);
    flattenedTopics.push(...modTopics);
  }

  const topicIds = flattenedTopics.map((t) => t.id);
  const portTopicIds = [...new Set(challenges.map((c) => c.topic_id))];

  // Fetch quiz attempts + portfolio topic titles in parallel if needed
  const [quizAttemptsRes, portTopicsRes] = await Promise.all([
    topicIds.length > 0
      ? (db
          .from('topic_quiz_attempts')
          .select('topic_id, score, submitted_at')
          .eq('student_id', studentId)
          .in('topic_id', topicIds) as unknown as Promise<{
          data: Array<{
            topic_id: number;
            score: number;
            submitted_at?: string;
          }> | null;
          error: unknown;
        }>)
      : Promise.resolve({ data: [], error: null }),
    portTopicIds.length > 0
      ? (db
          .from('topics')
          .select('id, title')
          .in('id', portTopicIds) as unknown as Promise<{
          data: Array<{ id: number; title: string }> | null;
          error: unknown;
        }>)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const quizBestMap = new Map<number, number>();
  for (const qa of quizAttemptsRes.data ?? []) {
    const prev = quizBestMap.get(qa.topic_id) ?? 0;
    if (qa.score > prev) quizBestMap.set(qa.topic_id, qa.score);
  }

  // Average quiz score across all attempted topics
  const attemptedScores = [...quizBestMap.values()];
  const avgQuizScore =
    attemptedScores.length > 0
      ? Math.round(
          attemptedScores.reduce((s, v) => s + v, 0) / attemptedScores.length
        )
      : 0;

  // Module status string
  let moduleStatus = 'Belum ada modul aktif';
  if (activeEnrollment?.modules) {
    const activeTopics = flattenedTopics.filter(
      (t) => t.module_id === activeEnrollment.module_id
    );
    const completedTopics = activeTopics.filter(
      (t) => quizBestMap.has(t.id) && quizBestMap.get(t.id)! >= 70
    ).length;
    moduleStatus = `${activeEnrollment.modules.title} · ${completedTopics}/${activeTopics.length} topik`;
  }

  // Meeting history follows its saved topic association; legacy meetings stay unmapped.
  const meetingTopicMap = new Map<
    number,
    { topic_title: string | null; quiz_score: number | null }
  >();
  const topicsById = new Map(flattenedTopics.map((topic) => [topic.id, topic]));
  for (const meeting of allMeetingsAsc) {
    const topic = meeting.topic_id == null ? undefined : topicsById.get(meeting.topic_id);
    meetingTopicMap.set(meeting.id, {
      topic_title: topic?.title ?? null,
      quiz_score: topic ? quizBestMap.get(topic.id) ?? null : null,
    });
  }

  // Current month recap
  const monthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  ).toISOString();
  const monthEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  ).toISOString();

  const thisMoMeetings = allMeetingsAsc.filter(
    (m) => m.meeting_date >= monthStart && m.meeting_date <= monthEnd
  );
  const totalScheduled = thisMoMeetings.length;
  const attendedCount = thisMoMeetings.filter(
    (m) => joinedMap.get(m.id) === true
  ).length;
  const attendanceRate =
    totalScheduled > 0 ? Math.round((attendedCount / totalScheduled) * 100) : 0;

  const xpThisMonth = (tpAll ?? [])
    .filter((r) => r.completed_at >= monthStart && r.completed_at <= monthEnd)
    .reduce((s, r) => s + r.xp_earned, 0);

  // Completed sessions for riwayat (descending by meeting_date)
  const riwayat: RiwayatModule[] = [];
  const completedMeetingsDesc = allMeetingsAsc
    .filter((m) => m.is_completed)
    .slice()
    .sort((a, b) => b.meeting_date.localeCompare(a.meeting_date));

  if (completedMeetingsDesc.length > 0) {
    const sessions: RiwayatSession[] = completedMeetingsDesc.map((m) => {
      const topicData = meetingTopicMap.get(m.id);
      return {
        meeting_id: m.id,
        title: m.title,
        meeting_date: m.meeting_date,
        has_joined: joinedMap.get(m.id) ?? false,
        attendance_status:
          attendanceMap.get(m.id) ?? (joinedMap.get(m.id) ? 'hadir' : 'absen'),
        progress_report: m.progress_report,
        topic_title: topicData?.topic_title ?? null,
        quiz_score: topicData?.quiz_score ?? null,
      };
    });

    // Group all completed sessions under the active module (or "Sesi Lainnya" if none).
    // We deliberately avoid fuzzy title matching which silently drops sessions.
    if (activeEnrollment?.modules) {
      riwayat.push({
        module_id: activeEnrollment.module_id,
        module_title: activeEnrollment.modules.title,
        completed_count: sessions.filter((s) => s.has_joined).length,
        sessions,
      });
    } else if (sessions.length > 0) {
      riwayat.push({
        module_id: null,
        module_title: 'Sesi Lainnya',
        completed_count: sessions.filter((s) => s.has_joined).length,
        sessions,
      });
    }
  }

  // Every submitted project link is visible in the Parent Hub portfolio, including pending reviews.
  const portfolio: PortfolioItem[] = [];
  if ((portfolioSubs ?? []).length > 0) {
    const chMap = new Map(challenges.map((c) => [c.id, c]));
    const topicMap = new Map((portTopicsRes.data ?? []).map((t) => [t.id, t]));

    for (const sub of portfolioSubs ?? []) {
      const ch = chMap.get(sub.challenge_id);
      const topic = ch ? topicMap.get(ch.topic_id) : null;
      portfolio.push({
        submissionId: sub.id,
        challengeTitle: ch?.title ?? 'Challenge',
        topicTitle: topic?.title ?? null,
        submissionUrl: sub.submission_url,
        approvedAt: sub.status === 'approved' ? sub.reviewed_at : null,
        submittedAt: sub.submitted_at,
        status: sub.status,
      });
    }
  }

  const monthLabel = now.toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  });
  const monthly: MonthlyRecap = {
    monthLabel,
    attendedCount,
    totalScheduled,
    attendanceRate,
    xpThisMonth,
    coinsTotal,
    totalXp,
    avgQuizScore,
    moduleStatus,
  };

  const hubData: StudentHubData = {
    studentName,
    monthly,
    portfolio,
    certificates,
    invoices: invoiceRows ?? [],
    riwayat,
  };

  // Build 12 month windows for MonthlySnapshot[]
  const windows: Array<{
    monthYear: string;
    monthLabel: string;
    start: string;
    end: string;
  }> = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
    const end = new Date(
      d.getFullYear(),
      d.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    ).toISOString();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    windows.push({
      monthYear: `${d.getFullYear()}-${mm}`,
      monthLabel: d.toLocaleDateString('id-ID', {
        month: 'long',
        year: 'numeric',
      }),
      start,
      end,
    });
  }

  const snapshots: MonthlySnapshot[] = windows.map((w) => {
    const inWindow = allMeetingsAsc.filter(
      (m) => m.meeting_date >= w.start && m.meeting_date <= w.end
    );

    const scheduled = inWindow.length;
    const attended = inWindow.filter(
      (m) => joinedMap.get(m.id) === true
    ).length;
    const rate = scheduled > 0 ? Math.round((attended / scheduled) * 100) : 0;

    const meetingScores = inWindow
      .map((m) => meetingTopicMap.get(m.id)?.quiz_score ?? null)
      .filter((s): s is number => s !== null);
    const directAttemptScores = (quizAttemptsRes.data ?? [])
      .filter(
        (qa) =>
          qa.submitted_at &&
          qa.submitted_at >= w.start &&
          qa.submitted_at <= w.end
      )
      .map((qa) => qa.score);
    const scores =
      meetingScores.length > 0 ? meetingScores : directAttemptScores;
    const avg =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;

    const topicsThisMonth = inWindow
      .map((m) => meetingTopicMap.get(m.id)?.quiz_score)
      .filter((s): s is number => typeof s === 'number' && s >= 70).length;

    const xpEarned = (tpAll ?? [])
      .filter((t) => t.completed_at >= w.start && t.completed_at <= w.end)
      .reduce((s, t) => s + t.xp_earned, 0);

    const sessions = inWindow.map((m) => {
      const td = meetingTopicMap.get(m.id);
      return {
        meeting_id: m.id,
        title: m.title,
        meeting_date: m.meeting_date,
        has_joined: joinedMap.get(m.id) ?? false,
        attendance_status:
          attendanceMap.get(m.id) ?? (joinedMap.get(m.id) ? 'hadir' : 'absen'),
        quiz_score: td?.quiz_score ?? null,
        topic_title: td?.topic_title ?? null,
        progress_report: m.progress_report,
      };
    });

    return {
      monthYear: w.monthYear,
      monthLabel: w.monthLabel,
      attendedCount: attended,
      totalScheduled: scheduled,
      attendanceRate: rate,
      avgQuizScore: avg,
      topicsCompleted: topicsThisMonth,
      xpEarned,
      sessions,
    };
  });

  return { hubData, snapshots };
}

export async function getStudentHubData(
  studentId: string
): Promise<StudentHubData> {
  const { hubData } = await getStudentHubBundle(studentId);
  return hubData;
}

export async function getMonthlySnapshots(
  studentId: string
): Promise<MonthlySnapshot[]> {
  const { snapshots } = await getStudentHubBundle(studentId);
  return snapshots;
}
