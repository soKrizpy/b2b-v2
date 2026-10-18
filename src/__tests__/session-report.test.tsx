import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminSessionActions } from '@/features/sessions/components/AdminSessionActions';
import { updateSessionReport } from '@/features/sessions/actions';
import type { MeetingWithStudents } from '@/features/sessions/queries';
import { TeacherCompleteAction } from '@/features/sessions/components/TeacherCompleteAction';
import { localDatetimeToIso } from '@/features/sessions/components/MeetingForm';

const state = vi.hoisted(() => ({
  meeting: {
    id: 41,
    is_completed: true,
    completion_status: 'done',
    progress_report: 'Old report',
  },
  studentLinks: Array.from({ length: 4 }, (_, index) => ({
    meeting_id: 41,
    student_id: `student-${index + 1}`,
    has_joined: false,
    attendance_status: 'absen',
  })),
  dbError: null as { message: string } | null,
}));

vi.mock('@/lib/auth', () => ({
  requireAdminOrTeacher: async () => ({ ok: true }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    rpc: async (functionName: string, args: Record<string, unknown>) => {
      if (state.dbError) return { data: null, error: state.dbError };
      if (functionName !== 'save_meeting_report') {
        return { data: null, error: { message: 'Unknown RPC' } };
      }
      if (args.p_mark_completed === false && !state.meeting.is_completed) {
        return {
          data: null,
          error: { message: 'Meeting not found or is not completed' },
        };
      }
      state.studentLinks = (
        args.p_attendance as Array<{
          student_id: string;
          status: 'hadir' | 'telat' | 'absen';
        }>
      ).map((entry) => ({
        meeting_id: Number(args.p_meeting_id),
        student_id: entry.student_id,
        has_joined: entry.status !== 'absen',
        attendance_status: entry.status,
      }));
      state.meeting.progress_report = String(args.p_progress_report ?? '');
      if (args.p_mark_completed) {
        state.meeting.is_completed = true;
        state.meeting.completion_status = String(
          args.p_completion_status ?? 'selesai'
        );
      }
      return { data: null, error: null };
    },
  }),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock('@/features/ai/actions', () => ({
  draftProgressReport: vi.fn(),
}));

describe('completed session report editing', () => {
  beforeEach(() => {
    state.meeting = {
      id: 41,
      is_completed: true,
      completion_status: 'done',
      progress_report: 'Old report',
    };
    state.studentLinks = Array.from({ length: 4 }, (_, index) => ({
      meeting_id: 41,
      student_id: `student-${index + 1}`,
      has_joined: false,
      attendance_status: 'absen',
    }));
    state.dbError = null;
  });

  it('updates only the report and preserves completion and student links', async () => {
    const formData = new FormData();
    formData.set('id', '41');
    formData.set('progress_report', 'Edited report');
    formData.set(
      'attendance_statuses',
      JSON.stringify([
        { student_id: 'student-1', status: 'hadir' },
        { student_id: 'student-2', status: 'telat' },
        { student_id: 'student-3', status: 'absen' },
        { student_id: 'student-4', status: 'hadir' },
      ])
    );

    const result = await updateSessionReport(null, formData);

    expect(result).toEqual({
      success: true,
      message: 'Laporan kelas berhasil diperbarui.',
    });

    const independentlyReadMeetingRow = { ...state.meeting };
    const independentlyReadStudentLinks = [...state.studentLinks];
    expect(independentlyReadMeetingRow).toEqual({
      id: 41,
      is_completed: true,
      completion_status: 'done',
      progress_report: 'Edited report',
    });
    expect(independentlyReadStudentLinks).toEqual([
      {
        meeting_id: 41,
        student_id: 'student-1',
        has_joined: true,
        attendance_status: 'hadir',
      },
      {
        meeting_id: 41,
        student_id: 'student-2',
        has_joined: true,
        attendance_status: 'telat',
      },
      {
        meeting_id: 41,
        student_id: 'student-3',
        has_joined: false,
        attendance_status: 'absen',
      },
      {
        meeting_id: 41,
        student_id: 'student-4',
        has_joined: true,
        attendance_status: 'hadir',
      },
    ]);
  });

  it('returns the exact database error when the report update fails', async () => {
    state.dbError = { message: 'permission denied for table meetings' };
    const formData = new FormData();
    formData.set('id', '41');
    formData.set('progress_report', 'Edited report');
    formData.set('attendance_statuses', '[]');

    await expect(updateSessionReport(null, formData)).resolves.toEqual({
      success: false,
      error: 'Gagal memperbarui laporan: permission denied for table meetings',
    });
  });

  it('does not allow report-only edits to complete an open session', async () => {
    state.meeting.is_completed = false;
    const formData = new FormData();
    formData.set('id', '41');
    formData.set('progress_report', 'Edited report');
    formData.set('attendance_statuses', '[]');

    await expect(updateSessionReport(null, formData)).resolves.toEqual({
      success: false,
      error: 'Gagal memperbarui laporan: Meeting not found or is not completed',
    });
    expect(state.meeting.progress_report).toBe('Old report');
  });

  it('keeps the teacher’s existing completed-session edit flow working', async () => {
    render(
      <TeacherCompleteAction
        meetingId={41}
        meetingTitle="Completed lesson"
        buttonText="✏️ Edit Laporan"
        initialReport="Old report"
        isCompleted
        attendanceStudents={[
          { studentId: 'student-1', studentName: 'Student 1', status: 'hadir' },
          { studentId: 'student-2', studentName: 'Student 2', status: 'hadir' },
          { studentId: 'student-3', studentName: 'Student 3', status: 'absen' },
          { studentId: 'student-4', studentName: 'Student 4', status: 'hadir' },
        ]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Edit Laporan/ }));
    fireEvent.change(screen.getByLabelText('Catatan Progress'), {
      target: { value: 'Teacher-edited report' },
    });
    fireEvent.click(screen.getAllByRole('radio', { name: 'Telat' })[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Laporan' }));

    await waitFor(() => {
      expect(state.meeting.progress_report).toBe('Teacher-edited report');
    });
    expect(state.meeting.is_completed).toBe(true);
    expect(state.meeting.completion_status).toBe('done');
    expect(state.studentLinks).toContainEqual({
      meeting_id: 41,
      student_id: 'student-2',
      has_joined: true,
      attendance_status: 'telat',
    });
  });

  it('saves per-student attendance from the admin completion form', async () => {
    state.meeting.is_completed = false;
    const meeting = {
      id: 41,
      title: 'Group lesson',
      is_completed: false,
      progress_report: null,
      meeting_students: Array.from({ length: 4 }, (_, index) => ({
        student_id: `student-${index + 1}`,
        has_joined: false,
        attendance_status: 'absen',
        students: { full_name: `Student ${index + 1}` },
      })),
    } as unknown as MeetingWithStudents;

    render(
      <AdminSessionActions meeting={meeting} teachers={[]} students={[]} />
    );
    fireEvent.click(screen.getByTitle('Tandai Selesai'));
    fireEvent.click(screen.getAllByRole('radio', { name: 'Telat' })[1]);
    fireEvent.click(
      screen.getByRole('button', { name: /Simpan & Selesaikan/ })
    );

    await waitFor(() => {
      expect(state.meeting.is_completed).toBe(true);
      expect(state.studentLinks).toContainEqual({
        meeting_id: 41,
        student_id: 'student-2',
        has_joined: true,
        attendance_status: 'telat',
      });
    });
  });

  it('allows schedule and report editing for completed admin sessions', () => {
    const meeting = {
      id: 41,
      title: 'Completed lesson',
      is_completed: true,
      progress_report: 'Old report',
      meeting_students: [],
    } as MeetingWithStudents;

    render(
      <AdminSessionActions meeting={meeting} teachers={[]} students={[]} />
    );

    expect(
      screen.getByRole('button', { name: /Edit Laporan/ })
    ).toBeInTheDocument();
    expect(screen.getByTitle('Edit Jadwal')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Edit Jadwal'));
    expect(
      screen.getByRole('dialog', { name: 'Edit Jadwal' })
    ).toBeInTheDocument();
    expect(screen.queryByTitle('Tandai Selesai')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Hapus Jadwal')).not.toBeInTheDocument();
  });
});

describe('meeting form datetime conversion', () => {
  it('converts local datetime input to an ISO timestamp with timezone', () => {
    const localValue = '2026-10-18T07:55';

    expect(localDatetimeToIso(localValue)).toBe(
      new Date(localValue).toISOString()
    );
    expect(localDatetimeToIso(localValue)).toMatch(/Z$/);
  });

  it('keeps an empty or invalid value empty for required-field validation', () => {
    expect(localDatetimeToIso('')).toBe('');
    expect(localDatetimeToIso('not-a-date')).toBe('');
  });
});
