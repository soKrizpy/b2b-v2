// src/features/sessions/queries.ts
// Typed data query helpers for fetching meetings, teachers, and students.
// All helpers that need to bypass RLS use the admin client (server-only).

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { sanitizeEnvVal, isValidSupabaseKey } from '@/lib/supabase/mock';
import type { MeetingRow, StudentRow } from '@/types/database';
import type { AttendanceStatus } from '@/types/sessions';

// ── Runtime Supabase Environment Diagnostics ─────────────────────────────────

export interface SupabaseEnvDiagnosticReport {
  urlPresent: boolean;
  urlProjectRef: string | null;
  anonKey: {
    present: boolean;
    validFormat: boolean;
    rawLength: number;
    sanitizedLength: number;
    wasAutoRepaired: boolean;
    jwtRef: string | null;
    jwtRole: string | null;
    matchesUrlRef: boolean;
  };
  serviceRoleKey: {
    present: boolean;
    validFormat: boolean;
    rawLength: number;
    sanitizedLength: number;
    wasAutoRepaired: boolean;
    jwtRef: string | null;
    jwtRole: string | null;
    matchesUrlRef: boolean;
  };
  hasKeyMismatch: boolean;
}

function decodeJwtPayload(
  token: string
): { ref?: string; role?: string; exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(json) as { ref?: string; role?: string; exp?: number };
  } catch {
    return null;
  }
}

export function verifySupabaseEnvDiagnostics(): SupabaseEnvDiagnosticReport {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const rawAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  const rawService = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

  const cleanUrl = sanitizeEnvVal(rawUrl);
  const cleanAnon = sanitizeEnvVal(rawAnon);
  const cleanService = sanitizeEnvVal(rawService);

  let urlProjectRef: string | null = null;
  try {
    if (cleanUrl) {
      const host = new URL(cleanUrl).hostname; // e.g. enfqoofluceqrlcjemfu.supabase.co
      urlProjectRef = host.split('.')[0] ?? null;
    }
  } catch {
    urlProjectRef = null;
  }

  const anonPayload = decodeJwtPayload(cleanAnon);
  const servicePayload = decodeJwtPayload(cleanService);

  const anonMatches = Boolean(
    urlProjectRef && anonPayload?.ref === urlProjectRef
  );
  const serviceMatches = Boolean(
    urlProjectRef && servicePayload?.ref === urlProjectRef
  );

  const report: SupabaseEnvDiagnosticReport = {
    urlPresent: Boolean(cleanUrl),
    urlProjectRef,
    anonKey: {
      present: Boolean(rawAnon),
      validFormat: isValidSupabaseKey(cleanAnon),
      rawLength: rawAnon.trim().length,
      sanitizedLength: cleanAnon.length,
      wasAutoRepaired: rawAnon.trim() !== cleanAnon,
      jwtRef: anonPayload?.ref ?? null,
      jwtRole: anonPayload?.role ?? null,
      matchesUrlRef: anonMatches,
    },
    serviceRoleKey: {
      present: Boolean(rawService),
      validFormat: isValidSupabaseKey(cleanService),
      rawLength: rawService.trim().length,
      sanitizedLength: cleanService.length,
      wasAutoRepaired: rawService.trim() !== cleanService,
      jwtRef: servicePayload?.ref ?? null,
      jwtRole: servicePayload?.role ?? null,
      matchesUrlRef: serviceMatches,
    },
    hasKeyMismatch:
      !anonMatches ||
      !serviceMatches ||
      anonPayload?.role !== 'anon' ||
      servicePayload?.role !== 'service_role',
  };

  console.info('[SupabaseEnvDiagnostics]', JSON.stringify(report));
  return report;
}

// ── Result shapes ─────────────────────────────────────────────────────────────

export interface StudentAssignedModule {
  module_id: number;
  module_title: string;
  enrollment_status: string;
  topics: Array<{ topic_id: number; topic_title: string; order_index: number }>;
}

export interface MeetingWithStudents extends MeetingRow {
  module_title?: string | null;
  topic_title?: string | null;
  meeting_students: Array<{
    student_id: string;
    has_joined: boolean;
    attendance_status: AttendanceStatus;
    students: Pick<StudentRow, 'id' | 'full_name' | 'email_or_phone'> | null;
    assigned_modules?: StudentAssignedModule[];
  }>;
}

export interface TeacherOption {
  id: string;
  full_name: string | null;
  email: string | null;
}

export interface StudentOption {
  id: string;
  full_name: string;
  email_or_phone: string;
  grade: string | null;
}

// ── Query helpers shared between cookie client and admin client ───────────────

const MEETING_SELECT = `
  id, title, meeting_date, link_url, notes, teacher_id,
  session_count, session_number, series_id, module_id, topic_id,
  is_completed, completion_status, progress_report, created_at,
  meeting_students (
    student_id,
    has_joined,
    attendance_status,
    students ( id, full_name, email_or_phone )
  )
`.trim();

const MEETING_SELECT_INNER = `
  id, title, meeting_date, link_url, notes, teacher_id,
  session_count, session_number, series_id, module_id, topic_id,
  is_completed, completion_status, progress_report, created_at,
  meeting_students!inner (
    student_id,
    has_joined,
    attendance_status,
    students ( id, full_name )
  )
`.trim();

// ── Meetings ─────────────────────────────────────────────────────────────────

/**
 * All meetings sorted ascending by meeting_date.
 * Admin-only — bypasses RLS via the admin client.
 */
async function enrichMeetingsWithStudentCurriculum(
  meetings: MeetingWithStudents[],
  logPrefix: string
): Promise<MeetingWithStudents[]> {
  const db = createSupabaseAdminClient();
  const studentIds = [...new Set(meetings.flatMap((meeting) =>
    meeting.meeting_students.map((student) => student.student_id)
  ))];
  const topicIds = [...new Set(meetings.flatMap((meeting) =>
    meeting.topic_id == null ? [] : [meeting.topic_id]
  ))];
  const moduleIds = [...new Set(meetings.flatMap((meeting) =>
    meeting.module_id == null ? [] : [meeting.module_id]
  ))];

  const [topicResult, moduleResult, assignmentResult] = await Promise.all([
    topicIds.length > 0
      ? db.from('topics').select('id, title').eq('status', 'published').in('id', topicIds)
      : Promise.resolve({ data: [], error: null }),
    moduleIds.length > 0
      ? db.from('modules').select('id, title').in('id', moduleIds)
      : Promise.resolve({ data: [], error: null }),
    studentIds.length > 0
      ? db.from('student_modules').select(`
          student_id, status,
          modules (
            id, title,
            topics ( id, title, order_index, status )
          )
        `).in('student_id', studentIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (topicResult.error) console.error(`[${logPrefix}] meeting topic mapping`, topicResult.error.message);
  if (moduleResult.error) console.error(`[${logPrefix}] meeting module mapping`, moduleResult.error.message);
  if (assignmentResult.error) console.error(`[${logPrefix}] student module mapping`, assignmentResult.error.message);

  const titlesByTopic = new Map<number, string>(
    ((topicResult.data ?? []) as Array<{ id: number; title: string }>).map((topic) => [topic.id, topic.title])
  );
  const moduleTitles = new Map<number, string | null>(
    ((moduleResult.data ?? []) as Array<{ id: number; title: string | null }>).map((module) => [module.id, module.title])
  );
  const modulesByStudent = new Map<string, StudentAssignedModule[]>();

  type AssignmentRow = {
    student_id: string;
    status: string;
    modules: {
      id: number;
      title: string;
      topics: Array<{ id: number; title: string; order_index: number; status: string }>;
    } | null;
  };

  for (const row of (assignmentResult.data ?? []) as unknown as AssignmentRow[]) {
    if (!row.modules) continue;
    const assignedModule: StudentAssignedModule = {
      module_id: row.modules.id,
      module_title: row.modules.title,
      enrollment_status: row.status,
      topics: (row.modules.topics ?? [])
        .filter((topic) => topic.status === 'published')
        .sort((a, b) => a.order_index - b.order_index)
        .map((topic) => ({
          topic_id: topic.id,
          topic_title: topic.title,
          order_index: topic.order_index,
        })),
    };
    const current = modulesByStudent.get(row.student_id) ?? [];
    current.push(assignedModule);
    modulesByStudent.set(row.student_id, current);
  }

  return meetings.map((meeting) => ({
    ...meeting,
    module_title: meeting.module_id == null ? null : moduleTitles.get(meeting.module_id) ?? null,
    topic_title: meeting.topic_id == null ? null : titlesByTopic.get(meeting.topic_id) ?? null,
    meeting_students: meeting.meeting_students.map((student) => ({
      ...student,
      assigned_modules: modulesByStudent.get(student.student_id) ?? [],
    })),
  }));
}

/**
 * All meetings sorted ascending by meeting_date.
 * Admin-only — bypasses RLS via the admin client.
 */
export async function getSessionsForAdmin(): Promise<MeetingWithStudents[]> {
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from('meetings')
    .select(MEETING_SELECT)
    .order('meeting_date', { ascending: true });

  if (error) {
    console.error('[getSessionsForAdmin]', error.message);
    return [];
  }
  return enrichMeetingsWithStudentCurriculum((data ?? []) as unknown as MeetingWithStudents[], 'getSessionsForAdmin');
}

/**
 * Meetings assigned to a specific teacher (teacher_id = teacherId).
 * Uses the admin client so RLS doesn't interfere with the filter.
 * teacher_id was added in migration 0007.
 */
export async function getSessionsForTeacher(
  teacherId: string
): Promise<MeetingWithStudents[]> {
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from('meetings')
    .select(MEETING_SELECT)
    .eq('teacher_id', teacherId)
    .order('meeting_date', { ascending: true });

  if (error) {
    console.error('[getSessionsForTeacher]', error.message);
    return [];
  }
  return enrichMeetingsWithStudentCurriculum((data ?? []) as unknown as MeetingWithStudents[], 'getSessionsForTeacher');
}

/**
 * Meetings where the given student appears in meeting_students, sorted ascending.
 */
export async function getSessionsForStudent(
  studentId: string
): Promise<MeetingWithStudents[]> {
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from('meetings')
    .select(MEETING_SELECT_INNER)
    .eq('meeting_students.student_id', studentId)
    .order('meeting_date', { ascending: true });

  if (error) {
    console.error('[getSessionsForStudent]', error.message);
    return [];
  }

  // A student needs their own schedule details, not classmates' UUIDs,
  // contact information, attendance statuses, or teacher-only progress reports.
  // Project the result before it can be serialized into a page or API response.
  const studentMeetings = (data ?? []) as unknown as MeetingWithStudents[];
  return studentMeetings.map((meeting) => ({
    id: meeting.id,
    title: meeting.title,
    meeting_date: meeting.meeting_date,
    link_url: meeting.link_url,
    notes: meeting.notes,
    session_count: meeting.session_count,
    session_number: meeting.session_number,
    series_id: meeting.series_id,
    module_id: meeting.module_id,
    is_completed: meeting.is_completed,
    created_at: meeting.created_at,
    completion_status: null,
    progress_report: null,
    meeting_students: [],
  })) as unknown as MeetingWithStudents[];
}

/**
 * Single meeting by ID with its student list.
 */
export async function getSessionById(
  id: number
): Promise<MeetingWithStudents | null> {
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from('meetings')
    .select(MEETING_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[getSessionById]', error.message);
    return null;
  }
  return data as unknown as MeetingWithStudents | null;
}

// ── Teachers ─────────────────────────────────────────────────────────────────

/**
 * All teachers as { id, full_name, email } — for admin select dropdowns.
 * Reads profiles table directly (including email column if present), and only
 * calls auth.admin.listUsers if any teacher row is missing an email.
 */
export async function getTeacherOptions(): Promise<TeacherOption[]> {
  const db = createSupabaseAdminClient();

  const { data: profiles, error } = await db
    .from('profiles')
    .select('id, role, full_name, created_at')
    .eq('role', 'teacher')
    .order('full_name', { ascending: true });

  if (error) {
    console.error('[getTeacherOptions] profiles error:', error.message);
    return [];
  }

  const rows = (profiles ?? []) as unknown as Array<{
    id: string;
    full_name: string | null;
  }>;

  // Always fetch emails from auth.admin since profiles table doesn't have an email column
  let emailMap = new Map<string, string>();
  if (rows.length > 0) {
    const { data: authList } = await db.auth.admin.listUsers({ perPage: 1000 });
    emailMap = new Map<string, string>(
      (authList?.users ?? []).map((u) => [u.id, u.email ?? ''])
    );
  }

  return rows.map((row) => ({
    id: row.id,
    full_name: row.full_name,
    email: emailMap.get(row.id) ?? null,
  }));
}

// ── Students ─────────────────────────────────────────────────────────────────

/**
 * All students as { id, full_name, email_or_phone, grade } — for admin dropdowns.
 */
export async function getStudentOptions(): Promise<StudentOption[]> {
  verifySupabaseEnvDiagnostics();
  const db = createSupabaseAdminClient();

  const { data, error } = await db
    .from('students')
    .select('id, full_name, email_or_phone, grade')
    .order('full_name', { ascending: true });

  if (error) {
    console.error('[getStudentOptions]', error.message);
    return [];
  }

  return (data ?? []) as unknown as StudentOption[];
}

/**
 * Paginated student list with total count.
 * Used by the Admin student management page.
 */
export async function getStudentsWithModules(opts?: {
  page?: number;
  pageSize?: number;
}): Promise<{ students: StudentOption[]; total: number }> {
  const db = createSupabaseAdminClient();
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await db
    .from('students')
    .select('id, full_name, email_or_phone, grade', { count: 'exact' })
    .order('full_name', { ascending: true })
    .range(from, to);

  if (error) {
    console.error('[getStudentsWithModules]', error.message);
    return { students: [], total: 0 };
  }

  return {
    students: (data ?? []) as unknown as StudentOption[],
    total: count ?? 0,
  };
}

// ── Town Square enriched meeting ─────────────────────────────────────────────

export interface TownSquareSeat {
  student_id: string;
  full_name: string;
  avatar_id: string | null;
  equipped_hat_id: string | null;
  equipped_cosmetics?: {
    archetype?: string;
    skinTone?: string;
    hatId?: string | null;
    outfitId?: string | null;
    auraId?: string | null;
    petId?: string | null;
    petHatId?: string | null;
    titleId?: string | null;
  } | null;
  total_xp: number;
  is_self: boolean;
  is_online?: boolean;
}

export interface TownSquareMeeting {
  id: number;
  title: string;
  meeting_date: string;
  link_url: string | null;
  notes: string | null;
  session_count: number;
  session_number: number;
  teacher_id: string | null;
  teacher_name: string | null;
  seats: TownSquareSeat[]; // max 4 enrolled students
}

/**
 * Returns the next upcoming (non-completed) meeting for a student, enriched
 * with teacher name (from profiles) and all enrolled classmate names+avatars.
 * Returns null if no upcoming meeting exists.
 */
export async function getUpcomingMeetingForStudent(
  studentId: string
): Promise<TownSquareMeeting | null> {
  const db = createSupabaseAdminClient();
  const now = new Date().toISOString();

  // 1. Find live and next upcoming meetings in parallel
  const [
    { data: meetings, error: meetErr },
    { data: liveMeetings, error: liveErr },
  ] = await Promise.all([
    db
      .from('meetings')
      .select(
        `
        id, title, meeting_date, link_url, notes,
        session_count, session_number, teacher_id,
        meeting_students!inner (
          student_id,
          students ( id, full_name, avatar_id )
        )
      `
      )
      .eq('is_completed', false)
      .eq('meeting_students.student_id', studentId)
      .gt('meeting_date', now)
      .order('meeting_date', { ascending: true })
      .limit(1) as unknown as Promise<{
      data: Array<{
        id: number;
        title: string;
        meeting_date: string;
        link_url: string | null;
        notes: string | null;
        session_count: number;
        session_number: number;
        teacher_id: string | null;
        meeting_students: Array<{
          student_id: string;
          students: {
            id: string;
            full_name: string;
            avatar_id: string | null;
          } | null;
        }>;
      }> | null;
      error: { message: string } | null;
    }>,
    db
      .from('meetings')
      .select(
        `
        id, title, meeting_date, link_url, notes,
        session_count, session_number, teacher_id,
        meeting_students!inner (
          student_id,
          students ( id, full_name, avatar_id )
        )
      `
      )
      .eq('is_completed', false)
      .eq('meeting_students.student_id', studentId)
      .lte('meeting_date', now)
      .order('meeting_date', { ascending: false })
      .limit(1) as unknown as Promise<{
      data: Array<{
        id: number;
        title: string;
        meeting_date: string;
        link_url: string | null;
        notes: string | null;
        session_count: number;
        session_number: number;
        teacher_id: string | null;
        meeting_students: Array<{
          student_id: string;
          students: {
            id: string;
            full_name: string;
            avatar_id: string | null;
          } | null;
        }>;
      }> | null;
      error: { message: string } | null;
    }>,
  ]);

  if (meetErr)
    console.error('[getUpcomingMeetingForStudent] meetings:', meetErr.message);
  if (liveErr)
    console.error('[getUpcomingMeetingForStudent] live:', liveErr.message);

  // Prefer live meeting, then upcoming
  const raw = liveMeetings?.[0] ?? meetings?.[0] ?? null;
  if (!raw) return null;

  // 2 & 3. Fetch all enrolled students and teacher name in parallel
  const [{ data: allSeats }, teacherProfileRes] = await Promise.all([
    db
      .from('meeting_students')
      .select(
        'student_id, students ( id, full_name, avatar_id, equipped_hat_id, total_xp, equipped_cosmetics )'
      )
      .eq('meeting_id', raw.id) as unknown as Promise<{
      data: Array<{
        student_id: string;
        students: {
          id: string;
          full_name: string;
          avatar_id: string | null;
          equipped_hat_id: string | null;
          total_xp: number;
          equipped_cosmetics?: {
            archetype?: string;
            skinTone?: string;
            hatId?: string | null;
            outfitId?: string | null;
            auraId?: string | null;
            petId?: string | null;
            petHatId?: string | null;
            titleId?: string | null;
          } | null;
        } | null;
      }> | null;
      error: unknown;
    }>,
    raw.teacher_id
      ? (db
          .from('profiles')
          .select('full_name')
          .eq('id', raw.teacher_id)
          .maybeSingle() as unknown as Promise<{
          data: { full_name: string | null } | null;
          error: unknown;
        }>)
      : Promise.resolve({ data: null, error: null }),
  ]);

  const teacherName: string | null = teacherProfileRes.data?.full_name ?? null;

  // 4. Build seats array (max 4)
  const seats: TownSquareSeat[] = (allSeats ?? []).slice(0, 4).map((ms) => ({
    student_id: ms.student_id,
    full_name: ms.students?.full_name ?? 'Siswa',
    avatar_id: ms.students?.avatar_id ?? null,
    equipped_hat_id: ms.students?.equipped_hat_id ?? null,
    equipped_cosmetics: ms.students?.equipped_cosmetics ?? null,
    total_xp: ms.students?.total_xp ?? 0,
    is_self: ms.student_id === studentId,
  }));

  return {
    id: raw.id,
    title: raw.title,
    meeting_date: raw.meeting_date,
    link_url: raw.link_url,
    notes: raw.notes,
    session_count: raw.session_count,
    session_number: raw.session_number,
    teacher_id: raw.teacher_id,
    teacher_name: teacherName,
    seats,
  };
}
