// src/features/users/queries.ts
// Read-side helpers for the admin user management page.
// All queries use the admin client (bypasses RLS).

import { createSupabaseAdminClient } from '@/lib/supabase/admin';

// ── Result shapes ─────────────────────────────────────────────────────────────

export interface AssignedModule {
  module_id: number;
  title:     string;
  status:    string;
  level:     string | null;
}

export interface EnrolledTeacher {
  id:            string;
  full_name:     string | null;
  session_count: number;
}

export interface EnrolledStudent {
  id:             string;
  full_name:      string;
  email_or_phone: string;
  grade:          string | null;
  session_count:  number;
}

export interface StudentRecord {
  id:             string;
  full_name:      string;
  email_or_phone: string;
  grade:          string | null;
  bio:            string | null;
  mpin:           string;
  total_xp:       number;
  coins:          number;
  created_at:     string | null;
  /** Active module titles (for badge list in table row) */
  module_titles:  string[];
  /** All assigned modules with detail (for detail modal) */
  modules:        AssignedModule[];
  /** Teachers enrolled with this student */
  teachers:       EnrolledTeacher[];
  /** Attended meeting count */
  session_count:  number;
  /** Quiz attempt count */
  quiz_count:     number;
  /** Certificate count */
  cert_count:     number;
}

export interface TeacherRecord {
  id:         string;
  full_name:  string | null;
  email:      string | null;
  created_at: string | null;
  /** Meetings assigned to this teacher */
  session_count: number;
  /** Unique students enrolled in this teacher's meetings */
  student_count: number;
  /** Enrolled student records */
  enrolled_students: EnrolledStudent[];
}

// ── Queries ───────────────────────────────────────────────────────────────────

/** All students, newest first, enriched with modules + stats. */
export async function getAllStudents(): Promise<StudentRecord[]> {
  const db = createSupabaseAdminClient();

  const [
    { data, error },
    { data: meetingStudents },
    { data: meetings },
    { data: teacherProfiles },
    { data: quizAttempts },
    { data: certs },
  ] = await Promise.all([
    db
      .from('students')
      .select(`
        id, full_name, email_or_phone, grade, bio, mpin,
        total_xp, coins, created_at,
        student_modules (
          status,
          modules ( id, title, level )
        )
      `)
      .order('created_at', { ascending: false }),
    db
      .from('meeting_students')
      .select('meeting_id, student_id, has_joined') as unknown as Promise<{
        data: Array<{ meeting_id: number; student_id: string; has_joined: boolean }> | null;
        error: unknown;
      }>,
    db.from('meetings').select('id, teacher_id'),
    db.from('profiles').select('id, full_name').eq('role', 'teacher'),
    db.from('quiz_attempts').select('student_id'),
    db.from('certificates').select('student_id'),
  ]);

  if (error) {
    console.error('[getAllStudents]', error.message);
    return [];
  }

  // Teacher lookup map
  const teacherNameMap = new Map<string, string | null>(
    (teacherProfiles ?? []).map((t: { id: string; full_name: string | null }) => [t.id, t.full_name])
  );

  // Meeting -> teacher_id lookup
  const meetingTeacherMap = new Map<number, string>();
  (meetings ?? []).forEach((m: { id: number; teacher_id: string | null }) => {
    if (m.teacher_id) meetingTeacherMap.set(m.id, m.teacher_id);
  });

  // Build lookup maps
  const sessionMap = new Map<string, number>();
  // student_id -> Map<teacher_id, session_count>
  const studentTeachersMap = new Map<string, Map<string, number>>();

  (meetingStudents ?? []).forEach((ms) => {
    if (ms.has_joined) {
      sessionMap.set(ms.student_id, (sessionMap.get(ms.student_id) ?? 0) + 1);
    }
    const tid = meetingTeacherMap.get(ms.meeting_id);
    if (tid) {
      if (!studentTeachersMap.has(ms.student_id)) {
        studentTeachersMap.set(ms.student_id, new Map());
      }
      const tMap = studentTeachersMap.get(ms.student_id)!;
      tMap.set(tid, (tMap.get(tid) ?? 0) + 1);
    }
  });

  const quizMap = new Map<string, number>();
  (quizAttempts ?? []).forEach((qa) => {
    const sid = (qa as { student_id: string }).student_id;
    quizMap.set(sid, (quizMap.get(sid) ?? 0) + 1);
  });

  const certMap = new Map<string, number>();
  (certs ?? []).forEach((c) => {
    const sid = (c as { student_id: string }).student_id;
    certMap.set(sid, (certMap.get(sid) ?? 0) + 1);
  });

  return (data ?? []).map((row: unknown) => {
    const r = row as {
      id: string;
      full_name: string;
      email_or_phone: string;
      grade: string | null;
      bio: string | null;
      mpin: string;
      total_xp: number;
      coins: number;
      created_at: string | null;
      student_modules: Array<{
        status: string;
        modules: { id: number; title: string; level: string | null } | null;
      }>;
    };

    const modules: AssignedModule[] = (r.student_modules ?? [])
      .filter((sm) => sm.modules != null)
      .map((sm) => ({
        module_id: sm.modules!.id,
        title:     sm.modules!.title,
        status:    sm.status,
        level:     sm.modules!.level,
      }));

    const module_titles = modules
      .filter((m) => m.status === 'active')
      .map((m) => m.title);

    const tMap = studentTeachersMap.get(r.id);
    const teachers: EnrolledTeacher[] = tMap
      ? Array.from(tMap.entries()).map(([tid, count]) => ({
          id:            tid,
          full_name:     teacherNameMap.get(tid) ?? null,
          session_count: count,
        }))
      : [];

    return {
      id:             r.id,
      full_name:      r.full_name,
      email_or_phone: r.email_or_phone,
      grade:          r.grade,
      bio:            r.bio,
      mpin:           r.mpin,
      total_xp:       r.total_xp ?? 0,
      coins:          r.coins    ?? 0,
      created_at:     r.created_at,
      module_titles,
      modules,
      teachers,
      session_count:  sessionMap.get(r.id) ?? 0,
      quiz_count:     quizMap.get(r.id)    ?? 0,
      cert_count:     certMap.get(r.id)    ?? 0,
    };
  });
}

/** All teachers (from public.profiles where role = 'teacher'), enriched with email + session count + enrolled students. */
export async function getAllTeachers(): Promise<TeacherRecord[]> {
  const db = createSupabaseAdminClient();

  const [
    { data: profiles, error },
    { data: meetings },
    { data: mStudents },
    { data: directTS },
    { data: students },
  ] = await Promise.all([
    db
      .from('profiles')
      .select('id, role, full_name, created_at')
      .eq('role', 'teacher')
      .order('full_name', { ascending: true }),
    db.from('meetings').select('id, teacher_id'),
    db.from('meeting_students').select('meeting_id, student_id'),
    db.from('teacher_students').select('teacher_id, student_id'),
    db.from('students').select('id, full_name, email_or_phone, grade'),
  ]);

  if (error) {
    console.error('[getAllTeachers]', error.message);
    return [];
  }

  const profileRows = (profiles ?? []) as unknown as Array<{
    id: string;
    full_name: string | null;
    created_at: string | null;
  }>;

  // Always fetch emails from auth.admin since profiles table doesn't have an email column
  let emailMap = new Map<string, string>();
  if (profileRows.length > 0) {
    const { data: authList } = await db.auth.admin.listUsers({ perPage: 1000 });
    emailMap = new Map<string, string>(
      (authList?.users ?? []).map((u) => [u.id, u.email ?? ''])
    );
  }

  const studentLookup = new Map<string, { full_name: string; email_or_phone: string; grade: string | null }>(
    (students ?? []).map((s: { id: string; full_name: string; email_or_phone: string; grade: string | null }) => [
      s.id,
      { full_name: s.full_name, email_or_phone: s.email_or_phone, grade: s.grade },
    ])
  );

  const sessionMap = new Map<string, number>();
  const teacherMeetingIds = new Map<string, number[]>();
  (meetings ?? []).forEach((m) => {
    const row = m as { id: number; teacher_id: string | null };
    if (row.teacher_id) {
      sessionMap.set(row.teacher_id, (sessionMap.get(row.teacher_id) ?? 0) + 1);
      const arr = teacherMeetingIds.get(row.teacher_id) ?? [];
      arr.push(row.id);
      teacherMeetingIds.set(row.teacher_id, arr);
    }
  });

  // Count class sessions separately; mentorship membership comes only from teacher_students.
  const sessionCountByTeacherStudent = new Map<string, Map<string, number>>();
  (mStudents ?? []).forEach((ms) => {
    const row = ms as { meeting_id: number; student_id: string };
    for (const [tid, mids] of teacherMeetingIds) {
      if (mids.includes(row.meeting_id)) {
        if (!sessionCountByTeacherStudent.has(tid)) {
          sessionCountByTeacherStudent.set(tid, new Map());
        }
        const counts = sessionCountByTeacherStudent.get(tid)!;
        counts.set(row.student_id, (counts.get(row.student_id) ?? 0) + 1);
      }
    }
  });

  const teacherStudentsMap = new Map<string, Map<string, number>>();
  (directTS ?? []).forEach((ts) => {
    const row = ts as { teacher_id: string; student_id: string };
    if (!teacherStudentsMap.has(row.teacher_id)) {
      teacherStudentsMap.set(row.teacher_id, new Map());
    }
    teacherStudentsMap.get(row.teacher_id)!.set(
      row.student_id,
      sessionCountByTeacherStudent.get(row.teacher_id)?.get(row.student_id) ?? 0,
    );
  });

  return profileRows.map((row) => {
    const sMap = teacherStudentsMap.get(row.id);
    const enrolled_students: EnrolledStudent[] = sMap
      ? Array.from(sMap.entries()).map(([sid, count]) => {
          const sInfo = studentLookup.get(sid);
          return {
            id:             sid,
            full_name:      sInfo?.full_name ?? 'Siswa',
            email_or_phone: sInfo?.email_or_phone ?? '',
            grade:          sInfo?.grade ?? null,
            session_count:  count,
          };
        })
      : [];

    return {
      id:                row.id,
      full_name:         row.full_name,
      email:             emailMap.get(row.id) ?? null,
      created_at:        row.created_at,
      session_count:     sessionMap.get(row.id) ?? 0,
      student_count:     enrolled_students.length,
      enrolled_students,
    };
  });
}

export interface TeacherStudentCardData {
  id: string;
  full_name: string;
  email_or_phone: string;
  grade: string | null;
  total_xp: number;
  coins: number;
  session_count: number;
  active_module: string | null;
}

/** Fetches enriched student profiles enrolled to a specific teacher. */
export async function getStudentsForTeacher(teacherId: string): Promise<TeacherStudentCardData[]> {
  const db = createSupabaseAdminClient();

  // 1. Fetch meeting IDs for this teacher
  const { data: teacherMeetings } = await (db
    .from('meetings')
    .select('id')
    .eq('teacher_id', teacherId)
    .eq('is_completed', false) as unknown as Promise<{ data: Array<{ id: number }> | null }>);

  const mIds = (teacherMeetings ?? []).map((m) => m.id);

  // 2. Query meeting_students and teacher_students in parallel
  const [{ data: mStudents }, { data: directTS }] = await Promise.all([
    mIds.length > 0
      ? (db
          .from('meeting_students')
          .select('student_id, has_joined')
          .in('meeting_id', mIds) as unknown as Promise<{
            data: Array<{ student_id: string; has_joined: boolean }> | null;
          }>)
      : Promise.resolve({ data: [] }),
    db
      .from('teacher_students')
      .select('student_id')
      .eq('teacher_id', teacherId) as unknown as Promise<{
        data: Array<{ student_id: string }> | null;
      }>,
  ]);

  const studentSessionCount = new Map<string, number>();
  const studentIds = new Set<string>();

  (mStudents ?? []).forEach((ms) => {
    studentIds.add(ms.student_id);
    studentSessionCount.set(ms.student_id, (studentSessionCount.get(ms.student_id) ?? 0) + 1);
  });

  (directTS ?? []).forEach((ts) => {
    studentIds.add(ts.student_id);
  });

  if (studentIds.size === 0) return [];

  const targetIds = Array.from(studentIds);

  const { data: studentRows } = await (db
    .from('students')
    .select(`
      id, full_name, email_or_phone, grade, total_xp, coins,
      student_modules (
        status,
        modules ( title )
      )
    `)
    .in('id', targetIds) as unknown as Promise<{
      data: Array<{
        id: string;
        full_name: string;
        email_or_phone: string;
        grade: string | null;
        total_xp: number | null;
        coins: number | null;
        student_modules: Array<{
          status: string;
          modules: { title: string } | null;
        }>;
      }> | null;
    }>);

  return (studentRows ?? []).map((s) => {
    const activeMod = s.student_modules?.find((sm) => sm.status === 'active')?.modules?.title ?? null;
    return {
      id: s.id,
      full_name: s.full_name,
      email_or_phone: s.email_or_phone,
      grade: s.grade,
      total_xp: s.total_xp ?? 0,
      coins: s.coins ?? 0,
      session_count: studentSessionCount.get(s.id) ?? 0,
      active_module: activeMod,
    };
  });
}
