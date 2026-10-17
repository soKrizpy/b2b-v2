// src/features/users/teacherStudentQueries.ts
// Rich query for teacher to see a single student's full learning profile.
// Uses admin client to bypass RLS.

import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export interface StudentModuleDetail {
  module_id: number;
  title: string;
  level: string | null;
  status: string;
  topics: StudentTopicDetail[];
}

export interface StudentTopicDetail {
  topic_id: number;
  title: string;
  order_index: number;
  quiz_score: number | null;
  quiz_passed: boolean | null;
  submission_count: number;
  submissions_approved: number;
}

export interface StudentBadgeDetail {
  id: number;
  name: string;
  description: string | null;
  icon_url: string | null;
  earned_at: string;
}

export interface StudentCertDetail {
  id: number;
  module_title: string | null;
  score: number;
  tier: string;
  certificate_number: string;
  issued_at: string;
}

export interface StudentSessionDetail {
  id: number;
  meeting_date: string;
  subject: string | null;
  is_completed: boolean;
  has_joined: boolean;
  progress_report: string | null;
  teacher_name: string | null;
}

export interface StudentSubmissionDetail {
  id: number;
  challenge_title: string | null;
  topic_title: string | null;
  module_title: string | null;
  submission_url: string | null;
  submission_note: string | null;
  status: string;
  review_note: string | null;
  submitted_at: string;
}

export interface TeacherStudentProfile {
  id: string;
  full_name: string;
  email_or_phone: string;
  grade: string | null;
  bio: string | null;
  total_xp: number;
  coins: number;
  created_at: string | null;
  modules: StudentModuleDetail[];
  badges: StudentBadgeDetail[];
  certificates: StudentCertDetail[];
  sessions: StudentSessionDetail[];
  submissions: StudentSubmissionDetail[];
  session_count: number;
  quiz_count: number;
  cert_count: number;
  badge_count: number;
  submission_count: number;
}

/** Full student profile for teacher view. */
export async function getTeacherStudentProfile(
  studentId: string
): Promise<TeacherStudentProfile | null> {
  const db = createSupabaseAdminClient();

  const [
    { data: studentRow, error: sErr },
    { data: studentModules },
    { data: badgeRows },
    { data: certRows },
    { data: sessionRows },
    { data: submissionRows },
    { data: quizRows },
  ] = await Promise.all([
    // Core profile
    db
      .from('students')
      .select('id, full_name, email_or_phone, grade, bio, total_xp, coins, created_at')
      .eq('id', studentId)
      .maybeSingle(),

    // Modules with topics
    db
      .from('student_modules')
      .select(`
        status,
        modules (
          id, title, level,
          topics ( id, title, order_index )
        )
      `)
      .eq('student_id', studentId),

    // Badges
    db
      .from('student_badges')
      .select('earned_at, badges ( id, name, description, icon_url )')
      .eq('student_id', studentId)
      .order('earned_at', { ascending: false }),

    // Certificates
    db
      .from('certificates')
      .select('id, score, tier, certificate_number, issued_at, modules ( title )')
      .eq('student_id', studentId)
      .order('issued_at', { ascending: false }),

    // Sessions (meetings this student has been in)
    db
      .from('meeting_students')
      .select(`
        has_joined,
        meetings (
          id, meeting_date, subject, is_completed, progress_report,
          profiles ( full_name )
        )
      `)
      .eq('student_id', studentId)
      .order('student_id', { ascending: false }),

    // Submissions
    db
      .from('challenge_submissions')
      .select(`
        id, submission_url, submission_note, status, review_note, submitted_at,
        challenges ( title, topics ( title, modules ( title ) ) )
      `)
      .eq('student_id', studentId)
      .order('submitted_at', { ascending: false }),

    // Quiz attempts
    db
      .from('quiz_attempts')
      .select('id, topic_id, score, passed')
      .eq('student_id', studentId),
  ]);

  if (sErr || !studentRow) return null;

  const sr = studentRow as unknown as {
    id: string; full_name: string; email_or_phone: string;
    grade: string | null; bio: string | null;
    total_xp: number; coins: number; created_at: string | null;
  };

  // Build quiz map: topic_id -> best score
  const quizMap = new Map<number, { score: number; passed: boolean }>();
  (quizRows ?? []).forEach((qa: unknown) => {
    const q = qa as { topic_id: number; score: number; passed: boolean };
    const prev = quizMap.get(q.topic_id);
    if (!prev || q.score > prev.score) quizMap.set(q.topic_id, q);
  });

  // Build submission count map: challenge_id -> counts
  const subCountMap = new Map<string, { total: number; approved: number }>();
  (submissionRows ?? []).forEach((sub: unknown) => {
    const s = sub as { challenges: { title: string } | null; status: string };
    const key = (s.challenges as unknown as { title: string } | null)?.title ?? 'unknown';
    const prev = subCountMap.get(key) ?? { total: 0, approved: 0 };
    subCountMap.set(key, {
      total: prev.total + 1,
      approved: prev.approved + (s.status === 'approved' ? 1 : 0),
    });
  });

  // Parse modules
  const modules: StudentModuleDetail[] = (studentModules ?? []).map((sm: unknown) => {
    const m = sm as {
      status: string;
      modules: {
        id: number; title: string; level: string | null;
        topics: Array<{ id: number; title: string; order_index: number }>;
      } | null;
    };
    if (!m.modules) return null;
    const topics: StudentTopicDetail[] = (m.modules.topics ?? []).map((t) => {
      const qz = quizMap.get(t.id);
      return {
        topic_id: t.id,
        title: t.title,
        order_index: t.order_index,
        quiz_score: qz?.score ?? null,
        quiz_passed: qz?.passed ?? null,
        submission_count: 0,
        submissions_approved: 0,
      };
    }).sort((a, b) => a.order_index - b.order_index);
    return {
      module_id: m.modules.id,
      title: m.modules.title,
      level: m.modules.level,
      status: m.status,
      topics,
    };
  }).filter(Boolean) as StudentModuleDetail[];

  // Parse badges
  const badges: StudentBadgeDetail[] = (badgeRows ?? []).map((b: unknown) => {
    const bw = b as {
      earned_at: string;
      badges: { id: number; name: string; description: string | null; icon_url: string | null } | null;
    };
    if (!bw.badges) return null;
    return {
      id: bw.badges.id,
      name: bw.badges.name,
      description: bw.badges.description,
      icon_url: bw.badges.icon_url,
      earned_at: bw.earned_at,
    };
  }).filter(Boolean) as StudentBadgeDetail[];

  // Parse certs
  const certificates: StudentCertDetail[] = (certRows ?? []).map((c: unknown) => {
    const cw = c as {
      id: number; score: number; tier: string; certificate_number: string; issued_at: string;
      modules: { title: string } | null;
    };
    return {
      id: cw.id,
      module_title: cw.modules?.title ?? null,
      score: cw.score,
      tier: cw.tier,
      certificate_number: cw.certificate_number,
      issued_at: cw.issued_at,
    };
  });

  // Parse sessions
  const sessions: StudentSessionDetail[] = (sessionRows ?? []).map((ms: unknown) => {
    const mw = ms as {
      has_joined: boolean;
      meetings: {
        id: number; meeting_date: string; subject: string | null;
        is_completed: boolean; progress_report: string | null;
        profiles: { full_name: string | null } | null;
      } | null;
    };
    if (!mw.meetings) return null;
    return {
      id: mw.meetings.id,
      meeting_date: mw.meetings.meeting_date,
      subject: mw.meetings.subject,
      is_completed: mw.meetings.is_completed,
      has_joined: mw.has_joined,
      progress_report: mw.meetings.progress_report,
      teacher_name: mw.meetings.profiles?.full_name ?? null,
    };
  }).filter(Boolean) as StudentSessionDetail[];

  // Sort sessions by date desc
  sessions.sort((a, b) => new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime());

  // Parse submissions
  const submissions: StudentSubmissionDetail[] = (submissionRows ?? []).map((sub: unknown) => {
    const s = sub as {
      id: number; submission_url: string | null; submission_note: string | null;
      status: string; review_note: string | null; submitted_at: string;
      challenges: {
        title: string;
        topics: { title: string; modules: { title: string } | null } | null;
      } | null;
    };
    return {
      id: s.id,
      challenge_title: s.challenges?.title ?? null,
      topic_title: s.challenges?.topics?.title ?? null,
      module_title: s.challenges?.topics?.modules?.title ?? null,
      submission_url: s.submission_url,
      submission_note: s.submission_note,
      status: s.status,
      review_note: s.review_note,
      submitted_at: s.submitted_at,
    };
  });

  return {
    ...sr,
    total_xp: sr.total_xp ?? 0,
    coins: sr.coins ?? 0,
    modules,
    badges,
    certificates,
    sessions,
    submissions,
    session_count: sessions.filter((s) => s.has_joined).length,
    quiz_count: quizRows?.length ?? 0,
    cert_count: certificates.length,
    badge_count: badges.length,
    submission_count: submissions.length,
  };
}
