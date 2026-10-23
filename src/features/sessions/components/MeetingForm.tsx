// src/features/sessions/components/MeetingForm.tsx
// Admin-only form for creating and editing meetings.
// Used in both the Create modal and the Edit modal.
'use client';

import { useActionState, useEffect, useState } from 'react';
import {
  createSession,
  updateSession,
  type ActionResult,
} from '@/features/sessions/actions';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import type {
  MeetingWithStudents,
  TeacherOption,
  StudentOption,
} from '@/features/sessions/queries';

type Mode = 'create' | 'edit';

interface MeetingFormProps {
  mode: Mode;
  teachers?: TeacherOption[]; // reserved for future teacher assignment UI
  students: StudentOption[];
  meeting?: MeetingWithStudents;
  onSuccess?: () => void;
}

const initial: ActionResult | null = null;

function toLocalDatetimeInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function localDatetimeToIso(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

export function MeetingForm({
  mode,
  teachers = [],
  students,
  meeting,
  onSuccess,
}: MeetingFormProps) {
  const action = mode === 'create' ? createSession : updateSession;
  const [state, formAction, pending] = useActionState(action, initial);
  const [meetingDate, setMeetingDate] = useState(
    meeting ? toLocalDatetimeInput(meeting.meeting_date) : ''
  );
  const [selectedStudents, setSelectedStudents] = useState<string[]>(
    meeting?.meeting_students?.map((ms) => ms.student_id) ?? []
  );
  const [editMode, setEditMode] = useState<'single' | 'series'>('single');

  useEffect(() => {
    if (state?.success) onSuccess?.();
  }, [state, onSuccess]);

  const err = (field: string) =>
    state && !state.success ? state.fields?.[field] : undefined;

  const toggleStudent = (id: string) =>
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );

  return (
    <form action={formAction} className="space-y-5">
      {/* Hidden fields */}
      {mode === 'edit' && meeting && (
        <>
          <input type="hidden" name="id" value={meeting.id} />
          <input type="hidden" name="edit_mode" value={editMode} />
          {meeting.series_id && (
            <input type="hidden" name="series_id" value={meeting.series_id} />
          )}
          <input type="hidden" name="session_number" value={meeting.session_number} />
          {meeting.module_id != null && <input type="hidden" name="module_id" value={meeting.module_id} />}
        </>
      )}

      <input
        type="hidden"
        name="meeting_date"
        value={localDatetimeToIso(meetingDate)}
      />

      {/* Selected students (repeated hidden inputs) */}
      {selectedStudents.map((id) => (
        <input key={id} type="hidden" name="student_ids" value={id} />
      ))}

      {/* Top-level error */}
      {state && !state.success && !state.fields && (
        <div
          className="rounded-xl bg-red-50 dark:bg-rose-950/40 ring-1 ring-red-200 dark:ring-rose-800/50 px-4 py-3 text-sm text-red-700 dark:text-rose-200
          flex items-center gap-2"
        >
          <svg
            className="h-4 w-4 flex-shrink-0"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 3.75a.75.75 0 011.5 0v4a.75.75 0 01-1.5 0v-4zm.75 7a.75.75 0 110-1.5.75.75 0 010 1.5z" />
          </svg>
          {state.error}
        </div>
      )}

      {/* Title */}
      <Input
        label="Judul Kelas"
        name="title"
        required
        defaultValue={meeting?.title}
        placeholder="Kelas HTML Dasar — Sesi 1"
        error={err('title')}
      />

      {/* Curriculum association: required for teacher-guided quiz unlocks */}
      {mode === 'create' ? (
        <Input
          label="ID Modul Kurikulum"
          name="module_id"
          type="number"
          min={1}
          required
          placeholder="Masukkan ID modul dari halaman Kurikulum"
          error={err('module_id')}
        />
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-purple-500/30 px-3.5 py-2.5 text-sm">
          <span className="font-medium">Modul kurikulum: </span>
          {meeting?.module_id ? `ID ${meeting.module_id}` : 'Belum terhubung (jadwal lama)'}
          {!meeting?.module_id && <p className="mt-1 text-xs text-amber-600">Jadwal lama tidak dapat membuka kuis sampai dihubungkan ke modul secara eksplisit.</p>}
        </div>
      )}

      {/* Teacher picker */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="meeting-teacher"
          className="text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          Guru <span className="text-slate-400 dark:text-slate-500 font-normal">(opsional)</span>
        </label>
        <select
          id="meeting-teacher"
          name="teacher_id"
          defaultValue={meeting?.teacher_id ?? ''}
          className="rounded-xl border border-slate-200 dark:border-purple-500/40 px-3.5 py-2.5 text-sm
            bg-white dark:bg-[#0B0F19] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-purple-500/50"
        >
          <option value="">— Pilih guru —</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.full_name ?? t.email ?? t.id}
            </option>
          ))}
        </select>
      </div>

      {/* Date-time */}
      <Input
        label="Waktu Mulai"
        name="meeting_date_local"
        type="datetime-local"
        required
        value={meetingDate}
        onChange={(event) => setMeetingDate(event.target.value)}
        error={err('meeting_date')}
      />

      {/* Meeting link */}
      <Input
        label="Link Meeting (Zoom / Meet)"
        name="link_url"
        type="url"
        required
        defaultValue={meeting?.link_url ?? undefined}
        placeholder="https://zoom.us/j/..."
        error={err('link_url')}
      />

      {/* Session count — create mode only */}
      {mode === 'create' && (
        <Input
          label="Jumlah Sesi (1 = single, >1 = seri mingguan)"
          name="session_count"
          type="number"
          min={1}
          max={20}
          defaultValue={1}
          error={err('session_count')}
        />
      )}

      {/* Notes */}
      <Textarea
        label="Catatan (opsional)"
        name="notes"
        defaultValue={meeting?.notes ?? undefined}
        placeholder="Topik, persiapan, dll."
        error={err('notes')}
      />

      {/* Student picker */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Siswa {mode === 'create' ? '(pilih minimal 1)' : ''}
          </p>
          {selectedStudents.length > 0 && (
            <span
              className="text-xs font-semibold text-indigo-600 dark:text-purple-300 bg-indigo-50 dark:bg-purple-950/40 px-2 py-0.5
              rounded-full ring-1 ring-indigo-200 dark:ring-purple-700/50"
            >
              {selectedStudents.length} dipilih
            </span>
          )}
        </div>
        {err('student_ids') && (
          <p className="text-xs text-red-600 dark:text-red-400 mb-2 flex items-center gap-1">
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 3.75a.75.75 0 011.5 0v4a.75.75 0 01-1.5 0v-4zm.75 7a.75.75 0 110-1.5.75.75 0 010 1.5z" />
            </svg>
            {err('student_ids')}
          </p>
        )}
        <div
          className="rounded-xl border border-slate-200 dark:border-purple-500/30 max-h-48 overflow-y-auto
          divide-y divide-slate-100 dark:divide-white/10 shadow-sm"
        >
          {students.length === 0 && (
            <p className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500 italic">
              Belum ada siswa terdaftar.
            </p>
          )}
          {students.map((s) => {
            const checked = selectedStudents.includes(s.id);
            return (
              <label
                key={s.id}
                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer select-none transition-colors
                  ${checked ? 'bg-indigo-50/80 dark:bg-purple-950/40' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}
              >
                <input
                  type="checkbox"
                  className="rounded accent-indigo-600 dark:accent-purple-500 w-4 h-4"
                  checked={checked}
                  onChange={() => toggleStudent(s.id)}
                />
                <span className="text-sm font-medium text-slate-800 dark:text-slate-100 flex-1 min-w-0 truncate">
                  {s.full_name}
                  {s.grade && (
                    <span className="ml-1.5 text-xs text-slate-400 dark:text-slate-400 font-normal">
                      Kelas {s.grade}
                    </span>
                  )}
                </span>
                {checked && (
                  <svg
                    className="h-4 w-4 text-indigo-600 dark:text-purple-400 flex-shrink-0"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <path d="M13.854 3.646a.5.5 0 010 .708l-7 7a.5.5 0 01-.708 0l-3.5-3.5a.5.5 0 11.708-.708L6.5 10.293l6.646-6.647a.5.5 0 01.708 0z" />
                  </svg>
                )}
              </label>
            );
          })}
        </div>
      </div>

      {/* Series edit mode — edit mode only, for series meetings */}
      {mode === 'edit' && meeting?.series_id && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-2">
          <p className="text-xs font-semibold text-amber-800">
            Ini adalah bagian dari seri kelas
          </p>
          <div className="flex gap-3">
            {(['single', 'series'] as const).map((m) => (
              <label
                key={m}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <input
                  type="radio"
                  name="_editMode_ui"
                  value={m}
                  checked={editMode === m}
                  onChange={() => setEditMode(m)}
                />
                {m === 'single'
                  ? 'Perbarui hanya sesi ini'
                  : 'Perbarui sesi ini & selanjutnya'}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
        <Button type="submit" loading={pending} className="min-w-[140px]">
          {mode === 'create' ? '✨ Buat Jadwal' : '💾 Simpan Perubahan'}
        </Button>
      </div>
    </form>
  );
}
