'use client';

import {
  ATTENDANCE_STATUSES,
  type AttendanceStatus,
  type SessionAttendanceStudent,
} from '@/types/sessions';

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  hadir: 'Hadir',
  telat: 'Telat',
  absen: 'Absen',
};

interface AttendanceRadioGroupProps {
  groupId: number;
  students: SessionAttendanceStudent[];
  values: Record<string, AttendanceStatus>;
  onChange: (studentId: string, status: AttendanceStatus) => void;
}

export function AttendanceRadioGroup({
  groupId,
  students,
  values,
  onChange,
}: AttendanceRadioGroupProps) {
  if (students.length === 0) {
    return (
      <p className="text-xs text-slate-500">
        Belum ada siswa yang terdaftar pada sesi ini.
      </p>
    );
  }

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        Kehadiran Siswa
      </legend>
      {students.map((student) => (
        <fieldset
          key={student.studentId}
          className="rounded-xl border border-slate-200 dark:border-zinc-700 p-3"
        >
          <legend className="px-1 text-xs font-bold text-slate-700 dark:text-slate-200">
            {student.studentName}
          </legend>
          <div className="grid grid-cols-3 gap-2">
            {ATTENDANCE_STATUSES.map((status) => (
              <label
                key={status}
                className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-semibold cursor-pointer transition-colors ${
                  (values[student.studentId] ?? student.status) === status
                    ? 'border-cyan-500 bg-cyan-50 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-200'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
                }`}
              >
                <input
                  type="radio"
                  name={`attendance-${groupId}-${student.studentId}`}
                  value={status}
                  checked={
                    (values[student.studentId] ?? student.status) === status
                  }
                  onChange={() => onChange(student.studentId, status)}
                  className="accent-cyan-600"
                />
                {STATUS_LABELS[status]}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </fieldset>
  );
}
