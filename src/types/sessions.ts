// src/types/sessions.ts
// Domain types for the sessions feature (Phase 1).
// The production DB uses a "meetings" table — Session is the app-layer name.

export const ATTENDANCE_STATUSES = ['hadir', 'telat', 'absen'] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export interface SessionAttendanceStudent {
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
}

export interface Session {
  id: number;
  title: string;
  meeting_date: string; // ISO 8601 timestamptz
  link_url: string;
  notes: string | null;
  session_count: number;
  session_number: number;
  series_id: string | null;
  is_completed: boolean;
  progress_report: string | null;
  created_at: string | null;
}

export interface SessionStudent {
  meeting_id: number;
  student_id: string;
  has_joined: boolean;
  attendance_status: AttendanceStatus;
}

// Shape returned to the Admin/Teacher/Student dashboard views —
// the raw meeting row plus the joined student list.
export interface SessionWithStudents extends Session {
  meeting_students: SessionStudent[];
}

export type CreateSessionPayload = {
  title: string;
  meeting_date: string; // ISO 8601
  link_url: string;
  notes?: string;
  session_count?: number;
  session_number?: number;
  student_ids: string[]; // one or more students assigned to this meeting
};

export type UpdateSessionPayload = Partial<
  Omit<CreateSessionPayload, 'student_ids'>
>;
