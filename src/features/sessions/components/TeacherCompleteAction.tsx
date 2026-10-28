// src/features/sessions/components/TeacherCompleteAction.tsx
// Teacher action: "Tandai Selesai" button + progress report modal with AI draft.
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  markSessionComplete,
  updateSessionReport,
} from '@/features/sessions/actions';
import { draftProgressReport } from '@/features/ai/actions';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { AttendanceRadioGroup } from './AttendanceRadioGroup';
import type {
  AttendanceStatus,
  SessionAttendanceStudent,
} from '@/types/sessions';

interface Props {
  meetingId: number;
  meetingTitle: string;
  studentNames?: string;
  buttonText?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  className?: string;
  initialReport?: string | null;
  isCompleted?: boolean;
  attendanceStudents: SessionAttendanceStudent[];
}

export function TeacherCompleteAction({
  meetingId,
  meetingTitle,
  studentNames,
  buttonText = '✓ Tandai Selesai',
  variant = 'secondary',
  className,
  initialReport,
  isCompleted = false,
  attendanceStudents,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState(initialReport ?? '');
  const [attendance, setAttendance] = useState<
    Record<string, AttendanceStatus>
  >(() =>
    Object.fromEntries(
      attendanceStudents.map((student) => [student.studentId, student.status])
    )
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [aiPending, startAi] = useTransition();
  const [aiError, setAiError] = useState<string | null>(null);

  // Sync initialReport when modal opens
  function handleOpen() {
    setReport(initialReport ?? '');
    setAttendance(
      Object.fromEntries(
        attendanceStudents.map((student) => [student.studentId, student.status])
      )
    );
    setError(null);
    setAiError(null);
    setOpen(true);
  }

  async function handleSubmit() {
    setError(null);
    const fd = new FormData();
    fd.append('id', String(meetingId));
    fd.append('progress_report', report);
    fd.set(
      'attendance_statuses',
      JSON.stringify(
        attendanceStudents.map((student) => ({
          student_id: student.studentId,
          status: attendance[student.studentId] ?? student.status,
        }))
      )
    );
    if (!isCompleted) fd.append('completion_status', 'selesai');
    start(async () => {
      const result = isCompleted
        ? await updateSessionReport(null, fd)
        : await markSessionComplete(null, fd);
      if (result.success) {
        setOpen(false);
        router.refresh();
      } else setError(result.error);
    });
  }

  function handleAiDraft() {
    setAiError(null);
    const fd = new FormData();
    fd.append('session_title', meetingTitle);
    fd.append('student_names', studentNames ?? 'siswa');
    fd.append('topic_hint', '');
    startAi(async () => {
      const r = await draftProgressReport(null, fd);
      if (r.success) setReport(r.data);
      else setAiError(r.error);
    });
  }

  return (
    <>
      <Button
        variant={variant}
        size="sm"
        className={className}
        onClick={handleOpen}
      >
        {buttonText}
      </Button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Laporan Kelas">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {isCompleted ? (
              <>
                Perbarui catatan perkembangan untuk{' '}
                <strong>{meetingTitle}</strong>.
              </>
            ) : (
              <>
                Tandai <strong>{meetingTitle}</strong> sebagai selesai dan
                tambahkan catatan perkembangan siswa.
              </>
            )}
          </p>

          {/* AI draft button */}
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
            {report && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                (Edit sebelum menyimpan)
              </span>
            )}
          </div>

          {aiError && (
            <p
              className="text-xs text-red-500 bg-red-50 dark:text-rose-300 dark:bg-rose-950/30
              rounded-lg px-3 py-2 ring-1 ring-red-200 dark:ring-rose-800/50"
            >
              {aiError}
            </p>
          )}

          <AttendanceRadioGroup
            groupId={meetingId}
            students={attendanceStudents}
            values={attendance}
            onChange={(studentId, status) =>
              setAttendance((current) => ({ ...current, [studentId]: status }))
            }
          />

          <Textarea
            label="Catatan Progress"
            value={report}
            onChange={(e) => setReport(e.target.value)}
            rows={6}
            placeholder="Topik yang dipelajari hari ini, perkembangan siswa, catatan untuk orang tua…"
          />

          {error && <p className="text-xs text-red-600 dark:text-rose-400">{error}</p>}

          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Batal
            </Button>
            <Button size="sm" loading={pending} onClick={handleSubmit}>
              {isCompleted ? 'Simpan Laporan' : 'Simpan & Selesaikan'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
