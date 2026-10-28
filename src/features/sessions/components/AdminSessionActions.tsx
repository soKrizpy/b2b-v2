// src/features/sessions/components/AdminSessionActions.tsx
// Client component containing all admin action buttons/modals for a single meeting.
'use client';

import { useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  deleteSession,
  markSessionComplete,
  type ActionResult,
} from '@/features/sessions/actions';
import { draftProgressReport } from '@/features/ai/actions';
import { Modal } from '@/components/ui/Modal';
import { MeetingForm } from './MeetingForm';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import type {
  MeetingWithStudents,
  TeacherOption,
  StudentOption,
} from '@/features/sessions/queries';
import { TeacherCompleteAction } from './TeacherCompleteAction';
import { AttendanceRadioGroup } from './AttendanceRadioGroup';
import type {
  AttendanceStatus,
  SessionAttendanceStudent,
} from '@/types/sessions';

interface AdminSessionActionsProps {
  meeting: MeetingWithStudents;
  teachers: TeacherOption[];
  students: StudentOption[];
}

/** Small icon-only ghost button for inline card actions */
function IconBtn({
  onClick,
  title,
  variant = 'default',
  children,
}: {
  onClick: () => void;
  title: string;
  variant?: 'default' | 'danger' | 'success';
  children: React.ReactNode;
}) {
  const base =
    'inline-flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-150 active:scale-95 ring-1';
  const styles = {
    default:
      'ring-slate-200 dark:ring-white/15 bg-white dark:bg-zinc-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-700 hover:text-slate-900 dark:hover:text-white hover:ring-slate-300 dark:hover:ring-white/30',
    danger:
      'ring-red-200 dark:ring-rose-800/50 bg-red-50 dark:bg-rose-950/40 text-red-600 dark:text-rose-400 hover:bg-red-100 dark:hover:bg-rose-900/50 hover:text-red-700 dark:hover:text-rose-200',
    success:
      'ring-emerald-200 dark:ring-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 hover:text-emerald-700 dark:hover:text-emerald-200',
  };
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`${base} ${styles[variant]}`}
    >
      {children}
    </button>
  );
}

export function AdminSessionActions({
  meeting,
  teachers,
  students,
}: AdminSessionActionsProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'single' | 'series'>('single');
  const [report, setReport] = useState(meeting.progress_report ?? '');
  const attendanceStudents: SessionAttendanceStudent[] =
    meeting.meeting_students.map((ms) => ({
      studentId: ms.student_id,
      studentName: ms.students?.full_name ?? 'Siswa',
      status: ms.attendance_status ?? (ms.has_joined ? 'hadir' : 'absen'),
    }));
  const [attendance, setAttendance] = useState<
    Record<string, AttendanceStatus>
  >(() =>
    Object.fromEntries(
      attendanceStudents.map((student) => [student.studentId, student.status])
    )
  );
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [aiPending, startAi] = useTransition();
  const [aiError, setAiError] = useState<string | null>(null);

  const handleSuccess = useCallback(() => {
    setEditOpen(false);
    router.refresh();
  }, [router]);

  async function handleDelete() {
    const fd = new FormData();
    fd.append('id', String(meeting.id));
    fd.append('edit_mode', deleteMode);
    if (meeting.series_id) fd.append('series_id', meeting.series_id);
    fd.append('session_number', String(meeting.session_number));

    startTransition(async () => {
      const result: ActionResult = await deleteSession(null, fd);
      if (result.success) {
        setDeleteOpen(false);
        router.refresh();
      } else setFeedback(result.error);
    });
  }

  async function handleComplete() {
    const fd = new FormData();
    fd.append('id', String(meeting.id));
    fd.append('progress_report', report);
    fd.append('completion_status', 'selesai');
    fd.set(
      'attendance_statuses',
      JSON.stringify(
        attendanceStudents.map((student) => ({
          student_id: student.studentId,
          status: attendance[student.studentId] ?? student.status,
        }))
      )
    );

    startTransition(async () => {
      const result: ActionResult = await markSessionComplete(null, fd);
      if (result.success) {
        setCompleteOpen(false);
        router.refresh();
      } else setFeedback(result.error);
    });
  }

  function handleAiDraft() {
    setAiError(null);
    const studentNames = meeting.meeting_students
      .map((ms) => ms.students?.full_name ?? '')
      .filter(Boolean)
      .join(', ');
    const fd = new FormData();
    fd.append('session_title', meeting.title);
    fd.append('student_names', studentNames || 'siswa');
    fd.append('topic_hint', meeting.notes ?? '');
    startAi(async () => {
      const r = await draftProgressReport(null, fd);
      if (r.success) setReport(r.data);
      else setAiError(r.error);
    });
  }

  if (meeting.is_completed) {
    const studentNames = meeting.meeting_students
      .map((ms) => ms.students?.full_name ?? '')
      .filter(Boolean)
      .join(', ');

    return (
      <>
        <div className="flex items-center gap-2">
          <IconBtn onClick={() => setEditOpen(true)} title="Edit Jadwal">
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
              <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 00-.354-.354l-1.086-1.086zM11.189 6.25L9.75 4.81l-6.286 6.287a.25.25 0 00-.064.108l-.558 1.953 1.953-.558a.249.249 0 00.108-.064l6.286-6.286z" />
            </svg>
          </IconBtn>
          <TeacherCompleteAction
            meetingId={meeting.id}
            meetingTitle={meeting.title}
            studentNames={studentNames}
            buttonText="✏️ Edit Laporan"
            variant="secondary"
            initialReport={meeting.progress_report}
            attendanceStudents={attendanceStudents}
            isCompleted
          />
        </div>
        <Modal
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
          title="Edit Jadwal"
          size="lg"
        >
          <MeetingForm
            mode="edit"
            teachers={teachers}
            students={students}
            meeting={meeting}
            onSuccess={handleSuccess}
          />
        </Modal>
      </>
    );
  }

  return (
    <>
      {feedback && (
        <div
          className="w-full text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2
          ring-1 ring-red-200 dark:text-rose-300 dark:bg-rose-950/40 dark:ring-rose-800/50
          flex items-center gap-1.5 mb-1"
        >
          <svg
            className="h-3.5 w-3.5 flex-shrink-0"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 3.75a.75.75 0 011.5 0v4a.75.75 0 01-1.5 0v-4zm.75 7a.75.75 0 110-1.5.75.75 0 010 1.5z" />
          </svg>
          {feedback}
        </div>
      )}

      {/* Edit */}
      <IconBtn onClick={() => setEditOpen(true)} title="Edit Jadwal">
        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
          <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 000-.354l-1.086-1.086zM11.189 6.25L9.75 4.81l-6.286 6.287a.25.25 0 00-.064.108l-.558 1.953 1.953-.558a.249.249 0 00.108-.064l6.286-6.286z" />
        </svg>
      </IconBtn>

      {/* Mark complete */}
      <IconBtn
        onClick={() => {
          setAttendance(
            Object.fromEntries(
              attendanceStudents.map((student) => [
                student.studentId,
                student.status,
              ])
            )
          );
          setCompleteOpen(true);
        }}
        title="Tandai Selesai"
        variant="success"
      >
        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
          <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
        </svg>
      </IconBtn>

      {/* Delete */}
      <IconBtn
        onClick={() => setDeleteOpen(true)}
        title="Hapus Jadwal"
        variant="danger"
      >
        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
          <path d="M6.5 1.75a.25.25 0 01.25-.25h2.5a.25.25 0 01.25.25V3h-3V1.75zm4.5 0V3h2.25a.75.75 0 010 1.5H2.75a.75.75 0 010-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.496 6.675a.75.75 0 10-1.492.15l.66 6.6A1.75 1.75 0 005.405 15h5.19a1.75 1.75 0 001.74-1.575l.66-6.6a.75.75 0 10-1.492-.15l-.66 6.6a.25.25 0 01-.248.225h-5.19a.25.25 0 01-.249-.225l-.66-6.6z" />
        </svg>
      </IconBtn>

      {/* ── Edit modal ──────────────────────────────────────── */}
      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Jadwal"
        size="lg"
      >
        <MeetingForm
          mode="edit"
          teachers={teachers}
          students={students}
          meeting={meeting}
          onSuccess={handleSuccess}
        />
      </Modal>

      {/* ── Complete modal ──────────────────────────────────── */}
      <Modal
        isOpen={completeOpen}
        onClose={() => setCompleteOpen(false)}
        title="Tandai Kelas Selesai"
      >
        <div className="space-y-5">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 ring-1 ring-emerald-200 dark:ring-emerald-800/50">
            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
              <svg
                className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                {meeting.title}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                Tulis catatan untuk laporan ke orang tua.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAiDraft}
              disabled={aiPending}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl
                text-xs font-extrabold
                bg-gradient-to-r from-violet-600 to-purple-600 text-white
                shadow-md shadow-purple-500/25
                hover:shadow-purple-500/45 hover:-translate-y-0.5 active:scale-95
                disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
            >
              {aiPending ? (
                <>
                  <span
                    className="inline-block w-3 h-3 border border-white/40 border-t-white
                  rounded-full animate-spin"
                  />{' '}
                  Membuat Draft…
                </>
              ) : (
                <>✨ Bantu Tulis dengan AI</>
              )}
            </button>
            {report && !aiPending && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                (Edit sebelum menyimpan)
              </span>
            )}
          </div>

          {aiError && (
            <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 ring-1 ring-red-200 dark:text-rose-300 dark:bg-rose-950/40 dark:ring-rose-800/50">
              {aiError}
            </p>
          )}

          <AttendanceRadioGroup
            groupId={meeting.id}
            students={attendanceStudents}
            values={attendance}
            onChange={(studentId, status) =>
              setAttendance((current) => ({ ...current, [studentId]: status }))
            }
          />

          <Textarea
            label="Catatan Progress (laporan untuk orang tua)"
            value={report}
            onChange={(e) => setReport(e.target.value)}
            rows={4}
            placeholder="Topik yang dipelajari, perkembangan siswa…"
          />
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-white/10">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCompleteOpen(false)}
            >
              Batal
            </Button>
            <Button
              size="sm"
              loading={pending}
              onClick={handleComplete}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 shadow-emerald-200 dark:shadow-emerald-950/40"
            >
              ✓ Simpan &amp; Selesaikan
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Delete modal ────────────────────────────────────── */}
      <Modal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Hapus Jadwal"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-rose-950/40 ring-1 ring-red-200 dark:ring-rose-800/50">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 dark:bg-rose-900/50 flex items-center justify-center mt-0.5">
              <svg
                className="h-4 w-4 text-red-600 dark:text-rose-400"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 3.75a.75.75 0 011.5 0v4a.75.75 0 01-1.5 0v-4zm.75 7a.75.75 0 110-1.5.75.75 0 010 1.5z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-red-800 dark:text-rose-200">
                Hapus jadwal ini?
              </p>
              <p className="text-xs text-red-600 dark:text-rose-300 mt-1 leading-relaxed">
                <span className="font-medium">{meeting.title}</span> akan
                dihapus permanen. Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
          </div>

          {meeting.series_id && (
            <div className="space-y-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 ring-1 ring-amber-200 dark:ring-amber-800/50">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                >
                  <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 3.75a.75.75 0 011.5 0v4a.75.75 0 01-1.5 0v-4zm.75 7a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                </svg>
                Ini bagian dari seri kelas
              </p>
              {(['single', 'series'] as const).map((m) => (
                <label
                  key={m}
                  className="flex items-center gap-2.5 text-sm cursor-pointer group"
                >
                  <input
                    type="radio"
                    name="_delMode"
                    value={m}
                    checked={deleteMode === m}
                    onChange={() => setDeleteMode(m)}
                    className="accent-amber-600"
                  />
                  <span className="text-amber-800 dark:text-amber-200 text-xs font-medium">
                    {m === 'single'
                      ? 'Hapus hanya sesi ini'
                      : 'Hapus sesi ini & selanjutnya'}
                  </span>
                </label>
              ))}
            </div>
          )}

          {feedback && (
            <p className="text-xs text-red-600 dark:text-rose-400 flex items-center gap-1">
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 3.75a.75.75 0 011.5 0v4a.75.75 0 01-1.5 0v-4zm.75 7a.75.75 0 110-1.5.75.75 0 010 1.5z" />
              </svg>
              {feedback}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-white/10">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDeleteOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={pending}
              onClick={handleDelete}
            >
              Ya, Hapus
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
